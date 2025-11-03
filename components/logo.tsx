"use client";

import * as React from "react";

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export function Logo({ size = 28, className, ...props }: LogoProps) {
  // Монохромный логотип: угловые скобки и изогнутая катана, все через currentColor
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Левая скобка «<» */}
      <path
        d="M16 32 L26 22 M16 32 L26 42"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Правая скобка «>» */}
      <path
        d="M48 32 L38 22 M48 32 L38 42"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Катана по диагонали с легким изгибом */}
      <g transform="rotate(-18 32 32)">
        {/* Рукоять с ромбовыми вставками */}
        <rect x="18" y="28" width="12" height="8" rx="3" fill="currentColor" />
        <g fill="none" stroke="white" strokeWidth="1.2" opacity="0.9">
          <path d="M20 30 l2 2 l-2 2 l-2 -2 Z" />
          <path d="M24 30 l2 2 l-2 2 l-2 -2 Z" />
        </g>
        {/* Гарда */}
        <rect x="30.5" y="28" width="3.5" height="8" rx="1.75" fill="currentColor" />
        {/* Клинок с кривой (Bezier) */}
        <path
          d="M34 32 C 40 30, 46 29, 54 31"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Тонкая линия кромки */}
        <path
          d="M35 33 C 41 31, 46.5 30, 54 32"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.7"
        />
      </g>
    </svg>
  );
}


