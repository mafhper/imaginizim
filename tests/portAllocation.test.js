import { describe, expect, it } from 'vitest';
import net from 'node:net';
import { BAD_PORTS, findSafePort, isForbiddenPort } from '../scripts/net-port.mjs';

function listen(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)));
  });
}

// A port that is bindable is not necessarily usable: `net.listen` accepts ports
// that `fetch` refuses outright. `getRandomPort` in chrome-launcher uses exactly
// `server.listen(0)` with no filtering, which is how a Lighthouse run ended up
// pointing at 1719 and failed with `bad port` before Chrome ever rendered.
describe('port selection for the Lighthouse run', () => {
  it('lists the ports the fetch client refuses', () => {
    expect(BAD_PORTS.has(1719)).toBe(true);
    expect(BAD_PORTS.has(1720)).toBe(true);
    expect(BAD_PORTS.has(6666)).toBe(true);
    expect(BAD_PORTS.has(10080)).toBe(true);
  });

  it('rejects forbidden and out-of-range ports', () => {
    expect(isForbiddenPort(1719)).toBe(true);
    expect(isForbiddenPort(0)).toBe(true);
    expect(isForbiddenPort(-1)).toBe(true);
    expect(isForbiddenPort(65536)).toBe(true);
    expect(isForbiddenPort(1.5)).toBe(true);
  });

  it('accepts ordinary ports', () => {
    expect(isForbiddenPort(4173)).toBe(false);
    expect(isForbiddenPort(9222)).toBe(false);
    expect(isForbiddenPort(65535)).toBe(false);
  });

  it('agrees with net about which ports are bindable', async () => {
    // The disagreement itself: 1719 binds fine and is still unusable.
    expect(await listen(1719)).toBe(true);
    expect(isForbiddenPort(1719)).toBe(true);
  });

  it('never returns a port the fetch client would reject', async () => {
    const port = await findSafePort(0, '127.0.0.1');
    expect(isForbiddenPort(port)).toBe(false);
    expect(port).toBeGreaterThan(0);
    expect(port).toBeLessThanOrEqual(65535);
  });

  it('uses the preferred port when it is free', async () => {
    const preferred = await findSafePort(0, '127.0.0.1');
    expect(await findSafePort(preferred, '127.0.0.1')).toBe(preferred);
  });

  it('falls back when the preferred port is taken', async () => {
    const held = net.createServer();
    await new Promise((resolve) => held.listen(0, '127.0.0.1', resolve));
    const busyPort = held.address().port;
    try {
      const chosen = await findSafePort(busyPort, '127.0.0.1');
      expect(chosen).not.toBe(busyPort);
      expect(isForbiddenPort(chosen)).toBe(false);
    } finally {
      await new Promise((resolve) => held.close(resolve));
    }
  });

  it('skips a forbidden preferred port instead of returning it', async () => {
    const chosen = await findSafePort(1719, '127.0.0.1');
    expect(chosen).not.toBe(1719);
    expect(isForbiddenPort(chosen)).toBe(false);
  });
});
