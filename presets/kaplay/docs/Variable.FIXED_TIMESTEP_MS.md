# Variable: FIXED\_TIMESTEP\_MS

> `const` **FIXED\_TIMESTEP\_MS**: `20` = `20`

One logical sim tick / one pumped KAPLAY frame, in milliseconds. KAPLAY's
default fixed update is 50 Hz, so this is 20 ms. The whole determinism model
rests on driving KAPLAY exactly ONE fixed-dt frame per pump in BOTH the
browser and the headless replay: each frame then runs one `update` (with
`dt()` == this) and one `fixedUpdate`, with identical internal RNG draws and
identical physics integration, so `k.rand()` and KAPLAY physics are
deterministic across the two environments. The verdict's `durationMs` is
`ticks * this`.
