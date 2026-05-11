import type { ModeStrategy, VerificationContext } from './index.js';
import { fireError } from '../errors.js';
import { findEnclosingForm } from '../form.js';

export function createFormSubmitMode(
  el: HTMLElement,
  runVerification: () => Promise<void>
): ModeStrategy {
  let submitHandler: ((e: SubmitEvent) => void) | null = null;
  let form: HTMLFormElement | null = null;
  let completed = false;
  let submitting = false;

  return {
    activate(_ctx: VerificationContext): void {
      form = findEnclosingForm(el);
      if (!form) {
        fireError(el, 'form-not-found', 'form-submit mode: no enclosing <form> found');
        return;
      }

      submitHandler = (e: SubmitEvent) => {
        if (submitting || completed) return;

        e.preventDefault();
        e.stopImmediatePropagation();

        submitting = true;
        runVerification()
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
    },
  };
}
