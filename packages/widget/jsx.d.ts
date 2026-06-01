// Opt-in React JSX typings for the custom elements this package registers.
//
// The package augments React's JSX intrinsic elements so <caputchin-widget> and
// <caputchin-game> typecheck in TSX. It is a SEPARATE entry, not part of the
// main types, so non-React consumers (Vue, Svelte, vanilla) are never forced to
// take a React typing dependency.
//
// Usage in a React/TypeScript project, either:
//   - add "@caputchin/widget/jsx" to compilerOptions.types in tsconfig.json, or
//   - add `/// <reference types="@caputchin/widget/jsx" />` to a project .d.ts.
//
// Attributes mirror each element's observedAttributes. Both elements also accept
// the standard HTML/React props (className, style, ref, event handlers) via
// React.DetailedHTMLProps.

type CaputchinWidgetAttributes = React.HTMLAttributes<HTMLElement> & {
  /** Required public site key (cpt_pub_...). */
  sitekey: string;
  /** When the verification runs. "click" renders a badge that opens the
   *  challenge on click; "auto" runs on mount; "form-submit" runs on the host
   *  form's submit; "manual" runs only via the element's start() method. */
  trigger?: "auto" | "click" | "form-submit" | "manual";
  /** Mount no visible UI; verification still runs per trigger. */
  invisible?: boolean | string;
  width?: string;
  height?: string;
  size?: string;
  locale?: string;
  skin?: string;
};

type CaputchinGameAttributes = React.HTMLAttributes<HTMLElement> & {
  /** Public site key (cpt_pub_...). Omit for a keyless, game-only mount. */
  sitekey?: string;
  /** Marketplace game id, e.g. "owner/repo/leaf-memory". */
  game?: string;
  /** Comma-separated game ids; the server picks one per mount. */
  games?: string;
  /** Direct bundle URL for a self-hosted game. */
  "game-src"?: string;
  layout?: "inline" | "modal" | "fullscreen" | "auto";
  width?: string;
  height?: string;
  locale?: string;
  skin?: string;
  /** Escape hatch: render no iframe and project custom game DOM into the shell. */
  trigger?: "manual";
  /** Boolean attribute: skip the verification gate and run game-only. Presence
   *  is read via hasAttribute, so no-verify="" is enough. */
  "no-verify"?: boolean | string;
};

declare namespace React {
  namespace JSX {
    interface IntrinsicElements {
      "caputchin-widget": React.DetailedHTMLProps<
        CaputchinWidgetAttributes,
        HTMLElement
      >;
      "caputchin-game": React.DetailedHTMLProps<
        CaputchinGameAttributes,
        HTMLElement
      >;
    }
  }
}
