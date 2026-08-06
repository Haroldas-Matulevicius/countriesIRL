import { motion, useAnimation } from 'motion/react';
import type { HTMLAttributes, MouseEvent } from 'react';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';

/**
 * Vendored animated icon — lucide `folder`, in the shape of
 * `themely/src/components/ui/search.tsx` (read in full 2026-08-06).
 *
 * **Translated, never copied.** The upstream exemplar is Tailwind; this repo has
 * no Tailwind, so a copied `className` string would produce an element that
 * looks wired up and renders unstyled (P-5). Sizing comes from the `size` prop,
 * colour from `currentColor`, and everything else from CSS custom properties.
 *
 * Consumer: the `saved` rail row. On hover the glyph opens with a small tilt.
 *
 * Attaching a ref flips `isControlledRef`, so the icon's own self-hover defers
 * to the parent row — ref-driven and hover-driven modes never fight. The rail
 * row gates `startAnimation()` on reduced motion; `stopAnimation()` is
 * unconditional.
 */
export interface FolderIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

export interface FolderIconProps extends HTMLAttributes<HTMLSpanElement> {
  size?: number;
}

const FOLDER_VARIANTS = {
  normal: { rotate: 0, y: 0 },
  animate: { rotate: [0, -4, 0], y: [0, -1.5, 0] },
};

export const FolderIcon = forwardRef<FolderIconHandle, FolderIconProps>(function FolderIcon(
  { onMouseEnter, onMouseLeave, className, size = 20, ...props },
  ref,
) {
  const controls = useAnimation();
  const isControlledRef = useRef(false);

  useImperativeHandle(ref, (): FolderIconHandle => {
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
        variants={FOLDER_VARIANTS}
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
          <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
      </motion.svg>
    </span>
  );
});
