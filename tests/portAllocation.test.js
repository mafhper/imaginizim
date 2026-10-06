import { describe, expect, it } from 'vitest';
import net from 'node:net';
import {
  BAD_PORTS,
  describePortTaken,
  findSafePort,
  formatPortFallback,
  isPortFree,
  isPortUsable
} from '../scripts/sonda-porta.mjs';

/**
 * The Lighthouse run used to fail at random: `chrome-launcher` asked the OS for
 * a debugging port with `listen(0)` and filtered nothing, so it sometimes picked
 * a port the WHATWG spec marks "bad". `net.listen(1719)` succeeds — the OS
 * accepts it — and `fetch('http://127.0.0.1:1719/')` is refused before any
 * connection is attempted. `net` and `fetch` disagree about which ports are
 * legal, and only asking about both halves is enough.
 *
 * Two distinct bad ports were observed on this project: 1719 and 10080.
 */
describe('the shared port probe', () => {
  it('lists the ports an HTTP client refuses', () => {
    expect(BAD_PORTS.has(1719)).toBe(true);
    expect(BAD_PORTS.has(1720)).toBe(true);
    expect(BAD_PORTS.has(10080)).toBe(true);
    expect(BAD_PORTS.has(6666)).toBe(true);
  });

  it('rejects forbidden and out-of-range ports', () => {
    expect(isPortUsable(1719)).toBe(false);
    expect(isPortUsable(0)).toBe(false);
    expect(isPortUsable(-1)).toBe(false);
    expect(isPortUsable(65536)).toBe(false);
    expect(isPortUsable(1.5)).toBe(false);
  });

  it('accepts ordinary ports', () => {
    expect(isPortUsable(4173)).toBe(true);
    expect(isPortUsable(5190)).toBe(true);
    expect(isPortUsable(4373)).toBe(true);
  });

  it('agrees with net about which ports are bindable', async () => {
    // The disagreement itself: 1719 binds fine and is still unusable.
    const bindable = await isPortFree(1719, '127.0.0.1');
    expect(bindable).toBe(true);
    expect(isPortUsable(1719)).toBe(false);
  });

  it('returns the preferred port when it is free', async () => {
    const chosen = await findSafePort(0, { host: '127.0.0.1' });
    expect(isPortUsable(chosen)).toBe(true);

    expect(await findSafePort(chosen, { host: '127.0.0.1' })).toBe(chosen);
  });

  it('skips a forbidden preferred port instead of returning it', async () => {
    const chosen = await findSafePort(1719, { host: '127.0.0.1' });
    expect(chosen).not.toBe(1719);
    expect(isPortUsable(chosen)).toBe(true);
  });

  it('falls back when the preferred port is taken', async () => {
    const held = net.createServer();
    await new Promise((resolve) => held.listen(0, '127.0.0.1', resolve));
    const busy = held.address().port;
    try {
      const chosen = await findSafePort(busy, { host: '127.0.0.1' });
      expect(chosen).not.toBe(busy);
      expect(isPortUsable(chosen)).toBe(true);
    } finally {
      await new Promise((resolve) => held.close(resolve));
    }
  });

  it('prefers a nearby port over an ephemeral one', async () => {
    // A number nobody reads off the cuff is useless to a developer, so the
    // probe scans sequentially before falling back to the OS.
    const chosen = await findSafePort(47000, { host: '127.0.0.1' });
    expect(chosen).toBeGreaterThanOrEqual(47000);
  });

  it('falls back to the OS when the whole range is unusable', async () => {
    // 1719 is unusable and `tentativas: 1` means only 1719 is tried, so the
    // sequential scan finds nothing and the ephemeral fallback has to answer.
    const chosen = await findSafePort(1719, { host: '127.0.0.1', tentativas: 1 });
    expect(chosen).not.toBe(1719);
    expect(isPortUsable(chosen)).toBe(true);
  });

  it('says which port moved, and why', () => {
    const message = formatPortFallback(4321, 4322, 'lighthouse server');
    expect(message).toContain('4321');
    expect(message).toContain('4322');
    expect(message).toContain('lighthouse server');
  });

  it('tells a developer how to find whoever holds a fixed port', () => {
    const message = describePortTaken(5190);
    expect(message).toContain('5190');
    expect(message).toContain('Get-NetTCPConnection');
  });
});
