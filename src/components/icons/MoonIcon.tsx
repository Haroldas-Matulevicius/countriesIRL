import { motion, useAnimation } from 'motion/react';
import type { HTMLAttributes, MouseEvent } from 'react';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';

/**
 * Vendored animated icon — lucide `moon`, in the shape of
 * `themely/src/components/ui/search.tsx` (read in full 2026-08-06).
 *
 * **Translated, never copied.** The upstream exemplar is Tailwind; this repo has
 * no Tailwind, so a copied `className` string would produce an element that
 * looks wired up and renders unstyled (P-5). Sizing comes from the `size` prop,
 * colour from `currentColor`, and everything else from CSS custom properties.
 *
 * Consumer: the HUD footer theme toggle, dark mode. On hover the glyph rocks the crescent.
 *
 * Attaching a ref flips `isControlledRef`, so the icon's own self-hover defers
 * to the parent row — ref-driven and hover-driven modes never fight. The rail
 * row gates `startAnimation()` on reduced motion; `stopAnimation()` is
 * unconditional.
 */
export interface MoonIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

export interface MoonIconProps extends HTMLAttributes<HTMLSpanElement> {
  size?: number;
}

const MOON_VARIANTS = {
  normal: { rotate: 0 },
  animate: { rotate: [0, -18, 0] },
};

export const MoonIcon = forwardRef<MoonIconHandle, MoonIconProps>(function MoonIcon(
  { onMouseEnter, onMouseLeave, className, size = 20, ...props },
  ref,
) {
  const controls = useAnimation();
  const isControlledRef = useRef(false);

  useImperativeHandle(ref, (): MoonIconHandle => {
    isControlledRef.current = true;

    return {
      startAnimation: (): void => {
        void controls.start('animate');
      },
      stopAnimation: (): void => {
        void controls.start('normal');
      },
    };
  });

  const handleMouseEnter = useCallback(
    (event: MouseEvent<HTMLSpanElement>): void => {
      if (isControlledRef.current) {
        onMouseEnter?.(event);
      } else {
        void controls.start('animate');
      }
    },
    [controls, onMouseEnter],
  );

  const handleMouseLeave = useCallback(
    (event: MouseEvent<HTMLSpanElement>): void => {
      if (isControlledRef.current) {
        onMouseLeave?.(event);
      } else {
        void controls.start('normal');
      }
    },
    [controls, onMouseLeave],
  );

  return (
    <span
      className={className === undefined ? 'icon-glyph' : `icon-glyph ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <motion.svg
        animate={controls}
        aria-hidden="true"
        fill="none"
        focusable="false"
        height={size}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        // vendored from lucide-animated; strokeWidth patched 2→1.5 (house icon recipe) — re-vendoring overwrites this patch
        strokeWidth={1.5}
        transition={{ duration: 1, bounce: 0.3 }}
        variants={MOON_VARIANTS}
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
      </motion.svg>
    </span>
  );
});
