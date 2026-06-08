import { z } from 'zod';

import { resolveVerifyHost } from './api.js';

/**
 * Local-only tools that need no Management API access. These run offline:
 * pure functions returning copy-paste snippets that help developers wire
 * Caputchin into a page or backend.
 */

/**
 * Descriptor for one local (offline) MCP tool. Registered in
 * {@link LOCAL_TOOLS} and served by `createServer` without any API call.
 */
export type LocalTool = {
  /** MCP tool name (snake_case, e.g. `"caputchin_widget_snippet"`). */
  name: string;
  /** Human-readable description surfaced in MCP `tools/list` responses. */
  description: string;
  /** Zod schema used to validate the tool's input arguments before calling `handler`. */
  inputSchema: z.ZodTypeAny;
  /**
   * Execute the tool.
   * @param args - Raw (unvalidated) arguments from the MCP caller. The
   *   implementation is responsible for parsing via `inputSchema`.
   * @returns Rendered text content to return as the tool result.
   */
  handler: (args: Record<string, unknown>) => Promise<string>;
};

const WIDGET_CDN_URL = 'https://cdn.jsdelivr.net/npm/@caputchin/widget@3/dist/widget.js';

export const WidgetSnippetInput = z.object({
  sitekey: z
    .string()
    .regex(/^cpt_pub_[A-Za-z0-9_-]+$/, 'site key must match `^cpt_pub_[A-Za-z0-9_-]+$`')
    .describe('Public site key (cpt_pub_...) from the Caputchin dashboard.'),
  game: z
    .string()
    .min(1)
    .nullable()
    .optional()
    .describe('Marketplace game id, or omit for the invisible default mode.'),
  games: z
    .array(z.string().min(1))
    .optional()
    .describe('Pool of game ids; the widget picks one at random per challenge.'),
  mode: z
    .enum(['auto', 'form-submit', 'manual'])
    .optional()
    .describe('Widget interaction mode. Defaults to `auto`.'),
});

export const SiteverifyExampleInput = z.object({
  language: z
    .enum(['node', 'javascript', 'typescript', 'python', 'go', 'php', 'curl'])
    .describe('Target backend language for the /siteverify snippet.'),
});

export function renderWidgetSnippet(args: z.infer<typeof WidgetSnippetInput>): string {
  const attrs: string[] = [`sitekey="${args.sitekey}"`];
  if (args.game) attrs.push(`game="${args.game}"`);
  if (args.games && args.games.length > 0) attrs.push(`games="${args.games.join(',')}"`);
  if (args.mode && args.mode !== 'auto') attrs.push(`mode="${args.mode}"`);
  return [
    `<script src="${WIDGET_CDN_URL}"></script>`,
    `<caputchin-widget ${attrs.join(' ')}></caputchin-widget>`,
  ].join('\n');
}

export function renderSiteverifyExample(args: z.infer<typeof SiteverifyExampleInput>): string {
  const lang = args.language;
  // Single source for the endpoint URL across every language snippet, derived
  // from the env-overridable verification host (CAPUTCHIN_VERIFY_HOST), so a
  // staging or self-hosted MCP emits matching examples instead of the public
  // default. siteverify lives on the public data plane (verify.caputchin.com),
  // a different host from the control plane that serves /mcp.
  const siteverifyUrl = `${resolveVerifyHost()}/v1/siteverify`;
  if (lang === 'node' || lang === 'javascript' || lang === 'typescript') {
    return [
      '// Node 18+ (built-in fetch)',
      `const res = await fetch("${siteverifyUrl}", {`,
      '  method: "POST",',
      '  headers: { "content-type": "application/json" },',
      '  body: JSON.stringify({ secret: process.env.CAPUTCHIN_SECRET, response: token }),',
      '});',
      'const verdict = await res.json();',
      'if (!verdict.success) throw new Error(verdict["error-codes"].join(","));',
    ].join('\n');
  }
  if (lang === 'python') {
    return [
      'import os, requests',
      'res = requests.post(',
      `    "${siteverifyUrl}",`,
      '    json={"secret": os.environ["CAPUTCHIN_SECRET"], "response": token},',
      '    timeout=10,',
      ')',
      'verdict = res.json()',
      'if not verdict.get("success"):',
      '    raise RuntimeError(verdict.get("error-codes"))',
    ].join('\n');
  }
  if (lang === 'go') {
    return [
      'body, _ := json.Marshal(map[string]string{',
      '    "secret":   os.Getenv("CAPUTCHIN_SECRET"),',
      '    "response": token,',
      '})',
      'res, err := http.Post(',
      `    "${siteverifyUrl}",`,
      '    "application/json",',
      '    bytes.NewReader(body),',
      ')',
      'if err != nil { return err }',
      'defer res.Body.Close()',
      'var verdict struct{ Success bool `json:"success"` }',
      'json.NewDecoder(res.Body).Decode(&verdict)',
      'if !verdict.Success { return fmt.Errorf("captcha failed") }',
    ].join('\n');
  }
  if (lang === 'php') {
    return [
      `$res = file_get_contents('${siteverifyUrl}', false, stream_context_create([`,
      "    'http' => [",
      "        'method'  => 'POST',",
      "        'header'  => 'content-type: application/json',",
      "        'content' => json_encode([",
      "            'secret'   => getenv('CAPUTCHIN_SECRET'),",
      "            'response' => $token,",
      '        ]),',
      '    ],',
      ']));',
      '$verdict = json_decode($res, true);',
      "if (!$verdict['success']) {",
      "    throw new Exception(implode(',', $verdict['error-codes']));",
      '}',
    ].join('\n');
  }
  // curl
  return [
    `curl -sS -X POST ${siteverifyUrl} \\`,
    '  -H "content-type: application/json" \\',
    '  -d "{\\"secret\\":\\"$CAPUTCHIN_SECRET\\",\\"response\\":\\"$TOKEN\\"}"',
  ].join('\n');
}

/**
 * All offline (no-auth) MCP tools bundled with this package. `createServer`
 * registers every entry here regardless of whether `CAPUTCHIN_TOKEN` is set.
 * Currently includes `caputchin_widget_snippet` (HTML mount snippet) and
 * `caputchin_siteverify_example` (backend verification code sample).
 */
export const LOCAL_TOOLS: LocalTool[] = [
  {
    name: 'caputchin_widget_snippet',
    description:
      'Generate an HTML snippet that mounts the Caputchin widget on a page. Offline; no API call.',
    inputSchema: WidgetSnippetInput,
    handler: async (args) =>
      renderWidgetSnippet(WidgetSnippetInput.parse(args)),
  },
  {
    name: 'caputchin_siteverify_example',
    description:
      'Generate a copy-paste /siteverify backend verification snippet for a target language (node, python, go, php, curl).',
    inputSchema: SiteverifyExampleInput,
    handler: async (args) =>
      renderSiteverifyExample(SiteverifyExampleInput.parse(args)),
  },
];
