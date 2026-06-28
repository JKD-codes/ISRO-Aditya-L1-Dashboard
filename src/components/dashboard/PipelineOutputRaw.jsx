import React from 'react';
import { Card } from '../ui/Card';
import { useStore } from '../../store/useStore';

export function PipelineOutputRaw() {
  const { pipelineNowcast } = useStore();

  const detection = pipelineNowcast?.detection || {};
  const isReal = pipelineNowcast?.is_real_data ?? false;
  const color = isReal ? '#00E5A0' : '#FFB347';

  return (
    <Card title="PIPELINE OUTPUT (RAW)" className="flex flex-col h-full justify-center">
      <div className="h-[1px] bg-[rgba(255,107,0,0.15)] w-full mb-3 -mt-2" />
      
      <div className="bg-[#020B18]/80 border border-border-subtle/50 rounded p-2.5 font-mono text-[11px] leading-relaxed flex-1 flex flex-col justify-center select-all">
        <div>
          <span className="text-text-secondary">FLARE_DETECTED:</span>{' '}
          <span style={{ color: detection.flare_detected ? '#00E5A0' : '#FF3B3B' }}>
            {String(detection.flare_detected ?? false).toUpperCase()}
          </span>
        </div>
        <div>
          <span className="text-text-secondary">CLASS:</span>{' '}
          <span className="text-text-primary font-bold">
            {detection.flare_class || 'NONE'}
          </span>
        </div>
        <div>
          <span className="text-text-secondary">NEUPERT_CONFIRMED:</span>{' '}
          <span style={{ color: detection.neupert_confirmed ? '#00E5A0' : '#FF3B3B' }}>
            {String(detection.neupert_confirmed ?? false).toUpperCase()}
          </span>
        </div>
        <div>
          <span className="text-text-secondary">DELAY:</span>{' '}
          <span className="text-text-primary">
            {detection.neupert_delay_minutes != null ? `${detection.neupert_delay_minutes} min` : 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-text-secondary">CONFIDENCE:</span>{' '}
          <span className="text-[#00E5A0] font-bold">
            {detection.confidence_pct != null ? `${detection.confidence_pct.toFixed(1)}%` : '0%'}
          </span>
        </div>
        <div>
          <span className="text-text-secondary">DATA:</span>{' '}
          <span style={{ color }}>
            {isReal ? 'REAL_ADITYA_L1' : 'DEMONSTRATION_DATA'}
          </span>
        </div>
      </div>
    </Card>
  );
}
