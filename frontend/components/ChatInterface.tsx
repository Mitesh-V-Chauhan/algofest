'use client';

import { useEffect, useRef, useState, FormEvent, KeyboardEvent } from 'react';
import { 
  Send, Bot, User, Activity, ChevronRight, ChevronDown, 
  Terminal, Sparkles, Zap, Key, Shield, ArrowRight, CornerDownLeft, Target, Infinity, Clock
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';

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

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

// Minimalist Reasoning Accordion
function ReasoningTrace({ msg }: { msg: AgentMessage }) {
  const [isOpen, setIsOpen] = useState(msg.streaming);

  useEffect(() => {
    if (msg.streaming) setIsOpen(true);
  }, [msg.streaming]);

  const hasTools = msg.tools.length > 0;
  const hasThinking = msg.thinking.trim().length > 0;
  
  if (!hasThinking && !hasTools && !msg.streaming) return null;

  return (
    <div className="my-2 border border-[#27272A] bg-[#121214] rounded-md overflow-hidden w-full max-w-[90%]">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3 py-2 text-[11px] uppercase tracking-wider font-semibold text-[#A1A1AA] hover:text-[#E4E4E7] transition-colors bg-[#18181B]"
      >
        <div className="flex items-center gap-2">
          {msg.streaming ? (
            <Activity className="h-3 w-3 animate-pulse text-[#3B82F6]" />
          ) : (
            <Terminal className="h-3 w-3 text-[#52525B]" />
          )}
          <span>{msg.streaming ? 'Processing Request' : 'Execution Trace'}</span>
        </div>
        <div className="flex items-center gap-2">
          {hasTools && !msg.streaming && <span className="bg-[#27272A] text-[#D4D4D8] px-1.5 py-0.5 rounded text-[10px] lowercase tracking-normal">{msg.tools.length} tool(s)</span>}
          {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-[#27272A] bg-[#09090B]"
          >
            <div className="p-3 space-y-3 font-mono text-[11px] text-[#A1A1AA]">
              {msg.tools.map((tool, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-[#3B82F6] shrink-0">▶</span>
                  <span className="text-[#D4D4D8]">Executed: <span className="text-[#60A5FA]">{tool}</span></span>
                </div>
              ))}
              
              {msg.thinking && (
                <div className="leading-relaxed whitespace-pre-wrap pl-3 border-l hover:border-[#3F3F46] border-[#27272A] transition-colors break-words">
                  {msg.thinking}
                </div>
              )}
              
              {msg.streaming && !msg.thinking && !msg.tools.length && (
                <div className="flex gap-1.5 items-center pl-3">
                  <div className="h-1 w-1 bg-[#52525B] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="h-1 w-1 bg-[#52525B] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="h-1 w-1 bg-[#52525B] rounded-full animate-bounce"></div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ChatInterface({ initialChatId }: { initialChatId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  
  // Form parsing state
  const [formAge, setFormAge] = useState('30');
  const [formIncome, setFormIncome] = useState('120000');
  const [formSavings, setFormSavings] = useState('50000');
  const [formRisk, setFormRisk] = useState('Moderate');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [recentChats, setRecentChats] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const threadIdRef = useRef<string>(initialChatId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile({
      age: parseInt(formAge) || 30,
      income: parseInt(formIncome) || 0,
      savings: parseInt(formSavings) || 0,
      risk_tolerance: formRisk
    });

    // Provide initial context to agent invisibly or setup greeting
    setMessages([
      {
        id: uid(),
        role: 'agent',
        answer: "Identity verified. I am FinPilot AI. Based on your injected parameters, how can we advance your financial objectives today?",
        thinking: 'Profile ingested into memory. System ready.',
        tools: [],
        status: 'idle',
        streaming: false
      }
    ]);
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmit(e as unknown as FormEvent);
    }
  };

  const handleChatSubmit = async (e: FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isSending || !profile) return;

    const userMsg: UserMessage = {
      id: uid(),
      role: 'user',
      content: input.trim(),
    };

    const agentMsg: AgentMessage = {
      id: uid(),
      role: 'agent',
      answer: '',
      thinking: '',
      tools: [],
      status: 'pending',
      streaming: true,
    };

    setMessages((prev) => [...prev, userMsg, agentMsg]);
    setInput('');
    setIsSending(true);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL 
        ? `${process.env.NEXT_PUBLIC_API_URL}/chat/stream` 
        : 'http://localhost:8000/api/v1/chat/stream';
        
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg.content,
          thread_id: threadIdRef.current 
        }),
      });

      if (!res.body) throw new Error('No readable stream returned.');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const rawEvents = chunk.split('\n\n').filter(Boolean);

          setMessages((prev) => {
            const newMsgs = [...prev];
            const lastIdx = newMsgs.length - 1;
            const target = newMsgs[lastIdx];

            if (target.role !== 'agent') return newMsgs;

            const updatedMsg = { ...target };

            for (const raw of rawEvents) {
              const parsed = parseSSEEvent(raw);
              if (!parsed) continue;

              const { event, data } = parsed;
              const text = (data.text as string) || '';

              if (event === 'answer_delta') updatedMsg.answer += text;
              else if (event === 'thinking_delta') updatedMsg.thinking += text;
              else if (event === 'tool_start') updatedMsg.tools = [...updatedMsg.tools, data.tool as string];
              else if (event === 'status') updatedMsg.status = text;
            }

            newMsgs[lastIdx] = updatedMsg;
            return newMsgs;
          });
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => {
        const newMsgs = [...prev];
        const lastIdx = newMsgs.length - 1;
        const target = newMsgs[lastIdx];
        if (target.role === 'agent') {
          newMsgs[lastIdx] = { ...target, answer: target.answer + '\n\n**[Connection Error]** Failed to retrieve secure stream.' };
        }
        return newMsgs;
      });
    } finally {
      setMessages((prev) => {
        const newMsgs = [...prev];
        const lastIdx = newMsgs.length - 1;
        const target = newMsgs[lastIdx];
        if (target.role === 'agent') {
          newMsgs[lastIdx] = { ...target, streaming: false };
        }
        return newMsgs;
      });
      setIsSending(false);
    }
  };

  // View: Onboarding Profile Setup
  if (!profile) {
    return (
      <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center p-4 selection:bg-[#27272A] text-[#FAFAFA] font-sans">
        <div className="max-w-md w-full bg-[#121214] border border-[#27272A] rounded-2xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-700">
          <div className="w-10 h-10 rounded-xl bg-[#27272A] border border-[#3F3F46] flex items-center justify-center mb-6">
            <Target className="w-5 h-5 text-[#FAFAFA]" />
          </div>
          <h2 className="text-xl font-medium tracking-tight text-[#FAFAFA] mb-2">Configure Baseline</h2>
          <p className="text-sm text-[#A1A1AA] mb-8 leading-relaxed">Establish your financial profile before initiating the advisory matrix.</p>
          
          <form onSubmit={handleProfileSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">Age</label>
                <input 
                  type="number" value={formAge} onChange={e => setFormAge(e.target.value)} required min={18}
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none focus:border-[#52525B] transition-colors" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">Risk Tolerance</label>
                <select 
                  value={formRisk} onChange={e => setFormRisk(e.target.value)}
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#52525B] transition-colors appearance-none"
                >
                  <option>Conservative</option>
                  <option>Moderate</option>
                  <option>Aggressive</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">Annual Income (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525B]">$</span>
                <input 
                  type="number" value={formIncome} onChange={e => setFormIncome(e.target.value)} required min={0}
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-lg pl-7 pr-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#52525B] transition-colors" 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">Current Capital (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525B]">$</span>
                <input 
                  type="number" value={formSavings} onChange={e => setFormSavings(e.target.value)} required min={0}
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-lg pl-7 pr-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#52525B] transition-colors" 
                />
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                className="w-full flex items-center justify-center gap-2 bg-[#FAFAFA] hover:bg-[#E4E4E7] text-[#09090B] font-medium text-sm rounded-lg py-2.5 transition-colors focus:ring-2 focus:ring-white/20 focus:outline-none"
              >
                Assemble Workspace <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // View: Active Agent Workspace
  return (
    <div className="flex h-screen bg-[#09090B] text-[#FAFAFA] font-sans selection:bg-[#27272A]">
      {/* Sidebar - Profile Status */}
      <aside className="hidden md:flex flex-col w-64 bg-[#121214] border-r border-[#27272A]">
        <div className="p-4 border-b border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-[#27272A] flex items-center justify-center border border-[#3F3F46]">
              <Infinity className="w-3.5 h-3.5 text-[#FAFAFA]" />
            </div>
            <span className="font-semibold text-[13px] tracking-tight">FinPilot AI</span>
          </div>
          <a 
            href="/"
            className="flex items-center justify-center w-6 h-6 rounded bg-transparent hover:bg-[#27272A] transition-colors border border-transparent hover:border-[#3F3F46] cursor-pointer"
            title="New Chat Session"
          >
            <span className="text-[14px] text-[#A1A1AA] hover:text-[#FAFAFA]">+</span>
          </a>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <div className="mb-6">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] mb-3">Active Session</h3>
            <div className="flex items-center gap-3 p-3 bg-[#18181B] border border-[#27272A] rounded-lg">
              <div className="w-8 h-8 rounded-full bg-[#27272A] border border-[#3F3F46] flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-[#A1A1AA]" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[13px] font-medium text-[#FAFAFA] truncate">User {threadIdRef.current.slice(-4)}</span>
                <span className="text-[11px] text-[#A1A1AA] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Connected
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] mb-3">Parameters</h3>
            <div className="space-y-1">
              <div className="flex justify-between items-center py-2 px-3 text-[12px] rounded-md hover:bg-[#18181B] transition-colors cursor-default border border-transparent hover:border-[#27272A]">
                <span className="text-[#A1A1AA] flex items-center gap-2"><Key className="w-3 h-3"/> Risk Level</span>
                <span className="font-medium text-[#FAFAFA]">{profile.risk_tolerance}</span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 text-[12px] rounded-md hover:bg-[#18181B] transition-colors cursor-default border border-transparent hover:border-[#27272A]">
                <span className="text-[#A1A1AA] flex items-center gap-2"><Shield className="w-3 h-3"/> Capital</span>
                <span className="font-medium text-[#FAFAFA] truncate max-w-[80px] text-right">{formatCurrency(profile.savings)}</span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 text-[12px] rounded-md hover:bg-[#18181B] transition-colors cursor-default border border-transparent hover:border-[#27272A]">
                <span className="text-[#A1A1AA] flex items-center gap-2"><Activity className="w-3 h-3"/> Income</span>
                <span className="font-medium text-[#FAFAFA] truncate max-w-[80px] text-right">{formatCurrency(profile.income)}</span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 text-[12px] rounded-md hover:bg-[#18181B] transition-colors cursor-default border border-transparent hover:border-[#27272A]">
                <span className="text-[#A1A1AA] flex items-center gap-2"><Clock className="w-3 h-3"/> Horizon Age</span>
                <span className="font-medium text-[#FAFAFA]">{profile.age}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-8">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] mb-3">History</h3>
            <div className="space-y-1">
              {recentChats.slice(0, 5).map((chat) => (
                <a 
                  key={chat}
                  href={`/chat/${chat}`} 
                  className={cn(
                    "flex flex-col py-2 px-3 text-[12px] rounded-md transition-colors border cursor-pointer",
                    chat === initialChatId 
                      ? "bg-[#18181B] border-[#3F3F46] text-[#FAFAFA]" 
                      : "bg-transparent border-transparent hover:bg-[#18181B] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#27272A]"
                  )}
                >
                  <span className="font-medium truncate">Session {chat.slice(0, 8)}</span>
                </a>
              ))}
              {recentChats.length === 0 && (
                <span className="text-[11px] text-[#71717A] px-2 italic">No previous sessions</span>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Interface */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-14 border-b border-[#27272A] bg-[#09090B]/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-4 md:hidden">
          <div className="flex items-center gap-2">
            <Infinity className="w-4 h-4 text-[#FAFAFA]" />
            <span className="font-medium text-sm">FinPilot AI</span>
          </div>
          <span className="text-[10px] uppercase font-bold text-[#A1A1AA] bg-[#27272A] px-2 py-1 rounded">Session Active</span>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto py-8 px-4 flex flex-col gap-8 pb-32">
            {messages.map((msg, i) => (
              <div key={msg.id} className="flex gap-4 w-full animate-in fade-in slide-in-from-bottom-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border border-[#27272A] bg-[#121214] mt-0.5">
                  {msg.role === 'user' ? (
                    <User className="w-3.5 h-3.5 text-[#FAFAFA]" />
                  ) : (
                    <Infinity className="w-3.5 h-3.5 text-[#FAFAFA]" />
                  )}
                </div>
                
                <div className="flex-1 flex flex-col min-w-0 border border-transparent hover:border-[#27272A]/50 bg-transparent hover:bg-[#121214]/50 rounded-xl p-2 -m-2 transition-colors">
                  <span className="text-[12px] font-semibold text-[#FAFAFA] mb-1.5 flex items-center gap-2">
                    {msg.role === 'user' ? 'You' : 'FinPilot AI'}
                    {msg.role === 'agent' && msg.streaming && (
                      <span className="text-[9px] uppercase tracking-wider text-[#A1A1AA] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse"></span> Processing
                      </span>
                    )}
                  </span>
                  
                  {msg.role === 'user' ? (
                    <p className="text-[#E4E4E7] text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="text-[#D4D4D8] text-[15px] leading-relaxed">
                      <ReasoningTrace msg={msg} />
                      
                      {msg.answer && (
                        <div className="prose prose-invert prose-headings:text-[#FAFAFA] prose-p:leading-7 prose-a:text-[#60A5FA] prose-pre:bg-[#121214] prose-pre:border prose-pre:border-[#27272A] prose-code:text-[#D4D4D8] prose-code:bg-[#27272A]/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none max-w-none break-words">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.answer}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input Form */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#09090B] via-[#09090B] to-transparent pt-8 pb-6 px-4">
          <div className="max-w-3xl mx-auto relative">
            <form 
              onSubmit={handleChatSubmit} 
              className="relative flex items-end bg-[#121214] border border-[#27272A] rounded-xl shadow-2xl focus-within:border-[#3F3F46] focus-within:ring-4 focus-within:ring-[#ffffff05] transition-all duration-200 overflow-hidden"
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  adjustTextareaHeight();
                }}
                onKeyDown={handleKeyDown}
                disabled={isSending}
                placeholder="Ask about market conditions, optimizations..."
                className="w-full bg-transparent border-none text-[#FAFAFA] px-4 py-4 max-h-[200px] min-h-[56px] resize-none focus:outline-none placeholder:text-[#52525B] text-[15px]"
                rows={1}
              />
              <div className="absolute right-2 bottom-2 p-1">
                <button
                  type="submit"
                  disabled={!input.trim() || isSending}
                  className="p-1.5 bg-[#FAFAFA] text-[#09090B] rounded-lg hover:bg-[#E4E4E7] disabled:bg-[#27272A] disabled:text-[#52525B] transition-colors flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                >
                  <CornerDownLeft className="w-4 h-4" />
                </button>
              </div>
            </form>
            <div className="text-center mt-2.5">
              <p className="text-[10px] text-[#52525B] font-medium tracking-wide">FinPilot AI is an experimental engine. Verify structural financial calculations.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
