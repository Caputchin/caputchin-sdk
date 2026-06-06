# Variable: REACTION\_FLOOR\_MS

> `const` **REACTION\_FLOOR\_MS**: `100` = `100`

Default minimum plausible reaction latency, in milliseconds. Conservative: real
simple-reaction times are ~200ms, so this leaves wide human headroom while a
frame-perfect bot (acting in one [FIXED\_TIMESTEP\_MS](Variable.FIXED_TIMESTEP_MS.md) tick) is well under.
Tune per game by passing an explicit floor to [isHumanReaction](Function.isHumanReaction.md); calibrate
from real-session data before tightening.
