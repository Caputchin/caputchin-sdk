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
  allowed_domains: z.array(z.string()).optional().describe('Origin allowlist for the widget.'),
  tier: z.enum(['free', 'paid']).optional().default('free'),
});

export const SiteIdInput = z.object({
  id: z.string().min(1).describe('Site id (e.g. `site_<base64url>`).'),
});

export const SiteUpdateInput = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  allowed_domains: z.array(z.string()).optional(),
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
  webhook_secret: z.string().optional().describe('Plaintext webhook signing secret (stored hashed; set once).'),
  email_to: z.string().email().nullable().optional(),
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
    description: 'Create a new site key. The site secret is returned ONCE — store it.',
    inputSchema: SiteCreateInput,
    call: {
      method: 'POST',
      path: () => '/api/v1/management/sites',
      body: (a) => ({
        name: a.name,
        allowed_domains: a.allowed_domains ?? [],
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
    description: 'Update a site (name, allowed_domains, tier, disabled). Only supplied fields change.',
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
    description: 'Set hosted-verification config (toggle, webhook URL, webhook secret, email destination). Paid tier only.',
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
];
