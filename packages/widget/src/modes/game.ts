import type { Presentation, PresentationState } from './index.js';
import type { WidgetTrigger, WidgetWidth, WidgetHeight, WidgetSize } from '../config/shared.js';
import { createSimplePresentation } from './simple.js';
import { emitDialogShown, emitDialogHidden } from '../verify/events.js';

/**
 * Game presentation for `<caputchin-game>`. Three layouts:
 *
 * - **inline**: bordered panel with iframe + simple-compact brand strip flush
 *   below. Brand strip doubles as state indicator.
 * - **modal**: simple-normal checkbox as the visible entry. Click opens a
 *   centered modal dialog with the iframe inside.
 * - **fullscreen**: simple-normal checkbox as entry. Click opens a fullscreen
 *   overlay with the iframe + a close button.
 *
 * State driven by the game widget's `runGame` orchestrator: cap+game flips
 * to `verified` on cap.solve + game-pass; game-only flips on game-pass alone.
 */
export interface GamePresentation extends Presentation {
  /** Where the iframe element should be appended by IframeHost. */
  getIframeSlot(): HTMLElement | null;
  /** Open the overlay (modal/fullscreen). No-op for inline. */
  open(): void;
  /** Close the overlay. No-op for inline. */
  close(): void;
}

export interface GamePresentationInput {
  /** The custom-element host (used for host-level styling like full-width). */
  host: HTMLElement;
  /** Shadow root where DOM is appended. */
  root: ShadowRoot;
  /** Derived implicit trigger (inline → auto, modal/fullscreen → click).
   *  For manual mode the trigger value here is what the simple-presentation
   *  should render (still click for modal/fullscreen so the user gets the
   *  entry checkbox; auto for inline since there's no entry surface). */
  trigger: WidgetTrigger;
  /** Customer's `width` attr. Applied to the OUTER chrome (inline frame
   *  or modal/fullscreen entry checkbox), not the iframe. */
  width: WidgetWidth;
  /** Customer's `height` attr. Same routing as width — outer chrome only. */
  height: WidgetHeight;
  layout: 'inline' | 'modal' | 'fullscreen';
  /** When true: render a `<slot></slot>` in place of the iframe slot so
   *  customer light-DOM children project into the layout chrome. The
   *  element skips iframe construction entirely. */
  manual?: boolean;
}

export function createGamePresentation(input: GamePresentationInput): GamePresentation {
  if (input.layout === 'inline') return createInlineGame(input);
  return createOverlayGame(input);
}

// ---------------- inline ----------------

function createInlineGame(input: GamePresentationInput): GamePresentation {
  const { host, root: renderRoot, width, height, manual } = input;
  const isFullWidth = width === 'full';
  const pxWidth = typeof width === 'number' ? width : null;
  const pxHeight = typeof height === 'number' ? height : null;
  let frame: HTMLDivElement | null = null;
  let iframeSlot: HTMLDivElement | null = null;
  let badgeSlot: HTMLDivElement | null = null;
  let subSimple: Presentation | null = null;

  return {
    mount(): void {
      if (frame) return;
      ensureGameStyles(renderRoot);

      frame = document.createElement('div');
      frame.setAttribute('part', 'game-frame');
      frame.dataset.layout = 'inline';
      if (isFullWidth) frame.dataset.width = 'full';

      iframeSlot = document.createElement('div');
      iframeSlot.setAttribute('part', 'game-iframe-slot');
      if (manual) {
        // Customer-hosted game: project light-DOM children of <caputchin-game>
        // into the iframe slot's position. Tagged with part="game-slot" so
        // customers can ::part() target the projection container.
        const slot = document.createElement('slot');
        slot.setAttribute('part', 'game-slot');
        iframeSlot.appendChild(slot);
      }

      badgeSlot = document.createElement('div');
      badgeSlot.setAttribute('part', 'game-badge-slot');

      frame.appendChild(iframeSlot);
      frame.appendChild(badgeSlot);
      renderRoot.appendChild(frame);

      // Per spec: inline game frame embeds a standalone simple × compact × auto
      // widget below the iframe. No style overrides — it looks like a regular
      // cap widget the customer might place on the page elsewhere.
      subSimple = createSimplePresentation({
        host,
        root: badgeSlot as unknown as ShadowRoot,
        trigger: 'auto' as WidgetTrigger,
        // Full-width so the strip spans the game-frame edge to edge, flush
        // with the iframe panel above. Brand still hugs the right via the
        // margin-left:auto rule in simple.ts.
        width: 'full',
        size: 'compact' as WidgetSize,
      });
      subSimple.mount();

      // Customer width/height apply to the WHOLE inline panel (iframe + brand
      // strip), not the iframe. Iframe-slot becomes flex:1 so the iframe
      // fills the remaining area; brand strip stays its compact natural
      // height. Reapplied AFTER subSimple.mount() because subSimple's
      // width:'full' branch sets host.style.width='100%' which would
      // otherwise overwrite the customer's pixel width.
      if (isFullWidth) {
        host.style.display = 'block';
        host.style.width = '100%';
      } else if (pxWidth !== null) {
        host.style.display = 'block';
        host.style.width = `${pxWidth}px`;
        frame.style.width = '100%';
        iframeSlot.dataset.fill = 'true';
      }
      if (pxHeight !== null) {
        host.style.display ||= 'block';
        host.style.height = `${pxHeight}px`;
        frame.style.height = '100%';
        iframeSlot.style.flex = '1 1 auto';
        iframeSlot.style.minHeight = '0';
        iframeSlot.style.overflow = 'hidden';
        iframeSlot.dataset.fill = 'true';
      }
    },
    unmount(): void {
      if (!frame) return;
      subSimple?.unmount();
      frame.remove();
      if (isFullWidth || pxWidth !== null || pxHeight !== null) {
        host.style.display = '';
        host.style.width = '';
        host.style.height = '';
      }
      frame = null;
      iframeSlot = null;
      badgeSlot = null;
      subSimple = null;
    },
    setState(state: PresentationState): void {
      subSimple?.setState(state);
    },
    onActivate(_handler: () => void): () => void {
      return () => {};
    },
    getIframeSlot(): HTMLElement | null {
      return iframeSlot;
    },
    open(): void {},
    close(): void {},
  };
}

// ---------------- modal / fullscreen overlay ----------------

let dialogIdCounter = 0;

/** Send a `visibility` message to the mounted iframe so its runtime can
 *  suspend / resume any AudioContexts. Game logic itself keeps running. */
function signalVisibility(slot: HTMLElement | null, visible: boolean): void {
  if (!slot) return;
  const iframe = slot.querySelector('iframe');
  if (!iframe || !iframe.contentWindow) return;
  try {
    iframe.contentWindow.postMessage({ kind: 'visibility', seq: 0, visible }, '*');
  } catch { /* iframe gone or detached */ }
}

function createOverlayGame(input: GamePresentationInput): GamePresentation {
  const { host, root: renderRoot, layout, manual, width, height } = input;
  let container: HTMLDivElement | null = null;
  let checkboxSlot: HTMLDivElement | null = null;
  let dialog: HTMLDialogElement | null = null;
  let iframeSlot: HTMLDivElement | null = null;
  let subSimple: Presentation | null = null;
  const activateListeners: Array<() => void> = [];
  let backdropWired = false;
  // Latched once the user makes the first activation. Subsequent activations
  // (re-opens after a close-mid-verify) just open the dialog — they must not
  // re-fire the trigger callbacks that start a second verification session.
  let firstActivationFired = false;
  // Mirrors the most recent state passed to setState. Used in close() to
  // decide whether to revert the simple-shield back to clickable idle when
  // the user dismisses the dialog before the game finishes.
  let logicalState: PresentationState = 'idle';

  function fireActivate(): void {
    for (const h of activateListeners) h();
  }

  return {
    mount(): void {
      if (container) return;
      ensureGameStyles(renderRoot);

      container = document.createElement('div');
      container.setAttribute('part', 'game-overlay-host');

      // Click-to-open entry — visually the simple-normal checkbox UI.
      // Sub-simple is mounted with trigger='click' so it shows the checkbox
      // shape; we wire our own onActivate on top to open the dialog.
      checkboxSlot = document.createElement('div');
      checkboxSlot.setAttribute('part', 'game-overlay-checkbox');
      container.appendChild(checkboxSlot);

      // Dialog with iframe slot. Built once, never re-parented — moving the
      // iframe between DOM nodes reloads its srcdoc.
      dialog = document.createElement('dialog');
      dialog.setAttribute('part', 'game-overlay-dialog');
      dialog.dataset.layout = layout;
      dialog.id = `cpt-overlay-${++dialogIdCounter}`;

      if (layout === 'fullscreen') {
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.setAttribute('part', 'game-overlay-close');
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => this.close());
        dialog.appendChild(closeBtn);
      }

      iframeSlot = document.createElement('div');
      iframeSlot.setAttribute('part', 'game-iframe-slot');
      if (manual) {
        // Customer-hosted game: project light-DOM children into the dialog.
        const slot = document.createElement('slot');
        slot.setAttribute('part', 'game-slot');
        iframeSlot.appendChild(slot);
      }
      dialog.appendChild(iframeSlot);

      // Native `close` event fires for every dismissal path (Escape key,
      // backdrop click, button close, programmatic close). Centralize the
      // post-close work here so all paths revert the shield + mute audio
      // consistently. Also surface a `dialog-hidden` event for customers
      // (especially manual mode where their slotted game needs to know).
      dialog.addEventListener('close', () => {
        signalVisibility(iframeSlot, false);
        if (logicalState === 'verifying') {
          logicalState = 'idle';
          subSimple?.setState('idle');
        }
        emitDialogHidden(host, layout as 'modal' | 'fullscreen');
      });

      container.appendChild(dialog);
      renderRoot.appendChild(container);

      // Customer width/height on overlay layouts size the entry checkbox
      // (not the dialog or iframe). Plumb both through to the simple
      // presentation, which applies them to the host element.
      subSimple = createSimplePresentation({
        host,
        root: checkboxSlot as unknown as ShadowRoot,
        trigger: 'click' as WidgetTrigger,
        width,
        height,
        // Overlay (modal / fullscreen) always uses the normal checkbox.
        // Inline uses compact (hardcoded in createInlineGame).
        size: 'normal' as WidgetSize,
      });
      subSimple.mount();
      // Pin checkboxSlot to the customer dims so the simple presentation's
      // internal width:100% / height:100% root fills the entry surface
      // instead of shrinking to its intrinsic checkbox-and-brand width.
      if (typeof width === 'number') checkboxSlot.style.width = `${width}px`;
      if (width === 'full') checkboxSlot.style.width = '100%';
      if (typeof height === 'number') checkboxSlot.style.height = `${height}px`;
      subSimple.onActivate(() => {
        this.open();
        if (!firstActivationFired) {
          firstActivationFired = true;
          fireActivate();
        }
      });
    },

    unmount(): void {
      if (!container) return;
      subSimple?.unmount();
      this.close();
      container.remove();
      container = null;
      checkboxSlot = null;
      dialog = null;
      iframeSlot = null;
      subSimple = null;
      activateListeners.length = 0;
      backdropWired = false;
    },

    setState(state: PresentationState): void {
      logicalState = state;
      subSimple?.setState(state);
      if (state === 'verified' || state === 'error') {
        // Auto-close shortly after a terminal state so the user returns to
        // the host page; the checkbox UI now carries the result.
        setTimeout(() => this.close(), 600);
      }
    },

    onActivate(handler: () => void): () => void {
      activateListeners.push(handler);
      return () => {
        const idx = activateListeners.indexOf(handler);
        if (idx >= 0) activateListeners.splice(idx, 1);
      };
    },

    getIframeSlot(): HTMLElement | null {
      return iframeSlot;
    },

    open(): void {
      if (!dialog) return;
      const d = dialog as HTMLDialogElement & { showModal?: () => void };
      if (typeof d.showModal === 'function') {
        try { d.showModal(); } catch { dialog.setAttribute('open', ''); }
      } else {
        dialog.setAttribute('open', '');
      }
      if (layout === 'modal' && !backdropWired) {
        dialog.addEventListener('click', (e) => {
          if (e.target === dialog) this.close();
        });
        backdropWired = true;
      }
      signalVisibility(iframeSlot, true);
      emitDialogShown(host, layout as 'modal' | 'fullscreen');
    },

    close(): void {
      // Hide only — iframe stays mounted inside the dialog so game state
      // is preserved across close/reopen. The post-close work (mute audio,
      // revert simple-shield to clickable idle on mid-verify dismissal)
      // happens in the dialog 'close' event listener wired in mount(), so
      // it covers Escape / backdrop / button / programmatic dismissal alike.
      if (!dialog) return;
      const d = dialog as HTMLDialogElement & { close?: () => void };
      let fired = false;
      if (typeof d.close === 'function') {
        try { d.close(); fired = true; } catch {}
      }
      if (!fired) {
        // Fallback path: no native close() support. Fire the listener manually
        // so the shield + audio still revert.
        dialog.removeAttribute('open');
        dialog.dispatchEvent(new Event('close'));
      }
    },
  };
}

// ---------------- styles ----------------

const gameStylesInjected = new WeakSet<ShadowRoot>();
function ensureGameStyles(root: ShadowRoot): void {
  if (gameStylesInjected.has(root)) return;
  gameStylesInjected.add(root);
  const style = document.createElement('style');
  style.textContent = [
    // --- inline frame ---
    // One unified bordered card containing the iframe + a brand strip below.
    // The simple widget inside the badge slot has its own border/radius/bg
    // stripped so the outer frame border reads as the only edge.
    '[part="game-frame"][data-layout="inline"]{display:flex;flex-direction:column;border:1px solid #d0d7de;border-radius:0.5rem;background:#fff;overflow:hidden;width:fit-content;max-width:100%;box-sizing:border-box}',
    '[part="game-frame"][data-layout="inline"][data-width="full"]{width:100%}',
    '[part="game-iframe-slot"]{display:flex;flex-direction:column}',
    '[part="game-iframe-slot"] iframe{display:block;border:0;background:#fff}',
    // When the customer pins the inline frame size (width/height attr), the
    // iframe stretches to fill the slot instead of staying at the game's
    // manifest preferred size.
    '[part="game-iframe-slot"][data-fill="true"] iframe{width:100%!important;height:100%!important;flex:1 1 auto}',
    // Badge slot: thin separator line between iframe and brand strip.
    '[part="game-badge-slot"]{display:flex;border-top:1px solid #d0d7de;background:#fff}',
    // Strip the embedded simple widget of its own border/radius/bg so it
    // visually merges with the outer game-frame card.
    '[part="game-badge-slot"] [part="simple-checkbox"]{border:none !important;border-radius:0 !important;background:transparent !important}',

    // --- overlay (modal / fullscreen) ---
    '[part="game-overlay-host"]{display:inline-block}',
    '[part="game-overlay-checkbox"]{display:inline-block}',
    '[part="game-overlay-dialog"]{padding:0;border:0;background:transparent;max-width:none;max-height:none}',
    '[part="game-overlay-dialog"][open]{display:flex;flex-direction:column}',
    // Modal: shrink-wrap to the iframe so neither white space nor scrollbars
    // appear. The iframe is sized to the game's manifest dimensions (or the
    // 400x300 default); the dialog hugs that plus its own padding. Capped to
    // 90vw / 90vh so very large games still fit the viewport.
    '[part="game-overlay-dialog"][data-layout="modal"]{border-radius:0.75rem;background:#fff;padding:1rem;width:fit-content;height:fit-content;max-width:90vw;max-height:90vh;box-shadow:0 20px 50px rgba(0,0,0,0.25)}',
    '[part="game-overlay-dialog"][data-layout="modal"]::backdrop{background:rgba(0,0,0,0.45)}',
    '[part="game-overlay-dialog"][data-layout="fullscreen"]{width:100vw;height:100vh;max-width:100vw;max-height:100vh;background:#fff}',
    '[part="game-overlay-dialog"][data-layout="fullscreen"]::backdrop{background:rgba(0,0,0,0.8)}',
    // Overlay (modal + fullscreen): iframe stays at its manifest preferred
    // size (set by applyIframeSize); slot fills the dialog interior and
    // centers the iframe both axes. Matters most for fullscreen — the
    // dialog is 100vw/100vh, the game might be 280×160, and we want it
    // centered with backdrop space rather than stretched and pixelated.
    // For modal the dialog shrink-wraps to the iframe so centering is a
    // no-op there but stays consistent.
    '[part="game-overlay-dialog"] [part="game-iframe-slot"]{flex:1 1 auto;display:flex;align-items:center;justify-content:center}',
    '[part="game-overlay-dialog"] [part="game-iframe-slot"] iframe{border:0}',
    '[part="game-overlay-close"]{position:absolute;top:0.5rem;right:0.75rem;width:2rem;height:2rem;border:0;border-radius:50%;background:rgba(255,255,255,0.9);color:#1a1917;font-size:1.5rem;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:1}',

    // --- show / hide animation (CSS @starting-style + transition-behavior:allow-discrete) ---
    // Modal: 180ms scale + fade. Fullscreen: 220ms slide-up + fade.
    // Older browsers (lacking @starting-style + allow-discrete) pop in/out
    // exactly like before — feature degrades cleanly.
    '[part="game-overlay-dialog"]{opacity:0;transition:opacity 180ms ease,transform 180ms ease,overlay 180ms ease allow-discrete,display 180ms ease allow-discrete}',
    '[part="game-overlay-dialog"][data-layout="modal"]{transform:scale(0.95)}',
    '[part="game-overlay-dialog"][data-layout="fullscreen"]{transform:translateY(24px);transition-duration:220ms}',
    '[part="game-overlay-dialog"][open]{opacity:1;transform:none}',
    '@starting-style{',
      '[part="game-overlay-dialog"][data-layout="modal"][open]{opacity:0;transform:scale(0.95)}',
      '[part="game-overlay-dialog"][data-layout="fullscreen"][open]{opacity:0;transform:translateY(24px)}',
    '}',
    '[part="game-overlay-dialog"]::backdrop{opacity:0;transition:opacity 180ms ease,overlay 180ms ease allow-discrete,display 180ms ease allow-discrete}',
    '[part="game-overlay-dialog"][open]::backdrop{opacity:1}',
    '@starting-style{[part="game-overlay-dialog"][open]::backdrop{opacity:0}}',
    // Respect reduced-motion: drop the transition window so it falls back to instant.
    '@media (prefers-reduced-motion:reduce){',
      '[part="game-overlay-dialog"],[part="game-overlay-dialog"]::backdrop{transition-duration:0ms}',
    '}',
  ].join('');
  root.appendChild(style);
}
