export function promisify(f) {
  return function (...args) {
    return new Promise((resolve, reject) => {
      function callback(err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }
      args.push(callback);
      f.call(this, ...args);
    });
  };
}

export const TextEncoder = globalThis.TextEncoder;
export const TextDecoder = globalThis.TextDecoder;

export default {
  promisify,
  TextEncoder,
  TextDecoder
};
