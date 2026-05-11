import { z } from 'zod';

/**
 * Local-only tools that need no Management API access. These run offline:
 * pure functions returning copy-paste snippets that help developers wire
 * Caputchin into a page or backend.
 */

export type LocalTool = {
  name: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  handler: (args: Record<string, unknown>) => Promise<string>;
};

const WIDGET_CDN_URL = 'https://cdn.jsdelivr.net/npm/@caputchin/widget@1/dist/widget.js';

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
    .describe('Pool of game ids — the widget picks one at random per challenge.'),
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
  if (lang === 'node' || lang === 'javascript' || lang === 'typescript') {
    return [
      '// Node 18+ (built-in fetch)',
      'const res = await fetch("https://api.caputchin.com/api/v1/siteverify", {',
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
      '    "https://api.caputchin.com/api/v1/siteverify",',
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
      '    "https://api.caputchin.com/api/v1/siteverify",',
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
      "$res = file_get_contents('https://api.caputchin.com/api/v1/siteverify', false, stream_context_create([",
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
    'curl -sS -X POST https://api.caputchin.com/api/v1/siteverify \\',
    '  -H "content-type: application/json" \\',
    '  -d "{\\"secret\\":\\"$CAPUTCHIN_SECRET\\",\\"response\\":\\"$TOKEN\\"}"',
  ].join('\n');
}

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
