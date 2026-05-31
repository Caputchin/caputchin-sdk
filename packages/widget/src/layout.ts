import type { Layout } from '@caputchin/game-sdk';

export type { Layout };

/** Accepted values of the `layout` attribute: a concrete {@link Layout}, or
 *  `auto` to defer to the game's preferred layout and then a breakpoint
 *  default. */
export type LayoutAttr = Layout | 'auto';

/** Where the resolved layout came from, reported on the `layout-resolved`
 *  event: the embed `attr`, the game `manifest`, or the built-in `default`. */
export type LayoutSource = 'attr' | 'manifest' | 'default';

export type TriggerState = 'idle' | 'loading' | 'verifying' | 'done' | 'error';

export const LAYOUT_VALUES: ReadonlyArray<Layout> = ['inline', 'modal', 'fullscreen'];
export const LAYOUT_ATTR_VALUES: ReadonlyArray<LayoutAttr> = ['inline', 'modal', 'fullscreen', 'auto'];

export function isLayout(v: unknown): v is Layout {
  return v === 'inline' || v === 'modal' || v === 'fullscreen';
}

export function isLayoutAttr(v: unknown): v is LayoutAttr {
  return isLayout(v) || v === 'auto';
}
