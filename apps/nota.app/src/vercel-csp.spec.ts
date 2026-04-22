import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const vercelJsonPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'vercel.json',
);

function directiveTokens(csp: string, directive: string): string[] {
  const parts = csp.split(';').map((s) => s.trim());
  const prefix = `${directive} `;
  const part = parts.find((p) => p.startsWith(prefix));
  if (!part) {
    return [];
  }
  return part.slice(prefix.length).split(/\s+/).filter(Boolean);
}

describe('nota.app vercel.json CSP', () => {
  it("includes script-src token for Clerk custom Frontend API (*.nota.mrlemoos.dev)", () => {
    // Arrange
    const raw = readFileSync(vercelJsonPath, 'utf8');
    const vercel = JSON.parse(raw) as {
      headers: { headers: { key: string; value: string }[] }[];
    };

    // Act
    const csp = vercel.headers[0].headers.find(
      (h) => h.key === 'Content-Security-Policy',
    )?.value;
    const scriptTokens = csp ? directiveTokens(csp, 'script-src') : [];
    const workerTokens = csp ? directiveTokens(csp, 'worker-src') : [];

    // Assert
    expect(csp).toBeDefined();
    expect(scriptTokens).toContain('https://*.nota.mrlemoos.dev');
    expect(scriptTokens).toContain('https://clerk.nota.mrlemoos.dev');
    expect(scriptTokens).toContain('https://*.i.posthog.com');
    expect(workerTokens).toContain("'self'");
    expect(workerTokens).toContain('blob:');
  });
});
