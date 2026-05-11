import { describe, expect, it } from 'vitest';
import {
  HostedVerificationPutInput,
  SiteCreateInput,
  SiteIdInput,
  SiteUpdateInput,
  TOOLS,
  TokenCreateInput,
} from './tools.js';

describe('TOOLS catalogue', () => {
  it('declares the 13 management tools at MVP', () => {
    expect(TOOLS).toHaveLength(13);
    const names = TOOLS.map((t) => t.name);
    for (const n of [
      'caputchin_ping',
      'caputchin_list_sites',
      'caputchin_create_site',
      'caputchin_get_site',
      'caputchin_update_site',
      'caputchin_delete_site',
      'caputchin_rotate_site_secret',
      'caputchin_site_stats',
      'caputchin_list_tokens',
      'caputchin_create_token',
      'caputchin_revoke_token',
      'caputchin_get_hosted_verification',
      'caputchin_set_hosted_verification',
    ]) {
      expect(names).toContain(n);
    }
  });

  it('each tool has name + description + inputSchema + call', () => {
    for (const t of TOOLS) {
      expect(typeof t.name).toBe('string');
      expect(typeof t.description).toBe('string');
      expect(t.inputSchema).toBeDefined();
      expect(t.call).toBeDefined();
      expect(['GET', 'POST', 'PATCH', 'PUT', 'DELETE']).toContain(t.call.method);
      expect(typeof t.call.path({})).toBe('string');
    }
  });

  it('path interpolation encodes URL components', () => {
    const tool = TOOLS.find((t) => t.name === 'caputchin_get_site')!;
    const path = tool.call.path({ id: 'site_with/slash' });
    expect(path).toBe('/api/v1/management/sites/site_with%2Fslash');
  });
});

describe('zod input schemas', () => {
  it('SiteCreateInput accepts name only; tier defaults to free', () => {
    const parsed = SiteCreateInput.parse({ name: 'My Site' });
    expect(parsed.name).toBe('My Site');
    expect(parsed.tier).toBe('free');
  });

  it('SiteCreateInput rejects missing name', () => {
    expect(() => SiteCreateInput.parse({})).toThrow();
  });

  it('SiteCreateInput accepts allowed_domains array', () => {
    const parsed = SiteCreateInput.parse({
      name: 'x',
      allowed_domains: ['example.com', 'app.example.com'],
    });
    expect(parsed.allowed_domains).toEqual(['example.com', 'app.example.com']);
  });

  it('SiteIdInput rejects empty id', () => {
    expect(() => SiteIdInput.parse({ id: '' })).toThrow();
  });

  it('SiteUpdateInput requires id; other fields optional', () => {
    expect(SiteUpdateInput.parse({ id: 'site_x' })).toEqual({ id: 'site_x' });
    expect(() => SiteUpdateInput.parse({})).toThrow();
  });

  it('TokenCreateInput rejects empty name', () => {
    expect(() => TokenCreateInput.parse({ name: '' })).toThrow();
  });

  it('HostedVerificationPutInput rejects bad webhook URL', () => {
    expect(() =>
      HostedVerificationPutInput.parse({
        site_id: 'site_x',
        enabled: true,
        webhook_url: 'not-a-url',
      }),
    ).toThrow();
  });

  it('HostedVerificationPutInput accepts nullable webhook + email', () => {
    const parsed = HostedVerificationPutInput.parse({
      site_id: 'site_x',
      enabled: false,
      webhook_url: null,
      email_to: null,
    });
    expect(parsed.webhook_url).toBeNull();
    expect(parsed.email_to).toBeNull();
  });

  it('HostedVerificationPutInput rejects malformed email', () => {
    expect(() =>
      HostedVerificationPutInput.parse({
        site_id: 'site_x',
        enabled: true,
        email_to: 'not-an-email',
      }),
    ).toThrow();
  });
});
