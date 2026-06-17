/**
 * Reinigungs-Portal: Login per Benutzername + Passwort.
 *
 * Supabase Auth verlangt intern eine E-Mail-Adresse. Reinigungskräfte
 * haben aber nur einen Benutzernamen. Wir leiten daraus deterministisch
 * eine synthetische Adresse ab, die NIE eine echte Mail erhält
 * (Konto wird mit email_confirm:true angelegt).
 *
 * Da die Ableitung deterministisch ist, kann die Login-Seite die Adresse
 * direkt aus dem eingegebenen Benutzernamen bilden — ohne DB-Lookup.
 */

export const CLEANING_EMAIL_DOMAIN = "cleaning.ferienhaus-rita.at";

/** Normalisiert einen Benutzernamen auf die kanonische Login-Form. */
export function normalizeCleaningUsername(username: string): string {
  return username.trim().toLowerCase();
}

/** Benutzername → synthetische (interne) E-Mail-Adresse. */
export function cleaningUsernameToEmail(username: string): string {
  return `${normalizeCleaningUsername(username)}@${CLEANING_EMAIL_DOMAIN}`;
}

/**
 * Erlaubte Benutzernamen: 3–40 Zeichen, Kleinbuchstaben/Ziffern und . _ -
 * (keine Leerzeichen, damit die synthetische E-Mail gültig bleibt).
 */
export function isValidCleaningUsername(username: string): boolean {
  return /^[a-z0-9._-]{3,40}$/.test(normalizeCleaningUsername(username));
}
