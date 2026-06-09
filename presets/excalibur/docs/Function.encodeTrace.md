# Function: encodeTrace()

> **encodeTrace**(`events`): `string`

Encode recorded events to the compact wire string. Coordinates are rounded to
 integers (the world is integer-pixel, so this is lossless for a conforming
 game and keeps the trace small + the codec bit-identical).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `events` | readonly [`RecordedEvent`](TypeAlias.RecordedEvent.md)[] |

## Returns

`string`
