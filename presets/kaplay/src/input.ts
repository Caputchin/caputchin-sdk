// Per-tick action input state, shared by live and headless. Each tick the driver
// calls `beginTick()` then `apply()` for every event landing on that tick BEFORE
// the sim reads it, so `justPressed`/`justReleased` are exact edges and `isDown`
// is the held set. Deterministic: identical applied-event sequences yield
// identical state, and both ends apply the SAME tick-stamped events.

export class InputState {
  private readonly down = new Set<string>();
  private pressed = new Set<string>();
  private released = new Set<string>();

  /** Clear this tick's edges. Call once at the start of every tick. */
  beginTick(): void {
    this.pressed = new Set();
    this.released = new Set();
  }

  /** Apply one press/release edge for `action`. */
  apply(action: string, press: boolean): void {
    if (press) {
      if (!this.down.has(action)) this.pressed.add(action);
      this.down.add(action);
    } else {
      if (this.down.has(action)) this.released.add(action);
      this.down.delete(action);
    }
  }

  isDown(action: string): boolean {
    return this.down.has(action);
  }
  justPressed(action: string): boolean {
    return this.pressed.has(action);
  }
  justReleased(action: string): boolean {
    return this.released.has(action);
  }
}
