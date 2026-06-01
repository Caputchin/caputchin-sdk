import { describe, it, expect } from 'vitest';
import { createGamePresentation } from '../../../src/modes/game.js';
import { buildWidgetShell } from '../../../src/locale/widget-shell.js';
import { buildWidgetShellSkin } from '../../../src/skin/widget-shell-skin.js';
import { buildWidgetShellConfig } from '../../../src/configurations/widget-shell-config.js';

// Overlay (modal / fullscreen) layouts mask the entry shield back to clickable
// idle when the user dismisses the dialog mid-verify (so it reads as re-openable)
// WITHOUT discarding the session state - the game + cap keep running while
// hidden. Re-opening must restore the verifying indicator; otherwise the entry
// stays stuck at the idle ("start") state on re-entry. Regression guard for
// the modal close-then-reopen report.

function buildOverlay(layout: 'modal' | 'fullscreen') {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });
  const gp = createGamePresentation({
    host,
    root: shadow,
    trigger: 'click',
    width: 'auto',
    height: null,
    layout,
    shell: buildWidgetShell(null),
    skin: buildWidgetShellSkin(null),
    shellConfig: buildWidgetShellConfig(null),
  });
  gp.mount();
  // The entry shield carries the visible state via its `data-state` attribute.
  const shieldState = (): string | null =>
    shadow.querySelector('[part="simple-shield-box"]')?.getAttribute('data-state') ?? null;
  return { host, gp, shieldState };
}

describe.each(['modal', 'fullscreen'] as const)('overlay (%s) mid-verify dismissal', (layout) => {
  it('idle on mount', () => {
    const { host, shieldState } = buildOverlay(layout);
    expect(shieldState()).toBe('idle');
    host.remove();
  });

  it('restores verifying when re-opened after a mid-verify close', () => {
    const { host, gp, shieldState } = buildOverlay(layout);

    // First activation: dialog opens + verification starts (setState verifying).
    gp.open();
    gp.setState('verifying');
    expect(shieldState()).toBe('verifying');

    // Dismiss without finishing: entry masks back to clickable idle.
    gp.close();
    expect(shieldState()).toBe('idle');

    // Re-open: the session never stopped, so the indicator must come back.
    gp.open();
    expect(shieldState()).toBe('verifying');

    host.remove();
  });

  it('keeps a terminal state across close - re-open does not revert to verifying', () => {
    const { host, gp, shieldState } = buildOverlay(layout);
    gp.open();
    gp.setState('verifying');
    gp.setState('verified'); // terminal; overlay schedules an auto-close
    expect(shieldState()).toBe('verified');
    gp.close();
    // Terminal masks are left as-is on close (only verifying masks to idle).
    expect(shieldState()).toBe('verified');
    gp.open();
    expect(shieldState()).toBe('verified');
    host.remove();
  });
});
