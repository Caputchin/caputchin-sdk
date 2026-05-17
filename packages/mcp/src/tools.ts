import { z } from 'zod';

/**
 * Shared tool definitions for the Caputchin MCP server.
 *
 * Each entry is { name, description, inputSchema, apiCall }:
 * - name, description, inputSchema describe the MCP tool surface
 * - apiCall describes how the management API is called (method + path-template
 *   + body-shape). The npm package uses fetch; the hosted platform mounts the
 *   same tool list against in-process handlers — both must keep this list in
 *   sync.
 */

export const NoArgs = z.object({}).strict();

export const SitesListInput = z.object({}).strict();

export const SiteCreateInput = z.object({
  name: z.string().min(1).describe('Human-readable label for the site.'),
  tier: z.enum(['free', 'paid']).optional().default('free'),
});

export const SiteIdInput = z.object({
  id: z.string().min(1).describe('Site id (e.g. `site_<base64url>`).'),
});

export const SiteUpdateInput = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  tier: z.enum(['free', 'paid']).optional(),
  disabled: z.boolean().optional().describe('When true the site stops accepting verification.'),
});

export const TokenCreateInput = z.object({
  name: z.string().min(1).describe('Friendly token name shown in the dashboard.'),
});

export const TokenIdInput = z.object({
  id: z.string().min(1).describe('Token id (e.g. `tok_<base64url>`).'),
});

export const HostedVerificationGetInput = z.object({
  site_id: z.string().min(1),
});

export const HostedVerificationPutInput = z.object({
  site_id: z.string().min(1),
  enabled: z.boolean(),
  webhook_url: z.string().url().nullable().optional(),
  email_to: z.string().email().nullable().optional(),
});

export const ChangeEmailInput = z.object({
  new_email: z.string().min(3).describe('New email address for the authed account.'),
});

export const SessionIdInput = z.object({
  id: z.string().min(1).describe('Dashboard session id.'),
});

export const CapConfigPatchInput = z.object({
  id: z.string().min(1).describe('Site id.'),
  difficulty: z.number().int().min(1).max(8).optional()
    .describe('PoW leading-zero target.'),
  challenge_count: z.number().int().min(1).max(500).optional()
    .describe('PoW challenges per request.'),
  obfuscation_level: z.number().int().min(1).max(10).optional()
    .describe('Instrumentation bundle obfuscation strength.'),
  block_automated_browsers: z.boolean().optional(),
  block_non_browser_ua: z.boolean().nullable().optional(),
  required_headers: z.array(z.string()).nullable().optional()
    .describe('Headers Cap requires on every request. Any header name accepted.'),
  ratelimit_max: z
    .number()
    .int()
    .min(1)
    .max(10000)
    .nullable()
    .optional()
    .describe(
      "Maximum requests per second (window is platform-locked at 1 second). Plan-capped — requests above the plan ceiling are rejected."
    ),
  cors_origins: z.array(z.string()).nullable().optional(),
});

export type ToolDef = {
  name: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  call: {
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    path: (args: Record<string, unknown>) => string;
    body?: (args: Record<string, unknown>) => unknown;
  };
};

export const TOOLS: ToolDef[] = [
  {
    name: 'caputchin_check_auth',
    description: 'Verify the management token and API host are valid; returns the site list on success.',
    inputSchema: NoArgs,
    call: { method: 'GET', path: () => '/api/v1/management/sites' },
  },
  {
    name: 'caputchin_list_sites',
    description: 'List all site keys owned by the authed account.',
    inputSchema: SitesListInput,
    call: { method: 'GET', path: () => '/api/v1/management/sites' },
  },
  {
    name: 'caputchin_create_site',
    description:
      'Create a new site key. The site secret is returned ONCE — store it. Origin allowlist (cors_origins) is managed separately via caputchin_update_site_cap_config.',
    inputSchema: SiteCreateInput,
    call: {
      method: 'POST',
      path: () => '/api/v1/management/sites',
      body: (a) => ({
        name: a.name,
        tier: a.tier,
      }),
    },
  },
  {
    name: 'caputchin_get_site',
    description: 'Fetch one site by id.',
    inputSchema: SiteIdInput,
    call: { method: 'GET', path: (a) => `/api/v1/management/sites/${encodeURIComponent(String(a.id))}` },
  },
  {
    name: 'caputchin_update_site',
    description:
      'Update a site (name, tier, disabled). Only supplied fields change. Origin allowlist (cors_origins) is managed separately via caputchin_update_site_cap_config.',
    inputSchema: SiteUpdateInput,
    call: {
      method: 'PATCH',
      path: (a) => `/api/v1/management/sites/${encodeURIComponent(String(a.id))}`,
      body: (a) => {
        const { id: _id, ...rest } = a;
        return rest;
      },
    },
  },
  {
    name: 'caputchin_delete_site',
    description: 'Delete a site. Permanent — no overlap window.',
    inputSchema: SiteIdInput,
    call: { method: 'DELETE', path: (a) => `/api/v1/management/sites/${encodeURIComponent(String(a.id))}` },
  },
  {
    name: 'caputchin_rotate_site_secret',
    description: 'Issue a new site secret for the site. The new secret is returned ONCE; the previous secret stops verifying immediately.',
    inputSchema: SiteIdInput,
    call: {
      method: 'POST',
      path: (a) => `/api/v1/management/sites/${encodeURIComponent(String(a.id))}/rotate-secret`,
    },
  },
  {
    name: 'caputchin_site_stats',
    description: 'Aggregate counts: sessions_started, sessions_client_completed, sessions_server_verified.',
    inputSchema: SiteIdInput,
    call: { method: 'GET', path: (a) => `/api/v1/management/sites/${encodeURIComponent(String(a.id))}/stats` },
  },
  {
    name: 'caputchin_get_site_cap_config',
    description:
      'Read the Cap-side config for a site (PoW difficulty/count, instrumentation obfuscation level, security filters, per-site rate limit, CORS).',
    inputSchema: SiteIdInput,
    call: {
      method: 'GET',
      path: (a) => `/api/v1/management/sites/${encodeURIComponent(String(a.id))}/cap-config`,
    },
  },
  {
    name: 'caputchin_update_site_cap_config',
    description:
      'Update Cap-side config for a site. Partial — only supplied fields change. `instrumentation` is platform-locked ON and cannot be set; `name` is set at mint and not customer-tunable.',
    inputSchema: CapConfigPatchInput,
    call: {
      method: 'PATCH',
      path: (a) => `/api/v1/management/sites/${encodeURIComponent(String(a.id))}/cap-config`,
      body: (a) => {
        const { id: _id, ...rest } = a;
        return rest;
      },
    },
  },
  {
    name: 'caputchin_list_tokens',
    description: 'List all active management tokens for the account (metadata only — value not returned).',
    inputSchema: NoArgs,
    call: { method: 'GET', path: () => '/api/v1/management/tokens' },
  },
  {
    name: 'caputchin_create_token',
    description: 'Issue a new management token. The full token value is returned ONCE.',
    inputSchema: TokenCreateInput,
    call: {
      method: 'POST',
      path: () => '/api/v1/management/tokens',
      body: (a) => ({ name: a.name }),
    },
  },
  {
    name: 'caputchin_revoke_token',
    description: 'Revoke a management token by id. Immediate; revoked tokens stop authenticating on the next request.',
    inputSchema: TokenIdInput,
    call: { method: 'DELETE', path: (a) => `/api/v1/management/tokens/${encodeURIComponent(String(a.id))}` },
  },
  {
    name: 'caputchin_get_hosted_verification',
    description: 'Fetch the hosted-verification configuration for a site (paid tier).',
    inputSchema: HostedVerificationGetInput,
    call: {
      method: 'GET',
      path: (a) => `/api/v1/management/hosted-verification/${encodeURIComponent(String(a.site_id))}`,
    },
  },
  {
    name: 'caputchin_set_hosted_verification',
    description: 'Set hosted-verification config (toggle, webhook URL, email destination). Paid tier only.',
    inputSchema: HostedVerificationPutInput,
    call: {
      method: 'PUT',
      path: (a) => `/api/v1/management/hosted-verification/${encodeURIComponent(String(a.site_id))}`,
      body: (a) => {
        const { site_id: _siteId, ...rest } = a;
        return rest;
      },
    },
  },
  {
    name: 'caputchin_test_hosted_verification',
    description:
      'Fire a synthetic verified-submission payload at the configured destinations for a site (paid tier only). Returns per-destination delivery status. Does not call cap or write replay-tracking.',
    inputSchema: HostedVerificationGetInput,
    call: {
      method: 'POST',
      path: (a) => `/api/v1/management/hosted-verification/${encodeURIComponent(String(a.site_id))}/test`,
    },
  },
  // me/* — account-self surfaces. Account-PAT or session cookie only;
  // team-PATs (when typing ships per ADR-0024) must be refused. See ADR-0027.
  {
    name: 'caputchin_get_account',
    description:
      "Fetch the authed account's metadata (id, email, created_at). Use this before proposing an email change so the new address differs from the current one.",
    inputSchema: NoArgs,
    call: { method: 'GET', path: () => '/api/v1/management/me/account' },
  },
  {
    name: 'caputchin_change_email',
    description:
      'Request an email change for the authed account. Sends a single-use confirmation link to the new address; the change applies only after the user clicks that link. This tool does NOT commit the change — the email is unchanged on return.',
    inputSchema: ChangeEmailInput,
    call: {
      method: 'PATCH',
      path: () => '/api/v1/management/me/email',
      body: (a) => ({ newEmail: a.new_email }),
    },
  },
  {
    name: 'caputchin_list_sessions',
    description:
      "List the authed account's active dashboard sessions (server-minted name, timestamps). PAT callers see `current: false` everywhere (no session-cookie concept).",
    inputSchema: NoArgs,
    call: { method: 'GET', path: () => '/api/v1/management/me/sessions' },
  },
  {
    name: 'caputchin_revoke_session',
    description:
      'Revoke one dashboard session by id. Ownership-enforced server-side: revoking another account\'s id returns 404. The session is signed out on its next request.',
    inputSchema: SessionIdInput,
    call: {
      method: 'DELETE',
      path: (a) => `/api/v1/management/me/sessions/${encodeURIComponent(String(a.id))}`,
    },
  },
];
