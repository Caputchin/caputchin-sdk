import * as v from 'valibot';
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
 *  two functional CSS forms `rgb(...)` and `rgba(...)`. Deliberately narrow:
 *  no `hsl()`, no `oklch()`, no named colors. */
const COLOR_REGEX = /^(#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgb\(\s*[^)]+\)|rgba\(\s*[^)]+\))$/;

/** Asset URL scheme allow-list. Everything else (notably `javascript:`,
 *  `vbscript:`, `file:`, `about:`) is rejected so a customer-supplied inline
 *  JSON can never inject an executable scheme via a key declared as
 *  `image` / `audio` / `video`. The `data:` scheme is matched separately so
 *  the per-type MIME allow-list can run. Bare relative paths (no scheme)
 *  pass through to the extension allow-list. */
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

/** Build the per-type validator schema once. Valibot handles the surface
 *  form + error messages; custom logic (allow-lists for schemes +
 *  extensions + data: MIMEs) runs inside a `rawCheck` step where the
 *  library's primitives can't express the rule directly. Valibot's
 *  functional + tree-shakable API keeps the bundle delta tiny vs zod. */
const colorSchema = v.pipe(
  v.string(),
  v.regex(COLOR_REGEX, 'not a valid color (expected hex or rgb()/rgba())'),
);

function buildAssetSchema(type: Exclude<SkinValueType, 'color'>) {
  return v.pipe(
    v.string(),
    v.rawCheck(({ dataset, addIssue }) => {
      if (dataset.typed !== true) return;
      const value = dataset.value;
      // data: URI branch first so a benign data:image/png passes without
      // colliding with the scheme allow-list (which only permits http/https).
      if (value.startsWith('data:')) {
        const mimeEnd = value.indexOf(';');
        const commaEnd = value.indexOf(',');
        const cut = mimeEnd === -1 ? commaEnd : (commaEnd === -1 ? mimeEnd : Math.min(mimeEnd, commaEnd));
        const mime = cut === -1 ? '' : value.slice(5, cut).toLowerCase();
        if (!mime) {
          addIssue({ message: `data: URI missing MIME type for type ${type}` });
          return;
        }
        if (!DATA_MIME_ALLOW[type].has(mime)) {
          addIssue({ message: `data: MIME "${mime}" not allowed for type ${type}` });
        }
        return;
      }
      // Scheme allow-list runs before the extension check so a
      // `javascript:alert.png` style payload (fake `.png` ext after the
      // scheme) can never sneak through.
      const schemeMatch = ASSET_SCHEME_REGEX.exec(value);
      if (schemeMatch) {
        const scheme = schemeMatch[1]!.toLowerCase();
        if (!ASSET_SCHEME_ALLOW.has(scheme)) {
          addIssue({
            message: `scheme "${scheme}:" not allowed for type ${type} (only http / https / data are accepted)`,
          });
          return;
        }
      }
      // URL paths: strip query + hash before checking ext. Treat extensions
      // case-insensitively per HTTP convention.
      const cleaned = value.split('?')[0]!.split('#')[0]!;
      const dot = cleaned.lastIndexOf('.');
      if (dot === -1 || dot === cleaned.length - 1) {
        addIssue({ message: `no file extension on "${value}" for type ${type}` });
        return;
      }
      const ext = cleaned.slice(dot + 1).toLowerCase();
      if (!EXTENSION_ALLOW[type].has(ext)) {
        addIssue({ message: `extension ".${ext}" not allowed for type ${type}` });
      }
    }),
  );
}

const ASSET_SCHEMAS = {
  image: buildAssetSchema('image'),
  audio: buildAssetSchema('audio'),
  video: buildAssetSchema('video'),
} as const;

/** Validate a skin value against its declared type. Caller drops the key
 *  from the resolved object on `ok:false` and surfaces `reason` via an
 *  `invalid-config` event. */
export function validateSkinValue(type: SkinValueType, value: string): ValidationResult {
  const schema = type === 'color' ? colorSchema : ASSET_SCHEMAS[type];
  const result = v.safeParse(schema, value);
  if (result.success) return { ok: true };
  // Valibot packs structured issues; the resolver only surfaces the first
  // human-readable message into the host-page `invalid-config` event.
  const issue = result.issues[0];
  return { ok: false, reason: issue?.message ?? 'invalid value' };
}
