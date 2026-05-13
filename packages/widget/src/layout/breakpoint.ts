const AUTO_BREAKPOINT_QUERY = '(min-width: 768px)';

export function evalAutoBreakpoint(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }
  return window.matchMedia(AUTO_BREAKPOINT_QUERY).matches;
}
