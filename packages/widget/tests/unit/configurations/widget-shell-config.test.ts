import { describe, it, expect } from 'vitest';
import { buildWidgetShellConfig } from '../../../src/configurations/widget-shell-config.js';
import type { ResolvedConfig } from '@caputchin/game-sdk';

// The SERVER resolves the shell config. buildWidgetShellConfig adapts
// the resolved config → the typed WidgetShellConfig, with a bundled `default`
// fallback (brand strip link targets).
describe('buildWidgetShellConfig', () => {
  it('null resolved → bundled default link targets', () => {
    const c = buildWidgetShellConfig(null);
    expect(typeof c.values.home_link).toBe('string');
    expect(typeof c.values.legal_link).toBe('string');
  });

  it('applies the server-resolved config link targets', () => {
    const resolved = { home_link: 'https://acme.com', legal_link: 'https://acme.com/legal' } as unknown as ResolvedConfig;
    const c = buildWidgetShellConfig(resolved);
    expect(c.values.home_link).toBe('https://acme.com');
    expect(c.values.legal_link).toBe('https://acme.com/legal');
  });
});
