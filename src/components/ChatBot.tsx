import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Minimize2, Maximize2, MessageSquare } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { ChatMessage, Shipment } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';

interface ChatBotProps {
  shipments: Shipment[];
  inline?: boolean;
}

export default function ChatBot({ shipments, inline = false }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(inline);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "Control Tower AI active. Enterprise Logistics Intelligence Interface accessible." }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const context = `
        Current Enterprise Logistics State:
        ${shipments.map(s => `
        - Shipment ID: ${s.id}
          Container ID: ${s.containerId}
          Carrier Fleet: ${s.carrier}
          Vessel Name: ${s.vessel}
          Cargo Classification: ${s.cargoType}
          Operational Status: ${s.status}
          Risk Profile: ${s.risk ? `${Math.round(s.risk * 100)}% risk index` : 'Nominal'}
          Current Corridor: ${s.origin} -> ${s.destination}
          Mission Progress: ${Math.round(s.progress * 100)}%
          Calculated ETA: ${s.eta}
          Remaining Transit Time: ${s.timeToReach || 'Calculating...'}
          ${s.disruption ? `ALERT: ${s.disruption.type} (${s.disruption.severity}) - ${s.disruption.description}` : 'Active Disruption: NONE'}
          Recent History: ${s.history?.map(h => `${h.time}: ${h.event}`).join(', ')}
        `).join('\n')}
        
        Logistics Protocol:
        - Respond as a high-level logistics analyst.
        - Use bolding for Shipment IDs, Ports, and critical status terms.
        - Provide detailed, technical explanations (e.g., mention vessel density, weather systems, wave heights, terminal congestion, transit corridors).
        - Format reports professionally with a balance of data and narrative.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: 'user', parts: [{ text: `${context}\n\nUser Intelligence Request: ${userMessage}` }] }
        ],
        config: {
          systemInstruction: "You are a lead supply chain mission controller. Your output must be technical and highly professional. When explaining delays, synthesize data about congestion, weather, and vessel operations into a structured technical report. Use Markdown to bold key entities."
        }
      });

      const aiResponse = response.text || "I apologize, communications link unstable. Error code: AIS_G_ERR.";
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: "CRITICAL SYSTEM ERROR: AIS NEURAL HANDSHAKE FAILED." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (inline) {
    return (
      <div className="flex flex-col h-full bg-black/40 rounded overflow-hidden relative border border-white/5">
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 p-4 pb-14 z-10 scrollbar-hide absolute inset-0">
          {messages.map((m, i) => (
            <div 
              key={i} 
              className={cn(
                "flex flex-col gap-1 w-full flex-shrink-0",
                m.role === 'user' ? "items-end" : "items-start"
              )}
            >
              <div className="flex items-center gap-1.5 opacity-60 px-1">
                {m.role === 'user' ? <User className="w-3 h-3 text-white" /> : <Bot className="w-3 h-3 text-bento-accent" />}
                <span className="text-[8px] font-mono tracking-widest uppercase">{m.role === 'user' ? 'OPERATOR' : 'SYS_AI'}</span>
              </div>
              <div className={cn(
                "max-w-[90%] px-3 py-2 rounded text-xs leading-relaxed border shadow-xl backdrop-blur-sm",
                m.role === 'user' 
                  ? "bg-white/10 text-white font-medium border-white/20 rounded-tr-none" 
                  : "bg-[#0b101e]/90 text-zinc-300 border-bento-accent/20 rounded-tl-none glow-blue"
              )}>
                <div className="prose prose-invert prose-xs max-w-none">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-bento-accent font-mono text-[9px] bg-bento-accent/10 w-fit px-3 py-1.5 rounded-lg border border-bento-accent/20">
              <Loader2 className="w-3 h-3 animate-spin" /> SYNTHESIZING SYSTEM PROTOCOL...
            </div>
          )}
          <div className="h-14" /> {/* Spacer for input field */}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="absolute bottom-0 left-0 w-full p-2 bg-black/80 backdrop-blur-md border-t border-white/10 flex gap-2 z-20">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="AWAITING LOGISTICS COMMAND..."
            className="flex-1 bg-white/5 border border-white/10 py-1.5 px-3 rounded text-[10px] text-white focus:outline-none focus:border-bento-accent/50 placeholder:text-zinc-600 font-mono transition-all"
          />
          <button 
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-bento-accent/20 text-bento-accent disabled:opacity-30 px-3 py-1.5 rounded hover:bg-bento-accent hover:text-black transition-all flex items-center justify-center border border-bento-accent/30"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-96 md:w-[450px] bg-[#020617] border border-bento-border rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[600px]"
          >
            {/* Header */}
            <div className="bg-zinc-900/40 p-3 border-b border-bento-border flex items-center justify-between backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-bento-accent" />
                <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-[0.2em]">LOGI-CORE AI INTERFACE</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-zinc-100"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800"
            >
              {messages.map((m, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "flex flex-col gap-1.5",
                    m.role === 'user' ? "items-end" : "items-start"
                  )}
                >
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-600 uppercase tracking-tighter">
                    {m.role === 'user' ? (
                      <><User className="w-3 h-3" /> COMM_CONTROLLER</>
                    ) : (
                      <><Bot className="w-3 h-3 text-bento-accent" /> AI_INTELLIGENCE</>
                    )}
                  </div>
                  <div className={cn(
                    "max-w-[90%] px-4 py-2.5 rounded text-[11px] leading-relaxed",
                    m.role === 'user' 
                      ? "bg-bento-accent text-zinc-950 rounded-tr-none font-bold" 
                      : "bg-[#1e293b] text-zinc-300 rounded-tl-none border border-bento-border/50 prose prose-invert prose-xs"
                  )}>
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-zinc-500 font-mono text-[9px]">
                  <Loader2 className="w-3 h-3 animate-spin" /> RUNNING_HEURISTICS...
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 bg-zinc-950/80 border-t border-bento-border flex gap-2 backdrop-blur-sm">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Awaiting Command Input..."
                className="flex-1 bg-zinc-900/50 border border-bento-border/50 rounded px-3 py-2 text-[11px] text-white focus:outline-none focus:border-bento-accent transition-colors font-mono"
              />
              <button 
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-bento-accent hover:brightness-110 disabled:opacity-50 text-zinc-950 font-bold p-2 rounded transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all border border-bento-border",
          isOpen ? "bg-zinc-800 rotate-90" : "bg-bento-accent"
        )}
      >
        {isOpen ? <Minimize2 className="text-white" /> : <MessageSquare className={cn(isOpen ? "text-white" : "text-zinc-950")} />}
      </motion.button>
    </div>
  );
}
