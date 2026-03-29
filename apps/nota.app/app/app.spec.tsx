import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LandingPage } from './components/landing-page';

describe('SPA shell', () => {
  it('renders the marketing landing call to action', () => {
    render(<LandingPage />);
    expect(screen.getByText(/Continue with email/i)).toBeTruthy();
  });
});
