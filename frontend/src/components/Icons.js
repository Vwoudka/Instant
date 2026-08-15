import React from 'react';

const Svg = ({ children, size = 20, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {children}
  </svg>
);

export const BoltIcon = (p) => (
  <Svg {...p}><path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2z" /></Svg>
);

export const LogoIcon = BoltIcon;

export const WaveIcon = (p) => (
  <Svg {...p}><path d="M2 12h3l2-7 4 14 3-10 2 3h6" /></Svg>
);

export const ZapIcon = (p) => (
  <Svg {...p}><path d="M4 14h6v8l10-12h-6V2L4 14z" /></Svg>
);

export const PulseIcon = (p) => (
  <Svg {...p}><path d="M2 12h4l3-8 4 16 3-8h6" /></Svg>
);

export const WarningIcon = (p) => (
  <Svg {...p}>
    <path d="M12 3 1.5 20h21L12 3z" />
    <path d="M12 9v5" />
    <path d="M12 17.5h.01" />
  </Svg>
);

export const SunIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
);

export const MoonIcon = (p) => (
  <Svg {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></Svg>
);

export const PlugIcon = (p) => (
  <Svg {...p}>
    <path d="M9 2v6M15 2v6M7 8h10v3a5 5 0 0 1-10 0V8z" />
    <path d="M12 16v6" />
  </Svg>
);
