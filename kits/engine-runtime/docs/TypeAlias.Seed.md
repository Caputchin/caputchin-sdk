# Type Alias: Seed

> **Seed** = readonly \[`number`, `number`, `number`, `number`\]

The replay seed: the low 128 bits of `SHA-256(sessionId : gameId : roundIndex)`,
carried as four unsigned 32-bit words, most-significant word first.

Fixed 128-bit width so it slices cleanly into a 128-bit PRNG state. The server
derives it both when issuing at `/verify/start` and again when replaying, so
it never rides the wire as trusted client input. The seed BINDS a trace to one
session + game + round: replaying a foreign or earlier trace under a different
seed yields `passed:false`, which is how trace injection is defended.
