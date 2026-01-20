
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles, Zap } from 'lucide-react';
import { aiService } from '../services/aiService';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: number;
}

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Protocol initialized. How can I assist with your supply chain query today?',
      isBot: true,
      timestamp: Date.now()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      text: input,
      isBot: false,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const response = await aiService.ask(input);
    
    const botMsg: Message = {
      id: Math.random().toString(),
      text: response || "Protocol timeout. Please resend.",
      isBot: true,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, botMsg]);
    setIsTyping(false);
  };

  return (
    <div className="fixed bottom-10 right-10 z-[1000] flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-6 w-[24rem] sm:w-[28rem] h-[36rem] glass-card rounded-[3rem] overflow-hidden flex flex-col shadow-[0_50px_100px_rgba(0,0,0,0.2)] border border-white animate-spring">
          {/* Header */}
          <div className="p-8 bg-gray-900 text-white flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="bg-green-500 p-2.5 rounded-2xl shadow-[0_0_20px_rgba(34,197,94,0.5)]">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-black uppercase tracking-tighter text-lg leading-none">AgriChain AI</h3>
                <div className="flex items-center space-x-1.5 mt-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Low Latency Lite Node</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-3 hover:bg-white/10 rounded-2xl transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Messages Area */}
          <div 
            ref={scrollRef}
            className="flex-grow overflow-y-auto p-8 space-y-6 bg-gray-50/30 scroll-smooth"
          >
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[85%] p-5 rounded-[2rem] text-sm font-semibold leading-relaxed shadow-sm ${
                  msg.isBot 
                    ? 'bg-white text-gray-800 rounded-tl-none border border-gray-100' 
                    : 'bg-green-600 text-white rounded-tr-none shadow-green-100 shadow-xl'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white p-5 rounded-[2rem] rounded-tl-none border border-gray-100 shadow-sm flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-6 bg-white border-t border-gray-50">
            <div className="relative group">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask the protocol..."
                className="w-full px-8 py-5 bg-gray-50 border border-transparent focus:border-green-500 focus:bg-white rounded-[1.8rem] outline-none transition-all font-bold text-gray-800 pr-20 shadow-inner"
              />
              <button 
                type="submit"
                disabled={!input.trim() || isTyping}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-4 bg-gray-900 text-white rounded-2xl hover:bg-black transition-all active:scale-90 disabled:opacity-20"
              >
                <Send size={20} />
              </button>
            </div>
            <p className="mt-4 text-[9px] text-center font-black text-gray-300 uppercase tracking-widest italic flex items-center justify-center space-x-2">
              <Zap size={10} className="text-yellow-400" />
              <span>Powered by Gemini 2.5 Flash-Lite</span>
            </p>
          </form>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`p-7 rounded-full shadow-[0_20px_50px_rgba(34,197,94,0.3)] transition-all duration-500 flex items-center justify-center hover:scale-110 active:scale-90 group relative
          ${isOpen ? 'bg-gray-900 text-white rotate-90' : 'bg-green-600 text-white hover:bg-green-700'}
        `}
      >
        {isOpen ? <X size={32} /> : <MessageSquare size={32} className="group-hover:rotate-12 transition-transform" />}
        {!isOpen && (
           <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-lg border-2 border-white animate-bounce">
              AI
           </div>
        )}
      </button>
    </div>
  );
};

export default ChatBot;
