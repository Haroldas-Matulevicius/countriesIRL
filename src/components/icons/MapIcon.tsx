import { motion, useAnimation } from 'motion/react';
import type { HTMLAttributes, MouseEvent } from 'react';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';

/**
 * Vendored animated icon — lucide `map`, in the shape of
 * `themely/src/components/ui/search.tsx` (read in full 2026-08-06).
 *
 * **Translated, never copied.** The upstream exemplar is Tailwind; this repo has
 * no Tailwind, so a copied `className` string would produce an element that
 * looks wired up and renders unstyled (P-5). Sizing comes from the `size` prop,
 * colour from `currentColor`, and everything else from CSS custom properties.
 *
 * Consumer: the HUD header glyph for an unnamed composition, and the saved-map row chip. On hover the glyph breathes once.
 *
 * Attaching a ref flips `isControlledRef`, so the icon's own self-hover defers
 * to the parent row — ref-driven and hover-driven modes never fight. The rail
 * row gates `startAnimation()` on reduced motion; `stopAnimation()` is
 * unconditional.
 */
export interface MapIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

export interface MapIconProps extends HTMLAttributes<HTMLSpanElement> {
  size?: number;
}

const MAP_VARIANTS = {
  normal: { scale: 1 },
  animate: { scale: [1, 1.06, 1] },
};

export const MapIcon = forwardRef<MapIconHandle, MapIconProps>(function MapIcon(
  { onMouseEnter, onMouseLeave, className, size = 20, ...props },
  ref,
) {
  const controls = useAnimation();
  const isControlledRef = useRef(false);

  useImperativeHandle(ref, (): MapIconHandle => {
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
        variants={MAP_VARIANTS}
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
          <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
          <path d="M15 5.764v15" />
          <path d="M9 3.236v15" />
      </motion.svg>
    </span>
  );
});
