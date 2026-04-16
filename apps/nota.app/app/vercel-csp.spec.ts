import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const vercelJsonPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'vercel.json',
);

function scriptSrcTokens(csp: string): string[] {
  const parts = csp.split(';').map((s) => s.trim());
  const scriptPart = parts.find((p) => p.startsWith('script-src '));
  if (!scriptPart) {
    return [];
  }
  return scriptPart.slice('script-src '.length).split(/\s+/).filter(Boolean);
}

describe('nota.app vercel.json CSP', () => {
  it("includes script-src token for Clerk custom Frontend API (*.nota.mrlemoos.dev)", () => {
    const raw = readFileSync(vercelJsonPath, 'utf8');
    const vercel = JSON.parse(raw) as {
      headers: { headers: { key: string; value: string }[] }[];
    };
    const csp = vercel.headers[0].headers.find(
      (h) => h.key === 'Content-Security-Policy',
    )?.value;
    expect(csp).toBeDefined();
    const tokens = scriptSrcTokens(csp!);
    expect(tokens).toContain('https://*.nota.mrlemoos.dev');
    expect(tokens).toContain('https://clerk.nota.mrlemoos.dev');
    expect(tokens).toContain('https://*.i.posthog.com');
  });
});
