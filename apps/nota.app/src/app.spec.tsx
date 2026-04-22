import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LandingPage } from './components/landing-page';

describe('App shell', () => {
  it('renders the marketing landing call to action', () => {
    // Arrange
    // (LandingPage has no props)

    // Act
    render(<LandingPage />);

    // Assert
    expect(screen.getByText(/Continue with email/i)).toBeTruthy();
  });
});
