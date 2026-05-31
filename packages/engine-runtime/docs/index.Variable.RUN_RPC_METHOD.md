# Variable: RUN\_RPC\_METHOD

> `const` **RUN\_RPC\_METHOD**: `"run"`

The RPC method name the host `WorkerEntrypoint` exposes for invoking the
loaded `run`. `apps/replay` calls `stub[RUN_RPC_METHOD](seed, config, trace)`;
the load-time wrapper defines a method of this name that forwards to the
module's [RUN\_EXPORT\_NAME](index.Variable.RUN_EXPORT_NAME.md) export. Sharing the constant keeps the host
wrapper and the caller in lockstep.
