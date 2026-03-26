import { createRoutesStub } from 'react-router';
import { render, screen, waitFor } from '@testing-library/react';
import App from './app';

test('renders home page', async () => {
  const ReactRouterStub = createRoutesStub([
    {
      path: '/',
      Component: App,
    },
  ]);

  render(<ReactRouterStub />);

  await waitFor(() => screen.findByText('Think clearly. Write slowly.'));
  expect(screen.getByRole('link', { name: 'Continue with email' })).toBeDefined();
  expect(screen.getByRole('link', { name: 'Create an account' })).toBeDefined();
});
