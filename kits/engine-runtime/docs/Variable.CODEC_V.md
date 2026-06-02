# Variable: CODEC\_V

> `const` **CODEC\_V**: `1` = `1`

Version of the kit's default trace codec envelope. Stamped into every trace
this kit encodes; increment only on a structural change to the envelope.
This is a kit-internal detail: the platform never inspects trace bytes, so
`CODEC_V` is not a wire contract.
