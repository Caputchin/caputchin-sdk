import type { Layout, LayoutAttr, LayoutSource } from './types.js';

export interface ResolveInput {
  attr: LayoutAttr | null;
  manifestPreferred: Layout | null;
  autoIsWide: boolean;
}

export interface Resolved {
  layout: Layout;
  source: LayoutSource;
}

export function resolveLayout(input: ResolveInput): Resolved {
  if (input.attr !== null) {
    if (input.attr === 'auto') {
      return { layout: input.autoIsWide ? 'modal' : 'fullscreen', source: 'attr' };
    }
    return { layout: input.attr, source: 'attr' };
  }
  if (input.manifestPreferred !== null) {
    return { layout: input.manifestPreferred, source: 'manifest' };
  }
  return { layout: 'inline', source: 'default' };
}
