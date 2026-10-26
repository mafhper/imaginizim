import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Dependabot PR #273 bumped `react` to 19.3.1 and left `react-dom` on 19.3.0. React
 * refuses to run at import time, before a single test executes:
 *
 *   Incompatible React versions: The "react" and "react-dom" packages must have the
 *   exact same version. Instead got: react: 19.3.1, react-dom: 19.3.0
 *
 * Two DOM suites failed to even load, so the failure read as a broken test setup
 * instead of a broken dependency pair. #270 and #271 show the same split for
 * `playwright` and `@playwright/test`, which share one CLI and must ship together.
 *
 * The lockfile is the invariant, because it is what `npm install` actually puts on
 * disk. Declared ranges may legitimately differ — a `^` on both sides that resolves
 * to one version is fine — but a matched pair must never resolve to two versions.
 */
const MATCHED_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['react', 'react-dom'],
  ['playwright', '@playwright/test']
];

type LockfilePackages = Record<string, { version?: string } | undefined>;

function readLockfilePackages(): LockfilePackages {
  const testsDir = path.dirname(fileURLToPath(import.meta.url));
  const lockfilePath = path.join(testsDir, '..', 'package-lock.json');
  const lockfile = readFileSync(lockfilePath, 'utf8');
  return (JSON.parse(lockfile) as { packages: LockfilePackages }).packages;
}

describe('matched dependency pairs', () => {
  const packages = readLockfilePackages();

  for (const [first, second] of MATCHED_PAIRS) {
    it(`resolves ${first} and ${second} to the same version`, () => {
      for (const name of [first, second]) {
        expect(
          packages[`node_modules/${name}`]?.version,
          `${name} is missing a resolved version in package-lock.json`
        ).toBeTruthy();
      }

      const firstVersion = packages[`node_modules/${first}`]?.version;
      const secondVersion = packages[`node_modules/${second}`]?.version;

      expect(
        firstVersion,
        `${first} and ${second} must resolve to the same version — bump them together`
      ).toBe(secondVersion);
    });
  }
});
