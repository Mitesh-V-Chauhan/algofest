import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.schemas.chat import ChatRequest, ChatResponse
from app.services.agent import get_agent_response, stream_agent_events

router = APIRouter()

@router.post("/", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    response_text = await get_agent_response(request.message, request.profile, request.thread_id)
    return ChatResponse(response=response_text)


@router.post("/stream")
async def chat_stream_endpoint(request: ChatRequest):
    async def event_generator():
        async for chunk in stream_agent_events(request.message, request.profile, request.thread_id):
            event_name = chunk.get("event", "message")
            payload = json.dumps(chunk.get("data", {}), ensure_ascii=True)
            yield f"event: {event_name}\n"
            yield f"data: {payload}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
