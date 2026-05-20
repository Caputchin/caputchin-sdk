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

      indicator = createShieldIndicator({ interactive: isInteractive, onPointer, onKey });

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

// ---------------- shield indicator ----------------

const SVG_NS = 'http://www.w3.org/2000/svg';
// Shield path tuned to fill the viewBox (1–23 vertical, 2–22 horizontal)
// so the rendered shield reads as a glyph, not a small mark on a big canvas.
const SHIELD_PATH = 'M12 1 L22 4 V12 C22 18 17.5 22.5 12 23.5 C6.5 22.5 2 18 2 12 V4 Z';

function createShieldIndicator(input: {
  interactive: boolean;
  onPointer: () => void;
  onKey: (e: KeyboardEvent) => void;
}): { el: HTMLElement; setState: (s: PresentationState) => void; dispose: () => void } {
  const { interactive, onPointer, onKey } = input;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('part', 'simple-shield-box');
  svg.setAttribute('viewBox', '0 0 24 24');
  if (interactive) {
    svg.setAttribute('data-interactive', '');
    svg.setAttribute('role', 'checkbox');
    svg.setAttribute('aria-checked', 'false');
    svg.setAttribute('aria-label', 'Verify you are human');
    (svg as unknown as SVGSVGElement).tabIndex = 0;
    svg.addEventListener('click', onPointer);
    svg.addEventListener('keydown', onKey);
  } else {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Caputchin verification status');
  }

  const shield = document.createElementNS(SVG_NS, 'path');
  shield.setAttribute('d', SHIELD_PATH);
  // Always 1px stroke — keeps the shield a clean glyph regardless of size or state.
  shield.setAttribute('stroke-width', '1');
  shield.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(shield);

  // Spinner arc shown only during verifying. Rotates inside the shield.
  const spinner = document.createElementNS(SVG_NS, 'circle');
  spinner.setAttribute('part', 'simple-shield-spinner');
  spinner.setAttribute('cx', '12');
  spinner.setAttribute('cy', '13');
  spinner.setAttribute('r', '4.5');
  spinner.setAttribute('fill', 'none');
  spinner.setAttribute('stroke', '#2F6640');
  spinner.setAttribute('stroke-width', '2');
  spinner.setAttribute('stroke-linecap', 'round');
  spinner.setAttribute('stroke-dasharray', '14 28');
  spinner.setAttribute('opacity', '0');
  svg.appendChild(spinner);

  // Glyph overlay. Idle (interactive) = chevron `›` hinting tap. Idle
  // (passive) = empty. Verifying = empty (spinner takes over). Verified = ✓.
  // Error = !. Font 16 of 24 viewBox = ~67% of shield height; sits centered.
  const glyph = document.createElementNS(SVG_NS, 'text');
  glyph.setAttribute('x', '12');
  glyph.setAttribute('y', '17');
  glyph.setAttribute('text-anchor', 'middle');
  glyph.setAttribute('font-size', '13');
  glyph.setAttribute('font-weight', '700');
  glyph.setAttribute('font-family', 'system-ui, sans-serif');
  glyph.setAttribute('fill', '#fff');
  svg.appendChild(glyph);

  return {
    el: svg as unknown as HTMLElement,
    dispose() {
      if (interactive) {
        svg.removeEventListener('click', onPointer);
        svg.removeEventListener('keydown', onKey);
      }
    },
    setState(state: PresentationState): void {
      glyph.textContent = '';
      spinner.setAttribute('opacity', '0');
      svg.removeAttribute('data-state');
      svg.setAttribute('data-state', state);
      switch (state) {
        case 'idle':
          // Idle gray-stroke shield. Passive (auto/manual/form-submit) gets
          // a lighter gray to read as "disabled / waiting"; interactive uses
          // the regular gray, with hover-scale + cursor:pointer signalling
          // the action.
          shield.setAttribute('stroke', interactive ? '#6e7681' : '#b8bec5');
          shield.setAttribute('fill', 'transparent');
          if (interactive) svg.setAttribute('aria-checked', 'false');
          break;
        case 'verifying':
          shield.setAttribute('stroke', '#2F6640');
          shield.setAttribute('fill', 'transparent');
          spinner.setAttribute('opacity', '1');
          if (interactive) svg.setAttribute('aria-checked', 'mixed');
          break;
        case 'verified':
          shield.setAttribute('stroke', '#2F6640');
          shield.setAttribute('fill', '#2F6640');
          glyph.textContent = '✓';
          glyph.setAttribute('fill', '#fff');
          if (interactive) svg.setAttribute('aria-checked', 'true');
          break;
        case 'error':
          shield.setAttribute('stroke', '#c2410c');
          shield.setAttribute('fill', '#c2410c');
          glyph.textContent = '!';
          glyph.setAttribute('fill', '#fff');
          if (interactive) svg.setAttribute('aria-checked', 'false');
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
    // Spinner arc inside the shield: rotates around the shield's visual center.
    // transform-origin set in viewBox user units (matches cx/cy of the circle).
    '[part="simple-shield-spinner"]{transform-origin:12px 13px;animation:caputchin-spin 0.8s linear infinite}',

    // --- shield SVG: only indicator on this widget; sized to read at a glance ---
    '[part="simple-shield-box"]{width:2rem;height:2rem;flex:0 0 auto;display:block;outline:none;transition:transform 120ms ease,stroke 180ms ease,fill 180ms ease}',
    // Interactive idle: pointer cursor + hover/focus scale-up.
    // Once the click fires, data-state flips away from "idle" → no more
    // hover scale (selector stops matching) + color transitions to verifying
    // green via the SVG attribute swap.
    '[part="simple-shield-box"][data-interactive][data-state="idle"]{cursor:pointer}',
    '[part="simple-shield-box"][data-interactive][data-state="idle"]:hover,[part="simple-shield-box"][data-interactive][data-state="idle"]:focus-visible{transform:scale(1.12)}',
    '[part="simple-shield-box"][data-interactive]:focus-visible{outline:2px solid #2F6640;outline-offset:2px;border-radius:0.25rem}',
    // Reduced motion: drop the scale lift; keep cursor + focus ring + color transitions.
    '@media (prefers-reduced-motion:reduce){',
      '[part="simple-shield-box"]{transition:none !important}',
      '[part="simple-shield-box"][data-interactive][data-state="idle"]:hover,[part="simple-shield-box"][data-interactive][data-state="idle"]:focus-visible{transform:none}',
    '}',
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
    '[data-size="compact"] [part="simple-shield-box"]{width:1.1rem;height:1.1rem}',
    '[data-size="compact"] [part="simple-checkbox-label"]{font-size:0.65rem;color:#3d2a5e;white-space:nowrap;min-width:3.6rem}',
    '[data-size="compact"] [part="simple-brand"]{display:flex;flex-direction:row;align-items:center;column-gap:0.25rem}',
    '[data-size="compact"] [part="simple-brand-logo"]{grid-column:auto;grid-row:auto;align-self:center;width:14px;height:14px}',
    '[data-size="compact"] [part="simple-brand-name"]{grid-column:auto;grid-row:auto;place-self:auto;font-size:0.6rem}',
    '[data-size="compact"] [part="simple-brand-tag"]{grid-column:auto;grid-row:auto;place-self:auto;font-size:0.5rem}',
    '[data-size="compact"] [part="simple-brand-name"]::after{content:" · ";color:#c0c0c0;margin-left:0.1rem}',

    // --- phone viewports (≤28rem) auto-compact non-compact widgets ---
    '@media (max-width:28rem){',
      '[part="simple-checkbox"]:not([data-size="compact"]){padding:0.625rem 0.75rem;gap:0.5rem}',
    '}',
  ].join('');
  root.appendChild(style);
}
