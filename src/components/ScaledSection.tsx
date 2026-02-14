// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - ScaledSection Component
// Wraps a section with CSS transform: scale() while adjusting layout dimensions
// ═══════════════════════════════════════════════════════════════════════════════

import { useRef, useState, useEffect, type ReactNode } from 'react';

interface ScaledSectionProps {
  scale: number;
  children: ReactNode;
  className?: string;
  /** For sections with known fixed dimensions, skip ResizeObserver */
  fixedWidth?: number;
  fixedHeight?: number;
  /** Transform origin. Default: 'top left' */
  origin?: string;
}

export function ScaledSection({
  scale,
  children,
  className,
  fixedWidth,
  fixedHeight,
  origin = 'top left',
}: ScaledSectionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState({ width: 0, height: 0 });

  useEffect(() => {
    // Skip measurement if fixed dimensions provided
    if (fixedWidth !== undefined && fixedHeight !== undefined) return;

    const el = contentRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setMeasured({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fixedWidth, fixedHeight]);

  const baseWidth = fixedWidth ?? measured.width;
  const baseHeight = fixedHeight ?? measured.height;

  // Only constrain dimensions when we have known sizes
  const hasFixedWidth = fixedWidth !== undefined;
  const hasFixedHeight = fixedHeight !== undefined;

  return (
    <div
      className={className}
      style={{
        ...(hasFixedWidth ? { width: baseWidth * scale } : {}),
        ...(hasFixedHeight ? { height: baseHeight * scale } : {}),
        overflow: 'visible',
      }}
    >
      <div
        ref={contentRef}
        style={{
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: origin,
          willChange: scale !== 1 ? 'transform' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
