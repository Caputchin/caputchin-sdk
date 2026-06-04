# Variable: FIXED\_TIMESTEP\_MS

> `const` **FIXED\_TIMESTEP\_MS**: `16` = `16`

Fixed simulation timestep in milliseconds. Every engine tick advances the
simulation by this amount; play duration is `endTick * FIXED_TIMESTEP_MS`.
Integer on purpose so duration arithmetic stays pure-integer with no
floating-point drift. 16 ms gives approximately 62.5 logical fps, close
enough to 60 fps for a captcha minigame.
