import pkg from '../package.json';

// The kit's deterministic-environment version. It IS the package version:
// cap.rng / cap.math / shim are versioned together as one atomic execution
// environment (ADR-0069), so a behavioral change to any of them is a package
// release and a new SHIM_VERSION. The kit's trace codec stamps it so a recorded
// run can be replayed through the matching environment. Sourced from
// package.json (release-please owns the bump) so it cannot drift.
export const SHIM_VERSION: string = pkg.version;
