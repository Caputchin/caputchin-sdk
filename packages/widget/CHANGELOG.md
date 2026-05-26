# Changelog

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
