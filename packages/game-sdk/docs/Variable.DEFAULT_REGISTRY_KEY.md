# Variable: DEFAULT\_REGISTRY\_KEY

> `const` **DEFAULT\_REGISTRY\_KEY**: `"__caputchin_default__"` = `'__caputchin_default__'`

Fallback registry key used when no `data-game-id` is available on the
 iframe runtime script tag. Each iframe only ever loads one game, so a
 single fixed slot is enough. Exported so the widget's iframe runtime +
 tests can reference the same constant.
