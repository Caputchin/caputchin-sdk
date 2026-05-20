import type { Presentation, PresentationState, PresentationFactoryInput } from './index.js';
import { LOGO_PRIMARY } from '../brand/logo.js';

/**
 * Caputchin UI for `mode="simple"`. Two layouts:
 *
 * - **checkbox** (trigger=`click` or `auto`): reCAPTCHA-style clickable
 *   checkbox + "I'm not a robot" label + brand block on the right.
 * - **pill** (trigger=`form-submit` or `manual`): Turnstile-style compact
 *   branded pill — the brand block IS the status indicator. The tagline
 *   slot ("see no data" link in idle) swaps to status text during the
 *   verification window. No left-side checkbox / phantom control.
 */
export function createSimplePresentation(input: PresentationFactoryInput): Presentation {
  const { host, root: renderRoot, trigger, width, height, size } = input;
  const isPill = trigger === 'form-submit' || trigger === 'manual';
  const isFullWidth = width === 'full';
  const isCompact = size === 'compact';
  const pxWidth = typeof width === 'number' ? width : null;
  const pxHeight = typeof height === 'number' ? height : null;

  let root: HTMLDivElement | null = null;
  let statusIcon: HTMLDivElement | null = null;
  let label: HTMLSpanElement | null = null;
  let brand: HTMLDivElement | null = null;
  let tagLink: HTMLAnchorElement | null = null;
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

  function buildBrand(): { container: HTMLDivElement; tag: HTMLAnchorElement } {
    const container = document.createElement('div');
    container.setAttribute('part', 'simple-brand');
    // Layout (grid for normal / flex-row for compact) lives in the shadow
    // stylesheet so size variants can override without inline-style fights.

    const homeLink = document.createElement('a');
    homeLink.setAttribute('part', 'simple-brand-home');
    homeLink.href = 'https://caputchin.com';
    homeLink.target = '_blank';
    homeLink.rel = 'noopener noreferrer';
    homeLink.style.cssText = [
      'display:contents',
      'color:#2F6640',
    ].join(';');

    const logoSpan = document.createElement('span');
    logoSpan.setAttribute('part', 'simple-brand-logo');
    logoSpan.setAttribute('aria-hidden', 'true');
    logoSpan.style.cssText = 'display:inline-flex;line-height:0';
    logoSpan.innerHTML = LOGO_PRIMARY;
    const svg = logoSpan.querySelector('svg');
    if (svg) {
      // Strip the source SVG's id + 100% width so CSS in the shadow stylesheet
      // controls the rendered size per variant (normal 32px / compact 20px).
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
    return { container, tag };
  }

  return {
    mount(): void {
      if (root) return;
      ensureStyles(renderRoot);

      root = document.createElement('div');
      root.setAttribute('part', isPill ? 'simple-pill' : 'simple-checkbox');
      if (isCompact) root.setAttribute('data-size', 'compact');
      // Responsive: never wider than parent (max-width:100%), capped at 22rem
      // so the widget stays compact in wide containers but fills narrow ones.
      // No min-width — flex children shrink naturally on narrow viewports.
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
      ];
      if (isPill) {
        rootStyles.push('gap:0', 'justify-content:center');
      } else {
        rootStyles.push('gap:0.75rem');
        if (!isFullWidth) rootStyles.push('min-width:min(18rem,100%)');
      }
      root.style.cssText = rootStyles.join(';');

      if (!isPill) {
        statusIcon = document.createElement('div');
        statusIcon.setAttribute('part', 'simple-checkbox-box');
        statusIcon.tabIndex = 0;
        statusIcon.setAttribute('role', 'checkbox');
        statusIcon.setAttribute('aria-checked', 'false');
        statusIcon.setAttribute('aria-label', 'Verify you are human');
        // Static layout/sizing lives in the shadow stylesheet so size variants
        // (`data-size="compact"`) can override without inline-style specificity
        // fights. Dynamic bits (background/border/animation) stay in setState.
        statusIcon.style.cssText = [
          'border:2px solid #6e7681',
          'border-radius:0.25rem',
          'background:#fff',
          'color:#fff',
        ].join(';');
        statusIcon.addEventListener('click', onPointer);
        statusIcon.addEventListener('keydown', onKey);

        label = document.createElement('span');
        label.setAttribute('part', 'simple-checkbox-label');
        // min-width:0 lets the label shrink below its intrinsic content width
        // on narrow viewports without overflowing the flex container.
        label.style.cssText = 'flex:1 1 auto;min-width:0';

        root.appendChild(statusIcon);
        root.appendChild(label);
      }

      const built = buildBrand();
      brand = built.container;
      tagLink = built.tag;
      root.appendChild(brand);
      // Host element is inline by default — width:100% inside an inline host
      // sizes to content. Expand the host when full-width is requested.
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

      // Apply idle state once everything is wired so first paint is correct.
      this.setState('idle');
    },

    unmount(): void {
      if (!root) return;
      if (statusIcon && !isPill) {
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
      tagLink = null;
      activateListeners.length = 0;
    },

    setState(state: PresentationState): void {
      if (!root) return;
      if (isPill) {
        if (tagLink) applyPillTagState(tagLink, state);
      } else {
        if (statusIcon && label) applyCheckboxState(statusIcon, label, state);
      }
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

function applyCheckboxState(box: HTMLDivElement, label: HTMLSpanElement, state: PresentationState): void {
  switch (state) {
    case 'idle':
      box.textContent = '';
      box.style.background = '#fff';
      box.style.borderColor = '#6e7681';
      box.style.borderRadius = '0.25rem';
      box.style.borderTopColor = '#6e7681';
      box.style.animation = '';
      box.style.color = '#fff';
      label.textContent = "I'm not a robot";
      box.setAttribute('aria-checked', 'false');
      break;
    case 'verifying':
      box.textContent = '';
      box.style.background = '#fff';
      box.style.borderColor = '#2F6640';
      box.style.borderTopColor = 'transparent';
      box.style.borderRadius = '50%';
      box.style.animation = 'caputchin-spin 0.8s linear infinite';
      label.textContent = 'Verifying…';
      box.setAttribute('aria-checked', 'mixed');
      break;
    case 'verified':
      box.style.animation = '';
      box.style.background = '#2F6640';
      box.style.borderColor = '#2F6640';
      box.style.borderRadius = '0.25rem';
      box.style.borderTopColor = '#2F6640';
      box.textContent = '✓';
      label.textContent = 'Verified';
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
      label.textContent = 'Verification failed';
      box.setAttribute('aria-checked', 'false');
      break;
  }
}

/**
 * Pill layout = brand block IS the status indicator. Tagline slot swaps:
 * idle = "see no data" link to /legal; non-idle = status text (no link).
 */
function applyPillTagState(tag: HTMLAnchorElement, state: PresentationState): void {
  switch (state) {
    case 'idle':
      tag.textContent = 'see no data';
      tag.style.color = '#6e7681';
      tag.style.pointerEvents = 'auto';
      tag.style.cursor = '';
      tag.removeAttribute('aria-live');
      break;
    case 'verifying':
      tag.textContent = 'verifying…';
      tag.style.color = '#2F6640';
      tag.style.pointerEvents = 'none';
      tag.style.cursor = 'default';
      tag.setAttribute('aria-live', 'polite');
      break;
    case 'verified':
      tag.textContent = '✓ verified';
      tag.style.color = '#2F6640';
      tag.style.pointerEvents = 'none';
      tag.style.cursor = 'default';
      tag.setAttribute('aria-live', 'polite');
      break;
    case 'error':
      tag.textContent = '! verification failed';
      tag.style.color = '#c2410c';
      tag.style.pointerEvents = 'none';
      tag.style.cursor = 'default';
      tag.setAttribute('aria-live', 'polite');
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

    // --- brand block: normal layout (2-col grid, logo spans 2 rows) ---
    '[part="simple-brand"]{display:grid;grid-template-columns:auto auto;grid-template-rows:auto auto;column-gap:0.25rem;row-gap:0;align-items:center;line-height:1.2;flex:0 0 auto}',
    '[part="simple-brand-logo"]{grid-column:1;grid-row:1 / span 2;align-self:center;width:32px;height:32px}',
    '[part="simple-brand-logo"] svg{width:100%;height:100%;display:block}',
    '[part="simple-brand-name"]{grid-column:2;grid-row:1;place-self:center;text-align:center;font-size:0.85rem}',
    '[part="simple-brand-tag"]{grid-column:2;grid-row:2;place-self:center;text-align:center;font-size:0.65rem}',

    // --- link styling (both sizes) ---
    '[part="simple-brand-home"],[part="simple-brand-tag"]{text-decoration:none;transition:color 0.15s ease}',
    '[part="simple-brand-home"]:hover,[part="simple-brand-home"]:focus-visible{color:#1f4a2c;text-decoration:underline;outline:none}',
    '[part="simple-brand-tag"]:hover,[part="simple-brand-tag"]:focus-visible{color:#2F6640;text-decoration:underline;outline:none}',

    // --- size="compact": single-row inline strip, dialed down small ---
    '[data-size="compact"][part="simple-checkbox"],[data-size="compact"][part="simple-pill"]{padding:0.15rem 0.35rem;gap:0.25rem;font-size:0.65rem;border-radius:0.35rem;flex-wrap:nowrap}',
    '[data-size="compact"] [part="simple-checkbox-box"]{width:0.85rem;height:0.85rem;font-size:0.65rem;border-width:1px;border-radius:0.2rem}',
    '[data-size="compact"] [part="simple-checkbox-label"]{display:none}',
    '[data-size="compact"] [part="simple-brand"]{display:flex;flex-direction:row;align-items:center;column-gap:0.25rem}',
    '[data-size="compact"] [part="simple-brand-logo"]{grid-column:auto;grid-row:auto;align-self:center;width:14px;height:14px}',
    '[data-size="compact"] [part="simple-brand-name"]{grid-column:auto;grid-row:auto;place-self:auto;font-size:0.6rem}',
    '[data-size="compact"] [part="simple-brand-tag"]{grid-column:auto;grid-row:auto;place-self:auto;font-size:0.5rem}',
    '[data-size="compact"] [part="simple-brand-name"]::after{content:" · ";color:#c0c0c0;margin-left:0.1rem}',

    // --- phone viewports (≤28rem) auto-compact non-compact widgets ---
    '@media (max-width:28rem){',
      '[part="simple-checkbox"]:not([data-size="compact"]){padding:0.625rem 0.75rem;gap:0.5rem}',
      '[part="simple-pill"]:not([data-size="compact"]){padding:0.625rem 0.75rem}',
      '[part="simple-checkbox-box"]:not([data-size="compact"] *){width:1.75rem;height:1.75rem}',
      '[part="simple-checkbox"]:not([data-size="compact"]) [part="simple-checkbox-label"]{display:none}',
    '}',
  ].join('');
  root.appendChild(style);
}
