import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientAppDir = join(__dirname, '../../../nota.app/src');

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      collectSourceFiles(p, acc);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.(spec|test)\.(ts|tsx)$/.test(name)) {
      acc.push(p);
    }
  }
  return acc;
}

const FORBIDDEN: { label: string; re: RegExp }[] = [
  { label: '@clerk/backend', re: /@clerk\/backend/ },
  { label: '.server/ import path', re: /\.server\// },
  { label: 'clerk-billing.server', re: /clerk-billing\.server/ },
  { label: 'og-preview.server', re: /og-preview\.server/ },
  { label: 'nota-pro-api-logic', re: /nota-pro-api-logic/ },
];

describe('nota.app client tree', () => {
  it('does not reference server-only Clerk or moved nota-server libs', () => {
    // Arrange
    const files = collectSourceFiles(clientAppDir);

    // Act
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const { label, re } of FORBIDDEN) {
        if (re.test(text)) {
          hits.push(`${relative(clientAppDir, file)}: matched ${label}`);
        }
      }
    }

    // Assert
    expect(files.length).toBeGreaterThan(0);
    expect(hits).toEqual([]);
  });
});
