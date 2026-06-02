// fflate/browser is the worker-less build; the bare 'fflate' entry pulls in
// worker_threads/createRequire (node) which leak into a browser/isolate bundle.
import { gunzipSync } from 'fflate/browser';

// No return annotation: inference keeps the concrete `Uint8Array<ArrayBuffer>`
// (a fresh-buffer array), which `Blob`/`DecompressionStream` require; annotating
// the bare `Uint8Array` widens it to `ArrayBufferLike` and breaks BlobPart.
function base64ToBytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Decode a gzip+base64-inlined WASM payload back to its exact bytes.
 *
 * A game's live build inlines its WASM as a string (the game iframe's CSP is
 * `connect-src 'none'`, so it cannot fetch a `.wasm`) and gzips it to stay under
 * the marketplace bundle gate. This reverses both: base64 decode, then gunzip.
 * Uses the native {@link DecompressionStream} where available (fast), and falls
 * back to fflate for runtimes without it.
 *
 * @param b64 - the gzip-then-base64 payload emitted at build time.
 * @returns the original uncompressed WASM bytes.
 */
export async function inflateWasm(b64: string): Promise<Uint8Array> {
  const gz = base64ToBytes(b64);
  if (typeof DecompressionStream !== 'undefined') {
    const stream = new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  return gunzipSync(gz);
}
