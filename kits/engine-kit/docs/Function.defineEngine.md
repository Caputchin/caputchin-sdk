# Function: defineEngine()

> **defineEngine**\<`S`, `A`, `C`, `V`\>(`def`): [`EngineDef`](Interface.EngineDef.md)\<`S`, `A`, `C`, `V`\>

Identity helper a game uses to declare its reducer, purely for type inference
- `defineEngine` does not wrap or transform it. Pair it with `toRun` to
produce the conforming `run(seed, trace)` the artifact exports;
`defineEngine` is one OPTIONAL authoring lane, not the mandatory contract.

```ts
const engine = defineEngine<MyState, MyAction, MyConfig>({
  // config is the RAW server config (or null); resolve it -> sim params here.
  init({ seed, config }) { const cfg = resolve(config); ... },
  step(state, action) { ... },
  tick(state) { ... },
  isOver(state) { ... },
  // result reports BOTH the score and the engine's own pass decision.
  result(state) { return { score: state.score, passed: state.score >= state.cfg.goal }; },
});
export const run = toRun(engine, { maxTicks });
```

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `S` | - |
| `A` | `unknown` |
| `C` | `unknown` |
| `V` | `S` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `def` | [`EngineDef`](Interface.EngineDef.md)\<`S`, `A`, `C`, `V`\> |

## Returns

[`EngineDef`](Interface.EngineDef.md)\<`S`, `A`, `C`, `V`\>
