import type { SvgParseError } from './types';

export interface SvgTag {
  /** Lower-cased element name, e.g. `clippath`. */
  name: string;
  /** Lower-cased attribute names → raw values. */
  attributes: Record<string, string>;
  selfClosing: boolean;
}

export interface SvgTokenizeResult {
  tags: SvgTag[];
  errors: SvgParseError[];
}

const ATTRIBUTE = /([^\s=/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;

function parseAttributes(input: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  ATTRIBUTE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ATTRIBUTE.exec(input)) !== null) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attributes;
}

/** Finds the `>` that ends a tag, ignoring one inside a quoted value. */
function findTagEnd(text: string, start: number): number {
  let quote: string | null = null;
  for (let i = start + 1; i < text.length; i += 1) {
    const char = text[i];
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '>') {
      return i;
    }
  }
  return -1;
}

/**
 * A structural scan of the SVG text — not a full XML validator. It skips
 * comments, CDATA and declarations, counts real elements, and checks the two
 * things that matter to classification: there is an `<svg>` root, and the tags
 * balance. This runs in the worker, where `DOMParser` is unavailable.
 */
export function tokenizeSvg(text: string): SvgTokenizeResult {
  const tags: SvgTag[] = [];
  const errors: SvgParseError[] = [];
  const stack: string[] = [];
  let rootName: string | null = null;
  let index = 0;

  while (index < text.length) {
    const lt = text.indexOf('<', index);
    if (lt < 0) break;
    index = lt;

    if (text.startsWith('<!--', index)) {
      const end = text.indexOf('-->', index + 4);
      if (end < 0) {
        errors.push({ code: 'unterminated-comment', message: 'comment without an end' });
        break;
      }
      index = end + 3;
      continue;
    }

    if (text.startsWith('<![CDATA[', index)) {
      const end = text.indexOf(']]>', index + 9);
      if (end < 0) {
        errors.push({ code: 'unterminated-cdata', message: 'CDATA without an end' });
        break;
      }
      index = end + 3;
      continue;
    }

    if (text.startsWith('<!', index) || text.startsWith('<?', index)) {
      const closer = text.startsWith('<?', index) ? '?>' : '>';
      const end = text.indexOf(closer, index);
      if (end < 0) break;
      index = end + closer.length;
      continue;
    }

    const end = findTagEnd(text, index);
    if (end < 0) {
      errors.push({ code: 'unterminated-tag', message: 'tag without an end' });
      break;
    }

    const raw = text.slice(index + 1, end);
    index = end + 1;

    if (raw.startsWith('/')) {
      const name = raw.slice(1).trim().toLowerCase();
      const expected = stack.pop();
      if (expected !== name) {
        errors.push({
          code: 'mismatched-tag',
          message: `</${name}> does not close <${expected ?? '?'}>`
        });
      }
      continue;
    }

    const trimmed = raw.trimEnd();
    const selfClosing = trimmed.endsWith('/');
    const body = (selfClosing ? trimmed.slice(0, -1) : trimmed).trim();
    if (body.length === 0) continue;

    const space = body.search(/\s/);
    const name = (space < 0 ? body : body.slice(0, space)).toLowerCase();
    if (!name) continue;

    if (rootName === null) rootName = name;
    tags.push({
      name,
      attributes: parseAttributes(space < 0 ? '' : body.slice(space + 1)),
      selfClosing
    });
    if (!selfClosing) stack.push(name);
  }

  if (rootName !== 'svg') {
    errors.push({
      code: 'no-svg-root',
      message: rootName ? `root is <${rootName}>, not <svg>` : 'no root element'
    });
  }
  if (stack.length > 0) {
    errors.push({ code: 'unbalanced-tag', message: `unclosed tags: ${stack.join(', ')}` });
  }

  return { tags, errors };
}
