import pkg from '../package.json';

// The deterministic-environment version recorded in every trace as
// `shimVersion`. It IS the package version: cap.rng / cap.math / shim are
// versioned together as one atomic execution environment (ADR-0068), so a
// behavioral change to any of them is a package release and a new SHIM_VERSION.
// Sourced from package.json (release-please owns the bump) so it cannot drift.
export const SHIM_VERSION: string = pkg.version;
