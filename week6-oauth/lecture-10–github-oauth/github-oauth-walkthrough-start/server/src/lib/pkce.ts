import { createHash, randomBytes } from 'node:crypto'

// A random, unguessable string – used for both state and the PKCE code verifier.
export const randomString = () => randomBytes(32).toString('base64url')

// PKCE: the code challenge is the SHA-256 hash of the code verifier, base64url-encoded.
// GitHub gets the hash first, and the verifier itself only when we exchange the code.
export const toCodeChallenge = (codeVerifier: string) => createHash('sha256').update(codeVerifier).digest('base64url')
