import { describe, it, expect } from 'vitest';
import en from '../src/locales/en.json';
import ptBr from '../src/locales/pt-br.json';
import es from '../src/locales/es.json';

describe('i18n Locales Consistency', () => {
  const getKeys = (obj, prefix = '') => {
    return Object.keys(obj).reduce((res, el) => {
      if (Array.isArray(obj[el])) {
        return res;
      } else if (typeof obj[el] === 'object' && obj[el] !== null) {
        return [...res, ...getKeys(obj[el], prefix + el + '.')];
      }
      return [...res, prefix + el];
    }, []);
  };

  const enKeys = getKeys(en).sort();
  const ptKeys = getKeys(ptBr).sort();
  const esKeys = getKeys(es).sort();

  it('should have the same keys in English and Portuguese', () => {
    expect(ptKeys).toEqual(enKeys);
  });

  it('should have the same keys in English and Spanish', () => {
    expect(esKeys).toEqual(enKeys);
  });
});

describe('Locale Values', () => {
  it('should not have empty values in English', () => {
    const enValues = Object.values(en).flat();
    enValues.forEach((val) => {
      if (typeof val === 'string') {
        expect(val.length).toBeGreaterThan(0);
      }
    });
  });
});
