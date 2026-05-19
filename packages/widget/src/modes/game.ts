import type { Presentation, PresentationState, PresentationFactoryInput } from './index.js';
import type { WidgetSize, WidgetTrigger, WidgetMode } from '../config.js';
import { createSimplePresentation } from './simple.js';

/**
 * Game / game-only presentation. Three layouts:
 *
 * - **inline**: bordered panel with iframe + simple-compact brand strip flush
 *   below. Brand strip doubles as state indicator.
 * - **modal**: simple-normal checkbox as the visible entry. Click opens a
 *   centered modal dialog with the iframe inside.
 * - **fullscreen**: simple-normal checkbox as entry. Click opens a fullscreen
 *   overlay with the iframe + a close button.
 *
 * State mapping:
 *   - `mode="game"`: verifying (cap starts) → verified (pass event = both
 *     cap done + game-pass arrived) → error.
 *   - `mode="game-only"`: idle (no cap) → verified (game-pass) → error.
 */
export interface GamePresentation extends Presentation {
  /** Where the iframe element should be appended by IframeHost. */
  getIframeSlot(): HTMLElement | null;
  /** Open the overlay (modal/fullscreen). No-op for inline. */
  open(): void;
  /** Close the overlay. No-op for inline. */
  close(): void;
}

export interface GamePresentationInput extends PresentationFactoryInput {
  layout: 'inline' | 'modal' | 'fullscreen';
  mode: WidgetMode;
}

export function createGamePresentation(input: GamePresentationInput): GamePresentation {
  if (input.layout === 'inline') return createInlineGame(input);
  return createOverlayGame(input);
}

// ---------------- inline ----------------

function createInlineGame(input: GamePresentationInput): GamePresentation {
  const { host, root: renderRoot, width } = input;
  const isFullWidth = width === 'full';
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

      badgeSlot = document.createElement('div');
      badgeSlot.setAttribute('part', 'game-badge-slot');

      frame.appendChild(iframeSlot);
      frame.appendChild(badgeSlot);
      renderRoot.appendChild(frame);
      if (isFullWidth) {
        host.style.display = 'block';
        host.style.width = '100%';
      }

      subSimple = createSimplePresentation({
        host,
        root: badgeSlot as unknown as ShadowRoot,
        trigger: 'manual' as WidgetTrigger,
        width: 'full',
        size: 'compact' as WidgetSize,
      });
      subSimple.mount();
    },
    unmount(): void {
      if (!frame) return;
      subSimple?.unmount();
      frame.remove();
      if (isFullWidth) {
        host.style.display = '';
        host.style.width = '';
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

function createOverlayGame(input: GamePresentationInput): GamePresentation {
  const { host, root: renderRoot, layout } = input;
  let container: HTMLDivElement | null = null;
  let checkboxSlot: HTMLDivElement | null = null;
  let dialog: HTMLDialogElement | null = null;
  let iframeSlot: HTMLDivElement | null = null;
  let subSimple: Presentation | null = null;
  const activateListeners: Array<() => void> = [];
  let backdropWired = false;

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
      dialog.appendChild(iframeSlot);

      container.appendChild(dialog);
      renderRoot.appendChild(container);

      subSimple = createSimplePresentation({
        host,
        root: checkboxSlot as unknown as ShadowRoot,
        trigger: 'click' as WidgetTrigger,
        width: input.width,
        size: input.size,
      });
      subSimple.mount();
      subSimple.onActivate(() => {
        this.open();
        fireActivate();
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
    },

    close(): void {
      if (!dialog) return;
      const d = dialog as HTMLDialogElement & { close?: () => void };
      let fired = false;
      if (typeof d.close === 'function') {
        try { d.close(); fired = true; } catch {}
      }
      if (!fired) dialog.removeAttribute('open');
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
    // Default: fit-content so the frame snaps to the iframe's auto-reported size.
    '[part="game-frame"][data-layout="inline"]{display:flex;flex-direction:column;border:1px solid #d0d7de;border-radius:0.5rem;background:#fff;overflow:hidden;width:fit-content;max-width:100%;box-sizing:border-box}',
    // width="full": frame spans parent; iframe sized by JS to 100% via setAutoWidth(false).
    '[part="game-frame"][data-layout="inline"][data-width="full"]{width:100%}',
    '[part="game-iframe-slot"]{display:flex;flex-direction:column}',
    '[part="game-iframe-slot"] iframe{display:block;border:0;background:#fff}',
    // Thin separator between iframe and brand strip — matches the outer frame border.
    '[part="game-badge-slot"]{display:flex;justify-content:flex-end;background:transparent;padding:0;border-top:1px solid #d0d7de}',
    // Strip the embedded simple panel of its own border + radius + background.
    // The outer game-frame border is the only border; the pill is purely text + logo.
    '[part="game-badge-slot"] [part="simple-checkbox"],',
    '[part="game-badge-slot"] [part="simple-pill"]{border:none !important;border-radius:0 !important;background:transparent !important;padding:0.25rem 0.5rem}',

    // --- overlay (modal / fullscreen) ---
    '[part="game-overlay-host"]{display:inline-block}',
    '[part="game-overlay-checkbox"]{display:inline-block}',
    '[part="game-overlay-dialog"]{padding:0;border:0;background:transparent;max-width:none;max-height:none}',
    '[part="game-overlay-dialog"][open]{display:flex;flex-direction:column}',
    '[part="game-overlay-dialog"][data-layout="modal"]{border-radius:0.75rem;background:#fff;padding:1rem;width:min(40rem,90vw);height:min(32rem,80vh);box-shadow:0 20px 50px rgba(0,0,0,0.25)}',
    '[part="game-overlay-dialog"][data-layout="modal"]::backdrop{background:rgba(0,0,0,0.45)}',
    '[part="game-overlay-dialog"][data-layout="fullscreen"]{width:100vw;height:100vh;max-width:100vw;max-height:100vh;background:#fff}',
    '[part="game-overlay-dialog"][data-layout="fullscreen"]::backdrop{background:rgba(0,0,0,0.8)}',
    '[part="game-overlay-dialog"] [part="game-iframe-slot"]{flex:1 1 auto;display:flex}',
    '[part="game-overlay-dialog"] [part="game-iframe-slot"] iframe{flex:1 1 auto;border:0}',
    '[part="game-overlay-close"]{position:absolute;top:0.5rem;right:0.75rem;width:2rem;height:2rem;border:0;border-radius:50%;background:rgba(255,255,255,0.9);color:#1a1917;font-size:1.5rem;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:1}',
  ].join('');
  root.appendChild(style);
}
