"use client";

interface BioreactorDiagramProps {
  hd?: number;          // H/D ratio (0.5 – 4.0), undefined = not set
  nImpellers?: number;  // 1 – 4, default 1
  impellerType?: string; // "rushton" | "pitched_blade" | "marine" | "unknown"
  volume?: number;       // L, shown as label
  width?: number;
  animated?: boolean;    // spinning impellers + rising bubbles
}

function renderImpeller(
  type: string,
  cx: number,
  cy: number,
  half: number,
  animated?: boolean,
  index?: number,
) {
  const wrap = (children: React.ReactNode) => {
    if (!animated) return <g key={`imp-${index}`}>{children}</g>;
    return (
      <g key={`imp-${index}`} style={{ transformOrigin: `${cx}px ${cy}px`, animation: `spin 2s linear infinite` }}>
        {children}
      </g>
    );
  };

  switch (type) {
    case "rushton": {
      const bladeH = Math.max(6, half * 0.28);
      const bladeW = Math.max(8, half * 0.38);
      return wrap(
        <>
          <circle cx={cx} cy={cy} r={half * 0.18} fill="none" stroke="var(--text-heading)" strokeWidth="1.2" />
          <rect x={cx - half * 0.95} y={cy - bladeH / 2} width={bladeW} height={bladeH} rx="1" fill="none" stroke="var(--text-heading)" strokeWidth="1.1" />
          <rect x={cx + half * 0.95 - bladeW} y={cy - bladeH / 2} width={bladeW} height={bladeH} rx="1" fill="none" stroke="var(--text-heading)" strokeWidth="1.1" />
        </>
      );
    }

    case "pitched_blade": {
      const tilt = half * 0.35;
      return wrap(
        <>
          <line x1={cx - half * 0.9} y1={cy - tilt * 0.5} x2={cx - half * 0.15} y2={cy + tilt * 0.5} stroke="var(--text-heading)" strokeWidth="2" strokeLinecap="round" />
          <line x1={cx + half * 0.15} y1={cy + tilt * 0.5} x2={cx + half * 0.9} y2={cy - tilt * 0.5} stroke="var(--text-heading)" strokeWidth="2" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r={2.5} fill="var(--text-heading)" />
        </>
      );
    }

    case "marine": {
      return wrap(
        <>
          <ellipse cx={cx - half * 0.48} cy={cy} rx={half * 0.38} ry={half * 0.14} fill="none" stroke="var(--text-heading)" strokeWidth="1.2" transform={`rotate(-25 ${cx - half * 0.48} ${cy})`} />
          <ellipse cx={cx + half * 0.48} cy={cy} rx={half * 0.38} ry={half * 0.14} fill="none" stroke="var(--text-heading)" strokeWidth="1.2" transform={`rotate(25 ${cx + half * 0.48} ${cy})`} />
          <circle cx={cx} cy={cy} r={2.5} fill="var(--text-heading)" />
        </>
      );
    }

    default: {
      return wrap(
        <>
          <line x1={cx - half * 0.9} y1={cy} x2={cx + half * 0.9} y2={cy} stroke="var(--text-heading)" strokeWidth="2" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r={2.5} fill="var(--text-heading)" />
        </>
      );
    }
  }
}

export default function BioreactorDiagram({
  hd = 2.0,
  nImpellers = 1,
  impellerType = "rushton",
  volume,
  width = 180,
  animated = false,
}: BioreactorDiagramProps) {
  const hdClamped = Math.max(0.5, Math.min(4.5, hd));

  // Normalized dimensions
  const tankD = 80;
  const tankH = tankD * hdClamped;
  const pad = 28;
  const svgW = tankD + pad * 2;
  const svgH = tankH + pad * 2 + 18;
  const scaleFactor = width / svgW;

  const wallL = pad;
  const wallR = pad + tankD;
  const wallTop = pad + 14;
  const wallBottom = pad + 14 + tankH;
  const cx = svgW / 2;
  const cornerR = 8;

  // Liquid at 70% fill
  const fillRatio = 0.70;
  const liquidTop = wallBottom - tankH * fillRatio;

  // Impeller diameter ~33% of tank
  const impellerHalf = tankD * 0.33 / 2;

  // Impeller Y positions
  const impellerYs: number[] = [];
  const nClamped = Math.max(1, Math.min(4, nImpellers));
  if (nClamped === 1) {
    impellerYs.push(wallBottom - tankH * 0.30);
  } else {
    const liquidH = wallBottom - liquidTop;
    const spacing = liquidH / (nClamped + 1);
    for (let i = 1; i <= nClamped; i++) {
      impellerYs.push(liquidTop + spacing * i);
    }
  }

  const shaftBottom = impellerYs[impellerYs.length - 1] + 4;

  // Bubble positions — scattered across the liquid zone
  const bubbles = [
    { bx: cx - 18, r: 2.5, dur: "1.4s", delay: "0s" },
    { bx: cx + 12, r: 1.8, dur: "1.7s", delay: "0.3s" },
    { bx: cx - 8,  r: 2.0, dur: "2.0s", delay: "0.6s" },
    { bx: cx + 22, r: 1.5, dur: "1.5s", delay: "0.9s" },
    { bx: cx + 5,  r: 2.2, dur: "1.8s", delay: "0.2s" },
    { bx: cx - 25, r: 1.6, dur: "1.6s", delay: "0.5s" },
  ];

  return (
    <div className="flex flex-col items-center">
      {animated && (
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      )}
      <svg
        width={width}
        height={svgH * scaleFactor}
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ overflow: "visible" }}
      >
        {/* Liquid fill */}
        <clipPath id="vessel-clip">
          <path
            d={`
              M ${wallL + 1} ${wallTop}
              L ${wallL + 1} ${wallBottom}
              Q ${wallL + 1} ${wallBottom + cornerR + 2} ${wallL + cornerR + 2} ${wallBottom + cornerR + 2}
              L ${wallR - cornerR - 2} ${wallBottom + cornerR + 2}
              Q ${wallR - 1} ${wallBottom + cornerR + 2} ${wallR - 1} ${wallBottom}
              L ${wallR - 1} ${wallTop}
              Z
            `}
          />
        </clipPath>
        <rect
          x={wallL + 1}
          y={liquidTop}
          width={tankD - 2}
          height={wallBottom - liquidTop}
          fill="rgba(74,158,142,0.07)"
          clipPath="url(#vessel-clip)"
          className="transition-all duration-500"
        />

        {/* Liquid surface dashed line */}
        <line
          x1={wallL + 3} y1={liquidTop} x2={wallR - 3} y2={liquidTop}
          stroke="var(--accent)" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.45"
          className="transition-all duration-500"
        />

        {/* Vessel walls */}
        <path
          d={`
            M ${wallL} ${wallTop}
            L ${wallL} ${wallBottom}
            Q ${wallL} ${wallBottom + cornerR * 2} ${wallL + cornerR * 2} ${wallBottom + cornerR * 2}
            L ${wallR - cornerR * 2} ${wallBottom + cornerR * 2}
            Q ${wallR} ${wallBottom + cornerR * 2} ${wallR} ${wallBottom}
            L ${wallR} ${wallTop}
          `}
          fill="none" stroke="var(--text-heading)" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" opacity="0.55"
          className="transition-all duration-500"
        />

        {/* Top flanges */}
        <line x1={wallL - 4} y1={wallTop} x2={wallL + 10} y2={wallTop} stroke="var(--text-heading)" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
        <line x1={wallR - 10} y1={wallTop} x2={wallR + 4} y2={wallTop} stroke="var(--text-heading)" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />

        {/* Baffles */}
        <line x1={wallL + 4} y1={wallTop + 6} x2={wallL + 4} y2={wallBottom - 6} stroke="var(--text-heading)" strokeWidth="1" opacity="0.2" />
        <line x1={wallR - 4} y1={wallTop + 6} x2={wallR - 4} y2={wallBottom - 6} stroke="var(--text-heading)" strokeWidth="1" opacity="0.2" />

        {/* Motor box */}
        <rect x={cx - 7} y={wallTop - 16} width={14} height={10} rx="2" fill="none" stroke="var(--text-heading)" strokeWidth="1.2" opacity="0.5" />

        {/* Shaft */}
        <line x1={cx} y1={wallTop - 6} x2={cx} y2={shaftBottom} stroke="var(--text-heading)" strokeWidth="1.4" opacity="0.6" />

        {/* Impellers */}
        {impellerYs.map((y, i) => (
          <g key={i} className="transition-all duration-500">
            {renderImpeller(impellerType, cx, y, impellerHalf, animated, i)}
          </g>
        ))}

        {/* Animated bubbles — only when animated */}
        {animated && bubbles.map((b, i) => (
          <circle
            key={`bubble-${i}`}
            cx={b.bx}
            r={b.r}
            fill="var(--accent)"
            opacity="0"
          >
            <animate attributeName="cy" values={`${wallBottom - 10};${liquidTop + 5}`} dur={b.dur} repeatCount="indefinite" begin={b.delay} />
            <animate attributeName="opacity" values="0.35;0.5;0" dur={b.dur} repeatCount="indefinite" begin={b.delay} />
          </circle>
        ))}

        {/* Sparger ring at bottom */}
        <ellipse
          cx={cx} cy={wallBottom - 6} rx={tankD * 0.22} ry={3}
          fill="none" stroke="var(--text-heading)" strokeWidth="0.9" strokeDasharray="2 2" opacity="0.3"
        />
        <line x1={cx} y1={wallBottom - 3} x2={cx} y2={wallBottom + cornerR * 2} stroke="var(--text-heading)" strokeWidth="0.9" opacity="0.25" />

        {/* H/D annotation */}
        <text
          x={wallR + 10} y={wallTop + tankH / 2}
          fill="var(--text-tertiary)" fontSize="7.5" fontFamily="ui-monospace, monospace"
          dominantBaseline="middle" opacity="0.7"
        >
          H/D {hdClamped.toFixed(1)}
        </text>

        {/* Volume label */}
        {volume !== undefined && (
          <text
            x={cx} y={wallBottom + cornerR * 2 + 12}
            fill="var(--text-tertiary)" fontSize="7.5" fontFamily="ui-monospace, monospace"
            textAnchor="middle" opacity="0.6"
          >
            {volume >= 1000 ? `${(volume / 1000).toFixed(0)} m³` : `${volume} L`}
          </text>
        )}
      </svg>
    </div>
  );
}
