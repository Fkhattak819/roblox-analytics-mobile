export type LoginProof = Readonly<{ verifier: string; challenge: string; state: string }>;

// Platform cryptography is injected so the same protocol can be tested without native modules.
export async function createLoginProof(
  randomBytes: () => Promise<Uint8Array>,
  sha256Base64: (value: string) => Promise<string>,
): Promise<LoginProof> {
  const hex = (bytes: Uint8Array) => {
    if (bytes.length !== 32) throw new Error('Secure random generation failed');
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  };
  const verifier = hex(await randomBytes());
  const state = hex(await randomBytes());
  const challenge = (await sha256Base64(verifier)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  if (!/^[A-Za-z0-9_-]{43}$/.test(challenge)) throw new Error('Secure hashing failed');
  return { verifier, challenge, state };
}
