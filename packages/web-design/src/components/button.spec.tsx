import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NotaButton, notaButtonVariants } from './button.js';

describe('NotaButton (named exports)', () => {
  it('exposes NotaButton and notaButtonVariants', () => {
    // Assert
    expect(NotaButton).toBeDefined();
    expect(notaButtonVariants).toBeDefined();
  });
});

describe('NotaButton (smoke)', () => {
  it('renders with default variant classes', () => {
    // Arrange|Act
    render(<NotaButton type="button">Save</NotaButton>);

    // Assert
    const el = screen.getByRole('button', { name: 'Save' });
    expect(el.className).toContain('bg-primary');
  });
});
