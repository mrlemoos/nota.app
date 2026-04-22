import { cn } from '@/lib/utils';

interface NotaLogoProps {
  className?: string;
}

/** Stacked-sheet mark. Static favicon copy: `public/favicon.svg`. */
export function NotaLogo({ className }: NotaLogoProps) {
  return (
    <svg
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
      aria-hidden="true"
    >
      {/* Back layer - most transparent */}
      <rect
        x="4"
        y="4"
        width="30"
        height="30"
        rx="5.5"
        fill="currentColor"
        fillOpacity="0.35"
      />
      {/* Middle layer */}
      <rect
        x="7"
        y="7"
        width="30"
        height="30"
        rx="5.5"
        fill="currentColor"
        fillOpacity="0.7"
      />
      {/* Front layer - solid */}
      <rect
        x="10"
        y="10"
        width="30"
        height="30"
        rx="5.5"
        fill="currentColor"
        fillOpacity="1"
      />
    </svg>
  );
}
