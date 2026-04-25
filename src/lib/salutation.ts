/**
 * Baut eine passende E-Mail-Anrede.
 *
 * - Vorname vorhanden  → "Hallo {Vorname}"
 * - Nur Nachname       → "Liebe Familie {Nachname}"
 * - Nichts             → "Guten Tag"
 *
 * Die Funktion gibt nur den Textteil ohne Satzzeichen zurück;
 * das Komma am Zeilenende wird vom aufrufenden Template gesetzt.
 */
export function greeting(
  firstName?: string | null,
  lastName?: string | null
): string {
  const first = (firstName ?? "").trim();
  const last = (lastName ?? "").trim();
  if (first) return `Hallo ${first}`;
  if (last) return `Liebe Familie ${last}`;
  return "Guten Tag";
}
