import os
import re
from functools import lru_cache
from typing import Any, AsyncIterator, Optional

import yfinance as yf
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver

from app.services.optimizer import optimize_portfolio
from app.schemas.chat import UserProfile


SYSTEM_PROMPT = (
    "You are an intelligent AI financial advisor. "
    "Use tools to fetch stock prices and optimize portfolios using Markowitz optimization. "
    "If the user shares risk tolerance, adapt accordingly: Low means higher risk aversion, "
    "High means lower risk aversion. Explain recommendations clearly and keep responses concise. "
    "Return your response as: "
    "<thinking>short, user-safe planning summary</thinking> "
    "followed by <answer>final recommendation</answer>."
)

THINKING_PATTERN = re.compile(r"<thinking>(.*?)</thinking>", re.IGNORECASE | re.DOTALL)
ANSWER_PATTERN = re.compile(r"<answer>(.*?)</answer>", re.IGNORECASE | re.DOTALL)


def _candidate_models() -> list[str]:
    preferred = os.getenv("GEMINI_MODEL", "gemini-3.1-flash")
    # Keep 3.1-flash first as requested, then graceful fallbacks based on current API availability.
    defaults = [
        "gemini-3.1-flash",
        "gemini-3-flash-preview",
        "gemini-3.1-flash-lite-preview",
        "gemini-flash-latest",
    ]
    ordered = [preferred] + [m for m in defaults if m != preferred]
    return ordered

@tool
def get_stock_price(ticker: str) -> float:
    """Gets the latest closing price of a stock using yfinance."""
    try:
        data = yf.Ticker(ticker).history(period="1d")
        if data.empty:
            return 0.0
        return float(data['Close'].iloc[-1])
    except Exception:
        return 0.0

@tool
def run_portfolio_optimization(expected_returns: list[float], covariance: list[list[float]], risk_aversion: float) -> str:
    """
    Computes optimal asset weights based on the Markowitz optimization model.
    Pass expected_returns (list of floats), a 2D covariance array (list of lists of floats), and a risk_aversion float.
    Returns the weights mapping for the provided returns.
    """
    try:
        result = optimize_portfolio(expected_returns, covariance, risk_aversion)
        return str(result)
    except Exception as e:
        return f"Optimization failed: {e}"

def _serialize_content(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                text = item.get("text")
                if isinstance(text, str):
                    parts.append(text)
        return "\n".join(parts).strip()
    return str(content)


def _extract_sections(text: str) -> tuple[str, str]:
    normalized = text.strip()
    thinking_match = THINKING_PATTERN.search(normalized)
    answer_match = ANSWER_PATTERN.search(normalized)

    thinking = thinking_match.group(1).strip() if thinking_match else ""
    if answer_match:
        answer = answer_match.group(1).strip()
    else:
        answer = THINKING_PATTERN.sub("", normalized)
        answer = ANSWER_PATTERN.sub("", answer).strip()

    if not thinking:
        thinking = "Completed analysis and prepared a recommendation."
    if not answer:
        answer = "I could not generate a response. Please try again."

    return thinking, answer


def _build_input_text(message: str, profile: Optional[UserProfile] = None) -> str:
    if not profile:
        return message
    profile_text = (
        f"User Profile: Age={profile.age}, Income={profile.income}, "
        f"Savings={profile.savings}, Risk Tolerance={profile.risk_tolerance}. "
    )
    return profile_text + "\nUser asks: " + message


def _as_text(value: Any, limit: int = 1200) -> str:
    text = _serialize_content(value)
    if len(text) > limit:
        return text[:limit] + "..."
    return text


@lru_cache(maxsize=1)
def _get_agent():
    load_dotenv()
    api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GOOGLE_API_KEY or GEMINI_API_KEY in environment.")

    last_error: Exception | None = None
    for model_name in _candidate_models():
        try:
            llm = ChatGoogleGenerativeAI(
                model=model_name,
                temperature=0.2,
                api_key=api_key,
            )
            # Probe model support once during lazy init to avoid runtime NOT_FOUND failures.
            llm.invoke("Return OK")
            return create_react_agent(
                model=llm,
                tools=[get_stock_price, run_portfolio_optimization],
                prompt=SYSTEM_PROMPT,
                checkpointer=MemorySaver(),
            )
        except Exception as exc:
            last_error = exc
            continue

    raise RuntimeError(f"No compatible Gemini Flash model available. Last error: {last_error}")

async def get_agent_response(message: str, profile: Optional[UserProfile] = None, thread_id: str = "default-thread") -> str:
    input_text = _build_input_text(message, profile)

    try:
        agent = _get_agent()
        result = await agent.ainvoke({"messages": [{"role": "user", "content": input_text}]}, config={"configurable": {"thread_id": thread_id}})
        messages = result.get("messages", [])
        if not messages:
            return "I could not generate a response. Please try again."

        content = getattr(messages[-1], "content", "")
        text = _serialize_content(content)
        _, answer = _extract_sections(text)
        return answer
    except Exception as exc:
        return f"I could not process your request right now. {exc}"


async def stream_agent_events(message: str, profile: Optional[UserProfile] = None, thread_id: str = "default-thread") -> AsyncIterator[dict[str, Any]]:
    input_text = _build_input_text(message, profile)

    yield {"event": "status", "data": {"text": "Analyzing your request..."}}
    yield {"event": "thinking_delta", "data": {"text": "Understanding your goal and risk profile. "}}

    try:
        agent = _get_agent()
        final_text = ""
        raw_stream_text = ""
        thinking_stream_text = ""
        answer_stream_text = ""

        open_thinking = "<thinking>"
        close_thinking = "</thinking>"
        open_answer = "<answer>"
        close_answer = "</answer>"
        pending = ""
        mode = "outside"

        def _consume_stream_piece(piece: str) -> list[tuple[str, str]]:
            nonlocal pending, mode
            if not piece:
                return []

            pending += piece
            emitted: list[tuple[str, str]] = []

            while pending:
                lower = pending.lower()

                if mode == "outside":
                    idx_thinking = lower.find(open_thinking)
                    idx_answer = lower.find(open_answer)

                    if idx_thinking == -1 and idx_answer == -1:
                        hold = max(len(open_thinking), len(open_answer)) - 1
                        if len(pending) > hold:
                            emitted.append(("answer", pending[:-hold]))
                            pending = pending[-hold:]
                        break

                    candidates = [idx for idx in (idx_thinking, idx_answer) if idx != -1]
                    next_idx = min(candidates)

                    if next_idx > 0:
                        emitted.append(("answer", pending[:next_idx]))

                    if idx_thinking != -1 and idx_thinking == next_idx:
                        pending = pending[next_idx + len(open_thinking):]
                        mode = "thinking"
                    else:
                        pending = pending[next_idx + len(open_answer):]
                        mode = "answer"

                elif mode == "thinking":
                    idx_close = lower.find(close_thinking)
                    if idx_close == -1:
                        hold = len(close_thinking) - 1
                        if len(pending) > hold:
                            emitted.append(("thinking", pending[:-hold]))
                            pending = pending[-hold:]
                        break

                    if idx_close > 0:
                        emitted.append(("thinking", pending[:idx_close]))
                    pending = pending[idx_close + len(close_thinking):]
                    mode = "outside"

                elif mode == "answer":
                    idx_close = lower.find(close_answer)
                    if idx_close == -1:
                        hold = len(close_answer) - 1
                        if len(pending) > hold:
                            emitted.append(("answer", pending[:-hold]))
                            pending = pending[-hold:]
                        break

                    if idx_close > 0:
                        emitted.append(("answer", pending[:idx_close]))
                    pending = pending[idx_close + len(close_answer):]
                    mode = "outside"

            return emitted

        async for event in agent.astream_events(
            {"messages": [{"role": "user", "content": input_text}]},
            version="v1",
            config={"configurable": {"thread_id": thread_id}},
        ):
            event_type = event.get("event", "")
            event_name = event.get("name", "")
            data = event.get("data", {})

            if event_type == "on_chain_start":
                yield {"event": "status", "data": {"text": "Planning an actionable strategy..."}}

            elif event_type == "on_chat_model_stream":
                chunk = data.get("chunk")
                piece = _serialize_content(getattr(chunk, "content", ""))
                if not piece:
                    continue

                raw_stream_text += piece
                for section, delta in _consume_stream_piece(piece):
                    if not delta:
                        continue
                    if section == "thinking":
                        thinking_stream_text += delta
                        yield {"event": "thinking_delta", "data": {"text": delta}}
                    else:
                        answer_stream_text += delta
                        yield {"event": "answer_delta", "data": {"text": delta}}

            elif event_type == "on_tool_start":
                yield {
                    "event": "tool_start",
                    "data": {
                        "tool": event_name,
                        "input": _as_text(data.get("input", "")),
                    },
                }
                yield {"event": "status", "data": {"text": f"Running tool: {event_name}"}}

            elif event_type == "on_tool_end":
                yield {
                    "event": "tool_end",
                    "data": {
                        "tool": event_name,
                        "output": _as_text(data.get("output", "")),
                    },
                }
                yield {"event": "status", "data": {"text": f"Tool finished: {event_name}"}}

            elif event_type == "on_chain_end":
                output = data.get("output")
                if isinstance(output, dict):
                    messages = output.get("messages", [])
                    if messages:
                        candidate = _serialize_content(getattr(messages[-1], "content", ""))
                        if candidate:
                            final_text = candidate

        # Flush any partial trailing buffered text.
        if pending:
            trailing_section = "thinking" if mode == "thinking" else "answer"
            if trailing_section == "thinking":
                thinking_stream_text += pending
                yield {"event": "thinking_delta", "data": {"text": pending}}
            else:
                answer_stream_text += pending
                yield {"event": "answer_delta", "data": {"text": pending}}
            pending = ""

        if not final_text.strip():
            final_text = raw_stream_text

        if final_text.strip():
            thinking, answer = _extract_sections(final_text)
        else:
            thinking = thinking_stream_text.strip() or "Completed analysis and prepared a recommendation."
            answer = answer_stream_text.strip() or "I could not generate a response. Please try again."

        yield {
            "event": "final",
            "data": {
                "thinking": thinking,
                "answer": answer,
            },
        }
    except Exception as exc:
        yield {"event": "error", "data": {"message": f"I could not process your request right now. {exc}"}}
    finally:
        yield {"event": "done", "data": {}}
