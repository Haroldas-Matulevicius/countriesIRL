import { motion, useAnimation } from 'motion/react';
import type { HTMLAttributes, MouseEvent } from 'react';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';

/**
 * Vendored animated icon — lucide `droplet`, in the shape of
 * `themely/src/components/ui/search.tsx` (the same exemplar every glyph in this
 * directory follows).
 *
 * **Translated, never copied.** The upstream exemplar is Tailwind; this repo has
 * no Tailwind, so a copied `className` string would produce an element that
 * looks wired up and renders unstyled (P-5). Sizing comes from the `size` prop,
 * colour from `currentColor`, and everything else from CSS custom properties.
 *
 * Consumer: the `map-style` rail row (D4-07). On hover the drop falls a little.
 * Chosen over `paintbrush`, which collides conceptually with `palette` on the
 * neighbouring `colors` row, and over `sliders`, which reads as "settings"
 * rather than "appearance" (`04-UI-SPEC.md § 6.1`, `[ASSUMED]` — the owner did
 * not decide the glyph).
 *
 * Attaching a ref flips `isControlledRef`, so the icon's own self-hover defers
 * to the parent row — ref-driven and hover-driven modes never fight. The rail
 * row gates `startAnimation()` on reduced motion; `stopAnimation()` is
 * unconditional.
 */
export interface DropletIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

export interface DropletIconProps extends HTMLAttributes<HTMLSpanElement> {
  size?: number;
}

const DROPLET_VARIANTS = {
  normal: { y: 0 },
  animate: { y: [0, 2, 0] },
};

export const DropletIcon = forwardRef<DropletIconHandle, DropletIconProps>(function DropletIcon(
  { onMouseEnter, onMouseLeave, className, size = 20, ...props },
  ref,
) {
  const controls = useAnimation();
  const isControlledRef = useRef(false);

  useImperativeHandle(ref, (): DropletIconHandle => {
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
        variants={DROPLET_VARIANTS}
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
          <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
      </motion.svg>
    </span>
  );
});
