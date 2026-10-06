/**
 * Filename naming from a `{token}` pattern.
 *
 * Unknown or absent tokens are left **visible** in the output (`{variant}`),
 * not erased. A silently emptied token produces a valid-looking but wrong name
 * — `logo-.webp` — which is worse than a name that shows what is missing.
 */

export interface NamingContext {
  basename: string;
  /** Extension without the dot, e.g. `webp`. */
  extension: string;
  format: string;
  width?: number;
  height?: number;
  scale?: number;
  quality?: number;
  variant?: string;
  project?: string;
  date?: string;
}

const TOKEN = /\{([a-zA-Z]+)\}/g;

export function resolveNaming(pattern: string, context: NamingContext): string {
  return pattern.replace(TOKEN, (match, token: string) => {
    const key = token === 'ext' ? 'extension' : token;
    const value = (context as unknown as Record<string, unknown>)[key];
    if (value === undefined || value === null || value === '') return match;
    return String(value);
  });
}
