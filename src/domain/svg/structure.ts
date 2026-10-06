import type { SvgTag } from './tokenize';
import type { SvgStructure } from './types';

function parseNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : null;
}

function isPercentage(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().endsWith('%');
}

function parseViewBox(value: string | undefined): [number, number, number, number] | null {
  if (!value) return null;
  const parts = value
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null;
  return [parts[0], parts[1], parts[2], parts[3]];
}

export function buildStructure(tags: SvgTag[]): SvgStructure {
  const structure: SvgStructure = {
    width: null,
    height: null,
    viewBox: null,
    percentageDimensions: false,
    elements: {
      paths: 0,
      rects: 0,
      circles: 0,
      ellipses: 0,
      polygons: 0,
      polylines: 0,
      lines: 0,
      groups: 0,
      text: 0,
      images: 0
    },
    features: {
      gradients: 0,
      masks: 0,
      clipPaths: 0,
      filters: 0,
      patterns: 0,
      foreignObjects: 0
    },
    references: { external: 0, internal: 0, broken: 0 }
  };

  const definedIds = new Set<string>();
  const referencedIds = new Set<string>();
  let external = 0;
  let internal = 0;

  for (const tag of tags) {
    switch (tag.name) {
      case 'path':
        structure.elements.paths += 1;
        break;
      case 'rect':
        structure.elements.rects += 1;
        break;
      case 'circle':
        structure.elements.circles += 1;
        break;
      case 'ellipse':
        structure.elements.ellipses += 1;
        break;
      case 'polygon':
        structure.elements.polygons += 1;
        break;
      case 'polyline':
        structure.elements.polylines += 1;
        break;
      case 'line':
        structure.elements.lines += 1;
        break;
      case 'g':
        structure.elements.groups += 1;
        break;
      case 'text':
        structure.elements.text += 1;
        break;
      case 'image':
        structure.elements.images += 1;
        break;
      case 'lineargradient':
      case 'radialgradient':
        structure.features.gradients += 1;
        break;
      case 'mask':
        structure.features.masks += 1;
        break;
      case 'clippath':
        structure.features.clipPaths += 1;
        break;
      case 'filter':
        structure.features.filters += 1;
        break;
      case 'pattern':
        structure.features.patterns += 1;
        break;
      case 'foreignobject':
        structure.features.foreignObjects += 1;
        break;
      case 'svg':
        if (structure.width === null && tag.attributes.width !== undefined) {
          structure.width = parseNumber(tag.attributes.width);
        }
        if (structure.height === null && tag.attributes.height !== undefined) {
          structure.height = parseNumber(tag.attributes.height);
        }
        if (structure.viewBox === null) {
          structure.viewBox = parseViewBox(tag.attributes.viewbox);
        }
        if (isPercentage(tag.attributes.width) || isPercentage(tag.attributes.height)) {
          structure.percentageDimensions = true;
        }
        break;
      default:
        break;
    }

    if (tag.attributes.id) definedIds.add(tag.attributes.id);

    const href = tag.attributes.href ?? tag.attributes['xlink:href'];
    if (href !== undefined) {
      if (href.startsWith('#')) {
        internal += 1;
        referencedIds.add(href.slice(1));
      } else if (!href.startsWith('data:')) {
        external += 1;
      }
    }

    for (const value of Object.values(tag.attributes)) {
      for (const match of value.matchAll(/url\(\s*#([^)\s]+)\s*\)/g)) {
        internal += 1;
        referencedIds.add(match[1]);
      }
    }
  }

  let broken = 0;
  for (const id of referencedIds) {
    if (!definedIds.has(id)) broken += 1;
  }

  structure.references = { external, internal, broken };
  return structure;
}
