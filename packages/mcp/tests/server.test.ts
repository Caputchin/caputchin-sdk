import { describe, expect, it } from 'vitest';
import { createServer, LOCAL_TOOLS, TOOLS } from '../src/server.js';

describe('createServer', () => {
  it('throws when token missing in default mode', () => {
    expect(() => createServer({} as NodeJS.ProcessEnv)).toThrow(/CAPUTCHIN_TOKEN/);
  });

  it('starts in local-only mode without a token', () => {
    const server = createServer({} as NodeJS.ProcessEnv, { localOnly: true });
    expect(server).toBeTruthy();
  });

  it('starts in full mode with a token', () => {
    const server = createServer(
      { CAPUTCHIN_TOKEN: 'cpt_pat_test_token_value' } as NodeJS.ProcessEnv,
    );
    expect(server).toBeTruthy();
  });
});

describe('tool exports', () => {
  it('TOOLS catalog includes every bridge tool', () => {
    const names = TOOLS.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'caputchin_check_auth',
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
        'caputchin_get_account',
        'caputchin_change_email',
        'caputchin_list_sessions',
        'caputchin_revoke_session',
      ]),
    );
  });

  it('LOCAL_TOOLS catalog has snippet generators', () => {
    const names = LOCAL_TOOLS.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining(['caputchin_widget_snippet', 'caputchin_siteverify_example']),
    );
  });
});
