"use client";

import type * as React from "react";
import { useEffect, useState } from "react";

export function BackgroundLogo() {
  const [svgContent, setSvgContent] = useState<string>("");

  useEffect(() => {
    fetch("/CodeSensei.svg")
      .then((res) => res.text())
      .then((text) => {
        const colored = text
          .replace(/fill="[^"]*"/g, 'fill="currentColor"')
          .replace(/stroke="[^"]*"/g, 'stroke="currentColor"')
          .replace(/<svg([^>]*)>/, '<svg$1 width="100%" height="100%" preserveAspectRatio="xMinYMin meet">');
        setSvgContent(colored);
      })
      .catch((err) => console.error("Failed to load background SVG logo:", err));
  }, []);

  if (!svgContent) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 text-primary opacity-[0.06] dark:opacity-[0.09] select-none overflow-hidden">
      <div
        className="absolute top-0 left-0 w-[400vw] h-[400vh] flex items-start justify-start [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
}
