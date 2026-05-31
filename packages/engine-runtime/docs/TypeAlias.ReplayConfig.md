# Type Alias: ReplayConfig

> **ReplayConfig** = `unknown`

The server-supplied gameplay config a run executes under. OPAQUE to
the platform - each game defines its own shape, so we never type or inspect it,
exactly like the trace - and NULLABLE: `null` means "use the run's own internal
defaults", mirroring the bootstrap config-override's "empty ⇒ game defaults"
semantics.

Unlike the trace, config is SERVER-sourced (the per-site policy, or the default
preset the indexer parsed) and re-resolved server-side at replay, never
client-asserted. That is the whole reason it is a distinct input: gate-affecting
fields (pass threshold, lives) are safe to read from `config` but would be a
bypass if read from the client-emitted `trace`. At MVP the server passes `null`
(defaults); per-site config injection is a deferred phase.

Authors parameterize the shape for their own ergonomics (`RunFn<MyConfig>`); the
platform invokes it as `RunFn` (config opaque).
