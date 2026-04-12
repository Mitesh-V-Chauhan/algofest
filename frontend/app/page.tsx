'use client';

import { useEffect, useRef, useState } from 'react';
import { 
  Send, Sparkles, BrainCircuit, Activity, 
  TrendingUp, Wallet, ShieldAlert, ChevronDown, 
  ChevronRight, CircleUserRound, Clock, 
  Menu, Plus
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Profile = {
  age: number;
  income: number;
  savings: number;
  risk_tolerance: string;
};

type UserMessage = {
  id: string;
  role: 'user';
  content: string;
};

type AgentMessage = {
  id: string;
  role: 'agent';
  answer: string;
  thinking: string;
  tools: string[];
  status: string;
  streaming: boolean;
};

type ChatMessage = UserMessage | AgentMessage;

type ParsedSSEEvent = {
  event: string;
  data: Record<string, unknown>;
};

function parseSSEEvent(rawChunk: string): ParsedSSEEvent | null {
  const lines = rawChunk.split('\n');
  let event = 'message';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
      continue;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (!dataLines.length) return null;

  const dataText = dataLines.join('\n');
  try {
    return { event, data: JSON.parse(dataText) as Record<string, unknown> };
  } catch {
    return { event, data: { text: dataText } };
  }
}

function shortText(value: unknown, maxLen = 140): string {
  const text = String(value ?? '');
  return text.length <= maxLen ? text : text.slice(0, maxLen) + '...';
}

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isAgentMessage(message: ChatMessage): message is AgentMessage {
  return message.role === 'agent';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

// Reusable animated dropdown for reasoning
function ReasoningTrace({ msg }: { msg: AgentMessage }) {
  const [isOpen, setIsOpen] = useState(msg.streaming);

  // Auto-open when streaming
  useEffect(() => {
    if (msg.streaming) setIsOpen(true);
  }, [msg.streaming]);

  const hasTools = msg.tools.length > 0;
  const hasThinking = msg.thinking.trim().length > 0;
  
  if (!hasThinking && !hasTools && !msg.streaming) return null;

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/60 bg-neutral-900 border border-neutral-800 mb-2/50 transition-all duration-300 w-full mb-3">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between bg-neutral-800/50 px-4 py-3 text-xs font-semibold text-neutral-300 transition-colors hover:bg-slate-100"
      >
        <div className="flex items-center gap-2">
          {msg.streaming ? (
            <Activity className="h-3.5 w-3.5 animate-pulse text-indigo-500" />
          ) : (
            <BrainCircuit className="h-3.5 w-3.5 text-slate-400" />
          )}
          <span className="uppercase tracking-widest">
            {msg.streaming ? 'Agent Processing...' : 'Reasoning & Actions'}
          </span>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-slate-200/50 p-4 space-y-5 bg-neutral-900/40 backdrop-blur-sm">
          {/* Thinking phase */}
          {hasThinking && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Thought Process</p>
              <div className="font-mono text-[13px] leading-relaxed text-neutral-300 pl-3 border-l-2 border-indigo-200 whitespace-pre-wrap">
                {msg.thinking}
              </div>
            </div>
          )}

          {/* Tools phase */}
          {hasTools && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Executed Tools</p>
              <div className="space-y-2">
                {msg.tools.map((toolLine, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-neutral-900 border border-slate-200 rounded-lg p-3 shadow-none">
                    <Activity className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                    <p className="font-mono text-[11px] leading-loose text-neutral-300 break-all">{toolLine}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Forms
  const [age, setAge] = useState('');
  const [income, setIncome] = useState('');
  const [savings, setSavings] = useState('');
  const [risk, setRisk] = useState('Medium');

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile({
      age: Number(age),
      income: Number(income),
      savings: Number(savings),
      risk_tolerance: risk
    });
    setMessages([
      {
        id: uid(),
        role: 'agent',
        answer: "Welcome aboard. I'm your dedicated autonomous financial agent. Based on your profile, how can we optimize your wealth today?",
        thinking: 'Profile captured securely. Waiting for user intent.',
        tools: [],
        status: 'Ready',
        streaming: false,
      },
    ]);
  };

  const updateAgentMessage = (id: string, update: (message: AgentMessage) => AgentMessage) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (!isAgentMessage(msg) || msg.id !== id) return msg;
        return update(msg);
      })
    );
  };

  const handleChatSubmit = async (e?: React.FormEvent, customInput?: string) => {
    if (e) e.preventDefault();
    const userMsg = (customInput || input).trim();
    if (!userMsg) return;

    const userId = uid();
    const agentId = uid();

    setMessages((prev) => [
      ...prev,
      { id: userId, role: 'user', content: userMsg },
      {
        id: agentId,
        role: 'agent',
        answer: '',
        thinking: '',
        tools: [],
        status: 'Initializing stream...',
        streaming: true,
      },
    ]);

    setInput('');
    setLoading(true);

    try {
      // Use env variable in prod mapping to NEXT_PUBLIC_API_URL/chat/stream or fallback to local
      const apiUrl = process.env.NEXT_PUBLIC_API_URL 
        ? `${process.env.NEXT_PUBLIC_API_URL}/chat/stream` 
        : 'http://localhost:8000/api/v1/chat/stream';
        
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          profile: profile
        })
      });

      if (!res.ok || !res.body) throw new Error('Stream failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';

        for (const rawChunk of chunks) {
          const parsed = parseSSEEvent(rawChunk);
          if (!parsed) continue;

          switch (parsed.event) {
            case 'status':
              updateAgentMessage(agentId, (m) => ({ ...m, status: String(parsed.data.text) }));
              break;
            case 'thinking_delta':
              updateAgentMessage(agentId, (m) => ({ 
                ...m, 
                thinking: m.thinking + String(parsed.data.text || '') 
              }));
              break;
            case 'answer_delta':
              updateAgentMessage(agentId, (m) => ({ 
                ...m, 
                answer: m.answer + String(parsed.data.text || '') 
              }));
              break;
            case 'tool_start':
              updateAgentMessage(agentId, (m) => ({ 
                ...m, 
                tools: [...m.tools, `Started ${parsed.data.tool} | Input: ${shortText(parsed.data.input, 60)}`] 
              }));
              break;
            case 'tool_end':
              updateAgentMessage(agentId, (m) => ({ 
                ...m, 
                tools: [...m.tools, `Finished ${parsed.data.tool} | Output: ${shortText(parsed.data.output, 60)}`] 
              }));
              break;
            case 'final':
              updateAgentMessage(agentId, (m) => ({
                ...m,
                answer: parsed.data.answer ? String(parsed.data.answer) : m.answer,
                status: 'Complete',
                streaming: false
              }));
              break;
            case 'error':
              updateAgentMessage(agentId, (m) => ({ 
                ...m, 
                answer: String(parsed.data.message), 
                status: 'Failed', 
                streaming: false 
              }));
              break;
            case 'done':
              updateAgentMessage(agentId, (m) => ({ ...m, streaming: false, status: 'Complete' }));
              break;
          }
        }
      }
      updateAgentMessage(agentId, (m) => ({ ...m, streaming: false }));
    } catch (error) {
      console.error(error);
      updateAgentMessage(agentId, (m) => ({
        ...m,
        answer: 'Connection error while streaming. Please try again.',
        status: 'Failed',
        streaming: false,
      }));
    } finally {
      setLoading(false);
    }
  };

  // --- Onboarding Screen ---
  if (!profile) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-neutral-900 border border-neutral-800 mb-2 relative overflow-hidden font-sans">
        {/* Background Accents */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/100/100/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-lg rounded-[2rem] border border-white bg-neutral-900/60 backdrop-blur-2xl p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] shadow-indigo-500/5">
          <div className="inline-flex items-center justify-center rounded-2xl bg-indigo-500/100/10/80 border border-indigo-500/20 p-4 mb-6 shadow-none">
            <Sparkles className="h-7 w-7 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-neutral-100 tracking-tight">FinPilot AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">Agent</span></h1>
          <p className="mt-3 text-neutral-400 leading-relaxed font-medium">Calibrate your autonomous financial engine. Set your baseline to unlock personalized wealth strategies.</p>
          
          <form onSubmit={handleProfileSubmit} className="mt-8 space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-[11px] font-bold mb-2 uppercase tracking-widest text-neutral-400">Current Age</label>
                <div className="relative">
                  <input type="number" required value={age} onChange={e => setAge(e.target.value)} className="w-full rounded-2xl border border-slate-200/80 bg-neutral-900/80 px-4 py-3.5 text-neutral-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium shadow-none hover:border-slate-300" placeholder="e.g. 28" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-2 uppercase tracking-widest text-neutral-400">Risk Profile</label>
                <div className="relative">
                  <select value={risk} onChange={e => setRisk(e.target.value)} className="w-full rounded-2xl border border-slate-200/80 bg-neutral-900/80 px-4 py-3.5 text-neutral-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium appearance-none shadow-none hover:border-slate-300">
                    <option value="Low">Conservative</option>
                    <option value="Medium">Balanced</option>
                    <option value="High">Aggressive</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold mb-2 uppercase tracking-widest text-neutral-400">Annual Income</label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-slate-400 font-medium">$</span>
                <input type="number" required value={income} onChange={e => setIncome(e.target.value)} className="w-full rounded-2xl border border-slate-200/80 bg-neutral-900/80 pl-8 pr-4 py-3.5 text-neutral-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium shadow-none hover:border-slate-300" placeholder="120,000" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold mb-2 uppercase tracking-widest text-neutral-400">Liquid Savings</label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-slate-400 font-medium">$</span>
                <input type="number" required value={savings} onChange={e => setSavings(e.target.value)} className="w-full rounded-2xl border border-slate-200/80 bg-neutral-900/80 pl-8 pr-4 py-3.5 text-neutral-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium shadow-none hover:border-slate-300" placeholder="45,000" />
              </div>
            </div>

            <div className="pt-2">
              <button type="submit" className="w-full rounded-2xl bg-slate-900 py-4 font-bold tracking-wide text-white transition-all hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] flex items-center justify-center gap-2">
                Deploy Agent <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  // --- Main Chat App ---
  return (
    <div className="flex h-screen bg-[#FDFDFE] text-neutral-100 overflow-hidden font-sans">
      
      {/* Sidebar */}
      <aside className={cn("flex flex-col bg-neutral-900 border border-neutral-800 mb-2/50 border-r border-slate-200 transition-all duration-300 z-20", sidebarOpen ? "w-72" : "w-0 opacity-0 overflow-hidden border-none")}>
        <div className="p-4 flex items-center gap-3 border-b border-slate-200 px-6 h-[72px] shrink-0 bg-neutral-900/50 backdrop-blur-sm">
          <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-none shadow-indigo-600/20">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-neutral-200 tracking-tight text-lg">FinPilot AI.ai</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 scrollbar-hide">
          <div className="mb-8">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 px-1">Active Profile</p>
            <div className="bg-neutral-900 border border-slate-200/80 rounded-2xl p-3.5 shadow-none space-y-3">
              <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                <ShieldAlert className="h-4 w-4 text-indigo-400" />
                <span>{profile.risk_tolerance} Risk</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                <Wallet className="h-4 w-4 text-indigo-400" />
                <span>{formatCurrency(profile.savings)} Cap</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                <TrendingUp className="h-4 w-4 text-indigo-400" />
                <span>{formatCurrency(profile.income)}/yr</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 px-1">Recent Scenarios</p>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-neutral-300 hover:bg-slate-200/50 hover:text-neutral-100 rounded-xl transition-colors text-left group">
              <Clock className="h-4 w-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
              <span className="truncate">AAPL Q3 Earnings</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-neutral-300 hover:bg-slate-200/50 hover:text-neutral-100 rounded-xl transition-colors text-left mt-1 group">
              <Clock className="h-4 w-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
              <span className="truncate">House Downpayment</span>
            </button>
          </div>
        </div>

        <div className="p-5 border-t border-slate-200 bg-neutral-900/50 backdrop-blur-sm shrink-0">
          <button className="w-full flex items-center justify-center gap-2 p-3 bg-neutral-900 border border-slate-200 hover:border-slate-300 hover:bg-neutral-900 border border-neutral-800 mb-2 text-neutral-200 font-bold text-sm rounded-xl shadow-none transition-all active:scale-[0.98]">
            <Plus className="h-4 w-4 text-indigo-400" /> New Analysis
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col min-w-0 relative bg-neutral-900">
        {/* Header */}
        <header className="h-[72px] shrink-0 border-b border-slate-200/80 bg-neutral-900/80 backdrop-blur-md flex items-center justify-between px-6 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-neutral-400"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h2 className="font-bold text-neutral-200 tracking-tight">Financial Engine</h2>
              <div className="flex items-center gap-2 text-[11px] text-emerald-600 font-bold tracking-wider mt-0.5 uppercase">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Agent Online
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-neutral-900 border border-neutral-800 mb-2 flex items-center justify-center border border-slate-200/80">
              <CircleUserRound className="h-5 w-5 text-slate-400" />
            </div>
          </div>
        </header>

        {/* Messages List */}
        <div ref={messagesRef} className="flex-1 overflow-y-auto scroll-smooth pb-32">
          <div className="max-w-[48rem] mx-auto px-6 py-10 space-y-8">
            {messages.length === 1 && !loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="h-16 w-16 bg-neutral-900 border border-neutral-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl flex items-center justify-center mb-6">
                  <Sparkles className="h-8 w-8 text-indigo-400" />
                </div>
                <h2 className="text-3xl font-extrabold text-neutral-100 mb-3 tracking-tight">Good morning.</h2>
                <p className="text-neutral-400 max-w-sm mb-10 font-medium">Your autonomous financial agent is ready. Ask a question or choose a scenario below to begin analysis.</p>
                
                <div className="grid grid-cols-2 gap-4 w-full">
                  {[
                    "Analyze AAPL's recent market performance.",
                    "Build a 5-year aggressive ETF strategy.",
                    "Optimize my savings for a downpayment.",
                    "Evaluate tech sector volatility today."
                  ].map((suggestion, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleChatSubmit(undefined, suggestion)}
                      className="p-5 border border-slate-200/80 rounded-2xl bg-neutral-900 hover:border-indigo-200 hover:shadow-[0_8px_30px_rgba(99,102,241,0.1)] transition-all text-left group"
                    >
                      <p className="text-sm font-semibold text-slate-700 group-hover:text-indigo-400 transition-colors leading-snug">{suggestion}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => {
                if (msg.role === 'user') {
                  const showAvatar = i === 1 || messages[i-1]?.role === 'agent';
                  return (
                    <div key={msg.id} className="flex w-full justify-end group animate-in fade-in slide-in-from-bottom-2">
                       <div className="max-w-[70%] px-5 py-4 rounded-[1.5rem] rounded-br-[0.5rem] bg-indigo-600 text-white shadow-none shadow-indigo-600/10">
                        <p className="leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
                      </div>
                    </div>
                  );
                }

                // AI Message
                return (
                  <div key={msg.id} className="flex max-w-[85%] gap-4 animate-in fade-in slide-in-from-bottom-2 group">
                    <div className="shrink-0 mt-1">
                      <div className="h-8 w-8 rounded-xl bg-indigo-500/100/10 border border-indigo-500/20 flex items-center justify-center shadow-none">
                        <Sparkles className="h-4 w-4 text-indigo-400" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-neutral-100 mb-2 flex items-center gap-2">
                        FinPilot AI AI
                        {msg.streaming && <span className="text-[9px] uppercase tracking-wider text-indigo-400 bg-indigo-500/100/10 px-2 py-0.5 rounded-md font-extrabold animate-pulse">Computing</span>}
                      </div>

                      <ReasoningTrace msg={msg} />

                      {msg.answer && (
                          <div className="prose prose-invert prose-headings:text-neutral-100 prose-h3:text-neutral-100 prose-a:text-indigo-400 prose-p:leading-relaxed prose-li:my-1 max-w-none text-neutral-200 font-medium">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.answer}
                            </ReactMarkdown>
                          </div>
                      )}
                      
                      {!msg.answer && msg.streaming && !msg.thinking && !msg.tools.length && (
                        <div className="mt-3 flex items-center gap-1.5 p-4 rounded-2xl border border-neutral-800 bg-neutral-900 border border-neutral-800 mb-2 w-fit">
                          <div className="h-1.5 w-1.5 rounded-full bg-neutral-500 animate-[bounce_1s_infinite] [animation-delay:-0.3s]"></div>
                          <div className="h-1.5 w-1.5 rounded-full bg-neutral-500 animate-[bounce_1s_infinite] [animation-delay:-0.15s]"></div>
                          <div className="h-1.5 w-1.5 rounded-full bg-neutral-500 animate-[bounce_1s_infinite]"></div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div className="h-4" /> 
          </div>
        </div>

        {/* Floating Input Area */}
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-white via-white/95 to-transparent pb-8 pt-10">
          <div className="max-w-[48rem] mx-auto px-6 relative">
            <form 
              onSubmit={(e) => handleChatSubmit(e)}
              className="relative flex items-end bg-neutral-900 border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-[1.5rem] focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all duration-300"
            >
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleChatSubmit();
                  }
                }}
                className="w-full max-h-48 min-h-[60px] py-4 pl-5 pr-16 bg-transparent outline-none resize-none text-neutral-100 font-medium placeholder:text-slate-400 placeholder:font-normal leading-relaxed scrollbar-hide"
                placeholder="Message FinPilot AI AI..."
                rows={1}
              />
              <div className="absolute right-2 bottom-2">
                <button 
                  type="submit" 
                  disabled={loading || !input.trim()}
                  className="p-2.5 rounded-xl bg-slate-900 text-white hover:bg-indigo-600 disabled:bg-slate-100 disabled:text-slate-400 transition-all shadow-none active:scale-95 disabled:active:scale-100 disabled:shadow-none cursor-pointer"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>
            <p className="text-center text-[11px] font-semibold tracking-wide text-slate-400 mt-4 uppercase">
              FinPilot AI AI can make mistakes. Verify critical financial decisions.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
