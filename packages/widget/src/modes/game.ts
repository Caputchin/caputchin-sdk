import type { Presentation, PresentationState, GeometryUpdate } from './index.js';
import type { WidgetTrigger, WidgetWidth, WidgetHeight, WidgetSize } from '../config/shared.js';
import type { WidgetShell } from '../locale/widget-shell.js';
import type { WidgetShellSkin } from '../skin/widget-shell-skin.js';
import type { WidgetShellConfig } from '../configurations/widget-shell-config.js';
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
  /** Size of the in-page element. Inline → the whole game panel; overlay
   *  (modal/fullscreen) → ONLY the entry checkbox. Never the iframe. Already
   *  resolved (inline folds the manifest `preferred`; overlay is the raw
   *  customer `width` so the game's footprint can't promote the entry). */
  width: WidgetWidth;
  /** In-page element height. Same routing as width. */
  height: WidgetHeight;
  /** Game-box footprint width (inline iframe, or overlay dialog + iframe),
   *  folded with the manifest `preferred`. In overlay, `'full'` opts the
   *  dialog into filling that axis (the `data-fill-x` flag). Inline ignores
   *  it (the panel IS the footprint, sized by `width`). */
  footprintWidth: WidgetWidth;
  /** Game-box footprint height. Overlay `'full'` opts the dialog into filling
   *  the vertical axis. */
  footprintHeight: WidgetHeight;
  layout: 'inline' | 'modal' | 'fullscreen';
  /** When true: render a `<slot></slot>` in place of the iframe slot so
   *  customer light-DOM children project into the layout shell. The
   *  element skips iframe construction entirely. */
  manual?: boolean;
  /** Pre-resolved shell (strings + direction). Threaded down from the
   *  `<caputchin-game>` element so the embedded simple presentation and
   *  the overlay dialog share the customer's `lang` selection. */
  shell: WidgetShell;
  /** Pre-resolved shell skin (mode + color palette). Threaded down so the
   *  embedded simple presentation and the overlay dialog share the same
   *  theme. The element layer already wrote the CSS vars onto the shadow
   *  host; this struct exists so the simple presentation can read raw
   *  palette values for its SVG shield strokes/fills. */
  skin: WidgetShellSkin;
  /** Pre-resolved widget shell configuration (brand link targets).
   *  Threaded down so the embedded simple presentation in both the inline
   *  badge slot and the modal/fullscreen entry checkbox shares the same
   *  link hrefs. The game's `config` attribute does NOT propagate here;
   *  this struct is widget-shell scoped only. */
  shellConfig: WidgetShellConfig;
}

export function createGamePresentation(input: GamePresentationInput): GamePresentation {
  if (input.layout === 'inline') return createInlineGame(input);
  return createOverlayGame(input);
}

// ---------------- inline ----------------

function createInlineGame(input: GamePresentationInput): GamePresentation {
  const { host, root: renderRoot, width, height, manual, shell, skin, shellConfig } = input;
  const isFullWidth = width === 'full';
  const isFullHeight = height === 'full';
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
      // widget below the iframe. No style overrides; it looks like a regular
      // cap widget the customer might place on the page elsewhere.
      subSimple = createSimplePresentation({
        host,
        root: badgeSlot as unknown as ShadowRoot,
        trigger: 'auto' as WidgetTrigger,
        skin,
        shellConfig,
        // Full-width so the strip spans the game-frame edge to edge, flush
        // with the iframe panel above. Brand still hugs the trailing edge
        // via the margin-inline-start:auto rule in simple.ts (flips under
        // dir="rtl" automatically).
        width: 'full',
        size: 'compact' as WidgetSize,
        shell,
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
        // data-fill-x clamps the iframe to the slot when the slot has a
        // DEFINITE width, but lets it grow to content when the slot is
        // auto-sized (see the data-fill-x CSS for the min+max:100% mechanism).
        // A responsive game in a definite-but-narrower slot reflows INTO the
        // slot instead of overflowing it: the grow-only auto-measure can't
        // push the iframe past the container, and a container resize is
        // tracked in BOTH directions (a shrunk box no longer leaves a stale-
        // wide iframe clipped by the frame's overflow:hidden).
        iframeSlot.dataset.fillX = 'true';
      } else if (pxWidth !== null) {
        host.style.display = 'block';
        host.style.width = `${pxWidth}px`;
        frame.style.width = '100%';
        iframeSlot.dataset.fill = 'true';
      } else {
        // width="auto": subSimple's width:'full' branch above set
        // host.style.width='100%' to make its brand strip span. Clear
        // that so the :host{display:inline-block} shadow rule takes
        // effect and the outer host shrinks to the inline game-frame
        // content (which is width:fit-content). Otherwise the host
        // stretches to fill any block/flex parent while the iframe
        // sits at the manifest preferred size, leaving a visible gap.
        host.style.display = '';
        host.style.width = '';
      }
      if (isFullHeight) {
        // height="full" in inline mode means "fit the parent vertically when
        // the parent has a definite height, else grow to content". The
        // pxHeight branch below uses `data-fill="true"` (height:100%
        // !important) which HARD-caps the iframe - wrong when the parent is
        // content-sized (collapses to the iframe default 150px and the game
        // scrolls). Instead use a per-axis `data-fill-y` (min+max:100%):
        // against a definite parent it clamps the iframe to the parent in
        // BOTH directions (fills when content is shorter, caps/reflows when
        // taller, and tracks the parent on resize so a shrunk box doesn't
        // leave a stale-tall iframe clipped by the slot's overflow:hidden);
        // against an auto parent the percentages resolve to no-constraint and
        // the grow-only auto-measure fills inline-style height with content
        // size, so the iframe grows.
        host.style.display ||= 'block';
        host.style.height = '100%';
        frame.style.height = '100%';
        iframeSlot.style.flex = '1 1 auto';
        iframeSlot.style.minHeight = '0';
        iframeSlot.style.overflow = 'hidden';
        iframeSlot.dataset.fillY = 'true';
      } else if (pxHeight !== null) {
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
      if (isFullWidth || isFullHeight || pxWidth !== null || pxHeight !== null) {
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
    applySkin(newSkin: WidgetShellSkin): void {
      // Frame border/bg are `var(--cpt-skin-*)` (recolored by the element's host
      // var rewrite); the embedded badge strip re-skins its own SVG shield.
      subSimple?.applySkin(newSkin);
    },
    applyLocale(newShell: WidgetShell): void {
      subSimple?.applyLocale(newShell);
    },
    // Geometry is applied by re-mounting the game element (recreating the iframe
    // at the new footprint), not in place, so this is a no-op.
    applyGeometry(_geometry: GeometryUpdate): void {},
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
  const { host, root: renderRoot, layout, manual, width, height, footprintWidth, footprintHeight, shell, skin, shellConfig } = input;
  let container: HTMLDivElement | null = null;
  let checkboxSlot: HTMLDivElement | null = null;
  let dialog: HTMLDialogElement | null = null;
  let iframeSlot: HTMLDivElement | null = null;
  let subSimple: Presentation | null = null;
  // Kept (fullscreen only) so `applyLocale` can re-label the close button.
  let closeBtn: HTMLButtonElement | null = null;
  const activateListeners: Array<() => void> = [];
  let backdropWired = false;
  // Latched once the user makes the first activation. Subsequent activations
  // (re-opens after a close-mid-verify) just open the dialog; they must not
  // re-fire the trigger callbacks that start a second verification session.
  let firstActivationFired = false;
  // Mirrors the most recent state passed to setState. close() uses it to show
  // the entry as clickable idle when the user dismisses the dialog mid-verify;
  // open() uses it to restore the verifying indicator on re-entry. The session
  // (game + cap) keeps running while the dialog is hidden, so the state must
  // survive a dismissal - it is only masked on the entry, never discarded.
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

      // Click-to-open entry; visually the simple-normal checkbox UI.
      // Sub-simple is mounted with trigger='click' so it shows the checkbox
      // shape; we wire our own onActivate on top to open the dialog.
      checkboxSlot = document.createElement('div');
      checkboxSlot.setAttribute('part', 'game-overlay-checkbox');
      container.appendChild(checkboxSlot);

      // Dialog with iframe slot. Built once, never re-parented; moving the
      // iframe between DOM nodes reloads its srcdoc.
      dialog = document.createElement('dialog');
      dialog.setAttribute('part', 'game-overlay-dialog');
      dialog.dataset.layout = layout;
      dialog.id = `cpt-overlay-${++dialogIdCounter}`;
      if (shell.direction === 'rtl') dialog.setAttribute('dir', 'rtl');
      // overlay-width="full" / overlay-height="full" (or the manifest
      // preferred footprint resolving to 'full') opts the iframe into filling
      // the dialog along that axis, instead of staying at the manifest
      // preferred size and being centered with backdrop space. For fullscreen
      // this turns the iframe into a true 100vw / 100vh surface; for modal it
      // pins the iframe to the dialog's content box. This is the GAME-box
      // footprint, decoupled from the customer's `width`/`height`, which size
      // only the entry checkbox below. Driven by the per-axis CSS rules near
      // `data-fill-x` / `data-fill-y` below; flagged here so the rules can opt
      // the slot out of its centering layout on the filled axis.
      if (footprintWidth === 'full') dialog.dataset.fillX = 'true';
      if (footprintHeight === 'full') dialog.dataset.fillY = 'true';

      if (layout === 'fullscreen') {
        closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.setAttribute('part', 'game-overlay-close');
        closeBtn.setAttribute('aria-label', shell.strings.overlayClose);
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
        // Dismissed mid-verify: mask the entry as clickable idle so the user
        // can re-open. Do NOT clear logicalState - the game + cap keep running
        // in the background while hidden; open() re-asserts 'verifying' on
        // re-entry so the indicator never stays stuck at idle (start state).
        if (logicalState === 'verifying') {
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
        shell,
        skin,
        shellConfig,
      });
      subSimple.mount();
      // Pin the entry surface to the customer dims so the simple presentation's
      // internal width:100% / height:100% root fills it instead of shrinking to
      // its intrinsic checkbox-and-brand width. The entry chain is
      // host -> container[game-overlay-host] -> checkboxSlot[game-overlay-checkbox]
      // -> [simple-checkbox]; the two wrappers default to inline-block
      // (shrink-to-content) so width="auto" hugs the checkbox. subSimple already
      // sized `host`, but a pixel/full width on an inline-block wrapper collapses
      // (a percentage child has no definite parent to resolve against, and a
      // shrink-to-fit box ignores it) - the inline frame dodges this because its
      // game-frame is display:flex. So when the customer pins an axis, flip the
      // wrappers to display:block and carry the size down the whole chain.
      if (width === 'full') {
        container.style.display = 'block';
        container.style.width = '100%';
        checkboxSlot.style.display = 'block';
        checkboxSlot.style.width = '100%';
      } else if (typeof width === 'number') {
        container.style.display = 'block';
        container.style.width = `${width}px`;
        checkboxSlot.style.display = 'block';
        checkboxSlot.style.width = `${width}px`;
      }
      if (height === 'full') checkboxSlot.style.height = '100%';
      else if (typeof height === 'number') checkboxSlot.style.height = `${height}px`;
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
      closeBtn = null;
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

    applySkin(newSkin: WidgetShellSkin): void {
      // Dialog / backdrop / close-button colors are `var(--cpt-skin-*)`
      // (recolored by the element's host var rewrite); the entry checkbox
      // re-skins its own SVG shield.
      subSimple?.applySkin(newSkin);
    },

    applyLocale(newShell: WidgetShell): void {
      subSimple?.applyLocale(newShell);
      if (dialog) {
        if (newShell.direction === 'rtl') dialog.setAttribute('dir', 'rtl');
        else dialog.removeAttribute('dir');
      }
      closeBtn?.setAttribute('aria-label', newShell.strings.overlayClose);
    },

    // Geometry is applied by re-mounting the game element, not in place → no-op.
    applyGeometry(_geometry: GeometryUpdate): void {},

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
      // Restore the in-flight indicator on re-entry: a mid-verify dismissal
      // masked the entry as idle (clickable), but the session never stopped.
      // Terminal states (verified / error) are left as-is.
      if (logicalState === 'verifying') subSimple?.setState('verifying');
      signalVisibility(iframeSlot, true);
      emitDialogShown(host, layout as 'modal' | 'fullscreen');
    },

    close(): void {
      // Hide only; iframe stays mounted inside the dialog so game state
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
    // Host defaults to shrink-to-content so width="auto" matches the
    // inner game-frame's intrinsic width. Without this, a parent that
    // stretches block children (flex column with align-items:stretch,
    // grid cell, plain block layout) would balloon the host while the
    // inner frame stayed compact, leaving a gap between the iframe and
    // the host edges. width:fit-content opts out of cross-axis stretch
    // in flex containers (inline-block alone doesn't - flex items get
    // computed display:block-equivalent regardless of source). Customer
    // overrides (width="full" or pixel width) still set display:block +
    // an explicit width at mount time, which wins by inline-style
    // specificity.
    ':host{display:inline-block;width:fit-content}',
    // --- inline frame ---
    // One unified bordered card containing the iframe + a brand strip below.
    // The simple widget inside the badge slot has its own border/radius/bg
    // stripped so the outer frame border reads as the only edge.
    '[part="game-frame"][data-layout="inline"]{display:flex;flex-direction:column;border:1px solid var(--cpt-skin-border);border-radius:0.5rem;background:var(--cpt-skin-surface_bg);overflow:hidden;width:fit-content;max-width:100%;box-sizing:border-box}',
    '[part="game-frame"][data-layout="inline"][data-width="full"]{width:100%}',
    '[part="game-iframe-slot"]{display:flex;flex-direction:column}',
    '[part="game-iframe-slot"] iframe{display:block;border:0;background:var(--cpt-skin-surface_bg)}',
    // When the customer pins the inline frame size (width/height attr), the
    // iframe stretches to fill the slot instead of staying at the game's
    // manifest preferred size.
    '[part="game-iframe-slot"][data-fill="true"] iframe{width:100%!important;height:100%!important;flex:1 1 auto}',
    // Inline `width="full"` / `height="full"`: clamp the iframe to the slot
    // on the filled axis WHEN the slot has a definite size, but let it grow
    // to content when the slot is auto-sized. `min:100%`+`max:100%` does both.
    // The iframe-runtime auto-measure (grow-only) writes a content-pixel
    // inline width/height. Against a DEFINITE slot, min+max:100% pin the
    // iframe to the slot: it fills when content is smaller, reflows/caps when
    // content is larger, and tracks the slot in BOTH directions on resize (so
    // a shrunk container can't leave a stale-big iframe overflowing past it).
    // Against an AUTO / shrink-to-fit slot, percentage min/max resolve to
    // no-constraint during intrinsic sizing, so the inline content size wins
    // and the iframe grows. Contrast data-fill (px-pinned shell) which uses
    // width/height:100%!important - a hard cap that would collapse the iframe
    // to its replaced-default in an auto parent, breaking the grow case.
    '[part="game-iframe-slot"][data-fill-x="true"] iframe{min-width:100%;max-width:100%;flex:1 1 auto}',
    '[part="game-iframe-slot"][data-fill-y="true"] iframe{min-height:100%;max-height:100%;flex:1 1 auto}',
    // Badge slot: thin separator line between iframe and brand strip.
    '[part="game-badge-slot"]{display:flex;border-top:1px solid var(--cpt-skin-border);background:var(--cpt-skin-surface_bg)}',
    // Strip the embedded simple widget of its own border/radius/bg so it
    // visually merges with the outer game-frame card.
    '[part="game-badge-slot"] [part="simple-checkbox"]{border:none !important;border-radius:0 !important;background:transparent !important}',

    // --- overlay (modal / fullscreen) ---
    '[part="game-overlay-host"]{display:inline-block}',
    '[part="game-overlay-checkbox"]{display:inline-block}',
    '[part="game-overlay-dialog"]{padding:0;border:0;background:transparent;max-width:none;max-height:none;box-sizing:border-box}',
    '[part="game-overlay-dialog"][open]{display:flex;flex-direction:column}',
    // Modal: shrink-wrap to the iframe so neither white space nor scrollbars
    // appear. The iframe is sized to the game's manifest dimensions (or the
    // 400x300 default); the dialog hugs that plus its own padding. Capped to
    // 90vw / 90dvh (box-sizing:border-box from the base rule folds the 1rem
    // padding INTO that cap) so the dialog never exceeds the viewport; an
    // over-wide game is then clamped by max-width:100% on the iframe below.
    // dvh (dynamic viewport height) tracks the mobile address-bar; vh is the
    // fallback for browsers without dvh.
    '[part="game-overlay-dialog"][data-layout="modal"]{border-radius:0.75rem;background:var(--cpt-skin-surface_bg);padding:1rem;width:fit-content;height:fit-content;max-width:90vw;max-height:90vh;max-height:90dvh;box-shadow:0 20px 50px var(--cpt-skin-shadow)}',
    // Modal + fill: switch the dialog off shrink-wrap on the filled axis so
    // the iframe inside actually has a definite size to stretch into. Pinned
    // to 90vw / 90vh (matching the existing max-* cap) so the modal still
    // reads as a dialog with backdrop, not as a fullscreen overlay.
    '[part="game-overlay-dialog"][data-layout="modal"][data-fill-x="true"]{width:90vw}',
    '[part="game-overlay-dialog"][data-layout="modal"][data-fill-y="true"]{height:90vh;height:90dvh}',
    '[part="game-overlay-dialog"][data-layout="modal"]::backdrop{background:var(--cpt-skin-modal_backdrop)}',
    '[part="game-overlay-dialog"][data-layout="fullscreen"]{width:100vw;height:100vh;height:100dvh;max-width:100vw;max-height:100vh;max-height:100dvh;background:var(--cpt-skin-surface_bg)}',
    '[part="game-overlay-dialog"][data-layout="fullscreen"]::backdrop{background:var(--cpt-skin-fullscreen_backdrop)}',
    // Overlay (modal + fullscreen): iframe stays at its manifest preferred
    // size (set by applyIframeSize); slot fills the dialog interior and
    // centers the iframe both axes. Matters most for fullscreen; the
    // dialog is 100vw/100dvh, the game might be 280x160, and we want it
    // centered with backdrop space rather than stretched and pixelated.
    // For modal the dialog shrink-wraps to the iframe so centering is a
    // no-op there but stays consistent.
    // max-width:100% clamps the iframe WIDTH to the dialog interior: a game
    // whose preferred width exceeds the capped dialog (90vw modal / 100vw
    // fullscreen) shrinks to fit instead of overflowing the viewport (the mobile
    // horizontal-scroll bug). Against a shrink-wrapped (auto) modal the
    // percentage resolves to no-constraint, so a small game keeps its size and
    // stays centered. max-height:100% only caps height where the slot has a
    // DEFINITE height (fullscreen / height="full"); in a shrink-wrapped modal a
    // taller-than-viewport game still centers and clips top/bottom (a
    // pre-existing limit; a real vertical fit needs object-fit-style scaling).
    '[part="game-overlay-dialog"] [part="game-iframe-slot"]{flex:1 1 auto;display:flex;align-items:center;justify-content:center;min-width:0;min-height:0}',
    '[part="game-overlay-dialog"] [part="game-iframe-slot"] iframe{border:0;max-width:100%;max-height:100%;box-sizing:border-box}',
    // width="full" / height="full" on a game widget in overlay layout: the
    // iframe stretches along that axis to fill the dialog interior. Per-axis
    // so a customer can fill one axis and letterbox the other. `align-items`
    // / `justify-content: stretch` opt the flex centering out on the filled
    // axis so the iframe actually grows; the iframe itself takes width/height
    // 100% via inline style from applyIframeSize (host.setSize), with
    // !important here as a belt-and-braces against future inline-style
    // collisions.
    '[part="game-overlay-dialog"][data-fill-x="true"] [part="game-iframe-slot"]{justify-content:stretch}',
    '[part="game-overlay-dialog"][data-fill-x="true"] [part="game-iframe-slot"] iframe{width:100%!important}',
    '[part="game-overlay-dialog"][data-fill-y="true"] [part="game-iframe-slot"]{align-items:stretch}',
    '[part="game-overlay-dialog"][data-fill-y="true"] [part="game-iframe-slot"] iframe{height:100%!important}',
    '[part="game-overlay-close"]{position:absolute;top:0.5rem;inset-inline-end:0.75rem;width:2rem;height:2rem;border:0;border-radius:50%;background:var(--cpt-skin-close_btn_bg);color:var(--cpt-skin-text_primary);font-size:1.5rem;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:1}',

    // --- show / hide animation (CSS @starting-style + transition-behavior:allow-discrete) ---
    // Modal: 180ms scale + fade. Fullscreen: 220ms slide-up + fade.
    // Older browsers (lacking @starting-style + allow-discrete) pop in/out
    // exactly like before; feature degrades cleanly.
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
