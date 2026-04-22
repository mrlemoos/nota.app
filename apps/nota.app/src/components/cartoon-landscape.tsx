import { cn } from '@/lib/utils';

type CartoonLandscapeProps = {
  className?: string;
  /** Optional theme overlay for contrast over the illustration (defaults for readability). */
  overlayClassName?: string;
};

/**
 * Decorative full-bleed landscape background (generated art + theme overlay).
 */
export function CartoonLandscape({
  className,
  overlayClassName,
}: CartoonLandscapeProps) {
  return (
    <div
      className={cn('relative pointer-events-none overflow-hidden', className)}
      aria-hidden="true"
    >
      <img
        src="/nota-landscape.png"
        alt=""
        className="absolute inset-0 size-full min-h-full min-w-full object-cover object-bottom grayscale select-none"
        draggable={false}
      />
      <div
        className={cn(
          'absolute inset-0 bg-background/40 dark:bg-background/50',
          overlayClassName
        )}
        aria-hidden="true"
      />
    </div>
  );
}
