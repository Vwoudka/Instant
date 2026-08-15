import React from 'react';
import styled from 'styled-components';

const Svg = styled.svg`
  display: block;
`;

const Arc = styled.circle`
  transition: stroke-dashoffset 0.7s cubic-bezier(0.4, 0, 0.2, 1);
`;

// Radial gauge: draws a background ring plus a neon progress arc whose offset
// transitions smoothly whenever the value changes.
export default function Gauge({ value, max, color, size = 132, stroke = 11 }) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value / max));
  const offset = circumference * (1 - pct);
  const center = size / 2;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke="rgba(127, 127, 255, 0.10)"
        strokeWidth={stroke}
      />
      <Arc
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />
    </Svg>
  );
}
