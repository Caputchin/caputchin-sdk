import type { Presentation, PresentationState, PresentationFactoryInput } from './index.js';
import { LOGO_PRIMARY } from '../brand/logo.js';

/**
 * Caputchin UI for `mode="simple"`. One layout across all triggers:
 * checkbox on the left, state text ("Verify" / "Verifying…" / "Verified" /
 * "Failed") right next to it, then the brand block (logo + Caputchin +
 * "see no data" link) on the right. The brand block is stable — the "see
 * no data" tag never gets overridden by the verification state.
 *
 * The checkbox is interactive only for `trigger="click"`. For `auto`,
 * `form-submit`, and `manual` it stays as a passive visual indicator.
 *
 * Compact size keeps the same three-part structure on a single row with
 * smaller glyphs and tighter padding.
 */
export function createSimplePresentation(input: PresentationFactoryInput): Presentation {
  const { host, root: renderRoot, trigger, width, height, size } = input;
  const isInteractive = trigger === 'click';
  const isFullWidth = width === 'full';
  const isCompact = size === 'compact';
  const pxWidth = typeof width === 'number' ? width : null;
  const pxHeight = typeof height === 'number' ? height : null;

  let root: HTMLDivElement | null = null;
  let statusIcon: HTMLDivElement | null = null;
  let label: HTMLSpanElement | null = null;
  let brand: HTMLDivElement | null = null;
  const activateListeners: Array<() => void> = [];

  function onPointer(): void {
    for (const h of activateListeners) h();
  }
  function onKey(e: KeyboardEvent): void {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onPointer();
    }
  }

  function buildBrand(): HTMLDivElement {
    const container = document.createElement('div');
    container.setAttribute('part', 'simple-brand');

    const homeLink = document.createElement('a');
    homeLink.setAttribute('part', 'simple-brand-home');
    homeLink.href = 'https://caputchin.com';
    homeLink.target = '_blank';
    homeLink.rel = 'noopener noreferrer';
    homeLink.style.cssText = 'display:contents;color:#2F6640';

    const logoSpan = document.createElement('span');
    logoSpan.setAttribute('part', 'simple-brand-logo');
    logoSpan.setAttribute('aria-hidden', 'true');
    logoSpan.style.cssText = 'display:inline-flex;line-height:0';
    logoSpan.innerHTML = LOGO_PRIMARY;
    const svg = logoSpan.querySelector('svg');
    if (svg) {
      // Strip the source SVG's id + 100% width so CSS in the shadow stylesheet
      // controls the rendered size per variant (normal 32px / compact 14px).
      svg.removeAttribute('id');
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    }

    const wordmark = document.createElement('span');
    wordmark.setAttribute('part', 'simple-brand-name');
    wordmark.textContent = 'Caputchin';
    wordmark.style.cssText = 'font-weight:600;color:inherit';

    homeLink.appendChild(logoSpan);
    homeLink.appendChild(wordmark);

    const tag = document.createElement('a');
    tag.setAttribute('part', 'simple-brand-tag');
    tag.href = 'https://caputchin.com/legal';
    tag.target = '_blank';
    tag.rel = 'noopener noreferrer';
    tag.textContent = 'see no data';
    tag.style.cssText = 'color:#6e7681';

    container.appendChild(homeLink);
    container.appendChild(tag);
    return container;
  }

  return {
    mount(): void {
      if (root) return;
      ensureStyles(renderRoot);

      root = document.createElement('div');
      root.setAttribute('part', 'simple-checkbox');
      if (isCompact) root.setAttribute('data-size', 'compact');
      const rootStyles = [
        'display:flex',
        'align-items:center',
        'padding:0.5rem 0.75rem',
        'border:1px solid #d0d7de',
        'border-radius:0.5rem',
        'background:#fff',
        'font:14px system-ui, -apple-system, "Segoe UI", sans-serif',
        'color:#1a1917',
        'user-select:none',
        'box-sizing:border-box',
        isFullWidth ? 'width:100%' : 'width:fit-content',
        'max-width:100%',
        'flex-wrap:wrap',
        'gap:0.75rem',
      ];
      if (!isFullWidth) rootStyles.push('min-width:min(18rem,100%)');
      root.style.cssText = rootStyles.join(';');

      statusIcon = document.createElement('div');
      statusIcon.setAttribute('part', 'simple-checkbox-box');
      // Static layout/sizing lives in the shadow stylesheet so size variants
      // (`data-size="compact"`) can override without inline-style specificity
      // fights. Dynamic bits (background/border/animation) stay in setState.
      statusIcon.style.cssText = [
        'border:2px solid #6e7681',
        'border-radius:0.25rem',
        'background:#fff',
        'color:#fff',
      ].join(';');
      if (isInteractive) {
        statusIcon.tabIndex = 0;
        statusIcon.setAttribute('role', 'checkbox');
        statusIcon.setAttribute('aria-checked', 'false');
        statusIcon.setAttribute('aria-label', 'Verify you are human');
        statusIcon.addEventListener('click', onPointer);
        statusIcon.addEventListener('keydown', onKey);
      } else {
        // Passive indicator — not focusable, not clickable. Use aria-live so
        // state changes announce.
        statusIcon.setAttribute('role', 'img');
        statusIcon.setAttribute('aria-label', 'Caputchin verification status');
        statusIcon.style.cursor = 'default';
      }

      label = document.createElement('span');
      label.setAttribute('part', 'simple-checkbox-label');
      label.setAttribute('aria-live', 'polite');
      // flex:1 absorbs the slack so brand block hugs the right edge.
      // min-width:0 lets the label shrink below intrinsic content width.
      label.style.cssText = 'flex:1 1 auto;min-width:0';

      root.appendChild(statusIcon);
      root.appendChild(label);

      brand = buildBrand();
      root.appendChild(brand);

      if (isFullWidth) {
        host.style.display = 'block';
        host.style.width = '100%';
      } else if (pxWidth !== null) {
        host.style.display = 'block';
        host.style.width = `${pxWidth}px`;
        root.style.boxSizing = 'border-box';
        root.style.width = '100%';
      }
      if (pxHeight !== null) {
        host.style.display ||= 'block';
        host.style.height = `${pxHeight}px`;
        root.style.boxSizing = 'border-box';
        root.style.height = '100%';
      }
      renderRoot.appendChild(root);

      this.setState('idle');
    },

    unmount(): void {
      if (!root) return;
      if (statusIcon && isInteractive) {
        statusIcon.removeEventListener('click', onPointer);
        statusIcon.removeEventListener('keydown', onKey);
      }
      if (isFullWidth || pxWidth !== null || pxHeight !== null) {
        host.style.display = '';
        host.style.width = '';
        host.style.height = '';
      }
      root.remove();
      root = null;
      statusIcon = null;
      label = null;
      brand = null;
      activateListeners.length = 0;
    },

    setState(state: PresentationState): void {
      if (statusIcon && label) applyState(statusIcon, label, state, isInteractive);
    },

    onActivate(handler: () => void): () => void {
      activateListeners.push(handler);
      return () => {
        const idx = activateListeners.indexOf(handler);
        if (idx >= 0) activateListeners.splice(idx, 1);
      };
    },
  };
}

function applyState(box: HTMLDivElement, label: HTMLSpanElement, state: PresentationState, interactive: boolean): void {
  switch (state) {
    case 'idle':
      box.textContent = '';
      box.style.background = '#fff';
      box.style.borderColor = '#6e7681';
      box.style.borderRadius = '0.25rem';
      box.style.borderTopColor = '#6e7681';
      box.style.animation = '';
      box.style.color = '#fff';
      label.textContent = 'Verify';
      if (interactive) box.setAttribute('aria-checked', 'false');
      break;
    case 'verifying':
      box.textContent = '';
      box.style.background = '#fff';
      box.style.borderColor = '#2F6640';
      box.style.borderTopColor = 'transparent';
      box.style.borderRadius = '50%';
      box.style.animation = 'caputchin-spin 0.8s linear infinite';
      label.textContent = 'Verifying…';
      if (interactive) box.setAttribute('aria-checked', 'mixed');
      break;
    case 'verified':
      box.style.animation = '';
      box.style.background = '#2F6640';
      box.style.borderColor = '#2F6640';
      box.style.borderRadius = '0.25rem';
      box.style.borderTopColor = '#2F6640';
      box.textContent = '✓';
      label.textContent = 'Verified';
      if (interactive) box.setAttribute('aria-checked', 'true');
      break;
    case 'error':
      box.style.animation = '';
      box.style.background = '#fff';
      box.style.borderColor = '#c2410c';
      box.style.borderRadius = '0.25rem';
      box.style.borderTopColor = '#c2410c';
      box.style.color = '#c2410c';
      box.textContent = '!';
      label.textContent = 'Failed';
      if (interactive) box.setAttribute('aria-checked', 'false');
      break;
  }
}

const stylesInjectedSet = new WeakSet<ShadowRoot>();
function ensureStyles(root: ShadowRoot): void {
  if (stylesInjectedSet.has(root)) return;
  stylesInjectedSet.add(root);
  const style = document.createElement('style');
  style.textContent = [
    '@keyframes caputchin-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}',

    // --- checkbox glyph: static sizing/layout (state toggles live in JS) ---
    '[part="simple-checkbox-box"]{width:1.5rem;height:1.5rem;display:flex;align-items:center;justify-content:center;font-size:1rem;line-height:1;flex:0 0 auto;cursor:pointer}',
    '[part="simple-checkbox-label"]{color:#3d2a5e;font-size:0.85rem}',

    // --- brand block: normal layout (2-col grid, logo spans 2 rows) ---
    '[part="simple-brand"]{display:grid;grid-template-columns:auto auto;grid-template-rows:auto auto;column-gap:0.25rem;row-gap:0;align-items:center;line-height:1.2;flex:0 0 auto}',
    '[part="simple-brand-logo"]{grid-column:1;grid-row:1 / span 2;align-self:center;width:32px;height:32px}',
    '[part="simple-brand-logo"] svg{width:100%;height:100%;display:block}',
    '[part="simple-brand-name"]{grid-column:2;grid-row:1;place-self:center;text-align:center;font-size:0.85rem}',
    '[part="simple-brand-tag"]{grid-column:2;grid-row:2;place-self:center;text-align:center;font-size:0.65rem}',

    // --- link styling ---
    '[part="simple-brand-home"],[part="simple-brand-tag"]{text-decoration:none;transition:color 0.15s ease}',
    '[part="simple-brand-home"]:hover,[part="simple-brand-home"]:focus-visible{color:#1f4a2c;text-decoration:underline;outline:none}',
    '[part="simple-brand-tag"]:hover,[part="simple-brand-tag"]:focus-visible{color:#2F6640;text-decoration:underline;outline:none}',

    // --- size="compact": single-row inline strip, dialed down ---
    '[data-size="compact"][part="simple-checkbox"]{padding:0.2rem 0.4rem;gap:0.35rem;border-radius:0.35rem;flex-wrap:nowrap;min-width:0 !important}',
    '[data-size="compact"] [part="simple-checkbox-box"]{width:0.85rem;height:0.85rem;font-size:0.65rem;border-width:1px;border-radius:0.2rem}',
    '[data-size="compact"] [part="simple-checkbox-label"]{font-size:0.65rem;color:#3d2a5e;white-space:nowrap}',
    '[data-size="compact"] [part="simple-brand"]{display:flex;flex-direction:row;align-items:center;column-gap:0.25rem}',
    '[data-size="compact"] [part="simple-brand-logo"]{grid-column:auto;grid-row:auto;align-self:center;width:14px;height:14px}',
    '[data-size="compact"] [part="simple-brand-name"]{grid-column:auto;grid-row:auto;place-self:auto;font-size:0.6rem}',
    '[data-size="compact"] [part="simple-brand-tag"]{grid-column:auto;grid-row:auto;place-self:auto;font-size:0.5rem}',
    '[data-size="compact"] [part="simple-brand-name"]::after{content:" · ";color:#c0c0c0;margin-left:0.1rem}',

    // --- phone viewports (≤28rem) auto-compact non-compact widgets ---
    // Don't hide the label anymore — state text is the primary signal.
    '@media (max-width:28rem){',
      '[part="simple-checkbox"]:not([data-size="compact"]){padding:0.625rem 0.75rem;gap:0.5rem}',
      '[part="simple-checkbox-box"]:not([data-size="compact"] *){width:1.75rem;height:1.75rem}',
    '}',
  ].join('');
  root.appendChild(style);
}
