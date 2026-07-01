import type { TriggerStrategy, TriggerContext } from './index.js';
import { findEnclosingForm } from '../form.js';

/**
 * `trigger="form-submit"` has DUAL behavior (click + submit):
 *
 *  - CLICK: the (interactive) checkbox is clicked → presentation.onActivate
 *    fires → verification runs IN PLACE. The token is injected into the
 *    enclosing form as a side effect of a successful solve (see
 *    cap-session.awaitCapAndEmitPass); the form is NOT auto-submitted. The
 *    visitor submits later; the native submit then proceeds because the token
 *    is already present.
 *
 *  - SUBMIT: the enclosing form submits → intercept in the capture phase, run
 *    verification, then `requestSubmit()` to release the original submit.
 *    Degrades open exactly as before: runVerification() RESOLVES on both
 *    success and verification-failure, so on failure the form still submits,
 *    token-less, and the server rejects it. No client-side retry.
 *
 * One verification per activation (`started`): a click already in flight is
 * reused by a subsequent submit, which is held and released once that
 * in-flight solve resolves; it never starts a second solve.
 */
export function createFormSubmitTrigger(): TriggerStrategy {
  let activateCleanup: (() => void) | null = null;
  let submitHandler: ((e: SubmitEvent) => void) | null = null;
  let form: HTMLFormElement | null = null;

  // one solve per activation (click / submit / widget.start())
  let started = false;
  // solve promise resolved → any submit is now a native passthrough (token
  // present iff the solve succeeded); never re-verify
  let settled = false;
  // a submit was intercepted while unsettled; owe the form exactly one
  // requestSubmit() on settle
  let pendingSubmit = false;

  // Kick off the single verification (idempotent). Shared by the click path,
  // the submit path, and forceStart. On resolve, honor a pending submit exactly
  // once; the CLICK path leaves `pendingSubmit` false, so it verifies in place
  // and never auto-submits.
  function runVerify(ctx: TriggerContext): void {
    if (started) return;
    started = true;
    ctx
      .runVerification()
      .then(() => {
        // runVerification (runCap) RESOLVES on success AND on verification
        // failure; the token is injected into the form only on success. Mirror
        // the legacy strategy: on resolve, release any held submit once (form
        // carries the token on success, submits token-less on failure → server
        // rejects; no client-side retry).
        settled = true;
        if (pendingSubmit) {
          pendingSubmit = false;
          form?.requestSubmit();
        }
      })
      .catch(() => {
        // Hard synchronous throw from runVerification (near-never; runCap
        // swallows its own errors). Preserve legacy semantics: do NOT
        // auto-submit on a throw. Mark settled so a later MANUAL submit passes
        // through natively instead of re-verifying or hanging.
        settled = true;
        pendingSubmit = false;
      });
  }

  return {
    activate(ctx: TriggerContext): void {
      // CLICK path. Registered even when there is no enclosing form: a click
      // still runs verification in place (the token simply isn't injected
      // anywhere without a form). No-op on the invisible presentation, whose
      // onActivate returns a no-op cleanup and never fires.
      activateCleanup = ctx.presentation.onActivate(() => runVerify(ctx));

      // SUBMIT path. Graceful degradation: no form → nothing to intercept;
      // verification still runs on click or widget.start().
      form = findEnclosingForm(ctx.el);
      if (!form) return;

      submitHandler = (e: SubmitEvent) => {
        // Verification already resolved: let the native submit proceed with
        // whatever token the successful path injected. Covers (a) our OWN
        // post-verify requestSubmit and (b) a manual submit after a click
        // already verified. Never re-verify.
        if (settled) return;

        // Verification not settled, so HOLD this submit. Prevent the native
        // submit and stop other capture-phase submit handlers, then
        // requestSubmit once it resolves. runVerify is idempotent: if a click /
        // widget.start() / earlier submit already started the solve, this only
        // marks the pending submit and does NOT start a second solve.
        e.preventDefault();
        e.stopImmediatePropagation();
        pendingSubmit = true;
        runVerify(ctx);
      };

      form.addEventListener('submit', submitHandler, true);
    },

    deactivate(): void {
      activateCleanup?.();
      activateCleanup = null;
      if (form && submitHandler) {
        form.removeEventListener('submit', submitHandler, true);
      }
      submitHandler = null;
      form = null;
      started = false;
      settled = false;
      pendingSubmit = false;
    },

    forceStart(ctx: TriggerContext): void {
      // widget.start(): run the single verification now, no auto-submit
      // (pendingSubmit stays false). A submit arriving while this is in flight
      // is held and released on settle, exactly like the click-in-flight case.
      runVerify(ctx);
    },
  };
}
