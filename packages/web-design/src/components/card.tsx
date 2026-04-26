import * as React from 'react';

import { cn } from '../lib/utils.js';

export type NotaCardProps = React.ComponentProps<'div'> & {
  size?: 'default' | 'sm';
};
export type NotaCardHeaderProps = React.ComponentProps<'div'>;
export type NotaCardTitleProps = React.ComponentProps<'div'>;
export type NotaCardDescriptionProps = React.ComponentProps<'div'>;
export type NotaCardActionProps = React.ComponentProps<'div'>;
export type NotaCardContentProps = React.ComponentProps<'div'>;
export type NotaCardFooterProps = React.ComponentProps<'div'>;

export function NotaCard({
  className,
  size = 'default',
  ...props
}: NotaCardProps) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        'group/card flex flex-col gap-4 overflow-hidden rounded-lg bg-card py-4 text-xs/relaxed text-card-foreground ring-1 ring-foreground/10 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 *:[img:first-child]:rounded-t-lg *:[img:last-child]:rounded-b-lg',
        className,
      )}
      {...props}
    />
  );
}

export function NotaCardHeader({ className, ...props }: NotaCardHeaderProps) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-lg px-4 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3',
        className,
      )}
      {...props}
    />
  );
}

export function NotaCardTitle({ className, ...props }: NotaCardTitleProps) {
  return (
    <div
      data-slot="card-title"
      className={cn('font-heading text-sm font-medium', className)}
      {...props}
    />
  );
}

export function NotaCardDescription({
  className,
  ...props
}: NotaCardDescriptionProps) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-xs/relaxed text-muted-foreground', className)}
      {...props}
    />
  );
}

export function NotaCardAction({ className, ...props }: NotaCardActionProps) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
        className,
      )}
      {...props}
    />
  );
}

export function NotaCardContent({ className, ...props }: NotaCardContentProps) {
  return (
    <div
      data-slot="card-content"
      className={cn('px-4 group-data-[size=sm]/card:px-3', className)}
      {...props}
    />
  );
}

export function NotaCardFooter({ className, ...props }: NotaCardFooterProps) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'flex items-center rounded-b-lg px-4 group-data-[size=sm]/card:px-3 [.border-t]:pt-4 group-data-[size=sm]/card:[.border-t]:pt-3',
        className,
      )}
      {...props}
    />
  );
}
