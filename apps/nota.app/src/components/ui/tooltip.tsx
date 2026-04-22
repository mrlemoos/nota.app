import * as React from 'react';
import { Tooltip } from '@base-ui/react/tooltip';
import { cn } from '@/lib/utils';

export function TooltipProvider({
  children,
  delay = 250,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return <Tooltip.Provider delay={delay}>{children}</Tooltip.Provider>;
}

type SimpleTooltipProps = {
  label: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  children: React.ReactElement;
};

export function SimpleTooltip({
  label,
  side = 'left',
  delay = 250,
  children,
}: SimpleTooltipProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger delay={delay} render={children} />
      <Tooltip.Portal>
        <Tooltip.Positioner side={side} sideOffset={6}>
          <Tooltip.Popup
            className={cn(
              'z-100 max-w-xs rounded-md border border-border bg-popover px-2 py-1',
              'text-popover-foreground text-xs shadow-md',
            )}
          >
            {label}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
