interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes': string[];
}

/**
 * Verify a Turnstile token with Cloudflare's siteverify API.
 * Returns true if the token is valid, false otherwise.
 */
export async function verifyTurnstileToken(
  token: string,
  secretKey: string,
  ip?: string
): Promise<boolean> {
  const formData = new URLSearchParams();
  formData.append('secret', secretKey);
  formData.append('response', token);
  if (ip) {
    formData.append('remoteip', ip);
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });

  const result = await response.json() as TurnstileVerifyResponse;
  return result.success;
}
