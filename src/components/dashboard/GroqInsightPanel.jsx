import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { useStore } from '../../store/useStore';
import { Sparkles, Activity } from 'lucide-react';

export function GroqInsightPanel() {
  const { latestInsight, demoActive } = useStore();
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const defaultInsight = "Aditya-L1 payloads are operating nominally. Current solar activity is moderate. The ensemble models indicate a stable baseline for the next 6-12 hours.";
  
  const textToType = latestInsight || defaultInsight;

  useEffect(() => {
    let i = 0;
    setDisplayedText('');
    setIsTyping(true);
    
    const timer = setInterval(() => {
      setDisplayedText(textToType.substring(0, i));
      i++;
      if (i > textToType.length) {
        clearInterval(timer);
        setIsTyping(false);
      }
    }, 20); // 20ms per character

    return () => clearInterval(timer);
  }, [textToType]);

  return (
    <Card className="flex flex-col h-full bg-[#1A0B2E]/40 border-purple-900/30" p={3}>
      <div className="flex justify-between items-center mb-3 shrink-0 px-1">
        <div className="flex items-center gap-2 text-purple-400">
          <Sparkles className="w-4 h-4" />
          <h3 className="font-display text-sm tracking-wider font-bold">GROQ AI INSIGHT</h3>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-purple-900/20 border border-purple-500/30 rounded text-[9px] font-mono text-purple-300 uppercase">
          {isTyping ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
              <span>ANALYZING...</span>
            </>
          ) : (
            <>
              <Activity className="w-3 h-3" />
              <span>LIVE</span>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar relative px-1">
        <p className="font-mono text-[11px] leading-relaxed text-text-secondary">
          {displayedText}
          {isTyping && (
            <span className="inline-block w-1.5 h-3 ml-1 bg-purple-400 animate-pulse" />
          )}
        </p>
      </div>

      <div className="mt-2 pt-2 border-t-[0.5px] border-purple-900/50 flex justify-between shrink-0 px-1">
        <span className="font-mono text-[9px] text-purple-400/60">MODEL: LLaMA-3-70B</span>
        <span className="font-mono text-[9px] text-purple-400/60">LATENCY: ~42ms</span>
      </div>
    </Card>
  );
}
