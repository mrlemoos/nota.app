import type { JSX } from 'react';
import { Menu } from '@base-ui/react/menu';
import {
  ArrowDown01Icon,
  ComputerIcon,
  Moon02Icon,
  Sun01Icon,
  Tick01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { notaButtonVariants } from '@nota.app/web-design/button';
import { cn } from '@/lib/utils';
import { type Theme, useTheme } from './theme-provider';

const THEME_LABEL: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

const itemClass = cn(
  'flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground outline-none',
  'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
);

export function ThemeMenu(): JSX.Element {
  const { theme, setTheme } = useTheme();

  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        type="button"
        aria-label="Theme"
        className={cn(
          notaButtonVariants({ variant: 'outline', size: 'default' }),
          'min-w-[7.5rem] justify-between gap-2 px-2.5 font-normal',
        )}
      >
        <span className="truncate">{THEME_LABEL[theme]}</span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={14}
          className="shrink-0 text-muted-foreground"
        />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={4}>
          <Menu.Popup
            className={cn(
              'z-50 min-w-[var(--anchor-width)] overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-md',
              'origin-[var(--transform-origin)] transition-[transform,scale,opacity]',
              'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
              'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
            )}
          >
            <Menu.Viewport>
              <Menu.RadioGroup
                value={theme}
                onValueChange={(value) => {
                  if (
                    value === 'light' ||
                    value === 'dark' ||
                    value === 'system'
                  ) {
                    setTheme(value);
                  }
                }}
              >
                <Menu.RadioItem
                  value="light"
                  closeOnClick
                  className={itemClass}
                >
                  <HugeiconsIcon
                    icon={Sun01Icon}
                    size={16}
                    className="shrink-0 text-muted-foreground"
                  />
                  <span className="min-w-0 flex-1">Light</span>
                  <Menu.RadioItemIndicator className="flex size-4 shrink-0 items-center justify-center">
                    <HugeiconsIcon icon={Tick01Icon} size={14} />
                  </Menu.RadioItemIndicator>
                </Menu.RadioItem>
                <Menu.RadioItem value="dark" closeOnClick className={itemClass}>
                  <HugeiconsIcon
                    icon={Moon02Icon}
                    size={16}
                    className="shrink-0 text-muted-foreground"
                  />
                  <span className="min-w-0 flex-1">Dark</span>
                  <Menu.RadioItemIndicator className="flex size-4 shrink-0 items-center justify-center">
                    <HugeiconsIcon icon={Tick01Icon} size={14} />
                  </Menu.RadioItemIndicator>
                </Menu.RadioItem>
                <Menu.RadioItem
                  value="system"
                  closeOnClick
                  className={itemClass}
                >
                  <HugeiconsIcon
                    icon={ComputerIcon}
                    size={16}
                    className="shrink-0 text-muted-foreground"
                  />
                  <span className="min-w-0 flex-1">System</span>
                  <Menu.RadioItemIndicator className="flex size-4 shrink-0 items-center justify-center">
                    <HugeiconsIcon icon={Tick01Icon} size={14} />
                  </Menu.RadioItemIndicator>
                </Menu.RadioItem>
              </Menu.RadioGroup>
            </Menu.Viewport>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
