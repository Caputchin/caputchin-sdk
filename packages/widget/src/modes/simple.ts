import type { Presentation, PresentationState, PresentationFactoryInput } from './index.js';
import { LOGO_PRIMARY } from '../brand/logo.js';

/**
 * Caputchin UI for `mode="simple"`. Two layouts:
 *
 * - **checkbox** (trigger=`click` or `auto`): reCAPTCHA-style clickable
 *   checkbox + "I'm not a robot" label. User-driven path.
 * - **pill** (trigger=`form-submit` or `manual`): status-only pill, no
 *   interactive checkbox (the user has no role in starting verification —
 *   showing a clickable checkbox would be a phantom control).
 *
 * Both layouts share the same brand block in the trailing slot: two
 * independent links — Caputchin wordmark+logo → `/`, "see no data" → `/legal`.
 */
export function createSimplePresentation(input: PresentationFactoryInput): Presentation {
  const { el, trigger } = input;
  const isPill = trigger === 'form-submit' || trigger === 'manual';

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
    container.style.cssText = [
      'display:flex',
      'flex-direction:column',
      'align-items:flex-end',
      'gap:0.125rem',
      'line-height:1.2',
      'flex:0 0 auto',
    ].join(';');

    const homeLink = document.createElement('a');
    homeLink.setAttribute('part', 'simple-brand-home');
    homeLink.href = 'https://caputchin.com';
    homeLink.target = '_blank';
    homeLink.rel = 'noopener noreferrer';
    homeLink.style.cssText = [
      'display:inline-flex',
      'align-items:center',
      'gap:0.35rem',
      'color:#2F6640',
      'font-weight:600',
      'font-size:0.8rem',
    ].join(';');
    // Wrap so we can size the imported SVG inline (the source SVG declares width=100%).
    const logoSpan = document.createElement('span');
    logoSpan.setAttribute('aria-hidden', 'true');
    logoSpan.style.cssText = 'display:inline-flex;width:28px;height:28px;line-height:0';
    logoSpan.innerHTML = LOGO_PRIMARY;
    const svg = logoSpan.querySelector('svg');
    if (svg) {
      svg.setAttribute('width', '28');
      svg.setAttribute('height', '28');
      svg.removeAttribute('id');
    }
    const wordmark = document.createElement('span');
    wordmark.textContent = 'Caputchin';
    homeLink.appendChild(logoSpan);
    homeLink.appendChild(wordmark);

    const tagLink = document.createElement('a');
    tagLink.setAttribute('part', 'simple-brand-tag');
    tagLink.href = 'https://caputchin.com/legal';
    tagLink.target = '_blank';
    tagLink.rel = 'noopener noreferrer';
    tagLink.textContent = 'see no data';
    tagLink.style.cssText = [
      'color:#6e7681',
      'font-size:0.625rem',
    ].join(';');

    container.appendChild(homeLink);
    container.appendChild(tagLink);
    return container;
  }

  return {
    mount(): void {
      if (root) return;
      ensureStyles();

      root = document.createElement('div');
      root.setAttribute('part', isPill ? 'simple-pill' : 'simple-checkbox');
      root.style.cssText = [
        'display:inline-flex',
        'align-items:center',
        'gap:0.75rem',
        'padding:0.75rem 1rem',
        'border:1px solid #d0d7de',
        'border-radius:0.5rem',
        'background:#fff',
        'font:14px system-ui, -apple-system, "Segoe UI", sans-serif',
        'color:#1a1917',
        'user-select:none',
        'min-width:18rem',
        'box-sizing:border-box',
      ].join(';');

      // Status indicator: clickable checkbox in checkbox layout, passive
      // shield/dot in pill layout.
      statusIcon = document.createElement('div');
      if (isPill) {
        statusIcon.setAttribute('part', 'simple-pill-status');
        statusIcon.setAttribute('aria-hidden', 'true');
        statusIcon.style.cssText = [
          'width:1.25rem',
          'height:1.25rem',
          'display:flex',
          'align-items:center',
          'justify-content:center',
          'font-size:0.875rem',
          'line-height:1',
          'flex:0 0 auto',
          'color:#6e7681',
        ].join(';');
      } else {
        statusIcon.setAttribute('part', 'simple-checkbox-box');
        statusIcon.tabIndex = 0;
        statusIcon.setAttribute('role', 'checkbox');
        statusIcon.setAttribute('aria-checked', 'false');
        statusIcon.setAttribute('aria-label', 'Verify you are human');
        statusIcon.style.cssText = [
          'width:1.5rem',
          'height:1.5rem',
          'border:2px solid #6e7681',
          'border-radius:0.25rem',
          'background:#fff',
          'display:flex',
          'align-items:center',
          'justify-content:center',
          'font-size:1rem',
          'line-height:1',
          'color:#fff',
          'flex:0 0 auto',
          'cursor:pointer',
        ].join(';');
        statusIcon.addEventListener('click', onPointer);
        statusIcon.addEventListener('keydown', onKey);
      }

      label = document.createElement('span');
      label.style.cssText = 'flex:1 1 auto';

      brand = buildBrand();

      root.appendChild(statusIcon);
      root.appendChild(label);
      root.appendChild(brand);
      el.appendChild(root);

      // Apply idle state once everything is wired so first paint is correct.
      this.setState('idle');
    },

    unmount(): void {
      if (!root) return;
      if (statusIcon && !isPill) {
        statusIcon.removeEventListener('click', onPointer);
        statusIcon.removeEventListener('keydown', onKey);
      }
      root.remove();
      root = null;
      statusIcon = null;
      label = null;
      brand = null;
      activateListeners.length = 0;
    },

    setState(state: PresentationState): void {
      if (!root || !statusIcon || !label) return;
      if (isPill) {
        applyPillState(statusIcon, label, state);
      } else {
        applyCheckboxState(statusIcon, label, state);
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

function applyPillState(icon: HTMLDivElement, label: HTMLSpanElement, state: PresentationState): void {
  switch (state) {
    case 'idle':
      icon.style.color = '#6e7681';
      icon.style.animation = '';
      icon.style.border = '';
      icon.style.borderRadius = '';
      icon.style.width = '1.25rem';
      icon.style.height = '1.25rem';
      icon.textContent = '🛡';
      label.textContent = 'Protected by Caputchin';
      label.style.color = '#6e7681';
      break;
    case 'verifying':
      icon.textContent = '';
      icon.style.color = '#2F6640';
      icon.style.width = '1.25rem';
      icon.style.height = '1.25rem';
      icon.style.border = '2px solid #2F6640';
      icon.style.borderTopColor = 'transparent';
      icon.style.borderRadius = '50%';
      icon.style.animation = 'caputchin-spin 0.8s linear infinite';
      label.textContent = 'Verifying…';
      label.style.color = '#1a1917';
      break;
    case 'verified':
      icon.style.animation = '';
      icon.style.color = '#2F6640';
      icon.style.border = '';
      icon.style.borderRadius = '';
      icon.style.width = '1.25rem';
      icon.style.height = '1.25rem';
      icon.textContent = '✓';
      label.textContent = 'Verified';
      label.style.color = '#2F6640';
      break;
    case 'error':
      icon.style.animation = '';
      icon.style.color = '#c2410c';
      icon.style.border = '';
      icon.style.borderRadius = '';
      icon.style.width = '1.25rem';
      icon.style.height = '1.25rem';
      icon.textContent = '!';
      label.textContent = 'Verification failed';
      label.style.color = '#c2410c';
      break;
  }
}

let stylesInjected = false;
function ensureStyles(): void {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = [
    '@keyframes caputchin-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}',
    '[part="simple-brand-home"],[part="simple-brand-tag"]{text-decoration:none;transition:color 0.15s ease}',
    '[part="simple-brand-home"]:hover,[part="simple-brand-home"]:focus-visible{color:#1f4a2c;text-decoration:underline;outline:none}',
    '[part="simple-brand-tag"]:hover,[part="simple-brand-tag"]:focus-visible{color:#2F6640;text-decoration:underline;outline:none}',
  ].join('');
  document.head.appendChild(style);
}
