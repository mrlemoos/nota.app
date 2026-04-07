import { describe, expect, it } from 'vitest';
import { useParams, usePathname, useRouter, useSearchParams } from './navigation';

describe('next/navigation shim (Clerk Elements on Vite)', () => {
  it('exposes stable stubs so the client bundle resolves @clerk/elements', () => {
    expect(usePathname()).toBe('/');
    expect([...useSearchParams().keys()]).toEqual([]);
    expect(useParams()).toEqual({});
    expect(typeof useRouter().push).toBe('function');
    expect(typeof useRouter().replace).toBe('function');
  });
});
