// An inline <caputchin-game> mount is CPU-bound in happy-dom (its CSS
// declaration parser re-runs on every skin var write): close to 1s per mount
// alone and several times that under a loaded parallel run. Tests that mount
// one inline (and the widget re-theme test, which slows the same way) wait on
// the real state with this per-step budget instead of a fixed number of
// flushes or vi.waitFor's 1s default. The test timeout fits two such steps (a
// mount, then a re-mount or reskin) at their full budget plus slack, so a stuck
// step fails with its waitFor assertion rather than a bare test timeout.
export const INLINE_WAIT = { timeout: 7_000 };
export const INLINE_GAME_TEST_TIMEOUT = 2 * INLINE_WAIT.timeout + 5_000;
