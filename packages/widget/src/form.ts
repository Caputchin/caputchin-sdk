export function findEnclosingForm(el: HTMLElement): HTMLFormElement | null {
  let node: HTMLElement | null = el.parentElement;
  while (node) {
    if (node instanceof HTMLFormElement) return node;
    node = node.parentElement;
  }
  return null;
}

export function injectHiddenInput(form: HTMLFormElement, token: string): void {
  const existing = form.querySelector<HTMLInputElement>('input[name="caputchin-token"]');
  if (existing) {
    existing.value = token;
    return;
  }
  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = 'caputchin-token';
  input.value = token;
  form.appendChild(input);
}

/** `form.requestSubmit()` that keeps the original submit button (its
 *  name/value and `formaction` / `formnovalidate`) when it still belongs to
 *  the form; requestSubmit throws on a submitter from another form. */
export function requestSubmitFrom(form: HTMLFormElement, submitter: HTMLElement | null): void {
  const own = submitter && (submitter as HTMLButtonElement | HTMLInputElement).form === form ? submitter : undefined;
  form.requestSubmit(own);
}
