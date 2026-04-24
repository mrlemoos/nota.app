import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LoadingStatus, NotaSpinner } from './spinner';

describe('NotaSpinner', () => {
  it('renders a decorative spinning ring (paired with copy elsewhere)', () => {
    // Arrange|Act
    const { container } = render(<NotaSpinner />);

    // Assert
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });
});

describe('LoadingStatus', () => {
  it('exposes a polite status region with a visible label', () => {
    // Arrange|Act
    render(<LoadingStatus label="Loading graph…" />);

    // Assert
    const region = screen.getByRole('status');
    expect(region.textContent).toContain('Loading graph');
  });
});
