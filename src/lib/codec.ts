// Browser-safe UTF-8 <-> base64. `Buffer` does not exist in the static bundle,
// and `btoa` alone mangles non-Latin1 text, so both directions go through bytes.

const CHUNK = 0x8000;

export function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function decodeBase64Utf8(base64: string): string {
  const clean = base64.replace(/\s/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

/**
 * Canonical JSON: object keys are sorted, array order is preserved.
 * Used for dirty detection and conflict content comparison so key insertion
 * order never turns into a phantom change.
 */
export function canonicalStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  const walk = (input: unknown): unknown => {
    if (input === null || typeof input !== 'object') return input;
    if (seen.has(input as object)) throw new TypeError('circular JSON');
    seen.add(input as object);
    try {
      if (Array.isArray(input)) return input.map(walk);
      const record = input as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(record).sort()) {
        if (record[key] !== undefined) out[key] = walk(record[key]);
      }
      return out;
    } finally {
      seen.delete(input as object);
    }
  };
  return JSON.stringify(walk(value));
}

export function canonicalEqual(a: unknown, b: unknown): boolean {
  return canonicalStringify(a) === canonicalStringify(b);
}
