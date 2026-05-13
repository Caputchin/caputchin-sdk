import type { Layout, TriggerState } from './types.js';
import { LAYOUT_CSS } from './styles.js';
import { TriggerCheckbox } from './trigger.js';

export interface PresenterCallbacks {
  onTriggerActivate: () => void;
  onDialogClose: () => void;
}

let dialogIdCounter = 0;

export class LayoutPresenter {
  private readonly shadow: ShadowRoot;
  private readonly callbacks: PresenterCallbacks;
  private readonly root: HTMLDivElement;
  private readonly dialog: HTMLDialogElement;
  private trigger: TriggerCheckbox | null = null;
  private layout: Layout | null = null;
  private disposed = false;
  private backdropWired = false;

  constructor(host: HTMLElement, callbacks: PresenterCallbacks) {
    this.callbacks = callbacks;
    this.shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    while (this.shadow.firstChild) this.shadow.removeChild(this.shadow.firstChild);
    this.installStyles();

    this.root = document.createElement('div');
    this.root.setAttribute('part', 'root');
    this.shadow.appendChild(this.root);

    // Dialog is built once and always parents the iframe — no re-parent on
    // layout switch, so srcdoc never reloads after manifest is consumed.
    this.dialog = document.createElement('dialog');
    this.dialog.setAttribute('part', 'dialog');
    this.dialog.id = `cpt-dialog-${++dialogIdCounter}`;
    this.dialog.addEventListener('close', () => {
      this.trigger?.element.setAttribute('aria-expanded', 'false');
      this.callbacks.onDialogClose();
    });
    this.root.appendChild(this.dialog);
  }

  private installStyles(): void {
    const docProto = (globalThis as { Document?: { prototype?: unknown } }).Document?.prototype;
    const supportsAdopted =
      typeof CSSStyleSheet !== 'undefined' &&
      docProto !== undefined &&
      'adoptedStyleSheets' in (docProto as object) &&
      typeof (CSSStyleSheet.prototype as { replaceSync?: unknown }).replaceSync === 'function';

    if (supportsAdopted) {
      try {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(LAYOUT_CSS);
        this.shadow.adoptedStyleSheets = [sheet];
        return;
      } catch {
        // fall through to <style> tag fallback
      }
    }
    const style = document.createElement('style');
    style.textContent = LAYOUT_CSS;
    this.shadow.appendChild(style);
  }

  /**
   * The container the iframe is mounted into. The dialog is the iframe's
   * permanent parent so the iframe never moves between DOM nodes — moving an
   * iframe parent reloads its srcdoc in real browsers, which would void the
   * manifest handshake.
   */
  getStaging(): HTMLDialogElement {
    return this.dialog;
  }

  /**
   * Configure the dialog for the resolved layout. For inline, opens the
   * dialog as a non-modal (CSS resets the dialog chrome so it renders in flow).
   * For modal/fullscreen, builds the trigger checkbox; dialog stays closed
   * until trigger activation.
   */
  apply(layout: Layout, _iframe: HTMLIFrameElement): void {
    if (this.disposed) return;
    if (this.layout === layout) return;
    this.layout = layout;
    this.root.dataset.layout = layout;
    this.dialog.dataset.layout = layout;

    if (layout === 'inline') {
      this.dialog.setAttribute('open', '');
      return;
    }

    if (layout === 'fullscreen') {
      this.buildCloseButton();
    }
    this.buildTrigger();
  }

  private buildTrigger(): void {
    this.trigger = new TriggerCheckbox(() => this.callbacks.onTriggerActivate());
    this.trigger.element.setAttribute('aria-controls', this.dialog.id);
    this.root.insertBefore(this.trigger.element, this.dialog);
  }

  private buildCloseButton(): void {
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.setAttribute('part', 'close');
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => {
      this.close();
    });
    this.dialog.insertBefore(closeBtn, this.dialog.firstChild);
  }

  open(): void {
    if (this.disposed) return;
    // For inline, the dialog is already open via the open attribute.
    if (this.layout === 'inline') return;
    const dialog = this.dialog as HTMLDialogElement & { showModal?: () => void };
    if (typeof dialog.showModal === 'function') {
      try {
        dialog.showModal();
      } catch {
        // already open or detached — ignore
      }
    } else {
      this.dialog.setAttribute('open', '');
    }
    this.trigger?.element.setAttribute('aria-expanded', 'true');

    // Modal: backdrop click closes. Wire on first open since the layout is
    // known by then.
    if (this.layout === 'modal' && !this.backdropWired) {
      this.dialog.addEventListener('click', (e) => {
        if (e.target === this.dialog) this.close();
      });
      this.backdropWired = true;
    }
  }

  close(): void {
    if (this.disposed) return;
    if (this.layout === 'inline') return;
    const dialog = this.dialog as HTMLDialogElement & { close?: () => void };
    let fired = false;
    if (typeof dialog.close === 'function') {
      try {
        dialog.close();
        fired = true;
      } catch {
        // ignore
      }
    }
    if (!fired) {
      this.dialog.removeAttribute('open');
      this.callbacks.onDialogClose();
    }
  }

  isDialogOpen(): boolean {
    return this.dialog.hasAttribute('open');
  }

  setTriggerState(state: TriggerState): void {
    this.trigger?.setState(state);
  }

  getTriggerState(): TriggerState | null {
    return this.trigger?.getState() ?? null;
  }

  hasTrigger(): boolean {
    return this.trigger !== null;
  }

  getLayout(): Layout | null {
    return this.layout;
  }

  /** Test/debug accessor. */
  getShadow(): ShadowRoot {
    return this.shadow;
  }

  /** Test/debug accessor. */
  getDialog(): HTMLDialogElement {
    return this.dialog;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.dialog.hasAttribute('open')) {
      this.dialog.removeAttribute('open');
    }
  }
}
