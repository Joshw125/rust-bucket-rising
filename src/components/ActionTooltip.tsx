// ═══════════════════════════════════════════════════════════════════════════════
// RUST BUCKET RISING - Action Tooltip
// Visible popup for disabled action buttons explaining WHY they're disabled
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// ActionTooltip Component
// ─────────────────────────────────────────────────────────────────────────────

interface ActionTooltipProps {
  lines: string[];
  visible: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
}

function ActionTooltipPopup({ lines, visible, anchorRef }: ActionTooltipProps) {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (visible && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
      });
    }
  }, [visible, anchorRef]);

  if (!visible || lines.length === 0) return null;

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15 }}
          className="fixed z-[10000] pointer-events-none"
          style={{
            left: pos.x,
            top: pos.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-slate-900/95 border border-amber-700/40 rounded-lg px-3 py-2 shadow-xl shadow-black/50 max-w-[240px]">
            {lines.map((line, i) => (
              <div key={i} className="text-[11px] leading-snug text-slate-200 whitespace-nowrap">
                {line}
              </div>
            ))}
            {/* Arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-slate-900/95 border-r border-b border-amber-700/40 rotate-45" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Wrapper: Button with tooltip on hover/tap when disabled
// ─────────────────────────────────────────────────────────────────────────────

interface ActionButtonWithTooltipProps {
  disabled: boolean;
  tooltipLines: string[];
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  title?: string;
}

export function ActionButtonWithTooltip({
  disabled,
  tooltipLines,
  children,
  className,
  onClick,
  title,
}: ActionButtonWithTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleMouseEnter = () => {
    if (disabled && tooltipLines.length > 0) {
      timeoutRef.current = setTimeout(() => setShowTooltip(true), 200);
    }
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowTooltip(false);
  };

  const handleClick = () => {
    if (disabled && tooltipLines.length > 0) {
      // Mobile: toggle tooltip on tap
      setShowTooltip(prev => !prev);
      return;
    }
    onClick?.();
  };

  // Close tooltip on any interaction elsewhere
  useEffect(() => {
    if (!showTooltip) return;
    const close = () => setShowTooltip(false);
    const timer = setTimeout(() => {
      document.addEventListener('click', close, { once: true });
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', close);
    };
  }, [showTooltip]);

  return (
    <>
      <button
        ref={ref}
        className={className}
        onClick={handleClick}
        disabled={false} // Don't disable natively so we can capture clicks
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title={title}
        aria-disabled={disabled}
      >
        {children}
      </button>
      <ActionTooltipPopup lines={tooltipLines} visible={showTooltip} anchorRef={ref} />
    </>
  );
}

export default ActionButtonWithTooltip;
