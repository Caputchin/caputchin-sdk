import type { Presentation, PresentationState, PresentationFactoryInput } from './index.js';
import { LOGO_PRIMARY } from '../brand/logo.js';

/**
 * Caputchin UI for `mode="simple"`. One layout across all triggers:
 * indicator on the left, state text ("Verify" / "Verifying…" / "Verified" /
 * "Failed") right next to it, then the brand block (logo + Caputchin +
 * "see no data" link) on the right. The brand block is stable — the "see
 * no data" tag never gets overridden by the verification state.
 *
 * Indicator shape depends on the trigger:
 * - `trigger="click"` → interactive checkbox the user can click.
 * - everything else  → passive shield SVG. Same state transitions, no
 *   click affordance (the widget drives itself).
 *
 * Label width is locked to fit the widest state string so transitions
 * never reflow the host page.
 */
export function createSimplePresentation(input: PresentationFactoryInput): Presentation {
  const { host, root: renderRoot, trigger, width, height, size } = input;
  const isInteractive = trigger === 'click';
  const isFullWidth = width === 'full';
  const isCompact = size === 'compact';
  const pxWidth = typeof width === 'number' ? width : null;
  const pxHeight = typeof height === 'number' ? height : null;

  let root: HTMLDivElement | null = null;
  let indicator: { el: HTMLElement; setState: (s: PresentationState) => void; dispose: () => void } | null = null;
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

      indicator = isInteractive
        ? createCheckboxIndicator(onPointer, onKey)
        : createShieldIndicator();

      label = document.createElement('span');
      label.setAttribute('part', 'simple-checkbox-label');
      label.setAttribute('aria-live', 'polite');
      // Width-locked: longest text fits, transitions don't reflow.
      label.style.cssText = 'flex:0 0 auto;text-align:left';

      root.appendChild(indicator.el);
      root.appendChild(label);

      brand = buildBrand();
      // Spacer pushes brand to the right edge without depending on label
      // width changes.
      brand.style.marginLeft = 'auto';
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
      indicator?.dispose();
      indicator = null;
      if (isFullWidth || pxWidth !== null || pxHeight !== null) {
        host.style.display = '';
        host.style.width = '';
        host.style.height = '';
      }
      root.remove();
      root = null;
      label = null;
      brand = null;
      activateListeners.length = 0;
    },

    setState(state: PresentationState): void {
      if (!indicator || !label) return;
      indicator.setState(state);
      label.textContent = STATE_LABEL[state];
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

const STATE_LABEL: Record<PresentationState, string> = {
  idle: 'Verify',
  verifying: 'Verifying…',
  verified: 'Verified',
  error: 'Failed',
};

// ---------------- indicator builders ----------------

function createCheckboxIndicator(
  onPointer: () => void,
  onKey: (e: KeyboardEvent) => void,
): { el: HTMLElement; setState: (s: PresentationState) => void; dispose: () => void } {
  const box = document.createElement('div');
  box.setAttribute('part', 'simple-checkbox-box');
  box.style.cssText = 'border:2px solid #6e7681;border-radius:0.25rem;background:#fff;color:#fff';
  box.tabIndex = 0;
  box.setAttribute('role', 'checkbox');
  box.setAttribute('aria-checked', 'false');
  box.setAttribute('aria-label', 'Verify you are human');
  box.addEventListener('click', onPointer);
  box.addEventListener('keydown', onKey);

  return {
    el: box,
    dispose() {
      box.removeEventListener('click', onPointer);
      box.removeEventListener('keydown', onKey);
    },
    setState(state: PresentationState): void {
      switch (state) {
        case 'idle':
          box.textContent = '';
          box.style.background = '#fff';
          box.style.borderColor = '#6e7681';
          box.style.borderRadius = '0.25rem';
          box.style.borderTopColor = '#6e7681';
          box.style.animation = '';
          box.style.color = '#fff';
          box.setAttribute('aria-checked', 'false');
          break;
        case 'verifying':
          box.textContent = '';
          box.style.background = '#fff';
          box.style.borderColor = '#2F6640';
          box.style.borderTopColor = 'transparent';
          box.style.borderRadius = '50%';
          box.style.animation = 'caputchin-spin 0.8s linear infinite';
          box.setAttribute('aria-checked', 'mixed');
          break;
        case 'verified':
          box.style.animation = '';
          box.style.background = '#2F6640';
          box.style.borderColor = '#2F6640';
          box.style.borderRadius = '0.25rem';
          box.style.borderTopColor = '#2F6640';
          box.textContent = '✓';
          box.setAttribute('aria-checked', 'true');
          break;
        case 'error':
          box.style.animation = '';
          box.style.background = '#fff';
          box.style.borderColor = '#c2410c';
          box.style.borderRadius = '0.25rem';
          box.style.borderTopColor = '#c2410c';
          box.style.color = '#c2410c';
          box.textContent = '!';
          box.setAttribute('aria-checked', 'false');
          break;
      }
    },
  };
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const SHIELD_PATH = 'M12 2 L20 5 V11 C20 16 16.5 19.5 12 22 C7.5 19.5 4 16 4 11 V5 Z';

function createShieldIndicator(): { el: HTMLElement; setState: (s: PresentationState) => void; dispose: () => void } {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('part', 'simple-shield-box');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Caputchin verification status');

  const shield = document.createElementNS(SVG_NS, 'path');
  shield.setAttribute('d', SHIELD_PATH);
  shield.setAttribute('stroke-width', '2');
  shield.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(shield);

  // Glyph overlay (✓ for verified, ! for error). Hidden in idle / verifying.
  const glyph = document.createElementNS(SVG_NS, 'text');
  glyph.setAttribute('x', '12');
  glyph.setAttribute('y', '16');
  glyph.setAttribute('text-anchor', 'middle');
  glyph.setAttribute('font-size', '12');
  glyph.setAttribute('font-weight', '700');
  glyph.setAttribute('font-family', 'system-ui, sans-serif');
  glyph.setAttribute('fill', '#fff');
  svg.appendChild(glyph);

  return {
    el: svg as unknown as HTMLElement,
    dispose() { /* no listeners */ },
    setState(state: PresentationState): void {
      svg.style.animation = '';
      glyph.textContent = '';
      switch (state) {
        case 'idle':
          shield.setAttribute('stroke', '#6e7681');
          shield.setAttribute('fill', 'transparent');
          break;
        case 'verifying':
          shield.setAttribute('stroke', '#2F6640');
          shield.setAttribute('fill', 'transparent');
          svg.style.animation = 'caputchin-pulse 1.2s ease-in-out infinite';
          break;
        case 'verified':
          shield.setAttribute('stroke', '#2F6640');
          shield.setAttribute('fill', '#2F6640');
          glyph.textContent = '✓';
          break;
        case 'error':
          shield.setAttribute('stroke', '#c2410c');
          shield.setAttribute('fill', '#c2410c');
          glyph.textContent = '!';
          break;
      }
    },
  };
}

// ---------------- shadow styles ----------------

const stylesInjectedSet = new WeakSet<ShadowRoot>();
function ensureStyles(root: ShadowRoot): void {
  if (stylesInjectedSet.has(root)) return;
  stylesInjectedSet.add(root);
  const style = document.createElement('style');
  style.textContent = [
    '@keyframes caputchin-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}',
    '@keyframes caputchin-pulse{0%,100%{opacity:1}50%{opacity:0.45}}',

    // --- checkbox glyph: static sizing/layout (state toggles live in JS) ---
    '[part="simple-checkbox-box"]{width:1.5rem;height:1.5rem;display:flex;align-items:center;justify-content:center;font-size:1rem;line-height:1;flex:0 0 auto;cursor:pointer}',
    // --- shield SVG: same footprint as checkbox so swapping doesn't reflow ---
    '[part="simple-shield-box"]{width:1.5rem;height:1.5rem;flex:0 0 auto;display:block}',
    // --- label: width locked to fit "Verifying…" so state changes don't reflow ---
    '[part="simple-checkbox-label"]{color:#3d2a5e;font-size:0.85rem;min-width:5rem;display:inline-block;text-align:left}',

    // --- brand block: normal layout (2-col grid, logo spans 2 rows) ---
    '[part="simple-brand"]{display:grid;grid-template-columns:auto auto;grid-template-rows:auto auto;column-gap:0.25rem;row-gap:0;align-items:center;line-height:1.2;flex:0 0 auto}',
    '[part="simple-brand-logo"]{grid-column:1;grid-row:1 / span 2;align-self:center;width:32px;height:32px}',
    '[part="simple-brand-logo"] svg{width:100%;height:100%;display:block}',
    '[part="simple-brand-name"]{grid-column:2;grid-row:1;place-self:center;text-align:center;font-size:0.85rem}',
    '[part="simple-brand-tag"]{grid-column:2;grid-row:2;place-self:center;text-align:center;font-size:0.65rem}',

    '[part="simple-brand-home"],[part="simple-brand-tag"]{text-decoration:none;transition:color 0.15s ease}',
    '[part="simple-brand-home"]:hover,[part="simple-brand-home"]:focus-visible{color:#1f4a2c;text-decoration:underline;outline:none}',
    '[part="simple-brand-tag"]:hover,[part="simple-brand-tag"]:focus-visible{color:#2F6640;text-decoration:underline;outline:none}',

    // --- size="compact": single-row inline strip, dialed down ---
    '[data-size="compact"][part="simple-checkbox"]{padding:0.2rem 0.4rem;gap:0.35rem;border-radius:0.35rem;flex-wrap:nowrap;min-width:0 !important}',
    '[data-size="compact"] [part="simple-checkbox-box"]{width:0.85rem;height:0.85rem;font-size:0.65rem;border-width:1px;border-radius:0.2rem}',
    '[data-size="compact"] [part="simple-shield-box"]{width:0.95rem;height:0.95rem}',
    '[data-size="compact"] [part="simple-checkbox-label"]{font-size:0.65rem;color:#3d2a5e;white-space:nowrap;min-width:3.6rem}',
    '[data-size="compact"] [part="simple-brand"]{display:flex;flex-direction:row;align-items:center;column-gap:0.25rem}',
    '[data-size="compact"] [part="simple-brand-logo"]{grid-column:auto;grid-row:auto;align-self:center;width:14px;height:14px}',
    '[data-size="compact"] [part="simple-brand-name"]{grid-column:auto;grid-row:auto;place-self:auto;font-size:0.6rem}',
    '[data-size="compact"] [part="simple-brand-tag"]{grid-column:auto;grid-row:auto;place-self:auto;font-size:0.5rem}',
    '[data-size="compact"] [part="simple-brand-name"]::after{content:" · ";color:#c0c0c0;margin-left:0.1rem}',

    // --- phone viewports (≤28rem) auto-compact non-compact widgets ---
    '@media (max-width:28rem){',
      '[part="simple-checkbox"]:not([data-size="compact"]){padding:0.625rem 0.75rem;gap:0.5rem}',
      '[part="simple-checkbox-box"]:not([data-size="compact"] *){width:1.75rem;height:1.75rem}',
    '}',
  ].join('');
  root.appendChild(style);
}
