import net from 'node:net';

/**
 * Ports that the fetch client refuses to connect to, even when something is
 * listening on them.
 *
 * The list is normative in the WHATWG URL Standard ("bad port"): a port whose
 * number is in it is rejected by `fetch` before any connection is attempted.
 * Node's `net`/`http` have no such restriction, so `net.listen` and `fetch`
 * disagree about which ports are legal. A port that is provably bindable is
 * not necessarily usable.
 */
export const BAD_PORTS = new Set([
  1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77, 79, 87, 95, 101, 102,
  103, 104, 109, 110, 111, 113, 115, 117, 119, 135, 139, 143, 161, 179, 185, 389, 427, 465, 512,
  513, 514, 515, 526, 530, 531, 532, 540, 548, 554, 556, 563, 587, 601, 636, 989, 990, 993, 995,
  1719, 1720, 1723, 2049, 3659, 4045, 5060, 5061, 6000, 6566, 6665, 6666, 6667, 6668, 6669, 6697,
  10080
]);

export function isForbiddenPort(port) {
  return !Number.isInteger(port) || port < 1 || port > 65535 || BAD_PORTS.has(port);
}

function tryListen(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(null));
    server.listen(port, host, () => {
      const address = server.address();
      server.close(() => resolve(address?.port ?? null));
    });
  });
}

/**
 * Finds a port that is free for the OS *and* acceptable to an HTTP client.
 *
 * `preferredPort` is tried first. Otherwise the OS is asked for an ephemeral
 * port, and bad ports are rejected and the request repeated.
 *
 * This exists because both halves matter:
 * - `net.listen(1719)` succeeds, so an OS-level probe alone accepts it;
 * - `fetch('http://127.0.0.1:1719/')` rejects it with `bad port`.
 */
export async function findSafePort(preferredPort, host, attempts = 20) {
  if (preferredPort) {
    const candidate = await tryListen(preferredPort, host);
    if (candidate && !isForbiddenPort(candidate)) {
      return candidate;
    }
  }

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const candidate = await tryListen(0, host);
    if (candidate && !isForbiddenPort(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Unable to find a usable port on ${host} after ${attempts} attempts.`);
}
