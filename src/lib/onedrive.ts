/**
 * Microsoft Graph / OneDrive – OAuth (Auth-Code-Flow mit Refresh-Token) und
 * Datei-Operationen für den automatischen Beleg-Import.
 *
 * Benötigte Env-Variablen:
 *   MS_GRAPH_CLIENT_ID       (Azure App – Anwendungs-/Client-ID)
 *   MS_GRAPH_CLIENT_SECRET   (Azure App – Geheimer Clientschlüssel)
 *   MS_GRAPH_REDIRECT_URI    (z. B. https://ferienhaus-rita-kals.at/api/admin/onedrive/callback)
 *   MS_GRAPH_AUTHORITY       (optional: "common" | "consumers" | "organizations"
 *                             oder eine Tenant-ID; Default "common")
 *
 * Refresh-Token + Ordnerpfad liegen in site_settings (Keys onedrive_token /
 * onedrive_folder) – kein zusätzliches Schema nötig.
 */

const SCOPE = "offline_access Files.Read";

function authority(): string {
  return process.env.MS_GRAPH_AUTHORITY || "common";
}
function tokenEndpoint(): string {
  return `https://login.microsoftonline.com/${authority()}/oauth2/v2.0/token`;
}
function authorizeEndpoint(): string {
  return `https://login.microsoftonline.com/${authority()}/oauth2/v2.0/authorize`;
}

export function isOneDriveConfigured(): boolean {
  return Boolean(
    process.env.MS_GRAPH_CLIENT_ID &&
      process.env.MS_GRAPH_CLIENT_SECRET &&
      process.env.MS_GRAPH_REDIRECT_URI
  );
}

/** URL, auf die der Admin zum Verbinden weitergeleitet wird. */
export function buildAuthorizeUrl(state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.MS_GRAPH_CLIENT_ID!,
    response_type: "code",
    redirect_uri: process.env.MS_GRAPH_REDIRECT_URI!,
    response_mode: "query",
    scope: SCOPE,
    state,
  });
  return `${authorizeEndpoint()}?${p.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

async function postToken(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(tokenEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MS_GRAPH_CLIENT_ID!,
      client_secret: process.env.MS_GRAPH_CLIENT_SECRET!,
      redirect_uri: process.env.MS_GRAPH_REDIRECT_URI!,
      scope: SCOPE,
      ...body,
    }).toString(),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Token-Endpoint ${res.status}: ${txt.slice(0, 300)}`);
  }
  return (await res.json()) as TokenResponse;
}

/** Auth-Code → Tokens (liefert refresh_token zum Speichern). */
export function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  return postToken({ grant_type: "authorization_code", code });
}

/** Refresh-Token → frischer Access-Token (und ggf. rotierter Refresh-Token). */
export function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  return postToken({ grant_type: "refresh_token", refresh_token: refreshToken });
}

export interface DriveFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
}

/** Listet Dateien (nur Dateien, keine Ordner) im konfigurierten Ordner. */
export async function listFolderFiles(
  accessToken: string,
  folderPath: string
): Promise<DriveFile[]> {
  const clean = (folderPath || "").replace(/^\/+|\/+$/g, "");
  const base = clean
    ? `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURI(clean)}:/children`
    : `https://graph.microsoft.com/v1.0/me/drive/root/children`;

  const files: DriveFile[] = [];
  let url: string | null = `${base}?$select=id,name,size,file&$top=200`;
  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Graph children ${res.status}: ${txt.slice(0, 300)}`);
    }
    const json: {
      value: Array<{ id: string; name: string; size?: number; file?: { mimeType?: string } }>;
      "@odata.nextLink"?: string;
    } = await res.json();
    for (const it of json.value) {
      if (!it.file) continue; // Ordner überspringen
      files.push({
        id: it.id,
        name: it.name,
        size: it.size ?? 0,
        mimeType: it.file.mimeType || "application/octet-stream",
      });
    }
    url = json["@odata.nextLink"] ?? null;
  }
  return files;
}

/** Lädt den Inhalt einer Datei als Buffer. */
export async function downloadFile(accessToken: string, itemId: string): Promise<Buffer> {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(itemId)}/content`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Graph content ${res.status}: ${txt.slice(0, 300)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/** Nur Belege importieren: PDF + gängige Bildformate. */
export function isImportableReceipt(f: DriveFile): boolean {
  const n = f.name.toLowerCase();
  return (
    f.mimeType === "application/pdf" ||
    f.mimeType.startsWith("image/") ||
    /\.(pdf|jpg|jpeg|png|webp|gif|heic)$/.test(n)
  );
}
