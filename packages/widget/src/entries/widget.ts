// MUST be the first import: it sets window.CAP_CUSTOM_WASM_URL (from
// document.currentScript.src) before the element/cap.js chain below loads
// @cap.js/widget, which eagerly loads its wasm at module-init. See
// cap/wasm-host-iife.ts.
import '../cap/wasm-host-iife.js';
import { defineCaputchinElements } from '../register.js';

// Single IIFE entry (builds to widget.js); registers both <caputchin-widget>
// and <caputchin-game>. Script-tag / jsDelivr consumers load this one file.
defineCaputchinElements();
