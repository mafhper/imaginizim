import { describe, it, expect } from 'vitest';
import { legacySettingsToOutputs } from '../src/domain/adapters';

describe('legacySettingsToOutputs', () => {
  it('maps the single legacy output into one OutputSpec', () => {
    const outputs = legacySettingsToOutputs({
      quality: 0.82,
      scale: 1,
      outputFormat: 'image/webp',
      optimizationMode: 'balanced'
    });

    expect(outputs).toHaveLength(1);
    expect(outputs[0].format).toBe('image/webp');
    expect(outputs[0].quality).toBe(0.82);
    expect(outputs[0].optimizationMode).toBe('balanced');
  });

  it('carries the byte budget when present, and null otherwise', () => {
    const withTarget = legacySettingsToOutputs({
      quality: 0.8,
      scale: 1,
      outputFormat: 'auto',
      optimizationMode: 'balanced',
      targetBytes: 204800
    });
    expect(withTarget[0].targetBytes).toBe(204800);

    const without = legacySettingsToOutputs({
      quality: 0.8,
      scale: 1,
      outputFormat: 'auto',
      optimizationMode: 'balanced'
    });
    expect(without[0].targetBytes).toBeNull();
  });

  it('preserves the auto format verbatim', () => {
    const outputs = legacySettingsToOutputs({
      quality: 0.8,
      scale: 1,
      outputFormat: 'auto',
      optimizationMode: 'max-speed'
    });

    expect(outputs[0].format).toBe('auto');
  });
});
