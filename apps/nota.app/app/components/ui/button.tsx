import * as React from 'react';
import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import {
  gsap,
  NOTA_BUTTON_PRESS_S,
  NOTA_BUTTON_RELEASE_S,
  NOTA_MOTION_EASE_OUT,
  usePrefersReducedMotion,
} from '@/lib/nota-motion';

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-xs/relaxed font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/80',
        outline:
          'border-border hover:bg-input/50 hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:bg-input/30',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        ghost:
          'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50',
        destructive:
          'bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default:
          "h-7 gap-1 px-2 text-xs/relaxed has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        xs: "h-5 gap-1 rounded-sm px-2 text-[0.625rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-2.5",
        sm: "h-6 gap-1 px-2 text-xs/relaxed has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        lg: "h-8 gap-1 px-2.5 text-xs/relaxed has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-4",
        icon: "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        'icon-xs': "size-5 rounded-sm [&_svg:not([class*='size-'])]:size-2.5",
        'icon-sm': "size-6 [&_svg:not([class*='size-'])]:size-3",
        'icon-lg': "size-8 [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function mergeButtonRefs<T extends HTMLElement>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref && 'current' in ref) {
        (ref as React.MutableRefObject<T | null>).current = node;
      }
    }
  };
}

const Button = React.forwardRef(function Button(
  {
    className,
    variant = 'default',
    size = 'default',
    disabled,
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onPointerLeave,
    ...props
  }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>,
  forwardedRef: React.ForwardedRef<HTMLElement>,
) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const motionRef = React.useRef<HTMLElement | null>(null);

  const releasePress = React.useCallback(() => {
    const el = motionRef.current;
    if (!el || prefersReducedMotion) {
      return;
    }
    gsap.to(el, {
      scale: 1,
      duration: NOTA_BUTTON_RELEASE_S,
      ease: NOTA_MOTION_EASE_OUT,
      overwrite: 'auto',
    });
  }, [prefersReducedMotion]);

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      onPointerDown?.(e);
      if (e.defaultPrevented || prefersReducedMotion || disabled) {
        return;
      }
      if (e.button !== 0) {
        return;
      }
      const el = motionRef.current;
      if (!el) {
        return;
      }
      gsap.to(el, {
        scale: 0.97,
        duration: NOTA_BUTTON_PRESS_S,
        ease: NOTA_MOTION_EASE_OUT,
        overwrite: 'auto',
      });
    },
    [disabled, onPointerDown, prefersReducedMotion],
  );

  const handlePointerUp = React.useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      onPointerUp?.(e);
      releasePress();
    },
    [onPointerUp, releasePress],
  );

  const handlePointerLeave = React.useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      onPointerLeave?.(e);
      releasePress();
    },
    [onPointerLeave, releasePress],
  );

  const handlePointerCancel = React.useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      onPointerCancel?.(e);
      releasePress();
    },
    [onPointerCancel, releasePress],
  );

  return (
    <ButtonPrimitive
      ref={mergeButtonRefs(forwardedRef, motionRef)}
      data-slot="button"
      disabled={disabled}
      className={cn(buttonVariants({ variant, size, className }))}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerLeave}
      {...props}
    />
  );
});

Button.displayName = 'Button';

export { Button, buttonVariants };
