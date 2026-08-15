"use client";
import React from "react";

export default function Pillory({ occupants }) {
  const n = Math.max(1, occupants.length);
  const SLOT = 96;
  const W = 36 + n * SLOT;
  const H = 178;

  const rand = (a, b) => {
    const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="pillory"
      role="img"
      aria-label={`The stocks holding ${occupants.map((o) => o.name).join(", ")}`}
    >
      <rect x="6" y="32" width="12" height="118" fill="#3E2F1E" />
      <rect x={W - 18} y="32" width="12" height="118" fill="#3E2F1E" />

      {occupants.map((o, i) => {
        const cx = 18 + SLOT * i + SLOT / 2;
        return (
          <g key={`f-${o.name}`}>
            <circle cx={cx} cy={48} r="15" fill="#E7DCC4" opacity="0.92" />
            <circle cx={cx - 5.5} cy={45} r="1.9" fill="#12100C" />
            <circle cx={cx + 5.5} cy={45} r="1.9" fill="#12100C" />
            <path
              d={`M${cx - 6} 56 Q${cx} 51 ${cx + 6} 56`}
              stroke="#12100C" strokeWidth="1.7" fill="none" strokeLinecap="round"
            />
            <circle cx={cx - 31} cy={51} r="7.5" fill="#E7DCC4" opacity="0.92" />
            <circle cx={cx + 31} cy={51} r="7.5" fill="#E7DCC4" opacity="0.92" />
            <rect x={cx - 13} y={86} width="26" height="56" rx="4" fill="#4A3A24" />
          </g>
        );
      })}

      <rect x="12" y="60" width={W - 24} height="25" rx="2" fill="#5A452C" />
      <rect x="12" y="60" width={W - 24} height="5" fill="#6E5638" opacity="0.6" />
      {occupants.map((o, i) => {
        const cx = 18 + SLOT * i + SLOT / 2;
        return (
          <g key={`h-${o.name}`}>
            <circle cx={cx} cy={72.5} r="14" fill="#12100C" />
            <circle cx={cx - 31} cy={72.5} r="8.5" fill="#12100C" />
            <circle cx={cx + 31} cy={72.5} r="8.5" fill="#12100C" />
          </g>
        );
      })}

      {occupants.map((o, i) => {
        const cx = 18 + SLOT * i + SLOT / 2;
        const count = Math.min(o.tomatoes, 22);
        return Array.from({ length: count }, (_, j) => {
          const x = cx - 42 + rand(i + 1, j + 1) * 84;
          const y = 24 + rand(j + 3, i + 7) * 108;
          const r = 3.6 + rand(i + j + 5, j + 2) * 4;
          return (
            <g key={`t-${i}-${j}`} opacity="0.85">
              <circle cx={x} cy={y} r={r} fill="#9E2B25" />
              <circle cx={x + r * 0.8} cy={y + r * 0.5} r={r * 0.45} fill="#B8352E" />
              <circle cx={x - r * 0.7} cy={y - r * 0.4} r={r * 0.3} fill="#7C1F1A" />
            </g>
          );
        });
      })}

      {occupants.map((o, i) => {
        const cx = 18 + SLOT * i + SLOT / 2;
        return (
          <text
            key={`n-${o.name}`} x={cx} y={168} textAnchor="middle"
            fill="#9E2B25" fontSize="12" fontFamily="Cinzel, serif" letterSpacing="1.4"
          >
            {o.name.toUpperCase()}
          </text>
        );
      })}
    </svg>
  );
}

export function Spark({ data, colour }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${28 - ((v - min) / span) * 26}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="spark">
      <polyline points={pts} fill="none" stroke={colour} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
