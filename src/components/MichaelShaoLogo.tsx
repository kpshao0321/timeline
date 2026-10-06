import React from 'react';

interface LogoProps {
  className?: string;
  size?: number; // base height in px, e.g. 28
}

export const MichaelShaoLogo: React.FC<LogoProps> = ({ className = 'h-7', size = 32 }) => {
  // The monogram spans from x=0 to x=180, y=0 to y=44
  // Stroke-width 2.5 for crisp geometric architectural look
  return (
    <svg
      viewBox="0 0 160 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} text-neutral-900 dark:text-white transition-colors overflow-visible`}
      style={{ height: size, width: 'auto' }}
      aria-label="Michael Shao Logo"
    >
      <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" strokeLinejoin="miter">
        {/* M (x: 4..16, y: 4..20) */}
        <path d="M 4 20 L 4 4 L 10 13 L 16 4 L 16 20" />

        {/* I (x: 23, y: 4..20) */}
        <line x1="23" y1="4" x2="23" y2="20" />

        {/* C (x: 31..45, y: 4..20) */}
        <path d="M 45 4 L 31 4 L 31 20 L 45 20" />

        {/* S (under C, x: 31..45, y: 24..40) */}
        <path d="M 45 24 L 31 24 L 31 32 L 45 32 L 45 40 L 31 40" />

        {/* Tall H (shared by MICHAEL & SHAO, spans y: 4..40, x: 53..67) */}
        <line x1="53" y1="4" x2="53" y2="40" />
        <line x1="67" y1="4" x2="67" y2="40" />
        <line x1="53" y1="22" x2="67" y2="22" />

        {/* Tall A (shared by MICHAEL & SHAO, spans y: 4..40, x: 75..89) */}
        <path d="M 75 40 L 75 4 L 89 4 L 89 40" />
        <line x1="75" y1="22" x2="89" y2="22" />

        {/* E (x: 97..111, y: 4..20) */}
        <path d="M 111 4 L 97 4 L 97 20 L 111 20" />
        <line x1="97" y1="12" x2="108" y2="12" />

        {/* O (under E, x: 97..111, y: 24..40) */}
        <rect x="97" y="24" width="14" height="16" />

        {/* L (x: 119..133, y: 4..20) */}
        <path d="M 119 4 L 119 20 L 133 20" />
      </g>
    </svg>
  );
};
