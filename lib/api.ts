'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Shared API Utilities for SSE/HTTP Command Communication
// Used by both useTelemetry.ts (dashboard hook) and useTelemetryStore.ts (3D scene)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the base API URL for SSE stream and command endpoints.
 * In production (Cloud Run), the server is on the same host.
 * In development, the telemetry engine runs on a separate port (default 8080).
 */
export function getBaseUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:8080';
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocal) {
    const port = process.env.NEXT_PUBLIC_WS_PORT || '8080';
    return `${window.location.protocol}//${window.location.hostname}:${port}`;
  }
  return `${window.location.protocol}//${window.location.host}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Session ID: unique per browser tab so each device runs independently
// ─────────────────────────────────────────────────────────────────────────────

let _sessionId: string | null = null;

/**
 * Get or create a per-tab session ID. Persists across page reloads
 * within the same tab via sessionStorage, but each new tab gets its own ID.
 */
export function getSessionId(): string {
  if (_sessionId) return _sessionId;
  if (typeof window !== 'undefined') {
    let id = sessionStorage.getItem('sphere_session_id');
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem('sphere_session_id', id);
    }
    _sessionId = id;
    return id;
  }
  return 'server';
}

/**
 * Build the SSE dashboard stream URL with session ID.
 */
export function getStreamUrl(): string {
  return `${getBaseUrl()}/api/stream/dashboard?session=${getSessionId()}`;
}

/**
 * Build the HTTP POST command endpoint URL.
 */
export function getCommandUrl(): string {
  return `${getBaseUrl()}/api/command`;
}

/**
 * Send a command to the telemetry server via HTTP POST.
 * Automatically includes the session ID in the payload.
 */
export async function sendCommand(body: Record<string, unknown>): Promise<void> {
  try {
    await fetch(getCommandUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, sessionId: getSessionId() }),
    });
  } catch (err) {
    console.error('[S.P.H.E.R.E. API] Failed to send command:', err);
  }
}
