import type { TriggerStrategy, TriggerContext } from './index.js';
import { findEnclosingForm } from '../form.js';

export function createFormSubmitTrigger(): TriggerStrategy {
  let submitHandler: ((e: SubmitEvent) => void) | null = null;
  let form: HTMLFormElement | null = null;
  let completed = false;
  let submitting = false;
  let started = false;

  return {
    activate(ctx: TriggerContext): void {
      form = findEnclosingForm(ctx.el);
      // Per graceful-degradation: if no form, fall back to "first interaction
      // or widget.start()". Don't fire an error; the absence of a form just
      // means there's nothing to intercept; verification runs on widget.start()
      // (force-start escape hatch). Silent fallback for widgets dragged outside
      // their original <form>.
      if (!form) return;

      submitHandler = (e: SubmitEvent) => {
        if (submitting || completed) return;
        if (started) {
          // Already started by an earlier widget.start(); wait for completion before re-firing submit.
          return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();

        submitting = true;
        started = true;
        ctx.runVerification()
          .then(() => {
            completed = true;
            form?.requestSubmit();
          })
          .catch(() => {})
          .finally(() => {
            submitting = false;
          });
      };

      form.addEventListener('submit', submitHandler, true);
    },

    deactivate(): void {
      if (form && submitHandler) {
        form.removeEventListener('submit', submitHandler, true);
      }
      submitHandler = null;
      form = null;
      completed = false;
      submitting = false;
      started = false;
    },

    forceStart(ctx: TriggerContext): void {
      if (started) return;
      started = true;
      ctx.runVerification().catch(() => {});
    },
  };
}
