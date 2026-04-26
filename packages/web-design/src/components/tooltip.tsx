import type { ComponentProps, ReactNode } from 'react';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';

import { cn } from '../lib/utils.js';

export type NotaTooltipProviderProps = {
  children: ReactNode;
  delay?: number;
};

export type NotaTooltipProps = ComponentProps<typeof BaseTooltip.Root>;
export type NotaTooltipTriggerProps = ComponentProps<typeof BaseTooltip.Trigger>;
export type NotaTooltipPortalProps = ComponentProps<typeof BaseTooltip.Portal>;
export type NotaTooltipPositionerProps = ComponentProps<
  typeof BaseTooltip.Positioner
>;
export type NotaTooltipPopupProps = ComponentProps<typeof BaseTooltip.Popup>;

const DEFAULT_NOTA_TOOLTIP_POPUP_CLASS = cn(
  'z-100 max-w-xs rounded-md border border-border bg-popover px-2 py-1',
  'text-popover-foreground text-xs shadow-md',
);

export const NotaTooltip = BaseTooltip.Root;
export const NotaTooltipTrigger = BaseTooltip.Trigger;
export const NotaTooltipPortal = BaseTooltip.Portal;
export const NotaTooltipPositioner = BaseTooltip.Positioner;

export function NotaTooltipProvider({
  children,
  delay = 250,
}: NotaTooltipProviderProps) {
  return <BaseTooltip.Provider delay={delay}>{children}</BaseTooltip.Provider>;
}

export function NotaTooltipPopup({
  className,
  ref,
  ...props
}: NotaTooltipPopupProps) {
  return (
    <BaseTooltip.Popup
      ref={ref}
      className={cn(DEFAULT_NOTA_TOOLTIP_POPUP_CLASS, className)}
      {...props}
    />
  );
}
