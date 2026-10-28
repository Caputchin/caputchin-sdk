import { describe, it, expect } from 'vitest';
import { createGamePresentation, type GamePresentationInput } from '../../../src/modes/game.js';
import { buildWidgetShell } from '../../../src/locale/widget-shell.js';
import { buildWidgetShellSkin } from '../../../src/skin/widget-shell-skin.js';
import { buildWidgetShellConfig } from '../../../src/configurations/widget-shell-config.js';

// A fixed-aspect game (bootstrap `game.responsive === false`) is mounted into a
// scale-to-fit box: the iframe keeps its own pixel size and is transform-scaled
// by the box's used width over its own, so a narrow container shrinks the game
// whole instead of narrowing it. happy-dom does no layout, so the box's used
// width is stubbed through clientWidth and the rescale is driven by the iframe
// style write the host makes (setSize), which the fit box observes. happy-dom
// only reports a style mutation for a `style` attribute write (a browser also
// reports `iframe.style.width = ...`, which is what IframeHost.setSize does), so
// the tests write the attribute.

function mount(over: Partial<GamePresentationInput>) {
  const shadowHost = document.createElement('div');
  document.body.appendChild(shadowHost);
  const root = shadowHost.attachShadow({ mode: 'open' });
  const gp = createGamePresentation({
    host: document.createElement('div'),
    root,
    trigger: 'auto',
    width: 'auto',
    height: null,
    footprintWidth: 'auto',
    footprintHeight: null,
    layout: 'inline',
    shell: buildWidgetShell(null),
    skin: buildWidgetShellSkin(null),
    shellConfig: buildWidgetShellConfig(null),
    ...over,
  });
  gp.mount();
  return { gp, root };
}

/** Let the MutationObserver callbacks run. */
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function stubRoom(el: HTMLElement, px: number): void {
  Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => px });
}

function setIframeSize(iframe: HTMLIFrameElement, w: number, h: number): void {
  const transform = iframe.style.transform;
  iframe.setAttribute('style', `width:${w}px;height:${h}px${transform ? `;transform:${transform}` : ''}`);
}

async function mountGameIframe(slot: HTMLElement, w: number, h: number): Promise<HTMLIFrameElement> {
  const iframe = document.createElement('iframe');
  slot.appendChild(iframe);
  await flush();
  setIframeSize(iframe, w, h);
  await flush();
  return iframe;
}

describe('game presentation - fixed-aspect fit box', () => {
  for (const layout of ['inline', 'modal', 'fullscreen'] as const) {
    it(`${layout}: mounts the iframe into a fit box and scales a 640x400 game into 320px`, async () => {
      const { gp } = mount({ layout, fixedAspect: true });
      const box = gp.getIframeSlot()!;
      expect(box.getAttribute('part')).toBe('game-fit-box');
      expect(box.parentElement?.getAttribute('part')).toBe('game-iframe-slot');
      stubRoom(box, 320);
      const iframe = await mountGameIframe(box, 640, 400);
      expect(box.style.getPropertyValue('--cpt-fit-w')).toBe('640px');
      expect(box.style.getPropertyValue('--cpt-fit-ratio')).toBe('1.6');
      expect(box.querySelector('[part="game-fit-sizer"]')?.getAttribute('viewBox')).toBe('0 0 640 400');
      expect(iframe.style.transform).toBe('scale(0.5)');
      // The iframe keeps its own layout size: the game never sees a narrower viewport.
      expect(iframe.style.width).toBe('640px');
      gp.unmount();
    });
  }

  it('leaves the game unscaled when the room is at least its width', async () => {
    const { gp } = mount({ fixedAspect: true });
    const box = gp.getIframeSlot()!;
    stubRoom(box, 700);
    const iframe = await mountGameIframe(box, 640, 400);
    expect(iframe.style.transform).toBe('');
    gp.unmount();
  });

  it('follows a later iframe resize (the runtime measured size)', async () => {
    const { gp } = mount({ fixedAspect: true });
    const box = gp.getIframeSlot()!;
    stubRoom(box, 300);
    const iframe = await mountGameIframe(box, 600, 400);
    expect(iframe.style.transform).toBe('scale(0.5)');
    setIframeSize(iframe, 1200, 600);
    await flush();
    expect(box.style.getPropertyValue('--cpt-fit-w')).toBe('1200px');
    expect(iframe.style.transform).toBe('scale(0.25)');
    gp.unmount();
  });

  it('skips scaling while the box has no width yet (a closed dialog)', async () => {
    const { gp } = mount({ layout: 'modal', fixedAspect: true });
    const box = gp.getIframeSlot()!;
    stubRoom(box, 0);
    const iframe = await mountGameIframe(box, 640, 400);
    expect(iframe.style.transform).toBe('');
    expect(box.style.getPropertyValue('--cpt-fit-w')).toBe('640px');
    gp.unmount();
  });

  /**
   * happy-dom has no ResizeObserver; install one that captures the callback the
   * fit box creates. `resize(w)` delivers an entry whose content box is `w` wide.
   */
  function captureResizeObserver(): { resize(width: number): void; restore(): void; count(): number } {
    const callbacks: ResizeObserverCallback[] = [];
    const original = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      constructor(cb: ResizeObserverCallback) { callbacks.push(cb); }
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
    return {
      resize(width) {
        const entry = { contentRect: { width } } as ResizeObserverEntry;
        callbacks[0]!([entry], {} as ResizeObserver);
      },
      restore() { globalThis.ResizeObserver = original; },
      count: () => callbacks.length,
    };
  }

  it('rescales when the box resizes (container change, a dialog opening)', async () => {
    const ro = captureResizeObserver();
    try {
      const { gp } = mount({ layout: 'modal', fixedAspect: true });
      const box = gp.getIframeSlot()!;
      stubRoom(box, 0);
      const iframe = await mountGameIframe(box, 640, 400);
      expect(iframe.style.transform).toBe('');
      expect(ro.count()).toBe(1);
      ro.resize(160);
      expect(iframe.style.transform).toBe('scale(0.25)');
      ro.resize(640);
      expect(iframe.style.transform).toBe('');
      gp.unmount();
    } finally {
      ro.restore();
    }
  });

  it('scales by the observed fractional box width, not the rounded clientWidth', async () => {
    // A 375px phone modal: the box is 305.5px wide, clientWidth reports 306.
    const ro = captureResizeObserver();
    try {
      const { gp } = mount({ layout: 'modal', fixedAspect: true });
      const box = gp.getIframeSlot()!;
      stubRoom(box, 306);
      const iframe = await mountGameIframe(box, 640, 400);
      // Before the first entry arrives the rounded clientWidth is the fallback.
      expect(iframe.style.transform).toBe(`scale(${306 / 640})`);
      ro.resize(305.5);
      expect(iframe.style.transform).toBe(`scale(${305.5 / 640})`);
      // A later iframe style write keeps using the observed width.
      setIframeSize(iframe, 640, 400);
      await flush();
      expect(iframe.style.transform).toBe(`scale(${305.5 / 640})`);
      gp.unmount();
    } finally {
      ro.restore();
    }
  });

  it('writes the iframe transform only when the scale changes', async () => {
    const ro = captureResizeObserver();
    try {
      const { gp } = mount({ layout: 'modal', fixedAspect: true });
      const box = gp.getIframeSlot()!;
      stubRoom(box, 0);
      const iframe = await mountGameIframe(box, 640, 400);
      let writes = 0;
      const style = iframe.style;
      let transform = style.transform;
      Object.defineProperty(style, 'transform', {
        configurable: true,
        get: () => transform,
        set: (v: string) => { writes++; transform = v; },
      });
      ro.resize(320);
      expect(transform).toBe('scale(0.5)');
      expect(writes).toBe(1);
      ro.resize(320);
      setIframeSize(iframe, 640, 400);
      await flush();
      expect(writes).toBe(1);
      // Something else clearing the transform gets it written back.
      transform = '';
      ro.resize(320);
      expect(transform).toBe('scale(0.5)');
      expect(writes).toBe(2);
      ro.resize(160);
      expect(transform).toBe('scale(0.25)');
      expect(writes).toBe(3);
      gp.unmount();
    } finally {
      ro.restore();
    }
  });

  it('stops observing on unmount', async () => {
    const { gp } = mount({ fixedAspect: true });
    const box = gp.getIframeSlot()!;
    stubRoom(box, 320);
    const iframe = await mountGameIframe(box, 640, 400);
    gp.unmount();
    setIframeSize(iframe, 320, 200);
    await flush();
    expect(iframe.style.transform).toBe('scale(0.5)');
  });

  it('a responsive game mounts straight into the slot (no fit box)', () => {
    const { gp } = mount({ fixedAspect: false });
    expect(gp.getIframeSlot()?.getAttribute('part')).toBe('game-iframe-slot');
    gp.unmount();
  });

  it('inline with a customer width or height keeps the fill path (no fit box)', () => {
    for (const over of [{ width: 500 }, { width: 'full' }, { height: 300 }, { height: 'full' }] as const) {
      const { gp } = mount({ fixedAspect: true, ...over });
      expect(gp.getIframeSlot()?.getAttribute('part')).toBe('game-iframe-slot');
      gp.unmount();
    }
  });

  it('overlay with a full footprint axis keeps the fill path (no fit box)', () => {
    for (const over of [{ footprintWidth: 'full' }, { footprintHeight: 'full' }] as const) {
      const { gp } = mount({ layout: 'modal', fixedAspect: true, ...over });
      expect(gp.getIframeSlot()?.getAttribute('part')).toBe('game-iframe-slot');
      gp.unmount();
    }
  });

  it('manual mode keeps the light-DOM slot (no fit box)', () => {
    const { gp } = mount({ fixedAspect: true, manual: true });
    const slot = gp.getIframeSlot()!;
    expect(slot.getAttribute('part')).toBe('game-iframe-slot');
    expect(slot.querySelector('[part="game-fit-box"]')).toBeNull();
    gp.unmount();
  });

  it('ships the fit box rules (iframe clamps overridden, overlay height bound)', () => {
    const { gp, root } = mount({ fixedAspect: true });
    const css = Array.from(root.querySelectorAll('style')).map((s) => s.textContent ?? '').join('');
    expect(css).toContain('[part="game-fit-box"] iframe{position:absolute;top:0;left:0;transform-origin:0 0;max-width:none!important;max-height:none!important}');
    expect(css).toContain('[part="game-frame"][data-layout="inline"] [part="game-fit-box"]{align-self:flex-start}');
    expect(css).toContain('[part="game-overlay-dialog"][data-layout="modal"] [part="game-fit-sizer"]{width:min(var(--cpt-fit-w,400px),calc((90dvh - 2rem) * var(--cpt-fit-ratio,1.3333)))}');
    gp.unmount();
  });
});
