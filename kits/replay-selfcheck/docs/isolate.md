# isolate

## Functions

| Function | Description |
| ------ | ------ |
| [runSelfCheck](isolate.Function.runSelfCheck.md) | Probe `run` for determinism inside the replay isolate. Thin alias over [selfCheckRun](index.Function.selfCheckRun.md) under a name that reads clearly at the Worker host-wrapper call site. Returns the aggregate [SelfCheckReport](index.Interface.SelfCheckReport.md); `report.ok` is the gate signal the platform stores as `selfCheckOk`. |

## References

### SelfCheckReport {#selfcheckreport}

Re-exports [SelfCheckReport](index.Interface.SelfCheckReport.md)

***

### SelfCheckRunOptions {#selfcheckrunoptions}

Re-exports [SelfCheckRunOptions](index.Interface.SelfCheckRunOptions.md)
