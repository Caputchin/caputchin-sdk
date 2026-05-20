import { injectHiddenInput } from '../form.js';

/** Find the form ancestor (if any) and inject the wrapped token as a hidden
 *  input. No-op when the widget isn't inside a form. Shared by every runner
 *  that completes verification. */
export function injectTokenIntoEnclosingForm(el: HTMLElement, token: string): void {
  const form = el.closest('form');
  if (form instanceof HTMLFormElement) {
    injectHiddenInput(form, token);
  }
}
