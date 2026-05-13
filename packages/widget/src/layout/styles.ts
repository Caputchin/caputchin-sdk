export const LAYOUT_CSS = `
:host {
  display: block;
}

[part~="root"] {
  display: block;
  position: relative;
}

[part~="trigger"] {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid #d0d5dd;
  border-radius: 6px;
  background: #fff;
  color: #1a0a2e;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  min-height: 44px;
}
[part~="trigger"]:hover { border-color: #6a4c93; }
[part~="trigger"]:focus-visible { outline: 2px solid #6a4c93; outline-offset: 2px; }
[part~="trigger"][data-state="loading"],
[part~="trigger"][data-state="verifying"] { cursor: progress; }
[part~="trigger"][data-state="done"] { cursor: default; color: #117a3a; border-color: #117a3a; }
[part~="trigger"][data-state="error"] { color: #b00020; border-color: #b00020; }

[part~="checkbox"] {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 1.5px solid #98a2b3;
  border-radius: 3px;
  background: #fff;
  flex: none;
  position: relative;
}
[part~="trigger"][data-state="done"] [part~="checkbox"] {
  background: #117a3a;
  border-color: #117a3a;
}
[part~="trigger"][data-state="done"] [part~="checkbox"]::after {
  content: "";
  position: absolute;
  left: 5px;
  top: 1px;
  width: 6px;
  height: 12px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
[part~="trigger"][data-state="error"] [part~="checkbox"] {
  border-color: #b00020;
}
[part~="trigger"][data-state="error"] [part~="checkbox"]::before {
  content: "×";
  display: block;
  color: #b00020;
  font-size: 18px;
  line-height: 18px;
  text-align: center;
}

[part~="spinner"] {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid #d0d5dd;
  border-top-color: #6a4c93;
  border-radius: 50%;
  animation: cpt-spin 0.8s linear infinite;
}
[part~="spinner"][hidden] { display: none; }
@keyframes cpt-spin { to { transform: rotate(360deg); } }

[part~="dialog"] {
  border: 0;
  padding: 0;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
  max-width: 480px;
  width: calc(100vw - 32px);
  max-height: 90vh;
  overflow: hidden;
}
[part~="dialog"]::backdrop {
  background: rgba(0, 0, 0, 0.5);
}

[part~="dialog"] iframe {
  display: block;
  border: 0;
  width: 100%;
  background: transparent;
}

[part~="dialog"][data-layout="modal"] iframe {
  height: 480px;
  max-height: calc(90vh - 0px);
}

[part~="dialog"][data-layout="fullscreen"] {
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  max-width: none;
  max-height: none;
  border-radius: 0;
  padding: 0;
  margin: 0;
  inset: 0;
  background: #fff;
  position: fixed;
}
[part~="dialog"][data-layout="fullscreen"]::backdrop {
  background: transparent;
}
[part~="dialog"][data-layout="fullscreen"] iframe {
  height: 100dvh;
  padding-top: env(safe-area-inset-top, 0);
  padding-bottom: env(safe-area-inset-bottom, 0);
  box-sizing: border-box;
}

/* Inline layout — reset dialog chrome so it renders in flow as a plain block. */
[part~="dialog"][data-layout="inline"] {
  position: static;
  display: block;
  inset: auto;
  border: 0;
  padding: 0;
  margin: 0;
  background: transparent;
  max-width: none;
  max-height: none;
  width: 100%;
  height: auto;
  border-radius: 0;
  box-shadow: none;
  overflow: visible;
}
[part~="dialog"][data-layout="inline"]::backdrop {
  display: none;
}
[part~="dialog"][data-layout="inline"] iframe {
  min-height: 300px;
}

[part~="close"] {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 8px);
  right: calc(env(safe-area-inset-right, 0px) + 8px);
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 22px;
  border: 0;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  z-index: 1;
  padding: 0;
}
[part~="close"][hidden] { display: none; }
[part~="close"]:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}
`;
