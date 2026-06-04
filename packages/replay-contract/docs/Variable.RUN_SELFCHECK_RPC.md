# Variable: RUN\_SELFCHECK\_RPC

> `const` **RUN\_SELFCHECK\_RPC**: `"selfcheck"`

The RPC method name the host `WorkerEntrypoint` exposes for the determinism
SELF-CHECK over the loaded `run`. `apps/replay` calls
`stub[RUN_SELFCHECK_RPC]()`; the load-time wrapper defines a method of this
name that probes the module's [RUN\_EXPORT\_NAME](Variable.RUN_EXPORT_NAME.md) export (replaying it under
a hostile environment) and returns a self-check report. Used at vendor / upload
/ index time to gate non-deterministic artifacts; separate from
[RUN\_RPC\_METHOD](Variable.RUN_RPC_METHOD.md) (the authoritative per-verify replay). Sharing the
constant keeps the host wrapper and the caller in lockstep.
