import type { SkinSchemaEntry, SkinValueType } from '@caputchin/game-sdk';

/** Per-type allow-list of file extensions (no leading dot) for asset URLs.
 *  Mirrors the documented `caputchin.json` `skins.schema` contract. */
const EXTENSION_ALLOW: Record<Exclude<SkinValueType, 'color'>, ReadonlySet<string>> = {
  image: new Set(['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif']),
  audio: new Set(['mp3', 'ogg', 'wav']),
  video: new Set(['mp4', 'webm']),
};

/** Per-type allow-list of MIME prefixes for `data:` URIs. The match is
 *  prefix-based against everything before the first `;` or `,`. */
const DATA_MIME_ALLOW: Record<Exclude<SkinValueType, 'color'>, ReadonlySet<string>> = {
  image: new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']),
  audio: new Set(['audio/mpeg', 'audio/ogg', 'audio/wav']),
  video: new Set(['video/mp4', 'video/webm']),
};

/** Color regex: matches hex (`#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`) and the
 *  two functional CSS forms `rgb(...)` and `rgba(...)`. Deliberately narrow
 *  — no `hsl()`, no `oklch()`, no named colors. */
const COLOR_REGEX = /^(#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgb\(\s*[^)]+\)|rgba\(\s*[^)]+\))$/;

/** Asset URL scheme allow-list. Everything else (notably `javascript:`,
 *  `vbscript:`, `file:`, `about:`) is rejected at resolve time so a
 *  customer-supplied inline JSON can never inject an executable scheme via
 *  a key declared as `image` / `audio` / `video`. The `data:` scheme is
 *  matched separately so the per-type MIME allow-list can run. Bare
 *  relative paths (no scheme) pass through to the extension allow-list. */
const ASSET_SCHEME_REGEX = /^([a-z][a-z0-9+.-]*):/i;
const ASSET_SCHEME_ALLOW: ReadonlySet<string> = new Set(['http', 'https']);

export type ValidationResult = { ok: true } | { ok: false; reason: string };

/** Read the type out of a schema entry. Both bare type-string and full
 *  descriptor forms are legal in the same schema block; this normalizes. */
export function schemaTypeOf(entry: SkinSchemaEntry | undefined): SkinValueType | null {
  if (!entry) return null;
  if (typeof entry === 'string') return entry;
  if (typeof entry === 'object' && entry !== null && typeof entry.type === 'string') {
    return entry.type;
  }
  return null;
}

/** Validate a skin value against its declared type. Caller drops the key
 *  from the resolved object on `ok:false` and surfaces `reason` via an
 *  `invalid-config` event. */
export function validateSkinValue(type: SkinValueType, value: string): ValidationResult {
  if (type === 'color') {
    return COLOR_REGEX.test(value)
      ? { ok: true }
      : { ok: false, reason: `not a valid color (expected hex or rgb()/rgba())` };
  }

  // Asset types: image / audio / video. Scheme check FIRST so a
  // `javascript:alert.png` style payload can't pass the extension allow-list
  // by smuggling a fake `.png` after the scheme. `data:` is its own branch
  // with the per-MIME allow-list. `//proto-relative.example/x.png` and bare
  // relative paths (no scheme) skip to the extension check unchanged.
  if (value.startsWith('data:')) {
    const mimeEnd = value.indexOf(';');
    const commaEnd = value.indexOf(',');
    const cut = mimeEnd === -1 ? commaEnd : (commaEnd === -1 ? mimeEnd : Math.min(mimeEnd, commaEnd));
    const mime = cut === -1 ? '' : value.slice(5, cut).toLowerCase();
    if (!mime) {
      return { ok: false, reason: `data: URI missing MIME type for type ${type}` };
    }
    return DATA_MIME_ALLOW[type].has(mime)
      ? { ok: true }
      : { ok: false, reason: `data: MIME "${mime}" not allowed for type ${type}` };
  }
  const schemeMatch = ASSET_SCHEME_REGEX.exec(value);
  if (schemeMatch) {
    const scheme = schemeMatch[1]!.toLowerCase();
    if (!ASSET_SCHEME_ALLOW.has(scheme)) {
      return { ok: false, reason: `scheme "${scheme}:" not allowed for type ${type} (only http / https / data are accepted)` };
    }
  }

  // Treat URL paths case-insensitively; strip query + hash before checking ext.
  const cleaned = value.split('?')[0]!.split('#')[0]!;
  const dot = cleaned.lastIndexOf('.');
  if (dot === -1 || dot === cleaned.length - 1) {
    return { ok: false, reason: `no file extension on "${value}" for type ${type}` };
  }
  const ext = cleaned.slice(dot + 1).toLowerCase();
  return EXTENSION_ALLOW[type].has(ext)
    ? { ok: true }
    : { ok: false, reason: `extension ".${ext}" not allowed for type ${type}` };
}
