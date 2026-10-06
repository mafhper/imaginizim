/**
 * Generates the fixtures that are impractical to author by hand.
 *
 * Kept as a script rather than a committed blob so the shape is auditable:
 * a 4000-node SVG checked into the repo tells you nothing about what it is
 * meant to prove.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const svgDir = path.resolve(here, '../tests/fixtures/assets/svg');

function complexVector() {
  const parts = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">',
    '  <title>complex vector: 4000 redundant nodes</title>',
    '  <desc>',
    '    Every node draws the same 2px square. A real Illustrator/Figma export',
    '    looks like this: a large count of structurally redundant elements that',
    '    collapse to a handful. It is the case that exposes SVGO multipass cost',
    '    and any per-node analysis.',
    '  </desc>',
    '  <g>'
  ];

  let index = 0;
  for (let y = 0; y < 100; y += 1) {
    for (let x = 0; x < 40; x += 1) {
      parts.push(
        `    <rect x="${x * 12}" y="${y * 5}" width="2" height="2" fill="#2f6f4f" data-i="${index}" />`
      );
      index += 1;
    }
  }
  parts.push('  </g>', '</svg>', '');
  return parts.join('\n');
}

function redundantPrecision() {
  // Numbers that survive cleanupNumericValues untouched at precision 3, but
  // are noise to a human. Tests whether the `safe` profile reduces precision
  // at all, and whether it does so without moving geometry.
  const parts = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">',
    '  <title>over-precise coordinates</title>',
    '  <path d="M10.000001 10.000001 L 90.000001 10.000001 L 90.000001 90.000001 Z" fill="#2f6f4f" />',
    '</svg>',
    ''
  ];
  return parts.join('\n');
}

const files = {
  'complex.svg': complexVector(),
  'redundant-precision.svg': redundantPrecision()
};

for (const [name, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(svgDir, name), content, 'utf8');
  console.log(`${name}  ${Buffer.byteLength(content)} B`);
}
