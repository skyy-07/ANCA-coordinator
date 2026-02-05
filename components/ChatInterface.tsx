import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, User, Bot, AlertTriangle } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { ChatMessage, WorldState, DisasterType } from '../types';
import { SYSTEM_INSTRUCTION } from '../constants';

interface ChatInterfaceProps {
  worldState: WorldState;
  disasterType: DisasterType;
  severity: number;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ worldState, disasterType, severity }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      if (!process.env.API_KEY) {
         throw new Error("API_KEY environment variable is not set. Please ensure the app is running in an environment with the Gemini API key configured.");
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Construct the context-aware prompt
      const currentContext = `
      CURRENT SCENARIO: ${disasterType} (Severity: ${severity}/10).
      
      [SYSTEM DATA INJECTION]
      Current World Graph State: ${JSON.stringify(worldState, null, 2)}
      
      User Query: ${userMessage.content}
      
      Analyze the graph state changes and the user query.
      If the infrastructure is damaged, prioritize resilient routing over speed.
      `;

      // We use chat history for context, but inject the current state as the latest context
      // Note: In a real app, we might prune history or summarize it to fit context window.
      // Here we reconstruct the chat history for the model.
      
      // Since generateContent is stateless, we could use chat mode, but managing state updates 
      // in chat history is tricky. The prompt suggests wrapping the new query with current state.
      // A robust way for this specific "Coordinator" style is to treat each turn as fresh with history provided.
      
      // Let's use the chat API but we must be careful. If we just append messages, the model won't know the state *changed* between turns unless we tell it.
      // Simpler approach for this demo: Send history as text in the prompt + current state.
      // OR use chat.sendMessage and preface the user's message with the state update.
      
      // Method: Chat API with State Injection on every turn.
      
      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
            systemInstruction: SYSTEM_INSTRUCTION
        },
        history: messages.map(m => ({
            role: m.role,
            parts: [{ text: m.content }]
        }))
      });

      const response = await chat.sendMessage({
        message: currentContext
      });

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: response.text,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect to ANCA Core.");
      // Add error as a system message visually
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: `**System Error:** ${err.message || "Unknown error occurred."}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-700">
      <div className="p-4 border-b border-slate-700 bg-slate-800/50">
        <h2 className="text-xl font-bold flex items-center gap-2 text-blue-400">
            <Bot className="w-6 h-6" />
            ANCA Terminal
        </h2>
        <p className="text-xs text-slate-400 mt-1">Autonomous NGO Coordination AI // Human-in-the-Loop Protocol Active</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
        {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50">
                <Bot className="w-16 h-16 mb-4" />
                <p>Awaiting coordination command...</p>
            </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
             <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`p-3 rounded-lg text-sm leading-relaxed shadow-md ${
                    msg.role === 'user' 
                    ? 'bg-blue-600/20 border border-blue-500/30 text-blue-100' 
                    : 'bg-slate-800 border border-slate-700 text-slate-200'
                }`}>
                    <ReactMarkdown 
                        components={{
                            strong: ({node, ...props}) => <span className="font-bold text-yellow-400" {...props} />,
                            p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-2" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-2" {...props} />,
                        }}
                    >
                        {msg.content}
                    </ReactMarkdown>
                </div>
             </div>
          </div>
        ))}
        {isLoading && (
             <div className="flex justify-start">
                <div className="flex gap-3 max-w-[85%]">
                     <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 animate-pulse">
                        <Bot size={16} />
                     </div>
                     <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                        <span className="text-xs text-slate-400">Analyzing graph metrics & ethical constraints...</span>
                     </div>
                </div>
             </div>
        )}
        {error && !isLoading && (
            <div className="flex justify-center my-2">
                <div className="bg-red-900/50 border border-red-500/50 text-red-200 text-xs px-3 py-1 rounded-full flex items-center gap-2">
                    <AlertTriangle size={12} />
                    {error}
                </div>
            </div>
        )}
      </div>

      <div className="p-4 bg-slate-800/30 border-t border-slate-700">
        <div className="relative">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter coordination command or query..."
                className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-500"
                disabled={isLoading}
            />
            <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
