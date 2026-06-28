import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/Card';
import { useStore } from '../../store/useStore';
import useMLStore from '../../store/useMLStore';
import { getFlareInsight } from '../../services/groqService';
import { Sparkles, Activity, RefreshCw } from 'lucide-react';

export function GroqInsightPanel() {
  const { demoActive, activeAlert, latestInsight } = useStore();
  const neupertResult = useMLStore(state => state.neupertResult);
  
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentInsight, setCurrentInsight] = useState('');

  const prevAlertId = useRef(activeAlert?.id);
  const prevNeupertConfirmed = useRef(neupertResult?.confirmed);

  const fetchInsight = async () => {
    setIsLoading(true);
    setDisplayedText('');
    setIsTyping(false);
    
    // Get latest data directly from stores to avoid stale closures
    const mlStoreState = useMLStore.getState();
    const storeState = useStore.getState();
    
    const latestSolexs = mlStoreState.solexsLive[mlStoreState.solexsLive.length - 1];
    const flux = latestSolexs?.flux || 1e-8;
    const forecastProbs = mlStoreState.mlForecast || {};
    
    // Get most complex active region (sorted by area)
    const sortedRegions = [...(storeState.activeRegions || [])].sort((a, b) => (b.area || 0) - (a.area || 0));
    const activeRegion = sortedRegions[0];

    const result = await getFlareInsight({
      flux: flux.toExponential(2),
      forecastProbs,
      neupert: mlStoreState.neupertResult,
      activeRegions: activeRegion
    });

    setCurrentInsight(result);
    setIsLoading(false);
  };

  // Trigger conditions for API call
  useEffect(() => {
    if (demoActive) return;
    
    let shouldFetch = false;
    
    if (activeAlert?.id !== prevAlertId.current) {
      shouldFetch = true;
      prevAlertId.current = activeAlert?.id;
    }
    
    if (neupertResult?.confirmed === true && prevNeupertConfirmed.current !== true) {
      shouldFetch = true;
      prevNeupertConfirmed.current = true;
    } else if (neupertResult?.confirmed === false) {
      prevNeupertConfirmed.current = false;
    }

    if (shouldFetch) {
      fetchInsight();
    }
  }, [activeAlert?.id, neupertResult?.confirmed, demoActive]);

  // Initial fetch on mount
  useEffect(() => {
    if (!demoActive && !currentInsight) {
      fetchInsight();
    }
  }, []);

  const defaultInsight = "Aditya-L1 payloads are operating nominally. Current solar activity is moderate. The ensemble models indicate a stable baseline for the next 6-12 hours.";
  
  // Choose text based on mode
  const textToType = demoActive ? (latestInsight || defaultInsight) : (currentInsight || defaultInsight);

  // Typewriter effect
  useEffect(() => {
    if (isLoading || !textToType) return;
    
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
  }, [textToType, isLoading]);

  return (
    <Card className="flex flex-col h-full bg-[#1A0B2E]/40 border-purple-900/30" p={3}>
      <div className="flex justify-between items-center mb-3 shrink-0 px-1">
        <div className="flex items-center gap-2 text-purple-400">
          <Sparkles className="w-4 h-4" />
          <h3 className="font-display text-sm tracking-wider font-bold">GROQ AI INSIGHT</h3>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchInsight}
            disabled={isLoading || demoActive}
            className="p-1 hover:bg-purple-900/40 rounded transition-colors disabled:opacity-50"
            title="Refresh Analysis"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-purple-900/20 border border-purple-500/30 rounded text-[9px] font-mono text-purple-300 uppercase">
            {isLoading ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                <span>ANALYZING...</span>
              </>
            ) : isTyping ? (
              <>
                <Activity className="w-3 h-3" />
                <span>TYPING...</span>
              </>
            ) : (
              <>
                <Activity className="w-3 h-3" />
                <span>LIVE</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar relative px-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <span className="font-mono text-[10px] text-purple-400/60 animate-pulse">GENERATING LLaMA-3 INSIGHTS...</span>
          </div>
        ) : (
          <p className="font-mono text-[11px] leading-relaxed text-text-secondary">
            {displayedText}
            {isTyping && (
              <span className="inline-block w-1.5 h-3 ml-1 bg-purple-400 animate-pulse" />
            )}
          </p>
        )}
      </div>

      <div className="mt-2 pt-2 border-t-[0.5px] border-purple-900/50 flex justify-between shrink-0 px-1">
        <span className="font-mono text-[9px] text-purple-400/60">MODEL: LLaMA-3-70B</span>
        <span className="font-mono text-[9px] text-purple-400/60">GROQ INFERENCE</span>
      </div>
    </Card>
  );
}
