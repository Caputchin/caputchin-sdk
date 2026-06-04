import pkg from '../package.json';

/**
 * Version of this kit (the reducer→run lane: the fixed-step loop + default trace
 * codec). Stamped into every trace this kit encodes so a recorded run can be
 * matched to the kit that produced it. Equals the package version (release-please
 * owns the bump). Internal — the trace codec uses it; not part of the public API.
 * Cross-environment float determinism is governed separately by the author's
 * `@caputchin/determinism` version, not by this stamp.
 */
export const SHIM_VERSION: string = pkg.version;
