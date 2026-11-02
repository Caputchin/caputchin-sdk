import { describe, it, expect, afterEach, vi } from 'vitest';
import { getWidget } from '../fixtures/test-element.js';
import { injectHiddenInput, requestSubmitFrom } from '../../src/form.js';

// trigger="form-submit" must hold a submit that arrives while the mount
// bootstrap is still in flight (CAP-258: Keycloak's Sign In clicked right after
// the invisible widget upgraded posted no token), then verify before the form
// posts.

const runCap = vi.hoisted(() => vi.fn());
vi.mock('../../src/verify/run-cap.js', () => ({ runCap }));

(globalThis as Record<string, unknown>)['__CAPUTCHIN_API_HOST__'] = 'https://api.test.com';
(globalThis as Record<string, unknown>)['__IFRAME_RUNTIME__'] = '';
(globalThis as Record<string, unknown>)['__IFRAME_RUNTIME_SHA256__'] = '';

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

/** Bootstrap fetch that stays pending until `resolve()` is called; `status`
 *  500 makes the mount degrade to bundled defaults. */
function pendingBootstrap(status = 200): { resolve: () => void } {
  let resolve: () => void = () => {};
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((res) => {
    resolve = () => res(new Response('{}', { status }));
  })));
  return { resolve: () => resolve() };
}

let pageListener: ((e: Event) => void) | null = null;

/** A form holding the widget and a `login` submit button; `posted` collects
 *  the token each submit that reached the page carried (null = token-less) and
 *  `submitters` the name of the button it carried. The page listens on
 *  `document`: happy-dom runs target-phase listeners in registration order,
 *  where a browser runs the widget's capture listener first. */
function formWith(attrs: Record<string, string>): {
  form: HTMLFormElement;
  el: HTMLElement;
  posted: Array<string | null>;
  submitters: Array<string | null>;
} {
  const form = document.createElement('form');
  const posted: Array<string | null> = [];
  const submitters: Array<string | null> = [];
  pageListener = (e) => {
    if (e.target !== form) return;
    e.preventDefault();
    posted.push(form.querySelector<HTMLInputElement>('input[name="caputchin-token"]')?.value ?? null);
    submitters.push((e as SubmitEvent).submitter?.getAttribute('name') ?? null);
  };
  document.addEventListener('submit', pageListener);
  form.requestSubmit = (submitter?: HTMLElement | null) => {
    form.dispatchEvent(new SubmitEvent('submit', { cancelable: true, bubbles: true, submitter: submitter ?? null }));
  };
  const el = getWidget(attrs);
  form.appendChild(el);
  const button = document.createElement('input');
  button.type = 'submit';
  button.name = 'login';
  form.appendChild(button);
  document.body.appendChild(form);
  return { form, el, posted, submitters };
}

/** A click on the form's `login` button. */
const submit = (form: HTMLFormElement): void => {
  const submitter = form.querySelector<HTMLElement>('input[name="login"]');
  form.dispatchEvent(new SubmitEvent('submit', { cancelable: true, bubbles: true, submitter }));
};

describe('<caputchin-widget trigger="form-submit"> submit during the mount bootstrap', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    runCap.mockReset();
    if (pageListener) document.removeEventListener('submit', pageListener);
    pageListener = null;
    document.body.innerHTML = '';
  });

  for (const invisible of [true, false]) {
    it(`${invisible ? 'invisible' : 'checkbox'}: holds the submit, verifies once mounted, then posts with the token`, async () => {
      const bootstrap = pendingBootstrap();
      const { form, posted, submitters } = formWith({ sitekey: 'k', trigger: 'form-submit', ...(invisible ? { invisible: '' } : {}) });
      runCap.mockImplementation(async () => { injectHiddenInput(form, 'tok'); });

      submit(form);
      await flush();
      expect(posted).toEqual([]);
      expect(runCap).not.toHaveBeenCalled();

      bootstrap.resolve();
      await vi.waitFor(() => expect(posted).toEqual(['tok']));
      expect(submitters).toEqual(['login']);
      expect(runCap).toHaveBeenCalledTimes(1);
    });
  }

  it('degraded bootstrap: the held submit still verifies before it posts', async () => {
    const bootstrap = pendingBootstrap(500);
    const { form, posted } = formWith({ sitekey: 'k', trigger: 'form-submit', invisible: '' });
    runCap.mockImplementation(async () => { injectHiddenInput(form, 'tok'); });
    submit(form);
    bootstrap.resolve();
    await vi.waitFor(() => expect(posted).toEqual(['tok']));
    expect(runCap).toHaveBeenCalledTimes(1);
  });

  it('without an early submit, mount does not submit the form', async () => {
    const bootstrap = pendingBootstrap();
    const { posted } = formWith({ sitekey: 'k', trigger: 'form-submit', invisible: '' });
    bootstrap.resolve();
    await flush();
    await flush();
    expect(posted).toEqual([]);
    expect(runCap).not.toHaveBeenCalled();
  });

  it('removed before the bootstrap resolves: no replayed submit, later submits are not held', async () => {
    const bootstrap = pendingBootstrap();
    const { form, el, posted } = formWith({ sitekey: 'k', trigger: 'form-submit', invisible: '' });
    submit(form);
    el.remove();
    bootstrap.resolve();
    await flush();
    expect(posted).toEqual([]);
    submit(form);
    expect(posted).toEqual([null]);
    expect(runCap).not.toHaveBeenCalled();
  });

  it('trigger="auto" installs no submit guard', async () => {
    pendingBootstrap();
    const { form, posted } = formWith({ sitekey: 'k', trigger: 'auto', invisible: '' });
    submit(form);
    expect(posted).toEqual([null]);
  });
});

describe('requestSubmitFrom', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('passes a submitter of the form and drops one from another form', () => {
    const form = document.createElement('form');
    const own = document.createElement('button');
    form.appendChild(own);
    const other = document.createElement('form');
    const foreign = document.createElement('button');
    other.appendChild(foreign);
    document.body.append(form, other);
    const spy = vi.fn();
    form.requestSubmit = spy;
    requestSubmitFrom(form, own);
    requestSubmitFrom(form, foreign);
    requestSubmitFrom(form, null);
    expect(spy.mock.calls).toEqual([[own], [undefined], [undefined]]);
  });
});
