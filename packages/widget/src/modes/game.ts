import type { Presentation, PresentationState, PresentationFactoryInput } from './index.js';
import type { WidgetSize, WidgetTrigger } from '../config.js';
import { createSimplePresentation } from './simple.js';

/**
 * Game / game-only presentation. Wraps the iframe in a bordered panel and
 * embeds a simple-compact brand strip below for state feedback. (Modal/
 * fullscreen layouts add a separate checkbox-as-entry-point on top of the
 * panel and gate iframe mount until click — coming in the next pass.)
 *
 * State mapping:
 *   - `mode="game"`: verifying (cap starts) → verified (pass event = both
 *     cap done + game-pass arrived) → error.
 *   - `mode="game-only"`: idle (no cap) → verified (game-pass) → error.
 */
export interface GamePresentation extends Presentation {
  /** Where the iframe element should be appended by IframeHost. */
  getIframeSlot(): HTMLElement | null;
}

export function createGamePresentation(input: PresentationFactoryInput): GamePresentation {
  const { host, root: renderRoot } = input;

  let frame: HTMLDivElement | null = null;
  let iframeSlot: HTMLDivElement | null = null;
  let badgeSlot: HTMLDivElement | null = null;
  let subSimple: Presentation | null = null;

  function buildSubSimple(): Presentation {
    // Embedded brand strip: compact size, never click-driven (it's a passive
    // status display, no user interaction). Reuse simple presentation; mount
    // it into our badge slot instead of the shadow root directly.
    const subTrigger: WidgetTrigger = 'manual';
    const subSize: WidgetSize = 'compact';
    return createSimplePresentation({
      host,
      // Hand the simple presentation our badge slot as its render root.
      root: badgeSlot as unknown as ShadowRoot,
      trigger: subTrigger,
      width: 'full',
      size: subSize,
    });
  }

  return {
    mount(): void {
      if (frame) return;
      ensureGameStyles(renderRoot);

      frame = document.createElement('div');
      frame.setAttribute('part', 'game-frame');

      iframeSlot = document.createElement('div');
      iframeSlot.setAttribute('part', 'game-iframe-slot');

      badgeSlot = document.createElement('div');
      badgeSlot.setAttribute('part', 'game-badge-slot');

      frame.appendChild(iframeSlot);
      frame.appendChild(badgeSlot);
      renderRoot.appendChild(frame);

      // Mount the embedded simple presentation into the badge slot.
      subSimple = buildSubSimple();
      subSimple.mount();
      // The embedded pill is informational only — its idle state is misleading
      // for game contexts ("I'm not a robot" doesn't apply). The setState
      // calls below from the game presentation drive it directly; nothing
      // here listens for clicks on the sub-simple.
      subSimple.setState('verifying');
    },

    unmount(): void {
      if (!frame) return;
      subSimple?.unmount();
      frame.remove();
      frame = null;
      iframeSlot = null;
      badgeSlot = null;
      subSimple = null;
    },

    setState(state: PresentationState): void {
      subSimple?.setState(state);
    },

    onActivate(_handler: () => void): () => void {
      // Inline-only path doesn't have a clickable entry — the user activates
      // the game by interacting with the iframe contents directly.
      return () => {};
    },

    getIframeSlot(): HTMLElement | null {
      return iframeSlot;
    },
  };
}

const gameStylesInjected = new WeakSet<ShadowRoot>();
function ensureGameStyles(root: ShadowRoot): void {
  if (gameStylesInjected.has(root)) return;
  gameStylesInjected.add(root);
  const style = document.createElement('style');
  style.textContent = [
    // Bordered frame wrapping iframe + brand strip as a single visual unit.
    '[part="game-frame"]{display:flex;flex-direction:column;border:1px solid #d0d7de;border-radius:0.5rem;background:#fff;overflow:hidden;width:fit-content;max-width:100%;box-sizing:border-box}',
    '[part="game-iframe-slot"]{display:flex;flex-direction:column;width:100%}',
    '[part="game-iframe-slot"] iframe{display:block;width:100%;border:0;background:#fff}',
    // Brand strip sits flush at the bottom; thin separator from iframe above.
    '[part="game-badge-slot"]{display:flex;justify-content:flex-end;background:#fafbfc;border-top:1px solid #eaeef2;padding:0}',
    // Strip the sub-simple panel's own border — the frame already provides it.
    '[part="game-badge-slot"] [part="simple-checkbox"],',
    '[part="game-badge-slot"] [part="simple-pill"]{border:none;border-radius:0;background:transparent;padding:0.25rem 0.5rem}',
  ].join('');
  root.appendChild(style);
}
