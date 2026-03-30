'use client';

import { useState, useEffect } from 'react';

const stages = [
  'Calculating power input...',
  'Estimating kLa via van\'t Riet...',
  'Computing mixing times...',
  'Evaluating heat removal...',
  'Assessing scale-up risks...',
];

/**
 * Total duration (ms) the animation plays before calling onComplete.
 * Tweak this single number to change the wait time.
 */
export const ANALYZING_DURATION_MS = 5000;

interface AnalyzingAnimationProps {
  onComplete: () => void;
  duration?: number;
}

export default function AnalyzingAnimation({
  onComplete,
  duration = ANALYZING_DURATION_MS,
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
        {/* Animated vessel */}
        <div className="mb-8 flex justify-center">
          <svg width="120" height="180" viewBox="0 0 120 180">
            {/* Vessel */}
            <rect x="25" y="20" width="70" height="130" rx="4" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" />
            {/* Liquid */}
            <rect x="26" y="70" width="68" height="79" rx="3" fill="var(--text-grad-accent-start)" opacity="0.08" />
            {/* Impeller shaft */}
            <line x1="60" y1="5" x2="60" y2="110" stroke="var(--text-secondary)" strokeWidth="1.5" />
            {/* Motor */}
            <rect x="50" y="5" width="20" height="15" rx="3" fill="none" stroke="var(--text-secondary)" strokeWidth="1.2" />
            {/* Impeller blades - rotating */}
            <g className="animate-spin" style={{ transformOrigin: '60px 95px', animationDuration: '2s' }}>
              <rect x="37" y="91" width="10" height="8" rx="1" fill="none" stroke="var(--text-grad-accent-start)" strokeWidth="1.2" />
              <rect x="73" y="91" width="10" height="8" rx="1" fill="none" stroke="var(--text-grad-accent-start)" strokeWidth="1.2" />
            </g>
            {/* Bubbles */}
            <circle cx="50" cy="120" r="2" fill="var(--text-grad-accent-start)" opacity="0.3">
              <animate attributeName="cy" values="120;80;70" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0.5;0" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="65" cy="125" r="1.5" fill="var(--text-grad-accent-start)" opacity="0.3">
              <animate attributeName="cy" values="125;85;75" dur="1.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0.5;0" dur="1.8s" repeatCount="indefinite" />
            </circle>
            <circle cx="55" cy="130" r="2.5" fill="var(--text-grad-accent-start)" opacity="0.2">
              <animate attributeName="cy" values="130;90;80" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.2;0.4;0" dur="2s" repeatCount="indefinite" />
            </circle>
            {/* Data readout lines */}
            <g opacity="0.4">
              <line x1="100" y1="50" x2="115" y2="50" stroke="var(--text-muted)" strokeWidth="0.8" />
              <line x1="100" y1="80" x2="115" y2="80" stroke="var(--text-muted)" strokeWidth="0.8" />
              <line x1="100" y1="110" x2="115" y2="110" stroke="var(--text-muted)" strokeWidth="0.8" />
            </g>
          </svg>
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
