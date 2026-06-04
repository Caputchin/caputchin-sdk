# Function: kaplayRun()

> **kaplayRun**\<`C`\>(`game`): [`RunFn`](TypeAlias.RunFn.md)\<`C`\>

Build the conforming `run` for a [KaplayGame](Interface.KaplayGame.md). The returned function
decodes the trace, boots KAPLAY headless, replays the recorded inputs over the
SAME scene the browser ran, and maps the outcome to a [Verdict](Interface.Verdict.md). It is
async (KAPLAY's headless boot awaits its asset load); the replay host awaits it.

## Type Parameters

| Type Parameter | Default type | Description |
| ------ | ------ | ------ |
| `C` | `unknown` | The game's config shape (opaque to the platform). |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `game` | [`KaplayGame`](Interface.KaplayGame.md) |

## Returns

[`RunFn`](TypeAlias.RunFn.md)\<`C`\>
