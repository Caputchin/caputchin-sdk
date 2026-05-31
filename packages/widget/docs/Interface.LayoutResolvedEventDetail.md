# Interface: LayoutResolvedEventDetail

Payload of the `layout-resolved` event: the layout the widget settled on and why.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="layout"></a> `layout` | [`Layout`](TypeAlias.Layout.md) | The resolved layout. |
| <a id="source"></a> `source` | [`LayoutSource`](TypeAlias.LayoutSource.md) | Where the resolved layout came from (attribute, default, etc.). |
