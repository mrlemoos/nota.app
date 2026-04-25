import { createContext, type ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { expect, test } from 'vitest';
import { CannotUseContextNullError, useOrThrow } from './use-or-throw.js';

const TestContext = createContext<string | null>(null);

test("useOrThrow(ValidContext, 'unused error') reads values from given context", () => {
  // Arrange
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TestContext.Provider value="hello">{children}</TestContext.Provider>
  );

  // Act
  const { result } = renderHook(
    () => useOrThrow(TestContext, 'should not throw'),
    { wrapper },
  );

  // Assert
  expect(result.current).toBe('hello');
});

test(
  "useOrThrow(TestContext, 'expected message') throws CannotUseContextNullError when provider value is null",
  () => {
    // Arrange
    const message = 'expected message';
    const wrapper = ({ children }: { children: ReactNode }) => (
      <TestContext.Provider value={null}>{children}</TestContext.Provider>
    );

    // Act
    const act = () => {
      renderHook(() => useOrThrow(TestContext, message), { wrapper });
    };

    // Assert
    expect(act).toThrow(CannotUseContextNullError);
    expect(act).toThrow(message);
  },
);

test(
  "useOrThrow(TestContext, 'missing provider') throws CannotUseContextNullError when no provider wraps the tree",
  () => {
    // Arrange
    const message = 'missing provider';

    // Act
    const act = () => {
      renderHook(() => useOrThrow(TestContext, message));
    };

    // Assert
    expect(act).toThrow(CannotUseContextNullError);
    expect(act).toThrow(message);
  },
);
