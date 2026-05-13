import type { TriggerState } from './types.js';

const STATE_LABELS: Record<TriggerState, string> = {
  idle: 'Verify you are human',
  loading: 'Loading…',
  verifying: 'Verifying…',
  done: 'Verified',
  error: 'Try again',
};

export class TriggerCheckbox {
  readonly element: HTMLButtonElement;
  private state: TriggerState = 'idle';
  private readonly labelEl: HTMLSpanElement;
  private readonly spinnerEl: HTMLSpanElement;
  private readonly onActivate: () => void;

  constructor(onActivate: () => void) {
    this.onActivate = onActivate;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('part', 'trigger');
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', 'false');
    btn.dataset.state = 'idle';

    const checkbox = document.createElement('span');
    checkbox.setAttribute('part', 'checkbox');
    checkbox.setAttribute('aria-hidden', 'true');

    const spinner = document.createElement('span');
    spinner.setAttribute('part', 'spinner');
    spinner.setAttribute('aria-hidden', 'true');
    spinner.hidden = true;

    const label = document.createElement('span');
    label.setAttribute('part', 'label');
    label.textContent = STATE_LABELS.idle;

    btn.appendChild(checkbox);
    btn.appendChild(spinner);
    btn.appendChild(label);
    btn.addEventListener('click', () => this.handleClick());

    this.element = btn;
    this.labelEl = label;
    this.spinnerEl = spinner;
  }

  setState(state: TriggerState): void {
    this.state = state;
    this.element.dataset.state = state;
    this.labelEl.textContent = STATE_LABELS[state];
    this.spinnerEl.hidden = state !== 'loading' && state !== 'verifying';
  }

  getState(): TriggerState {
    return this.state;
  }

  private handleClick(): void {
    if (this.state === 'idle' || this.state === 'error') {
      this.onActivate();
    }
  }
}
