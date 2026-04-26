/**
 * Context menu primitives built on Base UI: root, trigger, portal, positioner,
 * popup, item, separator, and submenu helpers.
 *
 * @remarks
 * Import from the package subpath only: `import { NotaContextMenu, … } from '@nota.app/web-design/context-menu'`.
 * `NotaContextMenuPopup` and the item wrappers apply Nota surface styling; the other exports are thin re-exports of Base UI parts.
 *
 * @packageDocumentation
 */

import type { ComponentProps } from 'react';
import { ContextMenu as BaseContextMenu } from '@base-ui/react/context-menu';
import { Menu as BaseMenu } from '@base-ui/react/menu';

import { cn } from '../lib/utils.js';

export type NotaContextMenuProps = ComponentProps<typeof BaseContextMenu.Root>;
export type NotaContextMenuTriggerProps = ComponentProps<
  typeof BaseContextMenu.Trigger
>;
export type NotaContextMenuPortalProps = ComponentProps<
  typeof BaseContextMenu.Portal
>;
export type NotaContextMenuPositionerProps = ComponentProps<
  typeof BaseContextMenu.Positioner
>;
export type NotaContextMenuPopupProps = ComponentProps<
  typeof BaseContextMenu.Popup
>;
export type NotaContextMenuViewportProps = ComponentProps<
  typeof BaseMenu.Viewport
>;
export type NotaContextMenuItemProps = ComponentProps<typeof BaseContextMenu.Item>;
export type NotaContextMenuSeparatorProps = ComponentProps<
  typeof BaseContextMenu.Separator
>;
export type NotaContextMenuSubmenuRootProps = ComponentProps<
  typeof BaseContextMenu.SubmenuRoot
>;
export type NotaContextMenuSubmenuTriggerProps = ComponentProps<
  typeof BaseContextMenu.SubmenuTrigger
>;
export type NotaContextMenuRadioGroupProps = ComponentProps<
  typeof BaseContextMenu.RadioGroup
>;
export type NotaContextMenuRadioItemProps = ComponentProps<
  typeof BaseContextMenu.RadioItem
>;
export type NotaContextMenuRadioItemIndicatorProps = ComponentProps<
  typeof BaseContextMenu.RadioItemIndicator
>;

const DEFAULT_CONTEXT_MENU_POPUP_CLASS = cn(
  'z-50 min-w-48 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-md',
  'origin-[var(--transform-origin)] transition-[transform,scale,opacity]',
  'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
  'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
);

const DEFAULT_CONTEXT_MENU_VIEWPORT_CLASS = cn(
  'max-h-[min(20rem,calc(100vh-2rem))] overflow-y-auto overscroll-contain',
);

const DEFAULT_CONTEXT_MENU_ITEM_CLASS = cn(
  'flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground outline-none',
  'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
);

const DEFAULT_CONTEXT_MENU_SUBMENU_TRIGGER_CLASS = cn(
  DEFAULT_CONTEXT_MENU_ITEM_CLASS,
  'justify-between',
);

const DEFAULT_CONTEXT_MENU_SEPARATOR_CLASS = 'my-1 h-px bg-border/70';

export const NotaContextMenu = BaseContextMenu.Root;
export const NotaContextMenuTrigger = BaseContextMenu.Trigger;
export const NotaContextMenuPortal = BaseContextMenu.Portal;
export const NotaContextMenuPositioner = BaseContextMenu.Positioner;
export const NotaContextMenuSubmenuRoot = BaseContextMenu.SubmenuRoot;
export const NotaContextMenuRadioGroup = BaseContextMenu.RadioGroup;
export const NotaContextMenuRadioItem = BaseContextMenu.RadioItem;
export const NotaContextMenuRadioItemIndicator =
  BaseContextMenu.RadioItemIndicator;

export function NotaContextMenuViewport({
  className,
  ref,
  ...props
}: NotaContextMenuViewportProps) {
  return (
    <BaseMenu.Viewport
      ref={ref}
      className={cn(DEFAULT_CONTEXT_MENU_VIEWPORT_CLASS, className)}
      {...props}
    />
  );
}

export function NotaContextMenuPopup({
  className,
  ref,
  ...props
}: NotaContextMenuPopupProps) {
  return (
    <BaseContextMenu.Popup
      ref={ref}
      className={cn(DEFAULT_CONTEXT_MENU_POPUP_CLASS, className)}
      {...props}
    />
  );
}

export function NotaContextMenuItem({ className, ...props }: NotaContextMenuItemProps) {
  return <BaseContextMenu.Item className={cn(DEFAULT_CONTEXT_MENU_ITEM_CLASS, className)} {...props} />;
}

export function NotaContextMenuSubmenuTrigger({
  className,
  ...props
}: NotaContextMenuSubmenuTriggerProps) {
  return (
    <BaseContextMenu.SubmenuTrigger
      className={cn(DEFAULT_CONTEXT_MENU_SUBMENU_TRIGGER_CLASS, className)}
      {...props}
    />
  );
}

export function NotaContextMenuSeparator({
  className,
  ...props
}: NotaContextMenuSeparatorProps) {
  return (
    <BaseContextMenu.Separator
      className={cn(DEFAULT_CONTEXT_MENU_SEPARATOR_CLASS, className)}
      {...props}
    />
  );
}
