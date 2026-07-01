import type { Presentation, PresentationState, PresentationFactoryInput, GeometryUpdate } from './index.js';
import type { ShellStrings, WidgetShell } from '../locale/widget-shell.js';
import type { ShellPalette, WidgetShellSkin } from '../skin/widget-shell-skin.js';

/**
 * Caputchin UI for `mode="simple"`. One layout across all triggers:
 * indicator on the left, state text ("Verify" / "Verifying…" / "Verified" /
 * "Failed") right next to it, then the brand block (logo + Caputchin +
 * "see no data" link) on the right. The brand block is stable; the "see
 * no data" tag never gets overridden by the verification state.
 *
 * Indicator shape depends on the trigger:
 * - `trigger="click"` / `trigger="form-submit"` → interactive checkbox the
 *   visitor can click to verify in place. `form-submit` ALSO verifies on the
 *   enclosing form's submit.
 * - `auto` / `manual` → passive shield SVG. Same state transitions, no click
 *   affordance (the widget drives itself).
 *
 * Label width is locked to fit the widest state string so transitions
 * never reflow the host page.
 */
export function createSimplePresentation(input: PresentationFactoryInput): Presentation {
  const { host, root: renderRoot, trigger, shellConfig } = input;
  // `shell` / `skin` are mutable so `applyLocale` / `applySkin` can swap the
  // resolved presets in place (no rebuild); `width` / `height` / `size` are
  // mutable so `applyGeometry` can live-resize the host + root box. Every
  // consumer reads the live vars.
  let shell = input.shell;
  let skin = input.skin;
  let width = input.width;
  let height = input.height;
  let size = input.size;
  const isInteractive = trigger === 'click' || trigger === 'form-submit';
  // Read from the LIVE `shell` so a post-mount `applyLocale` swap re-labels
  // without rebuilding the label lookup.
  const labelFor = (state: PresentationState): string => ({
    idle: shell.strings.simpleVerify,
    verifying: shell.strings.simpleVerifying,
    verified: shell.strings.simpleVerified,
    error: shell.strings.simpleFailed,
  }[state]);

  let root: HTMLDivElement | null = null;
  let indicator:
    | {
        el: HTMLElement;
        setState: (s: PresentationState) => void;
        applyPalette: (p: ShellPalette) => void;
        applyStrings: (s: ShellStrings) => void;
        dispose: () => void;
      }
    | null = null;
  let label: HTMLSpanElement | null = null;
  let brand: HTMLDivElement | null = null;
  // Brand refs kept so `applySkin` can swap the logo asset and `applyLocale`
  // can re-text the wordmark + tagline in place.
  let logoImg: HTMLImageElement | null = null;
  let wordmark: HTMLSpanElement | null = null;
  let tag: HTMLAnchorElement | null = null;
  // Mirrors the most recent state so `applySkin` (shield recolor) and
  // `applyLocale` (label re-text) re-render the CURRENT state, not idle.
  let current: PresentationState = 'idle';
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
    homeLink.href = shellConfig.values.home_link;
    homeLink.target = '_blank';
    homeLink.rel = 'noopener noreferrer';
    homeLink.style.cssText = 'display:contents;color:var(--cpt-skin-brand_text)';

    const logoSpan = document.createElement('span');
    logoSpan.setAttribute('part', 'simple-brand-logo');
    logoSpan.setAttribute('aria-hidden', 'true');
    logoSpan.style.cssText = 'display:inline-flex;line-height:0';
    // Logo is a skin asset (declared in caputchin.json as an `image` type).
    // Per skin preset ships its own mode-matched variant (green leaf for
    // light, all-white for dark). The CSS rule below sizes the <img> to
    // fill the wrapper span. Customer-curated paid skins can swap to any
    // brand mark via the same key.
    logoImg = document.createElement('img');
    logoImg.src = skin.palette.brand_logo;
    logoImg.alt = '';
    logoImg.style.cssText = 'width:100%;height:100%;display:block';
    logoSpan.appendChild(logoImg);

    wordmark = document.createElement('span');
    wordmark.setAttribute('part', 'simple-brand-name');
    wordmark.textContent = shell.strings.brandName;
    wordmark.style.cssText = 'font-weight:600;color:inherit';

    homeLink.appendChild(logoSpan);
    homeLink.appendChild(wordmark);

    tag = document.createElement('a');
    tag.setAttribute('part', 'simple-brand-tag');
    tag.href = shellConfig.values.legal_link;
    tag.target = '_blank';
    tag.rel = 'noopener noreferrer';
    tag.textContent = shell.strings.brandTag;
    tag.style.cssText = 'color:var(--cpt-skin-text_muted)';

    container.appendChild(homeLink);
    container.appendChild(tag);
    return container;
  }

  // Apply the current width / height / size to the host + root box. Re-runnable:
  // mount calls it once, applyGeometry re-calls it after a live resize. Fully
  // resets each axis first so a full<->pixel<->auto transition can't leave a
  // stale inline style.
  function applySizing(): void {
    if (!root) return;
    const full = width === 'full';
    const pxW = typeof width === 'number' ? width : null;
    const pxH = typeof height === 'number' ? height : null;
    if (size === 'compact') root.setAttribute('data-size', 'compact');
    else root.removeAttribute('data-size');
    root.style.boxSizing = 'border-box';
    root.style.width = full ? '100%' : 'fit-content';
    root.style.minWidth = full ? '' : 'min(18rem,100%)';
    root.style.height = '';
    host.style.display = '';
    host.style.width = '';
    host.style.height = '';
    if (full) {
      host.style.display = 'block';
      host.style.width = '100%';
    } else if (pxW !== null) {
      host.style.display = 'block';
      host.style.width = `${pxW}px`;
      root.style.width = '100%';
    }
    if (pxH !== null) {
      host.style.display ||= 'block';
      host.style.height = `${pxH}px`;
      root.style.height = '100%';
    }
  }

  return {
    mount(): void {
      if (root) return;
      ensureStyles(renderRoot);

      root = document.createElement('div');
      root.setAttribute('part', 'simple-checkbox');
      if (shell.direction === 'rtl') root.setAttribute('dir', 'rtl');
      // Static styles only; width / min-width / density come from applySizing so
      // a live applyGeometry can re-apply them without rebuilding the element.
      root.style.cssText = [
        'display:flex',
        'align-items:center',
        'padding:0.5rem 0.75rem',
        'border:1px solid var(--cpt-skin-border)',
        'border-radius:0.5rem',
        'background:var(--cpt-skin-surface_bg)',
        'font:14px system-ui, -apple-system, "Segoe UI", sans-serif',
        'color:var(--cpt-skin-text_primary)',
        'user-select:none',
        'box-sizing:border-box',
        'max-width:100%',
        'flex-wrap:wrap',
        'gap:0.75rem',
      ].join(';');

      indicator = createShieldIndicator({ interactive: isInteractive, onPointer, onKey, strings: shell.strings, palette: skin.palette });

      label = document.createElement('span');
      label.setAttribute('part', 'simple-checkbox-label');
      label.setAttribute('aria-live', 'polite');
      // Width-locked: longest text fits, transitions don't reflow.
      label.style.cssText = 'flex:0 0 auto;text-align:start';

      root.appendChild(indicator.el);
      root.appendChild(label);

      brand = buildBrand();
      // Spacer pushes brand to the trailing edge without depending on label
      // width changes. `margin-inline-start` flips automatically under
      // `dir="rtl"` so the brand stays on the line-end side in RTL too.
      brand.style.marginInlineStart = 'auto';
      root.appendChild(brand);

      applySizing();
      renderRoot.appendChild(root);

      this.setState('idle');
    },

    unmount(): void {
      if (!root) return;
      indicator?.dispose();
      indicator = null;
      // Unconditionally clear any host box we reserved (no-op when unset).
      host.style.display = '';
      host.style.width = '';
      host.style.height = '';
      root.remove();
      root = null;
      label = null;
      brand = null;
      activateListeners.length = 0;
    },

    setState(state: PresentationState): void {
      current = state;
      if (!indicator || !label) return;
      indicator.setState(state);
      label.textContent = labelFor(state);
    },

    onActivate(handler: () => void): () => void {
      activateListeners.push(handler);
      return () => {
        const idx = activateListeners.indexOf(handler);
        if (idx >= 0) activateListeners.splice(idx, 1);
      };
    },

    applySkin(newSkin: WidgetShellSkin): void {
      skin = newSkin;
      if (!root) return;
      // Shield SVG stroke/fill/glyph + spinner are baked raw at mount (CSS vars
      // don't reach SVG presentation attributes), so recolor them for the
      // CURRENT state; the brand logo is a skin asset, not a var.
      indicator?.applyPalette(newSkin.palette);
      if (logoImg) logoImg.src = newSkin.palette.brand_logo;
    },

    applyLocale(newShell: WidgetShell): void {
      shell = newShell;
      if (!root) return;
      if (label) label.textContent = labelFor(current);
      if (wordmark) wordmark.textContent = newShell.strings.brandName;
      if (tag) tag.textContent = newShell.strings.brandTag;
      indicator?.applyStrings(newShell.strings);
      // Set OR remove: an rtl→ltr switch must drop a stale dir attribute.
      if (newShell.direction === 'rtl') root.setAttribute('dir', 'rtl');
      else root.removeAttribute('dir');
    },

    applyGeometry(geometry: GeometryUpdate): void {
      width = geometry.width;
      height = geometry.height;
      if (geometry.size !== undefined) size = geometry.size;
      applySizing();
    },
  };
}

// ---------------- shield indicator ----------------

const SVG_NS = 'http://www.w3.org/2000/svg';
// Shield path tuned to fill the viewBox (1-23 vertical, 2-22 horizontal)
// so the rendered shield reads as a glyph, not a small mark on a big canvas.
const SHIELD_PATH = 'M12 1 L22 4 V12 C22 18 17.5 22.5 12 23.5 C6.5 22.5 2 18 2 12 V4 Z';

function createShieldIndicator(input: {
  interactive: boolean;
  onPointer: () => void;
  onKey: (e: KeyboardEvent) => void;
  strings: ShellStrings;
  palette: ShellPalette;
}): {
  el: HTMLElement;
  setState: (s: PresentationState) => void;
  applyPalette: (p: ShellPalette) => void;
  applyStrings: (s: ShellStrings) => void;
  dispose: () => void;
} {
  const { interactive, onPointer, onKey, strings } = input;
  // Mutable so `applyPalette` can swap the resolved skin palette in place; the
  // shield/glyph/spinner colors are SVG presentation attributes (not CSS vars),
  // so they must be re-written from the live palette on a skin change.
  let palette = input.palette;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('part', 'simple-shield-box');
  svg.setAttribute('viewBox', '0 0 24 24');
  if (interactive) {
    svg.setAttribute('data-interactive', '');
    svg.setAttribute('role', 'checkbox');
    svg.setAttribute('aria-checked', 'false');
    svg.setAttribute('aria-label', strings.simpleAriaCheckbox);
    (svg as unknown as SVGSVGElement).tabIndex = 0;
    svg.addEventListener('click', onPointer);
    svg.addEventListener('keydown', onKey);
  } else {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', strings.simpleAriaStatus);
  }

  const shield = document.createElementNS(SVG_NS, 'path');
  shield.setAttribute('d', SHIELD_PATH);
  // Always 1px stroke; keeps the shield a clean glyph regardless of size or state.
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
  spinner.setAttribute('stroke', palette.primary);
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
  glyph.setAttribute('fill', palette.glyph);
  svg.appendChild(glyph);

  // Tracks the current state so `applyPalette` can re-run the color assignment
  // for whatever state is showing (idle/verifying/verified/error).
  let indState: PresentationState = 'idle';

  function paint(state: PresentationState): void {
      indState = state;
      glyph.textContent = '';
      spinner.setAttribute('opacity', '0');
      svg.removeAttribute('data-state');
      svg.setAttribute('data-state', state);
      switch (state) {
        case 'idle':
          // Idle gray-stroke shield. Passive (auto/manual) gets
          // a lighter gray to read as "disabled / waiting"; interactive uses
          // the regular gray, with hover-scale + cursor:pointer signalling
          // the action.
          shield.setAttribute('stroke', interactive ? palette.text_muted : palette.text_passive);
          shield.setAttribute('fill', 'transparent');
          if (interactive) svg.setAttribute('aria-checked', 'false');
          break;
        case 'verifying':
          shield.setAttribute('stroke', palette.primary);
          shield.setAttribute('fill', 'transparent');
          spinner.setAttribute('opacity', '1');
          if (interactive) svg.setAttribute('aria-checked', 'mixed');
          break;
        case 'verified':
          shield.setAttribute('stroke', palette.primary);
          shield.setAttribute('fill', palette.primary);
          glyph.textContent = '✓';
          glyph.setAttribute('fill', palette.glyph);
          if (interactive) svg.setAttribute('aria-checked', 'true');
          break;
        case 'error':
          shield.setAttribute('stroke', palette.error);
          shield.setAttribute('fill', palette.error);
          glyph.textContent = '!';
          glyph.setAttribute('fill', palette.glyph);
          if (interactive) svg.setAttribute('aria-checked', 'false');
          break;
      }
  }

  return {
    el: svg as unknown as HTMLElement,
    setState: paint,
    applyPalette(newPalette: ShellPalette): void {
      palette = newPalette;
      // Spinner stroke is a raw attribute set at build; re-write it, then
      // repaint the shield/glyph for the current state with the new palette.
      spinner.setAttribute('stroke', palette.primary);
      paint(indState);
    },
    applyStrings(newStrings: ShellStrings): void {
      svg.setAttribute('aria-label', interactive ? newStrings.simpleAriaCheckbox : newStrings.simpleAriaStatus);
    },
    dispose(): void {
      if (interactive) {
        svg.removeEventListener('click', onPointer);
        svg.removeEventListener('keydown', onKey);
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
    '[part="simple-shield-box"][data-interactive]:focus-visible{outline:2px solid var(--cpt-skin-primary);outline-offset:2px;border-radius:0.25rem}',
    // Reduced motion: drop the scale lift; keep cursor + focus ring + color transitions.
    '@media (prefers-reduced-motion:reduce){',
      '[part="simple-shield-box"]{transition:none !important}',
      '[part="simple-shield-box"][data-interactive][data-state="idle"]:hover,[part="simple-shield-box"][data-interactive][data-state="idle"]:focus-visible{transform:none}',
    '}',
    // --- label: width locked to fit "Verifying…" so state changes don't reflow ---
    '[part="simple-checkbox-label"]{color:var(--cpt-skin-text_label);font-size:0.85rem;min-width:5rem;display:inline-block;text-align:start}',

    // --- brand block: normal layout (2-col grid, logo spans 2 rows) ---
    '[part="simple-brand"]{display:grid;grid-template-columns:auto auto;grid-template-rows:auto auto;column-gap:0.25rem;row-gap:0;align-items:center;line-height:1.2;flex:0 0 auto}',
    '[part="simple-brand-logo"]{grid-column:1;grid-row:1 / span 2;align-self:center;width:32px;height:32px}',
    '[part="simple-brand-logo"] img{width:100%;height:100%;display:block}',
    '[part="simple-brand-name"]{grid-column:2;grid-row:1;place-self:center;text-align:center;font-size:0.85rem}',
    '[part="simple-brand-tag"]{grid-column:2;grid-row:2;place-self:center;text-align:center;font-size:0.65rem}',

    '[part="simple-brand-home"],[part="simple-brand-tag"]{text-decoration:none;transition:color 0.15s ease}',
    '[part="simple-brand-home"]:hover,[part="simple-brand-home"]:focus-visible{color:var(--cpt-skin-brand_text_hover);text-decoration:underline;outline:none}',
    '[part="simple-brand-tag"]:hover,[part="simple-brand-tag"]:focus-visible{color:var(--cpt-skin-brand_text_hover);text-decoration:underline;outline:none}',

    // --- size="compact": single-row inline strip, dialed down ---
    '[data-size="compact"][part="simple-checkbox"]{padding:0.2rem 0.4rem;gap:0.35rem;border-radius:0.35rem;flex-wrap:nowrap;min-width:0 !important}',
    '[data-size="compact"] [part="simple-shield-box"]{width:1.1rem;height:1.1rem}',
    '[data-size="compact"] [part="simple-checkbox-label"]{font-size:0.65rem;color:var(--cpt-skin-text_label);white-space:nowrap;min-width:3.6rem}',
    '[data-size="compact"] [part="simple-brand"]{display:flex;flex-direction:row;align-items:center;column-gap:0.25rem}',
    '[data-size="compact"] [part="simple-brand-logo"]{grid-column:auto;grid-row:auto;align-self:center;width:14px;height:14px}',
    '[data-size="compact"] [part="simple-brand-name"]{grid-column:auto;grid-row:auto;place-self:auto;font-size:0.6rem}',
    '[data-size="compact"] [part="simple-brand-tag"]{grid-column:auto;grid-row:auto;place-self:auto;font-size:0.5rem}',
    '[data-size="compact"] [part="simple-brand-name"]::after{content:" · ";color:var(--cpt-skin-separator);margin-inline-start:0.1rem}',

    // --- phone viewports (≤28rem): reclaim the row, float the tagline ---
    // The full brand block (logo + wordmark + tagline) can't sit beside the
    // verify row on a phone without wrapping onto a second line (the "broken"
    // stacked look). Keep the verify row on ONE line and the logo at FULL size
    // on the trailing edge; hide the wordmark; float the tagline into the
    // bottom-trailing corner (absolute, so it never pushes the row and may
    // overlap the logo, like Friendly Captcha's corner brand). Scoped away from
    // the game's compact brand strip.
    '@media (max-width:28rem){',
      // !important on flex-wrap + min-width: the root sets flex-wrap:wrap and
      // min-width:min(18rem,100%) as INLINE styles (root.style.cssText), which a
      // plain rule can't beat (the compact rule uses !important for the same
      // reason). Without it the row still wraps on a narrow phone / long label.
      '[part="simple-checkbox"]:not([data-size="compact"]){position:relative;flex-wrap:nowrap!important;min-width:0!important}',
      '[part="simple-checkbox"]:not([data-size="compact"]) [part="simple-brand-name"]{display:none}',
      // Tagline floats in the bottom-trailing corner, on top of the full-size
      // logo (which stays in flow, trailing-aligned, at its 32px base size).
      '[part="simple-checkbox"]:not([data-size="compact"]) [part="simple-brand-tag"]{position:absolute;bottom:0.2rem;inset-inline-end:0.4rem;font-size:0.6rem;line-height:1;z-index:1}',
      // Compact strip (the game brand footer): a single right-aligned row, so
      // there is no corner to float into. Just hide the wordmark (its "·"
      // separator goes with it via ::after), leaving logo + tagline trailing.
      '[data-size="compact"] [part="simple-brand-name"]{display:none}',
    '}',
  ].join('');
  root.appendChild(style);
}
