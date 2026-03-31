'use client';

import { useState, useEffect } from 'react';
import BioreactorDiagram from '@/components/BioreactorDiagram';

const stages = [
  'Calculating power input...',
  'Estimating kLa via van\'t Riet...',
  'Computing mixing times...',
  'Evaluating heat removal...',
  'Assessing scale-up risks...',
];

/**
 * Total duration (ms) the animation plays before calling onComplete.
 */
export const ANALYZING_DURATION_MS = 5000;

interface AnalyzingAnimationProps {
  onComplete: () => void;
  duration?: number;
  hd?: number;
  nImpellers?: number;
  impellerType?: string;
  volume?: number;
}

export default function AnalyzingAnimation({
  onComplete,
  duration = ANALYZING_DURATION_MS,
  hd = 2.0,
  nImpellers = 1,
  impellerType = 'rushton',
  volume,
}: AnalyzingAnimationProps) {
  const [stage, setStage] = useState(0);
  const [started, setStarted] = useState(false);

  const stageInterval = duration / stages.length;

  // Trigger CSS transition on next frame
  useEffect(() => {
    requestAnimationFrame(() => setStarted(true));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setStage((s) => {
        const next = s + 1;
        if (next >= stages.length) {
          clearInterval(interval);
          return s;
        }
        return next;
      });
    }, stageInterval);
    return () => clearInterval(interval);
  }, [stageInterval]);

  // Fire onComplete after duration
  useEffect(() => {
    const timer = setTimeout(onComplete, duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="text-center">
        {/* Live bioreactor diagram using user's actual inputs */}
        <div className="mb-8">
          <BioreactorDiagram
            hd={hd}
            nImpellers={nImpellers}
            impellerType={impellerType}
            volume={volume}
            width={160}
            animated
          />
        </div>

        <h3 className="text-lg font-semibold mb-3 text-silver-100">
          Analysing Scale-Up
        </h3>
        <p
          className="text-sm font-mono transition-opacity duration-300 text-accent"
          key={stage}
        >
          {stages[stage]}
        </p>

        {/* Progress bar */}
        <div className="mt-6 w-48 mx-auto">
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--range-track)' }}>
            <div
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, var(--text-grad-accent-start), var(--text-grad-accent-end))',
                width: started ? '100%' : '0%',
                transition: `width ${duration}ms linear`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
