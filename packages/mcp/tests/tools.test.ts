import { describe, expect, it } from 'vitest';
import { SiteCreateInput, TOOLS } from '../src/tools.js';

const SAMPLE_ARGS: Record<string, Record<string, unknown>> = {
  caputchin_check_auth: {},
  caputchin_list_sites: {},
  caputchin_create_site: {
    name: 'demo',
    allowed_domains: ['example.com'],
    tier: 'free',
  },
  caputchin_get_site: { id: 'site_abc' },
  caputchin_update_site: { id: 'site_abc', name: 'renamed', disabled: false },
  caputchin_delete_site: { id: 'site_abc' },
  caputchin_rotate_site_secret: { id: 'site_abc' },
  caputchin_site_stats: { id: 'site_abc' },
  caputchin_list_tokens: {},
  caputchin_create_token: { name: 'pat-1' },
  caputchin_revoke_token: { id: 'tok_abc' },
  caputchin_get_hosted_verification: { site_id: 'site_xyz' },
  caputchin_set_hosted_verification: {
    site_id: 'site_xyz',
    enabled: true,
    webhook_url: 'https://x.com/hook',
    webhook_secret: 'shh',
    email_to: 'alerts@example.com',
  },
  caputchin_get_account: {},
  caputchin_change_email: { new_email: 'new@example.com' },
  caputchin_list_sessions: {},
  caputchin_revoke_session: { id: 'sess_abc' },
};

describe('TOOLS catalog — path() factories', () => {
  for (const tool of TOOLS) {
    it(`${tool.name} returns a management API path`, () => {
      const args = SAMPLE_ARGS[tool.name];
      expect(args).toBeDefined();
      const path = tool.call.path(args!);
      expect(path).toMatch(/^\/api\/v1\/management\//);
    });
  }

  it('caputchin_get_site interpolates and URL-encodes id', () => {
    const tool = TOOLS.find((t) => t.name === 'caputchin_get_site')!;
    expect(tool.call.path({ id: 'site/special?id' })).toBe(
      '/api/v1/management/sites/site%2Fspecial%3Fid'
    );
  });

  it('caputchin_set_hosted_verification interpolates site_id', () => {
    const tool = TOOLS.find((t) => t.name === 'caputchin_set_hosted_verification')!;
    expect(tool.call.path({ site_id: 'site_x' })).toBe(
      '/api/v1/management/hosted-verification/site_x'
    );
  });

  it('caputchin_rotate_site_secret targets the rotate-secret subpath', () => {
    const tool = TOOLS.find((t) => t.name === 'caputchin_rotate_site_secret')!;
    expect(tool.call.path({ id: 'site_a' })).toBe(
      '/api/v1/management/sites/site_a/rotate-secret'
    );
  });

  it('caputchin_site_stats targets the stats subpath', () => {
    const tool = TOOLS.find((t) => t.name === 'caputchin_site_stats')!;
    expect(tool.call.path({ id: 'site_a' })).toBe(
      '/api/v1/management/sites/site_a/stats'
    );
  });
});

describe('TOOLS catalog — body() factories', () => {
  for (const tool of TOOLS) {
    if (!tool.call.body) continue;
    it(`${tool.name} returns a serializable object`, () => {
      const body = tool.call.body!(SAMPLE_ARGS[tool.name]!);
      expect(body).toBeDefined();
      expect(typeof body).toBe('object');
      expect(() => JSON.stringify(body)).not.toThrow();
    });
  }

  it('caputchin_create_site body defaults allowed_domains to []', () => {
    const tool = TOOLS.find((t) => t.name === 'caputchin_create_site')!;
    const body = tool.call.body!({ name: 'x' });
    expect(body).toMatchObject({ name: 'x', allowed_domains: [] });
  });

  it('SiteCreateInput schema defaults tier to free when omitted', () => {
    const parsed = SiteCreateInput.parse({ name: 'x' });
    expect(parsed.tier).toBe('free');
  });

  it('caputchin_update_site body strips id from request payload', () => {
    const tool = TOOLS.find((t) => t.name === 'caputchin_update_site')!;
    const body = tool.call.body!({ id: 'site_a', name: 'renamed', disabled: true });
    expect(body).not.toHaveProperty('id');
    expect(body).toEqual({ name: 'renamed', disabled: true });
  });

  it('caputchin_set_hosted_verification body strips site_id from request payload', () => {
    const tool = TOOLS.find((t) => t.name === 'caputchin_set_hosted_verification')!;
    const body = tool.call.body!({ site_id: 'site_x', enabled: true });
    expect(body).not.toHaveProperty('site_id');
    expect(body).toEqual({ enabled: true });
  });

  it('caputchin_create_token body forwards name only', () => {
    const tool = TOOLS.find((t) => t.name === 'caputchin_create_token')!;
    const body = tool.call.body!({ name: 'pat-1', extra: 'ignored' });
    expect(body).toEqual({ name: 'pat-1' });
  });
});

describe('TOOLS catalog — shape', () => {
  it('every tool has a method, path, and either no body or a body fn', () => {
    for (const tool of TOOLS) {
      expect(['GET', 'POST', 'PATCH', 'PUT', 'DELETE']).toContain(tool.call.method);
      expect(typeof tool.call.path).toBe('function');
      if (tool.call.body !== undefined) {
        expect(typeof tool.call.body).toBe('function');
      }
    }
  });

  it('exposes 17 management tools (sites/tokens/hosted-verification/me)', () => {
    expect(TOOLS.length).toBe(17);
  });

  it('me/* tools target /api/v1/management/me/* paths', () => {
    const me = TOOLS.filter((t) => t.call.path(SAMPLE_ARGS[t.name] ?? {}).startsWith('/api/v1/management/me/'));
    const names = me.map((t) => t.name).sort();
    expect(names).toEqual([
      'caputchin_change_email',
      'caputchin_get_account',
      'caputchin_list_sessions',
      'caputchin_revoke_session',
    ]);
  });

  it('caputchin_change_email body renames new_email → newEmail to match the route contract', () => {
    const tool = TOOLS.find((t) => t.name === 'caputchin_change_email')!;
    const body = tool.call.body!({ new_email: 'next@example.com' });
    expect(body).toEqual({ newEmail: 'next@example.com' });
  });

  it('caputchin_revoke_session URL-encodes the session id', () => {
    const tool = TOOLS.find((t) => t.name === 'caputchin_revoke_session')!;
    expect(tool.call.path({ id: 'sess/with?slash' })).toBe(
      '/api/v1/management/me/sessions/sess%2Fwith%3Fslash'
    );
  });
});
