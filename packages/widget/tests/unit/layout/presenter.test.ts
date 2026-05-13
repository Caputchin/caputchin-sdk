import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LayoutPresenter } from '../../../src/layout/presenter.js';

function makeHost(): HTMLElement {
  return document.createElement('caputchin-widget-test-host');
}

function makeIframe(): HTMLIFrameElement {
  return document.createElement('iframe');
}

describe('LayoutPresenter', () => {
  beforeEach(() => {
    // happy-dom may lack showModal; provide stubs
    if (typeof HTMLDialogElement !== 'undefined') {
      const proto = HTMLDialogElement.prototype as HTMLDialogElement & {
        showModal?: () => void;
        close?: () => void;
      };
      if (typeof proto.showModal !== 'function') {
        proto.showModal = function () {
          this.setAttribute('open', '');
        };
      }
      if (typeof proto.close !== 'function') {
        proto.close = function () {
          this.removeAttribute('open');
          this.dispatchEvent(new Event('close'));
        };
      }
    }
  });

  it('attaches a shadow root with part="root"', () => {
    const host = makeHost();
    const presenter = new LayoutPresenter(host, { onTriggerActivate: vi.fn(), onDialogClose: vi.fn() });
    const root = presenter.getShadow().querySelector('[part~="root"]');
    expect(root).not.toBeNull();
  });

  it('apply(inline) opens dialog as non-modal and contains iframe (no trigger)', () => {
    const host = makeHost();
    const presenter = new LayoutPresenter(host, { onTriggerActivate: vi.fn(), onDialogClose: vi.fn() });
    const iframe = makeIframe();
    presenter.getStaging().appendChild(iframe);

    presenter.apply('inline', iframe);

    expect(presenter.getLayout()).toBe('inline');
    expect(presenter.hasTrigger()).toBe(false);
    const dialog = presenter.getDialog()!;
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(dialog.dataset.layout).toBe('inline');
    expect(dialog.contains(iframe)).toBe(true);
  });

  it('apply(modal) builds trigger and parks iframe in dialog (no close button)', () => {
    const host = makeHost();
    const presenter = new LayoutPresenter(host, { onTriggerActivate: vi.fn(), onDialogClose: vi.fn() });
    const iframe = makeIframe();
    presenter.getStaging().appendChild(iframe);

    presenter.apply('modal', iframe);

    expect(presenter.getLayout()).toBe('modal');
    expect(presenter.hasTrigger()).toBe(true);
    const dialog = presenter.getDialog();
    expect(dialog).not.toBeNull();
    expect(dialog!.dataset.layout).toBe('modal');
    expect(dialog!.contains(iframe)).toBe(true);
  });

  it('apply(modal) does not build a close button (backdrop+esc only)', () => {
    const host = makeHost();
    const presenter = new LayoutPresenter(host, { onTriggerActivate: vi.fn(), onDialogClose: vi.fn() });
    const iframe = makeIframe();
    presenter.getStaging().appendChild(iframe);
    presenter.apply('modal', iframe);
    const closeBtn = presenter.getDialog()!.querySelector('[part~="close"]');
    expect(closeBtn).toBeNull();
  });

  it('apply(fullscreen) shows the close button', () => {
    const host = makeHost();
    const presenter = new LayoutPresenter(host, { onTriggerActivate: vi.fn(), onDialogClose: vi.fn() });
    const iframe = makeIframe();
    presenter.getStaging().appendChild(iframe);
    presenter.apply('fullscreen', iframe);
    const closeBtn = presenter.getDialog()!.querySelector('[part~="close"]') as HTMLButtonElement;
    expect(closeBtn.hidden).toBe(false);
    expect(closeBtn.getAttribute('aria-label')).toBe('Close');
  });

  it('trigger activation invokes onTriggerActivate', () => {
    const onTriggerActivate = vi.fn();
    const host = makeHost();
    const presenter = new LayoutPresenter(host, { onTriggerActivate, onDialogClose: vi.fn() });
    const iframe = makeIframe();
    presenter.getStaging().appendChild(iframe);
    presenter.apply('modal', iframe);

    const triggerBtn = presenter.getShadow().querySelector('[part~="trigger"]') as HTMLButtonElement;
    triggerBtn.click();
    expect(onTriggerActivate).toHaveBeenCalledOnce();
  });

  it('open() and close() toggle the dialog open attribute', () => {
    const host = makeHost();
    const presenter = new LayoutPresenter(host, { onTriggerActivate: vi.fn(), onDialogClose: vi.fn() });
    const iframe = makeIframe();
    presenter.getStaging().appendChild(iframe);
    presenter.apply('modal', iframe);

    presenter.open();
    expect(presenter.isDialogOpen()).toBe(true);

    presenter.close();
    expect(presenter.isDialogOpen()).toBe(false);
  });

  it('close() in fullscreen via X click fires onDialogClose', () => {
    const onDialogClose = vi.fn();
    const host = makeHost();
    const presenter = new LayoutPresenter(host, { onTriggerActivate: vi.fn(), onDialogClose });
    const iframe = makeIframe();
    presenter.getStaging().appendChild(iframe);
    presenter.apply('fullscreen', iframe);
    presenter.open();
    const closeBtn = presenter.getDialog()!.querySelector('[part~="close"]') as HTMLButtonElement;
    closeBtn.click();
    expect(onDialogClose).toHaveBeenCalled();
  });

  it('apply is idempotent for same layout', () => {
    const host = makeHost();
    const presenter = new LayoutPresenter(host, { onTriggerActivate: vi.fn(), onDialogClose: vi.fn() });
    const iframe = makeIframe();
    presenter.getStaging().appendChild(iframe);
    presenter.apply('inline', iframe);
    presenter.apply('inline', iframe);
    expect(presenter.getLayout()).toBe('inline');
  });

  it('exposes shadow parts on root/dialog/trigger/close (fullscreen)', () => {
    const host = makeHost();
    const presenter = new LayoutPresenter(host, { onTriggerActivate: vi.fn(), onDialogClose: vi.fn() });
    const iframe = makeIframe();
    presenter.getStaging().appendChild(iframe);
    presenter.apply('fullscreen', iframe);
    const shadow = presenter.getShadow();
    expect(shadow.querySelector('[part~="root"]')).not.toBeNull();
    expect(shadow.querySelector('[part~="trigger"]')).not.toBeNull();
    expect(shadow.querySelector('[part~="dialog"]')).not.toBeNull();
    expect(shadow.querySelector('[part~="close"]')).not.toBeNull();
  });

  it('trigger has aria-controls pointing to dialog id', () => {
    const host = makeHost();
    const presenter = new LayoutPresenter(host, { onTriggerActivate: vi.fn(), onDialogClose: vi.fn() });
    const iframe = makeIframe();
    presenter.getStaging().appendChild(iframe);
    presenter.apply('modal', iframe);
    const trigger = presenter.getShadow().querySelector('[part~="trigger"]') as HTMLButtonElement;
    const dialog = presenter.getDialog()!;
    expect(trigger.getAttribute('aria-controls')).toBe(dialog.id);
  });
});
