export interface WrappedToken {
  token: string;
  score: number | null;
  durationMs: number | null;
}

export function assembleWrappedToken(platformField: {
  token: string;
  score?: number | null;
  durationMs?: number | null;
}): WrappedToken {
  return {
    token: platformField.token,
    score: platformField.score ?? null,
    durationMs: platformField.durationMs ?? null,
  };
}
