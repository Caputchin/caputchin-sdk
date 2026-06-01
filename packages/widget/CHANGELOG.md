# Changelog

## [4.0.0](https://github.com/Caputchin/caputchin-sdk/compare/widget-v3.0.0...widget-v4.0.0) (2026-06-01)


### ⚠ BREAKING CHANGES

* **game-sdk:** register() takes only the factory; drop the vestigial manifest arg
* **widget:** consume server-resolved presets, drop resolvers + config attr + manifest handshake
* **widget:** remove client config attribute; config is server-authoritative
* **sdk:** seed-in/trace-out replay contract across game-sdk + widget (ADR-0069)
* **game-sdk:** nest manifest preferred footprint as {width,height}, drop flat fields
* **widget:** adopt locale axis and skin theme rename across resolver, elements, protocol
* **game-sdk:** rename language axis to locale and skin _mode to _theme
* **widget:** override-first default-selection — customer marked default wins its group over bundled (ADR-0059)
* **widget:** marketplace lookup goes through /widget/bootstrap (ADR-0059, sitekey required)
* **widget:** call /games/resolve with game query param (ADR-0058)
* **sdk:** derive registry key from data-game-id; drop required manifest.id (ADR-0058)
* **sdk:** languages presets pipeline (game-sdk 2.0 + widget 2.0)
* **widget:** drop mode attribute on <caputchin-widget>; invisible becomes a boolean HTML attribute (was mode="invisible"|"simple")
* **widget:** drop start() from <caputchin-game>; default build to localhost api host; pass()/fail() guard premature calls
* **widget:** drop size from <caputchin-game> (implicit per layout); drop setNickname from <caputchin-widget>
* **widget:** drop trigger from <caputchin-game> (implicit per layout); add height to <caputchin-widget>; dialog close keeps iframe alive with audio mute
* **widget:** split into <caputchin-widget> (cap) and <caputchin-game> (game host)
* **widget:** rebuild public API to mode/trigger split with graceful validation
* **sdk:** rename bridge.complete to bridge.pass for success-only semantics

### Features

* **ci:** add CI workflow with codecov coverage upload ([727ad0d](https://github.com/Caputchin/caputchin-sdk/commit/727ad0dd8c7f1d98d4945269a906636b2c76da52))
* **frontend:** scaffold @caputchin/widget and @caputchin/game-sdk skeleton packages ([ef9d444](https://github.com/Caputchin/caputchin-sdk/commit/ef9d44434bd76a4168df6cb4f9ac99b8666bc579))
* **game-sdk:** nest manifest preferred footprint as {width,height}, drop flat fields ([ca8a1ac](https://github.com/Caputchin/caputchin-sdk/commit/ca8a1ac448f807a0f819814cbc3b1b95bcce639c))
* **game-sdk:** register() takes only the factory; drop the vestigial manifest arg ([0d28eed](https://github.com/Caputchin/caputchin-sdk/commit/0d28eed32557655477eb60502026c52d51225abc))
* **game-sdk:** rename language axis to locale and skin _mode to _theme ([2bd672c](https://github.com/Caputchin/caputchin-sdk/commit/2bd672c5c761e7ea92b60472efbc0b872d820ef5))
* **sdk:** add optional languages.schema for per-key docs + tokens ([4d04124](https://github.com/Caputchin/caputchin-sdk/commit/4d04124cbd822dc32be7f3cfc7d344c747c97446))
* **sdk:** derive registry key from data-game-id; drop required manifest.id (ADR-0058) ([79c6123](https://github.com/Caputchin/caputchin-sdk/commit/79c61231899ce9a07db18101373b1eec517daea5))
* **sdk:** honor game manifest preferred.layout in widget when embed layout unset ([487ecd6](https://github.com/Caputchin/caputchin-sdk/commit/487ecd6601c076c36f858c2d876e8ea040f3584a))
* **sdk:** languages presets pipeline (game-sdk 2.0 + widget 2.0) ([0df53ac](https://github.com/Caputchin/caputchin-sdk/commit/0df53ac520e4fac7d11dfb23c0a2e74bdcb909f2))
* **sdk:** seed-in/trace-out replay contract across game-sdk + widget (ADR-0069) ([27733ce](https://github.com/Caputchin/caputchin-sdk/commit/27733ce81ce16e781a5c4d5e4e3fc56dd201e1e2))
* **widget,game-sdk:** auto-measure game's first-rendered child via ResizeObserver + bridge.setSize(w,h) escape hatch; widget re-applies iframe size from dimensions-measured message ([e500aeb](https://github.com/Caputchin/caputchin-sdk/commit/e500aebfe503881982519af119060225429051a9))
* **widget:** "see no data" tagline (three-wise-monkeys riff on the Caputchin brand) ([b58f2de](https://github.com/Caputchin/caputchin-sdk/commit/b58f2de7ad30fdbea2ef296885757aa09b557c95))
* **widget:** &lt;caputchin-widget&gt; lang attr; chrome→shell; inline JSON shell signals; height=full ([973807d](https://github.com/Caputchin/caputchin-sdk/commit/973807d9b8696afe7c18ed7a39192a787d25000d))
* **widget:** add 3-layout system (inline/modal/fullscreen) with auto resolution and trigger checkbox ([faa27c5](https://github.com/Caputchin/caputchin-sdk/commit/faa27c50bf18cd4765d04b0b3dcd9d0acdbee215))
* **widget:** add game-only mode (skips Cap, hosts game iframe only) ([57abb99](https://github.com/Caputchin/caputchin-sdk/commit/57abb992c7f0b6f8005dda81b01408dd93ddf253))
* **widget:** add no-verify attribute decoupling game-only from sitekey absence (ADR-0049) ([173930a](https://github.com/Caputchin/caputchin-sdk/commit/173930aff4398159dbcd6922a5963e7877f6adbf))
* **widget:** add size="normal"|"compact" attribute + ensure every inner element has a `part` ([d50fe44](https://github.com/Caputchin/caputchin-sdk/commit/d50fe44eedb8b6f2f5da04bc481943506e6e1d11))
* **widget:** add width="auto"|"full" attribute (default auto = fit-content) ([8dfa77f](https://github.com/Caputchin/caputchin-sdk/commit/8dfa77fd46ac6c308f94ffbcae291690e2ac4101))
* **widget:** adopt locale axis and skin theme rename across resolver, elements, protocol ([4a81e5b](https://github.com/Caputchin/caputchin-sdk/commit/4a81e5b63475d18ddcb27c7d64244002e0cdeda9))
* **widget:** allow customer-configured skin asset origins in the game frame CSP ([80a174f](https://github.com/Caputchin/caputchin-sdk/commit/80a174f75ef9d190a4d9174203fe699d9facd2a1))
* **widget:** allow game-src on gated key when server picked a custom-replayable id (P13 slice 2) ([bd3cd4d](https://github.com/Caputchin/caputchin-sdk/commit/bd3cd4dc3b1f81ed22d5229f0fdd7048c6b797b4))
* **widget:** allow wasm-unsafe-eval in the game-iframe CSP for WASM game engines ([f6b836b](https://github.com/Caputchin/caputchin-sdk/commit/f6b836b72fdc3fc9ec8f2f0f5cecf915aceeb447))
* **widget:** animate modal/fullscreen dialog show + hide via [@starting-style](https://github.com/starting-style) + allow-discrete (with reduced-motion fallback) ([44df6fe](https://github.com/Caputchin/caputchin-sdk/commit/44df6fee95a75d137c84f7d5de69a59915e6f9ab))
* **widget:** apply per-game override banks to the game iframe at runtime (ADR-0059) ([0e101aa](https://github.com/Caputchin/caputchin-sdk/commit/0e101aafaead624b4de93c1d47e460902c522ecc))
* **widget:** bootstrap client + two-layer cascade override (ADR-0059) ([c771f35](https://github.com/Caputchin/caputchin-sdk/commit/c771f359c271cd23bdab9f253e09e714ec6439ae))
* **widget:** brand link hovers green with underline on the Caputchin wordmark ([d1ded63](https://github.com/Caputchin/caputchin-sdk/commit/d1ded63ebea1c2ef03c1c8342868611e015286ef))
* **widget:** call /games/resolve with game query param (ADR-0058) ([f7d8376](https://github.com/Caputchin/caputchin-sdk/commit/f7d8376e4dc55be37444c438d1ea2924e9658fbf))
* **widget:** center the game iframe inside modal + fullscreen dialogs (drop iframe stretch in fullscreen) ([1cea8d0](https://github.com/Caputchin/caputchin-sdk/commit/1cea8d00f6ffc029b5999c222d1a3fe74ead56d2))
* **widget:** configurations axis with valibot-backed type validation + brand link wiring ([407c979](https://github.com/Caputchin/caputchin-sdk/commit/407c9798059125da3390e2b3a044c8c2c1314fde))
* **widget:** consume server-resolved presets, drop resolvers + config attr + manifest handshake ([1d3c03f](https://github.com/Caputchin/caputchin-sdk/commit/1d3c03fd6f2f43e711538970ddd24eedff0f44f9))
* **widget:** drop checkbox; shield is the only indicator (clickable shields get chevron hint + breathing pulse) ([222837c](https://github.com/Caputchin/caputchin-sdk/commit/222837cb559f4671069c9217bea1def6512e1ac4))
* **widget:** drop mode attribute on &lt;caputchin-widget&gt;; invisible becomes a boolean HTML attribute (was mode="invisible"|"simple") ([28db5be](https://github.com/Caputchin/caputchin-sdk/commit/28db5be76f1ff075b1649efc276ffcc91e0c25fa))
* **widget:** drop size from &lt;caputchin-game&gt; (implicit per layout); drop setNickname from &lt;caputchin-widget&gt; ([9c97e35](https://github.com/Caputchin/caputchin-sdk/commit/9c97e353d4ceece5b1d01ca5291e18ad8b087e74))
* **widget:** drop start() from &lt;caputchin-game&gt;; default build to localhost api host; pass()/fail() guard premature calls ([ecbff3a](https://github.com/Caputchin/caputchin-sdk/commit/ecbff3a4fce9d9cceb48fa5d00e4839ea2b726de))
* **widget:** drop trigger from &lt;caputchin-game&gt; (implicit per layout); add height to &lt;caputchin-widget&gt;; dialog close keeps iframe alive with audio mute ([93145fb](https://github.com/Caputchin/caputchin-sdk/commit/93145fb8d503d1adecb9b2c58821df09bee1fd71))
* **widget:** expose author bridge.error code via error.detail.originalCode ([f42bf0c](https://github.com/Caputchin/caputchin-sdk/commit/f42bf0cf13d3f503824aae82984641356768ec92))
* **widget:** game modal/fullscreen — simple checkbox opens dialog with iframe inside ([3819ac8](https://github.com/Caputchin/caputchin-sdk/commit/3819ac8592dca3cba4919bd4310e8f93fe302fd0))
* **widget:** game preferred dimensions in manifest; width/height attrs accept px to override ([570a986](https://github.com/Caputchin/caputchin-sdk/commit/570a9869653dc6eea3d3f5c52647c16f66ed14ef))
* **widget:** game-gate ticket plumbing; reject game-src/manual on gated keys (Phase 11) ([46b3dcc](https://github.com/Caputchin/caputchin-sdk/commit/46b3dccb3a58033783284e75e4cd91cf916efcd2))
* **widget:** grid layout for brand — logo centered col 1, wordmark+tag stacked col 2 ([95a00c6](https://github.com/Caputchin/caputchin-sdk/commit/95a00c6d0263b1262c1eb93a27f663a5fd6fa25a))
* **widget:** hide checkbox label on narrow viewports (icon + brand carry the meaning) ([2296f59](https://github.com/Caputchin/caputchin-sdk/commit/2296f59cd7f0535926f5085a2ea53c7b24c31ccf))
* **widget:** honor preferred.width/height "full" footprint from caputchin.json ([0865de1](https://github.com/Caputchin/caputchin-sdk/commit/0865de15d6cb1630c810455cc696f2212c1f164e))
* **widget:** implement Cap client, element, modes — full verification pipeline ([d225646](https://github.com/Caputchin/caputchin-sdk/commit/d2256461a05eda2755003a2ac40e0aef8120b9ed))
* **widget:** implement iframe layer — srcdoc builder, runtime bootstrap, IframeHost ([502f8ec](https://github.com/Caputchin/caputchin-sdk/commit/502f8ecc4fea2c64dffd32f00d285599b727a0b8))
* **widget:** implement pure modules — config, errors, types, pool, token, resolver, protocol ([2abe118](https://github.com/Caputchin/caputchin-sdk/commit/2abe118f9c4b3128df40927365dac0c75f17f739))
* **widget:** inline game frame — bordered iframe + brand strip below as one panel ([3172c3e](https://github.com/Caputchin/caputchin-sdk/commit/3172c3eceb2b55112d533dae1f3f50585cfb5b40))
* **widget:** inline real Caputchin logo in brand block (replaces C-disc placeholder) ([249cf52](https://github.com/Caputchin/caputchin-sdk/commit/249cf5292fd759e3aed900427f5927633f2b3b93))
* **widget:** isolate simple presentation in shadow DOM; ::part is the sole styling surface ([9cef44f](https://github.com/Caputchin/caputchin-sdk/commit/9cef44f473efe61f9d23228f18b211786149b793))
* **widget:** isolate widgets via URL-routed custom-fetch — drop solveQueue + _activeSolvingEl ([100fc7f](https://github.com/Caputchin/caputchin-sdk/commit/100fc7f785bf5f81ae9db5184b89489b31b29d84))
* **widget:** localize widget shell to the 11 official languages ([39eb3e4](https://github.com/Caputchin/caputchin-sdk/commit/39eb3e41362b9635a877ccc995bf1a41d374dfcb))
* **widget:** manual mode supports multi-round pass() — first call releases cap gate, subsequent calls fire /verify/pass with locked token ([7764148](https://github.com/Caputchin/caputchin-sdk/commit/7764148e1aa857b7e4cfb042e61d93c6f3efff43))
* **widget:** marketplace lookup goes through /widget/bootstrap (ADR-0059, sitekey required) ([3ac951e](https://github.com/Caputchin/caputchin-sdk/commit/3ac951e58319059995de7c54d9b49553b874178d))
* **widget:** multi-round — subsequent bridge.pass fires pass event with locked token + new score ([da7acda](https://github.com/Caputchin/caputchin-sdk/commit/da7acda749efc5831855a51c9e5b945dff964219))
* **widget:** pill mode = branded badge with status replacing tag (Turnstile-style) ([bb6dc6b](https://github.com/Caputchin/caputchin-sdk/commit/bb6dc6b180d5454f096a997252386c7660ff873a))
* **widget:** pre-resolve locale + skin signals client-side before bootstrap ([652a8f8](https://github.com/Caputchin/caputchin-sdk/commit/652a8f807f95b64d899baa907e20581494a414f4))
* **widget:** rebuild public API to mode/trigger split with graceful validation ([b248e8d](https://github.com/Caputchin/caputchin-sdk/commit/b248e8d77f71d59baa3459b0e26c3eb2692a58c2))
* **widget:** remove client config attribute; config is server-authoritative ([a984732](https://github.com/Caputchin/caputchin-sdk/commit/a984732cf4fb5f8092db421ebd58c19690558803))
* **widget:** resolve marketplace game bundles without a sitekey ([5a52712](https://github.com/Caputchin/caputchin-sdk/commit/5a52712248a23d8c5676c09dc0ecd009996afe81))
* **widget:** responsive simple panel — flex-wrap, fit-content width, mobile media query ([6aad8d0](https://github.com/Caputchin/caputchin-sdk/commit/6aad8d0982974c9b934b3ccf2de8620714398047))
* **widget:** restore always-on iframe auto-measure observers (ResizeObserver + MutationObserver) with grow-only guard so post-game UI shifts re-flow the iframe up but never down ([21fe0ed](https://github.com/Caputchin/caputchin-sdk/commit/21fe0ede4236e02ca9ad366e8475d9ecdfaadf87))
* **widget:** scaffold package — Cap dep, vitest, two-pass tsup build, env vars ([aee9f49](https://github.com/Caputchin/caputchin-sdk/commit/aee9f49b74a2727c3493b258bf60814c126ba712))
* **widget:** SDK auto-sizes iframe from document.documentElement scrollWidth/Height (works for CSS-percentage layouts, not just intrinsic-sized roots) — single-shot, disconnects after 2 RAFs ([c59f4fe](https://github.com/Caputchin/caputchin-sdk/commit/c59f4fec85030b64f8a97e46ac16e1d551e75ecc))
* **widget:** ship cap.js wasm + pako in dist, point cap.js at them same-origin (no jsDelivr) ([cd4d6c4](https://github.com/Caputchin/caputchin-sdk/commit/cd4d6c4b1839907c26fbc8325595ce875e0dc4a8))
* **widget:** simple-mode brand is a single link to /legal, drop fake Privacy/Terms labels ([f9caae4](https://github.com/Caputchin/caputchin-sdk/commit/f9caae48198ee365276458416fd1e458eea623f2))
* **widget:** size="compact" now flattens to a single inline row (logo · checkbox · brand · tag) ([cf83a28](https://github.com/Caputchin/caputchin-sdk/commit/cf83a28114644dd0b966055f4908561c9e48c86e))
* **widget:** skin axis with built-in light/dark + typed asset validation + ctx.skin ([6518157](https://github.com/Caputchin/caputchin-sdk/commit/6518157607e33222d4fbe3444fa390688d57d33c))
* **widget:** split into &lt;caputchin-widget&gt; (cap) and &lt;caputchin-game&gt; (game host) ([5c4fbfc](https://github.com/Caputchin/caputchin-sdk/commit/5c4fbfc1f68b66ccf28529317ee29cfd82183c76))
* **widget:** status-pill UI for simple form-submit/manual + two-link brand block ([b4d01c8](https://github.com/Caputchin/caputchin-sdk/commit/b4d01c841dd29845dc8cc102c367721190f50106))
* **widget:** surface bootstrap 409 gate rejects as a gate-unavailable error instead of silently degrading ([381c7c8](https://github.com/Caputchin/caputchin-sdk/commit/381c7c8e29bb9451ff0b1715f5508e65aea631c8))
* **widget:** trigger=manual on &lt;caputchin-game&gt; (slot pattern, pass/fail methods, dialog visibility events, severity field on errors) ([2521849](https://github.com/Caputchin/caputchin-sdk/commit/25218494b88c0b374f34551f41f28dbf6a467c88))
* **widget:** unify simple presentation across triggers; state-text label replaces 'I'm not a robot'; demo gains reload button + optional form input ([e244524](https://github.com/Caputchin/caputchin-sdk/commit/e24452433603cbbe1a68bf5e273c05cb0e152ea8))
* **widget:** width/height on &lt;caputchin-game&gt; sizes the outer chrome (inline frame OR modal/fullscreen entry checkbox), not the iframe; modal dialog shrink-wraps to game ([b98b637](https://github.com/Caputchin/caputchin-sdk/commit/b98b637f79500d43a1225b2fe733164cce75683c))


### Bug Fixes

* **ci:** align coverage thresholds; add permissions+concurrency to ci.yml; fix codecov target ([f648c2c](https://github.com/Caputchin/caputchin-sdk/commit/f648c2ccf9bc4ce8555cdfc82265ba8c3c401f5e))
* **sdk:** resolve internal package types from source via central tsconfig paths ([57685e8](https://github.com/Caputchin/caputchin-sdk/commit/57685e85a96e814d314103a05813c2f8b0e92f57))
* **widget:** accept same-origin absolute paths for game-src ([4ed4be5](https://github.com/Caputchin/caputchin-sdk/commit/4ed4be5bc3313b8405c614d11145f4c4a984a2b0))
* **widget:** address M1-M6 phase-1 minor findings ([86077fb](https://github.com/Caputchin/caputchin-sdk/commit/86077fb557a0ca0bcf6155dbb711f87a3a14758f))
* **widget:** address QA cycle-1 findings F1-F9 ([9f08de8](https://github.com/Caputchin/caputchin-sdk/commit/9f08de8d8b26c57952cfb7468ea09a79bbf9da5b))
* **widget:** align game-sdk bridge contract — shared types, error/complete shape, code forwarding ([eb532d8](https://github.com/Caputchin/caputchin-sdk/commit/eb532d8707cb5067bf75de678be138ca883cb09a))
* **widget:** allow loopback game-src URLs + surface game-load/build failures via the error event instead of swallowing ([453d809](https://github.com/Caputchin/caputchin-sdk/commit/453d809713863a045b43eb58e3345c5c8ddf1e6c))
* **widget:** bigger logo (28px), fix tag-link hover underline (specificity) ([9943dae](https://github.com/Caputchin/caputchin-sdk/commit/9943dae5096f942607a5b21d6842736938276dec))
* **widget:** bump narrow-viewport breakpoint to 28rem so common phones (360-414px) trigger it ([d318359](https://github.com/Caputchin/caputchin-sdk/commit/d318359187dbef2df3223cb445f5d3b2c1de5d50))
* **widget:** close iframe kickoff/register race that intermittently fired game-not-registered ([71126c6](https://github.com/Caputchin/caputchin-sdk/commit/71126c62d034cc17bd5d815218669b671709fb65))
* **widget:** default api host back to https://caputchin.com (was api.caputchin.com); build:prod matches ([e167089](https://github.com/Caputchin/caputchin-sdk/commit/e16708988d59eb167f172303ef3a0663402e4d31))
* **widget:** drop redeems for disposed widgets + remove cap-widget element on dispose ([7d32588](https://github.com/Caputchin/caputchin-sdk/commit/7d32588222a076cb507083a9bb1160ae76428449))
* **widget:** forward platform.sessionId from /verify/start to /verify/pass ([dfb841e](https://github.com/Caputchin/caputchin-sdk/commit/dfb841ec0e2ceef18410fc5cbae92e6a469996ba))
* **widget:** game error aborts verification — no pass event, no token, suppress duplicate error ([66279c8](https://github.com/Caputchin/caputchin-sdk/commit/66279c8d8e8ca9da0fa00d24811232a21f477323))
* **widget:** game-frame — top border on badge slot; embedded pill border fully suppressed ([a983031](https://github.com/Caputchin/caputchin-sdk/commit/a9830317dbb522b2dcaecd5ca2be5efadbe7c577))
* **widget:** host shrink-wrap with width="auto" + reset iframe body margin ([b766060](https://github.com/Caputchin/caputchin-sdk/commit/b7660602093589894978c1e221070ce1dd918aa2))
* **widget:** ignore repeat game passes, record one round per session ([8329a32](https://github.com/Caputchin/caputchin-sdk/commit/8329a32ae33f5085dca5c76c98d1a3159be39615))
* **widget:** import Cap as default, mock per-suite, reorder demo listeners ([e4a9f6e](https://github.com/Caputchin/caputchin-sdk/commit/e4a9f6ea4490db9d273a438609e5f0e23891f687))
* **widget:** inline game frame — game-only also gets the brand strip; remove top-border separator ([2f8c33e](https://github.com/Caputchin/caputchin-sdk/commit/2f8c33eb075513ca439940f89d45d74cbc6c5d6f))
* **widget:** inline game frame — game-only stays at idle brand, not verifying ([4ebaa63](https://github.com/Caputchin/caputchin-sdk/commit/4ebaa63cba2112a60feba8a1ac537246fa1313ce))
* **widget:** keep iframe auto-measure observer alive for round lifetime so post-game UI changes (replay button, score panel) re-flow the iframe; cleaned up on dispose ([23e2bb7](https://github.com/Caputchin/caputchin-sdk/commit/23e2bb7199ce100c2a36c6503f17fe7881598a25))
* **widget:** keyless game mounts now bootstrap for preferred size + presets; gate kickoff on iframe load ([5ac9820](https://github.com/Caputchin/caputchin-sdk/commit/5ac9820e0eff6c11903c8b9eb4cff8ab655f8b59))
* **widget:** lock simple label width across state changes; passive triggers render shield instead of checkbox ([7a7b06c](https://github.com/Caputchin/caputchin-sdk/commit/7a7b06c9449846d45f19ac657d85ff8442f6ed38))
* **widget:** modal/fullscreen dialog dismissal mid-verify reverts shield to clickable idle (covers Esc/backdrop/button paths) ([e63ed80](https://github.com/Caputchin/caputchin-sdk/commit/e63ed8063b7f9fed94fc0d5cb8775cac665482ab))
* **widget:** move checkbox sizing to shadow stylesheet so compact CSS override applies ([8be6a73](https://github.com/Caputchin/caputchin-sdk/commit/8be6a73476e24ae7c7eed34c66645f8300071ce3))
* **widget:** move compact separator to wordmark::after so it's not part of the tag link ([62ded29](https://github.com/Caputchin/caputchin-sdk/commit/62ded29ff97fbe8c6d55a0d03bff811e69fa4773))
* **widget:** only the checkbox itself is clickable, not the whole simple panel ([075cce4](https://github.com/Caputchin/caputchin-sdk/commit/075cce4036992a343f78aec0d95e1f74d64e41db))
* **widget:** override-first default-selection — customer marked default wins its group over bundled (ADR-0059) ([555b4d9](https://github.com/Caputchin/caputchin-sdk/commit/555b4d9affe4d5c7af797a45c263d000be9cd2cf))
* **widget:** pass-event score/durationMs read from request payload (server doesn't echo them) ([b091949](https://github.com/Caputchin/caputchin-sdk/commit/b0919494d2bcc5cc5bebb0eea29f49d782b2358f))
* **widget:** postMessage targetOrigin must be "*" — "null" is silently dropped, broke iframe kickoff ([2246977](https://github.com/Caputchin/caputchin-sdk/commit/2246977fb4e0db135d16094e119f7cc56df20d1c))
* **widget:** raise branches threshold to 80 (M7 monotonic floor) ([6d585ad](https://github.com/Caputchin/caputchin-sdk/commit/6d585add7dec86686e57c794f30b157e05450b46))
* **widget:** redeem reads platform.wrappedToken, not cap's top-level token ([1d6e50a](https://github.com/Caputchin/caputchin-sdk/commit/1d6e50a249bdb07458793f49703c8acbf969d8b2))
* **widget:** rename ESM to .mjs and IIFE to widget.js for CDN script-tag compatibility ([1240c7d](https://github.com/Caputchin/caputchin-sdk/commit/1240c7d4cd913e727db7b3f61cec283ef25a9c52))
* **widget:** resolve @caputchin/game-sdk via tsconfig paths so typecheck works without dist ([7066206](https://github.com/Caputchin/caputchin-sdk/commit/7066206123c183db107728b893881f5bdcd90282))
* **widget:** revert iframe auto-measure to documentElement.scrollWidth/Height (body measurement death-spirals as iframe shrinks); doc the grow-only limitation ([163456f](https://github.com/Caputchin/caputchin-sdk/commit/163456f3a1d5c34e533e53d8977ea25b04314260))
* **widget:** set the cap.js wasm override before cap.js inits so the bundled wasm is used, not jsDelivr ([3357bda](https://github.com/Caputchin/caputchin-sdk/commit/3357bdaf165a4cc3a1ecfa8b9a6282146376c32a))
* **widget:** shrink compact size further (checkbox 0.85rem, logo 14px, tighter padding) ([65f9395](https://github.com/Caputchin/caputchin-sdk/commit/65f9395118c17e20a67c8831b825bea265519495))
* **widget:** silence post-dispose noise via widget.error override + state.connected guards ([395ca14](https://github.com/Caputchin/caputchin-sdk/commit/395ca149a877153a29bf101b916c0b7e3e369366))
* **widget:** tighter logo/text gap + center wordmark and tag in col 2 ([808a0d5](https://github.com/Caputchin/caputchin-sdk/commit/808a0d562b9a073798d3e26b923cd5c6f01f8487))
* **widget:** tighter padding on compact (0.15rem 0.35rem) for a flatter strip ([fd9fdf9](https://github.com/Caputchin/caputchin-sdk/commit/fd9fdf9f282b52d007e125f36948f2eaa29a3747))
* **widget:** tighter padding on normal simple panel (0.5rem 0.75rem) ([c535ffb](https://github.com/Caputchin/caputchin-sdk/commit/c535ffba8fdb68db0e17a576724cb721779dc4cb))
* **widget:** width="full" expands the inline host element, not just the inner panel ([cf222fe](https://github.com/Caputchin/caputchin-sdk/commit/cf222fee5446cc9b53c64470122ae54c6fa5f34d))


### Performance Improvements

* **widget:** reuse mount-time bootstrap bundle for game load, dropping the second resolve call (ADR-0059) ([e9140f9](https://github.com/Caputchin/caputchin-sdk/commit/e9140f914ab34a3aa866908685c1084d04ec4883))


### Reverts

* release-please PR [#10](https://github.com/Caputchin/caputchin-sdk/issues/10) due to broken title pattern config ([e0d7ef0](https://github.com/Caputchin/caputchin-sdk/commit/e0d7ef0ed6e781463588508226678a9d19528037))


### Code Refactoring

* **sdk:** rename bridge.complete to bridge.pass for success-only semantics ([fc384c5](https://github.com/Caputchin/caputchin-sdk/commit/fc384c586203d7dc47f34e3417ef814c601662ce))

## [3.0.0](https://github.com/Caputchin/caputchin-sdk/compare/widget-v2.3.0...widget-v3.0.0) (2026-06-01)


### ⚠ BREAKING CHANGES

* **game-sdk:** register() takes only the factory; drop the vestigial manifest arg
* **widget:** consume server-resolved presets, drop resolvers + config attr + manifest handshake
* **widget:** remove client config attribute; config is server-authoritative
* **sdk:** seed-in/trace-out replay contract across game-sdk + widget (ADR-0069)

### Features

* **game-sdk:** register() takes only the factory; drop the vestigial manifest arg ([a0a95ad](https://github.com/Caputchin/caputchin-sdk/commit/a0a95addcb73784649836cf7241aa2b80723eab1))
* **sdk:** honor game manifest preferred.layout in widget when embed layout unset ([303cad3](https://github.com/Caputchin/caputchin-sdk/commit/303cad33f5363f551154bdd3a8e492e123a25d28))
* **sdk:** seed-in/trace-out replay contract across game-sdk + widget (ADR-0069) ([54a9e2c](https://github.com/Caputchin/caputchin-sdk/commit/54a9e2c25b9ccae8d9b7ef50fe7f26424499a1ce))
* **widget:** allow game-src on gated key when server picked a custom-replayable id (P13 slice 2) ([e617d7a](https://github.com/Caputchin/caputchin-sdk/commit/e617d7aa6f0129c66d3c2c4555eaf80273d0bd21))
* **widget:** allow wasm-unsafe-eval in the game-iframe CSP for WASM game engines ([2606f3e](https://github.com/Caputchin/caputchin-sdk/commit/2606f3e234099f338997d3c7cfb0806d355fb7e5))
* **widget:** consume server-resolved presets, drop resolvers + config attr + manifest handshake ([55bc414](https://github.com/Caputchin/caputchin-sdk/commit/55bc414598de62f9d4e54f822892cd2f62747dbe))
* **widget:** game-gate ticket plumbing; reject game-src/manual on gated keys (Phase 11) ([3eca619](https://github.com/Caputchin/caputchin-sdk/commit/3eca6194b2edcfcf7b4369ffadcc4f1ed76b3a74))
* **widget:** honor preferred.width/height "full" footprint from caputchin.json ([559e68c](https://github.com/Caputchin/caputchin-sdk/commit/559e68c67785c58df79f9df135ad09b6204e6a53))
* **widget:** pre-resolve locale + skin signals client-side before bootstrap ([4c9bae9](https://github.com/Caputchin/caputchin-sdk/commit/4c9bae9e361b5e362eacb9b9afe868979b6a4a1a))
* **widget:** remove client config attribute; config is server-authoritative ([c4dbc58](https://github.com/Caputchin/caputchin-sdk/commit/c4dbc580083ef7f80d6745cdc2adcc88b2e80fc9))
* **widget:** surface bootstrap 409 gate rejects as a gate-unavailable error instead of silently degrading ([87be9a7](https://github.com/Caputchin/caputchin-sdk/commit/87be9a789ead42d17c7ea38588803fc8bf89f7ac))


### Bug Fixes

* **sdk:** resolve internal package types from source via central tsconfig paths ([8eb3e4c](https://github.com/Caputchin/caputchin-sdk/commit/8eb3e4c7f9b39d94ff0867c93ebee2a156fa60e5))
* **widget:** allow loopback game-src URLs + surface game-load/build failures via the error event instead of swallowing ([fc988d1](https://github.com/Caputchin/caputchin-sdk/commit/fc988d1552d84745b1fbf8c6ccc15cf4b6f4a3a7))
* **widget:** close iframe kickoff/register race that intermittently fired game-not-registered ([812fd2f](https://github.com/Caputchin/caputchin-sdk/commit/812fd2ff4e99137fede0f011615d43f0c4b9ef8c))
* **widget:** drop redeems for disposed widgets + remove cap-widget element on dispose ([a801100](https://github.com/Caputchin/caputchin-sdk/commit/a801100b6a8e745ddfebb19eb14eb7b5f647ba08))
* **widget:** ignore repeat game passes, record one round per session ([9100cbc](https://github.com/Caputchin/caputchin-sdk/commit/9100cbc510210b7092848209860d226b1687d8e6))
* **widget:** keyless game mounts now bootstrap for preferred size + presets; gate kickoff on iframe load ([c205938](https://github.com/Caputchin/caputchin-sdk/commit/c2059384eaa32c43413b583b2cfd75d52b3ce535))
* **widget:** silence post-dispose noise via widget.error override + state.connected guards ([d6da1c0](https://github.com/Caputchin/caputchin-sdk/commit/d6da1c0bedb2d76ca2d9745c74c0b1b0c9566e6b))

## [2.3.0](https://github.com/Caputchin/caputchin-sdk/compare/widget-v2.2.0...widget-v2.3.0) (2026-05-24)


### Features

* **widget:** localize widget shell to the 11 official languages ([0269eb1](https://github.com/Caputchin/caputchin-sdk/commit/0269eb195a177ed91a54cd017e2ab49b9eefaa70))


### Bug Fixes

* **widget:** set the cap.js wasm override before cap.js inits so the bundled wasm is used, not jsDelivr ([7757593](https://github.com/Caputchin/caputchin-sdk/commit/7757593ca8ad9bcee3df4fe9551510dd4cb5a01e))

## [2.2.0](https://github.com/Caputchin/caputchin-sdk/compare/widget-v2.1.0...widget-v2.2.0) (2026-05-24)


### Features

* **widget:** resolve marketplace game bundles without a sitekey ([a581727](https://github.com/Caputchin/caputchin-sdk/commit/a581727a69bb5c4f29b17b760ae5fb2e2ba66860))

## [2.1.0](https://github.com/Caputchin/caputchin-sdk/compare/widget-v2.0.0...widget-v2.1.0) (2026-05-24)


### Features

* **widget:** ship cap.js wasm + pako in dist, point cap.js at them same-origin (no jsDelivr) ([3a73559](https://github.com/Caputchin/caputchin-sdk/commit/3a7355916ad57a9b39cb3a5b26e5c7fdaf0c438f))

## [2.0.0](https://github.com/Caputchin/caputchin-sdk/compare/widget-v1.0.0...widget-v2.0.0) (2026-05-23)


### ⚠ BREAKING CHANGES

* **game-sdk:** nest manifest preferred footprint as {width,height}, drop flat fields
* **widget:** adopt locale axis and skin theme rename across resolver, elements, protocol
* **game-sdk:** rename language axis to locale and skin _mode to _theme
* **widget:** override-first default-selection — customer marked default wins its group over bundled
* **widget:** marketplace lookup goes through /widget/bootstrap (sitekey required)
* **widget:** call /games/resolve with game query param
* **sdk:** derive registry key from data-game-id; drop required manifest.id
* **sdk:** languages presets pipeline (game-sdk 2.0 + widget 2.0)
* **widget:** drop mode attribute on <caputchin-widget>; invisible becomes a boolean HTML attribute (was mode="invisible"|"simple")
* **widget:** drop start() from <caputchin-game>; default build to localhost api host; pass()/fail() guard premature calls
* **widget:** drop size from <caputchin-game> (implicit per layout); drop setNickname from <caputchin-widget>
* **widget:** drop trigger from <caputchin-game> (implicit per layout); add height to <caputchin-widget>; dialog close keeps iframe alive with audio mute
* **widget:** split into <caputchin-widget> (cap) and <caputchin-game> (game host)
* **widget:** rebuild public API to mode/trigger split with graceful validation

### Features

* **game-sdk:** nest manifest preferred footprint as {width,height}, drop flat fields ([9c692b6](https://github.com/Caputchin/caputchin-sdk/commit/9c692b65a8165f9b17c03fe0bb8ca8354482143e))
* **game-sdk:** rename language axis to locale and skin _mode to _theme ([7bb356a](https://github.com/Caputchin/caputchin-sdk/commit/7bb356a54baa5290ee84945f0c7b09f10e6aa13b))
* **sdk:** add optional languages.schema for per-key docs + tokens ([a3650c2](https://github.com/Caputchin/caputchin-sdk/commit/a3650c226c8194a1fe3ea5c36f47011520a77c4e))
* **sdk:** derive registry key from data-game-id; drop required manifest.id ([7c5e6d0](https://github.com/Caputchin/caputchin-sdk/commit/7c5e6d03632983cfc029da67b24c8736b2262554))
* **sdk:** languages presets pipeline (game-sdk 2.0 + widget 2.0) ([e5b91b4](https://github.com/Caputchin/caputchin-sdk/commit/e5b91b4a8b73101f0fe0a590fc5426932b29b062))
* **widget,game-sdk:** auto-measure game's first-rendered child via ResizeObserver + bridge.setSize(w,h) escape hatch; widget re-applies iframe size from dimensions-measured message ([f0bb3fb](https://github.com/Caputchin/caputchin-sdk/commit/f0bb3fb0a6784ac46619e9dcd35452791bcffce0))
* **widget:** "see no data" tagline (three-wise-monkeys riff on the Caputchin brand) ([ff63e01](https://github.com/Caputchin/caputchin-sdk/commit/ff63e01027d45401e9a2452da6459dd1b8f13647))
* **widget:** &lt;caputchin-widget&gt; lang attr; chrome→shell; inline JSON shell signals; height=full ([1c6ba21](https://github.com/Caputchin/caputchin-sdk/commit/1c6ba21125e46c7beede4c670c76cc3dff40e732))
* **widget:** add 3-layout system (inline/modal/fullscreen) with auto resolution and trigger checkbox ([07ae0e5](https://github.com/Caputchin/caputchin-sdk/commit/07ae0e526838682fb91b7a1c4073cd0fd0df7c16))
* **widget:** add no-verify attribute decoupling game-only from sitekey absence ([37e4a3a](https://github.com/Caputchin/caputchin-sdk/commit/37e4a3ab9442d85aa31a3954807b8371031ae592))
* **widget:** add size="normal"|"compact" attribute + ensure every inner element has a `part` ([e15afcf](https://github.com/Caputchin/caputchin-sdk/commit/e15afcfbf09c81058a305c39ab9748f1d8ab2abe))
* **widget:** add width="auto"|"full" attribute (default auto = fit-content) ([9854829](https://github.com/Caputchin/caputchin-sdk/commit/9854829f1ff710635933cf28fb5c88a1f8213150))
* **widget:** adopt locale axis and skin theme rename across resolver, elements, protocol ([a9a7026](https://github.com/Caputchin/caputchin-sdk/commit/a9a7026b0b3cbede8841a606508646512d7756a1))
* **widget:** allow customer-configured skin asset origins in the game frame CSP ([3d0a0c2](https://github.com/Caputchin/caputchin-sdk/commit/3d0a0c2ef9991d63071a9997d39fbd62962c7118))
* **widget:** animate modal/fullscreen dialog show + hide via [@starting-style](https://github.com/starting-style) + allow-discrete (with reduced-motion fallback) ([db965a6](https://github.com/Caputchin/caputchin-sdk/commit/db965a622297278932fdc8fa947ff4a38eee9b38))
* **widget:** apply per-game override banks to the game iframe at runtime ([64c100a](https://github.com/Caputchin/caputchin-sdk/commit/64c100afebbcc0dde37c0905db0cf6ad2387f299))
* **widget:** bootstrap client + two-layer cascade override ([7e52470](https://github.com/Caputchin/caputchin-sdk/commit/7e52470239c925d1433975b094c0e2490d0ee4c6))
* **widget:** brand link hovers green with underline on the Caputchin wordmark ([f0bd71a](https://github.com/Caputchin/caputchin-sdk/commit/f0bd71a10ccbbfa2dc65be8584485f4a7524db7d))
* **widget:** call /games/resolve with game query param ([f824137](https://github.com/Caputchin/caputchin-sdk/commit/f8241378f459f0c120a45ab6f1c403418865db82))
* **widget:** center the game iframe inside modal + fullscreen dialogs (drop iframe stretch in fullscreen) ([5dc62a9](https://github.com/Caputchin/caputchin-sdk/commit/5dc62a98ec68b8fa8f895905f7a222e3a914f17e))
* **widget:** configurations axis with valibot-backed type validation + brand link wiring ([228e588](https://github.com/Caputchin/caputchin-sdk/commit/228e5889f2daf153d53a38ffa24ba4ab4ac59691))
* **widget:** drop checkbox; shield is the only indicator (clickable shields get chevron hint + breathing pulse) ([abb52a0](https://github.com/Caputchin/caputchin-sdk/commit/abb52a09c22000e4eb6d04a0a3c1eab8440ed533))
* **widget:** drop mode attribute on &lt;caputchin-widget&gt;; invisible becomes a boolean HTML attribute (was mode="invisible"|"simple") ([5bb2aba](https://github.com/Caputchin/caputchin-sdk/commit/5bb2abaa931d5819a42081143042b5f012491de2))
* **widget:** drop size from &lt;caputchin-game&gt; (implicit per layout); drop setNickname from &lt;caputchin-widget&gt; ([a657ef8](https://github.com/Caputchin/caputchin-sdk/commit/a657ef8805c539780e6677039b0875c9996b0e9c))
* **widget:** drop start() from &lt;caputchin-game&gt;; default build to localhost api host; pass()/fail() guard premature calls ([eb84fe3](https://github.com/Caputchin/caputchin-sdk/commit/eb84fe34d273e173982782fac60345db8c60d3dd))
* **widget:** drop trigger from &lt;caputchin-game&gt; (implicit per layout); add height to &lt;caputchin-widget&gt;; dialog close keeps iframe alive with audio mute ([6de9b22](https://github.com/Caputchin/caputchin-sdk/commit/6de9b22fc442e593acb3a6d8f0e387b112e7f3bc))
* **widget:** game modal/fullscreen — simple checkbox opens dialog with iframe inside ([2c1502c](https://github.com/Caputchin/caputchin-sdk/commit/2c1502c2d96e613f8cc1e25171374c2cbd32dafd))
* **widget:** game preferred dimensions in manifest; width/height attrs accept px to override ([c215a97](https://github.com/Caputchin/caputchin-sdk/commit/c215a97e390f336e4de23a7f35b6c4b8afd0be72))
* **widget:** grid layout for brand — logo centered col 1, wordmark+tag stacked col 2 ([49545ea](https://github.com/Caputchin/caputchin-sdk/commit/49545ea24ec6bdc3de0617be2fd8113e0a92ecf1))
* **widget:** hide checkbox label on narrow viewports (icon + brand carry the meaning) ([cad5cb2](https://github.com/Caputchin/caputchin-sdk/commit/cad5cb2700213670cb7247ea69049c904cf0a435))
* **widget:** inline game frame — bordered iframe + brand strip below as one panel ([d79ac82](https://github.com/Caputchin/caputchin-sdk/commit/d79ac823421327e16a6311813d0333cc6a6cda42))
* **widget:** inline real Caputchin logo in brand block (replaces C-disc placeholder) ([7f14dca](https://github.com/Caputchin/caputchin-sdk/commit/7f14dcad3a62d23aa8e0c5b4dce99f68d992c498))
* **widget:** isolate simple presentation in shadow DOM; ::part is the sole styling surface ([99336d1](https://github.com/Caputchin/caputchin-sdk/commit/99336d12f9b185d0ef67caff83ea3504e4e902dd))
* **widget:** isolate widgets via URL-routed custom-fetch — drop solveQueue + _activeSolvingEl ([bae0208](https://github.com/Caputchin/caputchin-sdk/commit/bae02081524568247783147fd7ae25a36218fe72))
* **widget:** manual mode supports multi-round pass() — first call releases cap gate, subsequent calls fire /verify/pass with locked token ([9c27a6d](https://github.com/Caputchin/caputchin-sdk/commit/9c27a6de2598af671c85175b1e6e11228013b4b7))
* **widget:** marketplace lookup goes through /widget/bootstrap (sitekey required) ([fce1f78](https://github.com/Caputchin/caputchin-sdk/commit/fce1f78ca96434a38c511dcc43e333eaf17323ed))
* **widget:** multi-round — subsequent bridge.pass fires pass event with locked token + new score ([aed12f8](https://github.com/Caputchin/caputchin-sdk/commit/aed12f83030c2928de7a67133aa54698e75963ff))
* **widget:** pill mode = branded badge with status replacing tag (Turnstile-style) ([e3cd434](https://github.com/Caputchin/caputchin-sdk/commit/e3cd434b433f04cfcce17f31c1d92d0043a7ec24))
* **widget:** rebuild public API to mode/trigger split with graceful validation ([cfee568](https://github.com/Caputchin/caputchin-sdk/commit/cfee56885870b7cf0675d4611f873796295f7829))
* **widget:** responsive simple panel — flex-wrap, fit-content width, mobile media query ([8077262](https://github.com/Caputchin/caputchin-sdk/commit/8077262118674ec346c79195b9aef12254175b41))
* **widget:** restore always-on iframe auto-measure observers (ResizeObserver + MutationObserver) with grow-only guard so post-game UI shifts re-flow the iframe up but never down ([fe27ed4](https://github.com/Caputchin/caputchin-sdk/commit/fe27ed4e0112a6970f49a634fcce26b6709992a2))
* **widget:** SDK auto-sizes iframe from document.documentElement scrollWidth/Height (works for CSS-percentage layouts, not just intrinsic-sized roots) — single-shot, disconnects after 2 RAFs ([0584aa2](https://github.com/Caputchin/caputchin-sdk/commit/0584aa2a944ed582fa2d4ad8b951b4787c257cf5))
* **widget:** simple-mode brand is a single link to /legal, drop fake Privacy/Terms labels ([71287b2](https://github.com/Caputchin/caputchin-sdk/commit/71287b2fafd62e5df85030f75951e57d944c92d8))
* **widget:** size="compact" now flattens to a single inline row (logo · checkbox · brand · tag) ([48bebc0](https://github.com/Caputchin/caputchin-sdk/commit/48bebc0bc03ce76e3e8a727277a79020d4bf5f5f))
* **widget:** skin axis with built-in light/dark + typed asset validation + ctx.skin ([a3af1c0](https://github.com/Caputchin/caputchin-sdk/commit/a3af1c01e5ce313686b96c0655621dc28edf5999))
* **widget:** split into &lt;caputchin-widget&gt; (cap) and &lt;caputchin-game&gt; (game host) ([e194939](https://github.com/Caputchin/caputchin-sdk/commit/e194939621db1c8a9ce6655521a82a317a87c146))
* **widget:** status-pill UI for simple form-submit/manual + two-link brand block ([8c77ccd](https://github.com/Caputchin/caputchin-sdk/commit/8c77ccd17980fa3725b58a25574d43566e62c83f))
* **widget:** trigger=manual on &lt;caputchin-game&gt; (slot pattern, pass/fail methods, dialog visibility events, severity field on errors) ([57a5250](https://github.com/Caputchin/caputchin-sdk/commit/57a5250bb1540bd99c012919f98d4d8c4a4931c2))
* **widget:** unify simple presentation across triggers; state-text label replaces 'I'm not a robot'; demo gains reload button + optional form input ([fb29e0d](https://github.com/Caputchin/caputchin-sdk/commit/fb29e0daa3e924c2d5a2285caff2784926cfd7d4))
* **widget:** width/height on &lt;caputchin-game&gt; sizes the outer chrome (inline frame OR modal/fullscreen entry checkbox), not the iframe; modal dialog shrink-wraps to game ([55fc67c](https://github.com/Caputchin/caputchin-sdk/commit/55fc67c45626083415354377cf4793410a57a447))


### Bug Fixes

* **widget:** accept same-origin absolute paths for game-src ([1d78cda](https://github.com/Caputchin/caputchin-sdk/commit/1d78cda34224de5606ea90d769debbbf1a2aa24b))
* **widget:** bigger logo (28px), fix tag-link hover underline (specificity) ([063094e](https://github.com/Caputchin/caputchin-sdk/commit/063094eb65f11e2a2ca213610292648ea693398b))
* **widget:** bump narrow-viewport breakpoint to 28rem so common phones (360-414px) trigger it ([178a46d](https://github.com/Caputchin/caputchin-sdk/commit/178a46d490f9ff840d690e8b5fe46ff351714c31))
* **widget:** default api host back to https://caputchin.com (was api.caputchin.com); build:prod matches ([ac06021](https://github.com/Caputchin/caputchin-sdk/commit/ac06021c9fd97ed5e69f3b1e15199ce93f9bcba1))
* **widget:** forward platform.sessionId from /verify/start to /verify/pass ([5334453](https://github.com/Caputchin/caputchin-sdk/commit/53344534ac3ee3476ecaf3938c4c30251b415549))
* **widget:** game error aborts verification — no pass event, no token, suppress duplicate error ([3ab0ce2](https://github.com/Caputchin/caputchin-sdk/commit/3ab0ce27adbc0fc9750b4351e10140f116506726))
* **widget:** game-frame — top border on badge slot; embedded pill border fully suppressed ([f022561](https://github.com/Caputchin/caputchin-sdk/commit/f0225617f3a89814c53bf898415a8eea053e6e9e))
* **widget:** host shrink-wrap with width="auto" + reset iframe body margin ([4ca11c5](https://github.com/Caputchin/caputchin-sdk/commit/4ca11c5baea895ba5728ee9a48a00f0be085da9e))
* **widget:** import Cap as default, mock per-suite, reorder demo listeners ([4b227b1](https://github.com/Caputchin/caputchin-sdk/commit/4b227b12039862028c3801662bf139428bc37271))
* **widget:** inline game frame — game-only also gets the brand strip; remove top-border separator ([dc9faab](https://github.com/Caputchin/caputchin-sdk/commit/dc9faab5300b5fd7f7741c272a02e996259ff151))
* **widget:** inline game frame — game-only stays at idle brand, not verifying ([625074b](https://github.com/Caputchin/caputchin-sdk/commit/625074bdaad3e7920fffa35efb89f0b8757296f6))
* **widget:** keep iframe auto-measure observer alive for round lifetime so post-game UI changes (replay button, score panel) re-flow the iframe; cleaned up on dispose ([3189bfd](https://github.com/Caputchin/caputchin-sdk/commit/3189bfdd27e08f534757347de9da0574a106e460))
* **widget:** lock simple label width across state changes; passive triggers render shield instead of checkbox ([9688cda](https://github.com/Caputchin/caputchin-sdk/commit/9688cda95f6522ce72826273b105ee5ec70443ef))
* **widget:** modal/fullscreen dialog dismissal mid-verify reverts shield to clickable idle (covers Esc/backdrop/button paths) ([0e28160](https://github.com/Caputchin/caputchin-sdk/commit/0e28160c6bcd2e2ec104205ffa1f815719c95293))
* **widget:** move checkbox sizing to shadow stylesheet so compact CSS override applies ([3ed9e87](https://github.com/Caputchin/caputchin-sdk/commit/3ed9e8730ba0da3ae48816e86d07752b8fff861f))
* **widget:** move compact separator to wordmark::after so it's not part of the tag link ([14ba890](https://github.com/Caputchin/caputchin-sdk/commit/14ba8902f9ed7e6ce7da42d4587c03ad2c758e01))
* **widget:** only the checkbox itself is clickable, not the whole simple panel ([2005b2f](https://github.com/Caputchin/caputchin-sdk/commit/2005b2f0eedfdb4fbc214d8ea6c8130a7287ad99))
* **widget:** override-first default-selection — customer marked default wins its group over bundled ([f571f2e](https://github.com/Caputchin/caputchin-sdk/commit/f571f2e9162db28449be311be8cc4e0e377c217a))
* **widget:** pass-event score/durationMs read from request payload (server doesn't echo them) ([818f236](https://github.com/Caputchin/caputchin-sdk/commit/818f236f3e71b716ea02476f9c37f139a1d28520))
* **widget:** postMessage targetOrigin must be "*" — "null" is silently dropped, broke iframe kickoff ([451d190](https://github.com/Caputchin/caputchin-sdk/commit/451d190527b306d3d007278e688707ca916ea7b9))
* **widget:** redeem reads platform.wrappedToken, not cap's top-level token ([ca3c438](https://github.com/Caputchin/caputchin-sdk/commit/ca3c43887f557d02ce5cf7a72f554e4bfcbccd96))
* **widget:** revert iframe auto-measure to documentElement.scrollWidth/Height (body measurement death-spirals as iframe shrinks); doc the grow-only limitation ([97d9491](https://github.com/Caputchin/caputchin-sdk/commit/97d94915becf3623facd0ae64b69e0dddaf3e5b8))
* **widget:** shrink compact size further (checkbox 0.85rem, logo 14px, tighter padding) ([0625f90](https://github.com/Caputchin/caputchin-sdk/commit/0625f90aab9bc097ca580bb7294671bca14ee73f))
* **widget:** tighter logo/text gap + center wordmark and tag in col 2 ([911950d](https://github.com/Caputchin/caputchin-sdk/commit/911950d347cd05cf777846e8bc4cf37ed5453ffb))
* **widget:** tighter padding on compact (0.15rem 0.35rem) for a flatter strip ([60e1659](https://github.com/Caputchin/caputchin-sdk/commit/60e165987b394d8551db5235f945844222c193b7))
* **widget:** tighter padding on normal simple panel (0.5rem 0.75rem) ([e2da56e](https://github.com/Caputchin/caputchin-sdk/commit/e2da56e6fb561025d2822d1e1f053d34c23c7f8c))
* **widget:** width="full" expands the inline host element, not just the inner panel ([739338d](https://github.com/Caputchin/caputchin-sdk/commit/739338df2d4b88e07d99487357f8734984df2080))


### Performance Improvements

* **widget:** reuse mount-time bootstrap bundle for game load, dropping the second resolve call ([565d1e0](https://github.com/Caputchin/caputchin-sdk/commit/565d1e0a3493220928813ead1b0c12c50c545abc))


### Reverts

* release-please PR [#10](https://github.com/Caputchin/caputchin-sdk/issues/10) due to broken title pattern config ([52b9413](https://github.com/Caputchin/caputchin-sdk/commit/52b9413168769ade1b94f31ad091403e81481317))

## 2.0.0 (2026-05-20)


### ⚠ BREAKING CHANGES

* **widget:** depends on `@caputchin/game-sdk` 2.x. Iframe runtime now reads `Caputchin.manifests[id]` instead of `Caputchin.gameOpts[id]`, and `kickoff` postMessages carry a `lang` field.
* **widget:** `ManifestMessage` (iframe → widget postMessage) gains a `languages: { presets } | null` field; existing `preferredLayout` / `preferredWidth` / `preferredHeight` now sourced from the game's manifest top-level instead of `RegisterOptions`.


### Features

* **widget:** add `lang` attribute on `<caputchin-game>` accepting preset name, ISO 639 code, `auto`, or inline JSON; resolution runs after manifest postMessage and fires `invalid-config` for unknowns.
* **widget:** ship internal `caputchin.json` with en + ar chrome presets; widget chrome resolves browser-auto and applies `dir="rtl"` for RTL languages.

## 1.0.0 (2026-05-13)


### ⚠ BREAKING CHANGES

* **sdk:** rename bridge.complete to bridge.pass for success-only semantics

### Features

* **ci:** add CI workflow with codecov coverage upload ([727ad0d](https://github.com/Caputchin/caputchin-sdk/commit/727ad0dd8c7f1d98d4945269a906636b2c76da52))
* **frontend:** scaffold @caputchin/widget and @caputchin/game-sdk skeleton packages ([ef9d444](https://github.com/Caputchin/caputchin-sdk/commit/ef9d44434bd76a4168df6cb4f9ac99b8666bc579))
* **widget:** add game-only mode (skips Cap, hosts game iframe only) ([57abb99](https://github.com/Caputchin/caputchin-sdk/commit/57abb992c7f0b6f8005dda81b01408dd93ddf253))
* **widget:** expose author bridge.error code via error.detail.originalCode ([f42bf0c](https://github.com/Caputchin/caputchin-sdk/commit/f42bf0cf13d3f503824aae82984641356768ec92))
* **widget:** implement Cap client, element, modes — full verification pipeline ([d225646](https://github.com/Caputchin/caputchin-sdk/commit/d2256461a05eda2755003a2ac40e0aef8120b9ed))
* **widget:** implement iframe layer — srcdoc builder, runtime bootstrap, IframeHost ([502f8ec](https://github.com/Caputchin/caputchin-sdk/commit/502f8ecc4fea2c64dffd32f00d285599b727a0b8))
* **widget:** implement pure modules — config, errors, types, pool, token, resolver, protocol ([2abe118](https://github.com/Caputchin/caputchin-sdk/commit/2abe118f9c4b3128df40927365dac0c75f17f739))
* **widget:** scaffold package — Cap dep, vitest, two-pass tsup build, env vars ([aee9f49](https://github.com/Caputchin/caputchin-sdk/commit/aee9f49b74a2727c3493b258bf60814c126ba712))


### Bug Fixes

* **ci:** align coverage thresholds; add permissions+concurrency to ci.yml; fix codecov target ([f648c2c](https://github.com/Caputchin/caputchin-sdk/commit/f648c2ccf9bc4ce8555cdfc82265ba8c3c401f5e))
* **widget:** address M1-M6 phase-1 minor findings ([86077fb](https://github.com/Caputchin/caputchin-sdk/commit/86077fb557a0ca0bcf6155dbb711f87a3a14758f))
* **widget:** address QA cycle-1 findings F1-F9 ([9f08de8](https://github.com/Caputchin/caputchin-sdk/commit/9f08de8d8b26c57952cfb7468ea09a79bbf9da5b))
* **widget:** align game-sdk bridge contract — shared types, error/complete shape, code forwarding ([eb532d8](https://github.com/Caputchin/caputchin-sdk/commit/eb532d8707cb5067bf75de678be138ca883cb09a))
* **widget:** raise branches threshold to 80 (M7 monotonic floor) ([6d585ad](https://github.com/Caputchin/caputchin-sdk/commit/6d585add7dec86686e57c794f30b157e05450b46))
* **widget:** rename ESM to .mjs and IIFE to widget.js for CDN script-tag compatibility ([1240c7d](https://github.com/Caputchin/caputchin-sdk/commit/1240c7d4cd913e727db7b3f61cec283ef25a9c52))
* **widget:** resolve @caputchin/game-sdk via tsconfig paths so typecheck works without dist ([7066206](https://github.com/Caputchin/caputchin-sdk/commit/7066206123c183db107728b893881f5bdcd90282))


### Code Refactoring

* **sdk:** rename bridge.complete to bridge.pass for success-only semantics ([fc384c5](https://github.com/Caputchin/caputchin-sdk/commit/fc384c586203d7dc47f34e3417ef814c601662ce))
