import type { Layout } from '@caputchin/game-sdk';

export type { Layout };

export type LayoutAttr = Layout | 'auto';

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
