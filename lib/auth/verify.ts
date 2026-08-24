import { jwtVerify, createRemoteJWKSet, type JWTPayload } from 'jose';

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!_jwks) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not configured');
    }
    // Supabase exposes its JWKS here (requires the anon key on the request).
    _jwks = createRemoteJWKSet(new URL(`${url}/auth/v1/.well-known/jwks.json`), {
      headers: { apikey: anonKey },
    });
  }
  return _jwks;
}

export interface VerifiedToken {
  sub?: string;
  exp?: number;
}

/**
 * Verify a Supabase Auth access token (the `auth-token` cookie).
 *
 * Supabase signs its JWTs with ES256 (asymmetric, rotating keys), so they
 * cannot be verified with a static symmetric secret. We verify against the
 * project's published JWKS endpoint instead. Works in both Node (server
 * actions) and the Edge runtime (middleware).
 *
 * Returns the token's subject (user id) and expiry, or null if the token is
 * missing, malformed, expired, or invalid.
 */
export async function verifySupabaseToken(token: string): Promise<VerifiedToken | null> {
  try {
    const { payload } = await jwtVerify(token, getJwks());
    return {
      sub: payload.sub,
      exp: typeof payload.exp === 'number' ? payload.exp : undefined,
    };
  } catch (error) {
    console.error('token verification failed:', error);
    return null;
  }
}
