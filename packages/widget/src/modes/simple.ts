import type { Presentation, PresentationState, PresentationFactoryInput } from './index.js';

/**
 * Caputchin checkbox UI for `mode="simple"`. reCAPTCHA-style: a clickable
 * panel with a checkbox glyph, "Verify you're human" copy, and the Caputchin
 * brand. Renders into the widget host (light DOM, no shadow root) so styling
 * stays consistent with the rest of the widget surface.
 */
export function createSimplePresentation(input: PresentationFactoryInput): Presentation {
  const { el } = input;
  let root: HTMLDivElement | null = null;
  let checkbox: HTMLDivElement | null = null;
  let label: HTMLSpanElement | null = null;
  let brand: HTMLAnchorElement | null = null;
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

  return {
    mount(): void {
      if (root) return;
      root = document.createElement('div');
      root.setAttribute('part', 'simple-checkbox');
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

      checkbox = document.createElement('div');
      checkbox.setAttribute('part', 'simple-checkbox-box');
      checkbox.tabIndex = 0;
      checkbox.setAttribute('role', 'checkbox');
      checkbox.setAttribute('aria-checked', 'false');
      checkbox.setAttribute('aria-label', 'Verify you are human');
      checkbox.style.cssText = [
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

      label = document.createElement('span');
      label.textContent = "I'm not a robot";
      label.style.cssText = 'flex:1 1 auto';

      const brandLink = document.createElement('a');
      brandLink.setAttribute('part', 'simple-checkbox-brand');
      brandLink.href = 'https://caputchin.com/legal';
      brandLink.target = '_blank';
      brandLink.rel = 'noopener noreferrer';
      brandLink.style.cssText = [
        'display:flex',
        'flex-direction:column',
        'align-items:flex-end',
        'gap:0.125rem',
        'font-size:0.625rem',
        'color:#6e7681',
        'line-height:1.2',
        'flex:0 0 auto',
        'text-decoration:none',
      ].join(';');
      const brandName = document.createElement('div');
      brandName.setAttribute('part', 'simple-checkbox-brand-name');
      brandName.textContent = 'Caputchin';
      brandName.style.cssText = 'font-weight:600;font-size:0.75rem;color:#2F6640';
      const brandTag = document.createElement('div');
      brandTag.textContent = 'see no data';
      brandLink.appendChild(brandName);
      brandLink.appendChild(brandTag);
      brand = brandLink;

      // Make sure the brand hover/focus styles are present before first paint.
      ensureStyles();

      root.appendChild(checkbox);
      root.appendChild(label);
      root.appendChild(brand);

      // Only the checkbox itself is interactive — clicking the label or the
      // brand link does NOT trigger verification. Keyboard activation lives
      // on the checkbox for the same reason (it owns the role + tabIndex).
      checkbox.addEventListener('click', onPointer);
      checkbox.addEventListener('keydown', onKey);

      el.appendChild(root);
    },

    unmount(): void {
      if (!root) return;
      checkbox?.removeEventListener('click', onPointer);
      checkbox?.removeEventListener('keydown', onKey);
      root.remove();
      root = null;
      checkbox = null;
      label = null;
      brand = null;
      activateListeners.length = 0;
    },

    setState(state: PresentationState): void {
      if (!root || !checkbox || !label) return;
      switch (state) {
        case 'idle':
          checkbox.textContent = '';
          checkbox.style.background = '#fff';
          checkbox.style.borderColor = '#6e7681';
          label.textContent = "I'm not a robot";
          checkbox.setAttribute('aria-checked', 'false');
          root.style.opacity = '1';
          break;
        case 'verifying':
          checkbox.textContent = '';
          checkbox.style.background = '#fff';
          checkbox.style.borderColor = '#2F6640';
          checkbox.style.borderTopColor = 'transparent';
          checkbox.style.borderRadius = '50%';
          checkbox.style.animation = 'caputchin-spin 0.8s linear infinite';
          label.textContent = 'Verifying…';
          checkbox.setAttribute('aria-checked', 'mixed');
          ensureStyles();
          break;
        case 'verified':
          checkbox.style.animation = '';
          checkbox.style.background = '#2F6640';
          checkbox.style.borderColor = '#2F6640';
          checkbox.style.borderRadius = '0.25rem';
          checkbox.style.borderTopColor = '#2F6640';
          checkbox.textContent = '✓';
          label.textContent = 'Verified';
          checkbox.setAttribute('aria-checked', 'true');
          break;
        case 'error':
          checkbox.style.animation = '';
          checkbox.style.background = '#fff';
          checkbox.style.borderColor = '#c2410c';
          checkbox.style.borderRadius = '0.25rem';
          checkbox.style.borderTopColor = '#c2410c';
          checkbox.style.color = '#c2410c';
          checkbox.textContent = '!';
          label.textContent = 'Verification failed';
          checkbox.setAttribute('aria-checked', 'false');
          break;
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

let stylesInjected = false;
function ensureStyles(): void {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = [
    '@keyframes caputchin-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}',
    '[part="simple-checkbox-brand"]{transition:color 0.15s ease}',
    '[part="simple-checkbox-brand"]:hover,[part="simple-checkbox-brand"]:focus-visible{color:#2F6640;outline:none}',
    '[part="simple-checkbox-brand"]:hover [part="simple-checkbox-brand-name"],[part="simple-checkbox-brand"]:focus-visible [part="simple-checkbox-brand-name"]{text-decoration:underline}',
  ].join('');
  document.head.appendChild(style);
}
