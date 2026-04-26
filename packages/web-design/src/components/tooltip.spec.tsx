import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  NotaTooltip,
  NotaTooltipPopup,
  NotaTooltipPortal,
  NotaTooltipPositioner,
  NotaTooltipProvider,
  NotaTooltipTrigger,
} from './tooltip.js';

describe('NotaTooltip (named exports)', () => {
  it('exposes Provider, Root, Trigger, Portal, Positioner, Popup', () => {
    // Assert
    expect(NotaTooltipProvider).toBeDefined();
    expect(NotaTooltip).toBeDefined();
    expect(NotaTooltipTrigger).toBeDefined();
    expect(NotaTooltipPortal).toBeDefined();
    expect(NotaTooltipPositioner).toBeDefined();
    expect(NotaTooltipPopup).toBeDefined();
  });
});

describe('NotaTooltipPopup (default popover styles)', () => {
  it('applies the shared nota popover class tokens on NotaTooltipPopup', () => {
    // Arrange|Act: defaultOpen avoids flaky hover simulation in JSDOM
    const { baseElement } = render(
      <NotaTooltipProvider delay={0}>
        <NotaTooltip defaultOpen>
          <NotaTooltipTrigger render={<span>Anchor</span>} />
          <NotaTooltipPortal>
            <NotaTooltipPositioner side="top" sideOffset={6}>
              <NotaTooltipPopup>Test label</NotaTooltipPopup>
            </NotaTooltipPositioner>
          </NotaTooltipPortal>
        </NotaTooltip>
      </NotaTooltipProvider>,
    );

    // Assert
    const popup = within(baseElement).getByText('Test label', { exact: true });
    const surface = (popup as HTMLElement).closest('div') ?? popup;
    const classes = (surface as HTMLElement).className
      .split(/\s+/)
      .filter(Boolean);
    for (const token of [
      'z-100',
      'max-w-xs',
      'rounded-md',
      'border',
      'border-border',
      'bg-popover',
      'px-2',
      'py-1',
      'text-popover-foreground',
      'text-xs',
      'shadow-md',
    ]) {
      expect(classes).toContain(token);
    }
  });
});
