// Code de verrouillage : seule une empreinte (PBKDF2-SHA-256, sel aléatoire) est stockée.
// Ce code protège l'accès à l'app sur le téléphone ; il ne chiffre pas les données.

const ITERATIONS = 150_000;

const toB64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(pin: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: ITERATIONS }, key, 256);
  return toB64(bits);
}

export async function hashPin(pin: string): Promise<{ pinHash: string; pinSalt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { pinHash: await derive(pin, salt), pinSalt: toB64(salt) };
}

export async function verifyPin(pin: string, pinHash: string, pinSalt: string): Promise<boolean> {
  const candidate = await derive(pin, fromB64(pinSalt));
  // Comparaison à temps constant.
  if (candidate.length !== pinHash.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) diff |= candidate.charCodeAt(i) ^ pinHash.charCodeAt(i);
  return diff === 0;
}

export const isValidPin = (pin: string) => /^\d{4,6}$/.test(pin);

/** Délai imposé après plusieurs erreurs (ms) : 0 jusqu'à 4 erreurs, puis 30 s, 1 min, 2 min… */
export const lockoutDelay = (failures: number) => (failures < 5 ? 0 : Math.min(30_000 * 2 ** (failures - 5), 15 * 60_000));
