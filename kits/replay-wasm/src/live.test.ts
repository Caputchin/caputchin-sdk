import type { Seed } from '@caputchin/replay-contract';
import { describe, expect, it } from 'vitest';
import { LiveSim } from './live.js';

// A minimal module exporting the `caputchin_live!` C-ABI (live_new / live_step /
// live_state / live_trace / live_free) plus cap_alloc, hand-written in WAT then
// gzip+base64'd (LiveSim.create inflates it, as the browser does the inlined sim).
// Its toy "sim": state words = [steps, cfg0, lastInput0]; trace = one byte per
// step (the step index). This pins the host marshalling: config in, input in,
// state words + trace out via the out-len pointer.
const FIXTURE_GZ_B64 =
  'H4sIAAAAAAACA02QTW7CMBCF34wdJ+BVewIjWLDsj2DRrrxuF5V6AIgig0iTgEj6wyocrVfojTpJqgovPO97854XRlqXBIBctKaW2rVp+yNKycCae00tVGxArJSOFIFNLGl/Tmz8GpsylPvjiTHK0sMqLYp9BiTF7iOsqvAJGvWybsIBPP7TaROgBmiOaRagh9TmGAKi8Q+ZK6J2iglN4ZDP4MguBsdM4c/cWcZjyTJc5PGkW6fnDJF2yXrYJc7YR2k5yMZTPlEOTnUdOB469N9JHPw3cqc8vcn9ANiFBL3L+3rf8rMe9ADzHpIOyA/PStpeC15U5E3LsDjpKi0D7wwYqggV0YFicH1DXN8y13eK63ttss32pTlG3XwOlaEta9CWol0lNssQV0Xdb9aKu43Zvzfi6UuISCCOCboKX80vBxat4uUBAAA=';

describe('LiveSim', () => {
  it('steps, reads state words, and records the trace', async () => {
    const seed: Seed = [1, 2, 3, 4];
    const sim = await LiveSim.create(FIXTURE_GZ_B64, seed, Int32Array.from([42]));
    sim.step([7]);
    sim.step([7]);
    expect(Array.from(sim.state())).toEqual([2, 42, 7]); // steps, cfg0, lastInput0
    expect(Array.from(sim.trace())).toEqual([1, 2]); // one trace byte per step
    sim.free();
  });

  it('handles empty config and empty input', async () => {
    const sim = await LiveSim.create(FIXTURE_GZ_B64, [0, 0, 0, 0], []);
    sim.step([]);
    expect(Array.from(sim.state())).toEqual([1, 0, 0]); // steps=1, cfg0=0, lastInput0=0
    sim.free();
  });
});
