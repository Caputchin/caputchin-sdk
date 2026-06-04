import { describe, it, expect } from 'vitest';
import pkg from '../package.json';
import { SHIM_VERSION } from './version';

describe('SHIM_VERSION', () => {
  // Stamped into every encoded trace so a recording matches the kit that
  // produced it; MUST equal the package version (release-please owns the bump).
  it('equals the package version', () => {
    expect(SHIM_VERSION).toBe(pkg.version);
  });
});
