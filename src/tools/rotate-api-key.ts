// rotate_api_key — Rotate the user's Fathom API key via the fathom.fyi API.
// Available to paid tiers (starter+). Calls /api/rotate-key with the current key.

interface RotateKeySuccess {
  success: true;
  new_key: string;
  old_key_deactivated: boolean;
  message: string;
  agent_guidance: string;
}

interface RotateKeyError {
  error: true;
  error_source: string;
  message: string;
  agent_guidance: string;
}

export async function rotateApiKey(): Promise<RotateKeySuccess | RotateKeyError> {
  const currentKey = process.env.FATHOM_API_KEY;

  if (!currentKey) {
    return {
      error: true,
      error_source: 'rotate_api_key',
      message: 'No FATHOM_API_KEY found in environment.',
      agent_guidance: 'The user has no API key configured. They must set FATHOM_API_KEY in their .env file or MCP config first. Key rotation is only available to paid tiers (Starter+).',
    };
  }

  try {
    const res = await fetch('https://fathom.fyi/api/rotate-key', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (res.status === 401) {
      return {
        error: true,
        error_source: 'rotate_api_key',
        message: 'Current API key is invalid or inactive.',
        agent_guidance: 'The user\'s current API key was rejected. They may need to check their subscription status at https://fathom.fyi or contact support.',
      };
    }

    if (res.status === 429) {
      return {
        error: true,
        error_source: 'rotate_api_key',
        message: 'Rate limit exceeded. Maximum 3 key rotations per day.',
        agent_guidance: 'The user has already rotated their key 3 times today. This limit resets in 24 hours. Advise them to try again tomorrow.',
      };
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as Record<string, unknown>;
      return {
        error: true,
        error_source: 'rotate_api_key',
        message: (body.error as string) ?? `API returned status ${res.status}`,
        agent_guidance: 'Key rotation failed. The user should try again later or check https://fathom.fyi/api/status for service health.',
      };
    }

    const data = await res.json() as { success: boolean; new_key: string; old_key_deactivated: boolean; message: string };

    return {
      success: true,
      new_key: data.new_key,
      old_key_deactivated: data.old_key_deactivated,
      message: data.message,
      agent_guidance: `Key rotated successfully. IMPORTANT: The user must update their MCP config (Claude Desktop, Cursor, etc.) with the new key: ${data.new_key} — the old key is now deactivated. The current session will continue working but the next restart will need the new key. Instruct the user to update their .env or MCP config file immediately.`,
    };
  } catch (err) {
    return {
      error: true,
      error_source: 'rotate_api_key',
      message: 'Failed to reach fathom.fyi API.',
      agent_guidance: 'Network error during key rotation. The user should check their internet connection and try again. Their current key is still active.',
    };
  }
}
