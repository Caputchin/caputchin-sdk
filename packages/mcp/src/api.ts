/**
 * Thin HTTP client for the Caputchin Management API.
 *
 * Auth: management token (cpt_pat_*) via the `CAPUTCHIN_TOKEN` env var.
 * Base URL: `CAPUTCHIN_API_URL` (default https://api.caputchin.com).
 *
 * Errors are surfaced verbatim so MCP tool callers see the raw API response
 * shape — easier to debug for AI agents than re-translated messages.
 */
export type ManagementApiConfig = {
  baseUrl: string;
  token: string;
};

export function readManagementConfig(env: NodeJS.ProcessEnv = process.env): ManagementApiConfig {
  const baseUrl = (env.CAPUTCHIN_API_URL ?? 'https://api.caputchin.com').replace(/\/+$/, '');
  const token = env.CAPUTCHIN_TOKEN;
  if (!token) {
    throw new Error('CAPUTCHIN_TOKEN env var is required (management token starting with `cpt_pat_`).');
  }
  return { baseUrl, token };
}

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: unknown };

export async function apiRequest<T>(
  cfg: ManagementApiConfig,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  const init: RequestInit = {
    method,
    headers: {
      authorization: `Bearer ${cfg.token}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${cfg.baseUrl}${path}`, init);
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // Keep raw text if not JSON
  }
  if (res.ok) {
    return { ok: true, status: res.status, data: parsed as T };
  }
  return { ok: false, status: res.status, error: parsed };
}
