import Anthropic from "@anthropic-ai/sdk";

/**
 * Beleg-OCR via Claude Vision.
 *
 * Schickt ein Bild (JPEG/PNG/WebP) oder PDF eines Belegs an Claude und bekommt
 * strukturierte Felder zurück. Verlässliches JSON wird über erzwungenes Tool-Use
 * (`tool_choice` auf das Extraktions-Tool) garantiert — die Tool-Eingabe folgt
 * exakt dem `input_schema`.
 *
 * Kosteneffizientes vision-fähiges Default-Modell: claude-haiku-4-5
 * (überschreibbar via OCR_MODEL, z. B. claude-opus-4-8 für schwierige Belege).
 */

export interface ReceiptExtraction {
  expense_date: string | null; // YYYY-MM-DD
  gross: number | null; // Bruttobetrag
  net: number | null; // Nettobetrag
  vat_rate: number | null; // USt-Satz in Prozent (z. B. 20, 10, 13)
  vat_amount: number | null; // USt-Betrag
  vendor: string | null; // Lieferant / Händler
  category: string | null; // grobe Kategorie (Reinigung, Material, …)
  currency: string | null; // ISO-Code, z. B. EUR
  confidence: number | null; // 0..1 Selbsteinschätzung
}

const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const KNOWN_CATEGORIES = [
  "Reinigung",
  "Wäsche",
  "Material",
  "Reparatur/Instandhaltung",
  "Energie",
  "Möblierung/Ausstattung",
  "Gebühren/Abgaben",
  "Versicherung",
  "Marketing/Provision",
  "Bürobedarf",
  "Sonstiges",
] as const;

const RECEIPT_TOOL: Anthropic.Tool = {
  name: "record_receipt",
  description:
    "Erfasst die strukturierten Felder eines Belegs/einer Rechnung. Immer aufrufen. " +
    "Beträge als reine Zahlen (Punkt als Dezimaltrenner, kein Währungssymbol). " +
    "Felder, die nicht eindeutig erkennbar sind, auf null setzen.",
  input_schema: {
    type: "object",
    properties: {
      expense_date: {
        type: ["string", "null"],
        description: "Belegdatum im Format YYYY-MM-DD. null wenn nicht lesbar.",
      },
      gross: { type: ["number", "null"], description: "Bruttobetrag (Gesamtsumme inkl. USt)." },
      net: { type: ["number", "null"], description: "Nettobetrag (ohne USt), falls ausgewiesen." },
      vat_rate: {
        type: ["number", "null"],
        description: "USt-Satz in Prozent (z. B. 20, 13, 10). Bei mehreren der höchste Hauptsatz.",
      },
      vat_amount: { type: ["number", "null"], description: "Ausgewiesener USt-Betrag." },
      vendor: { type: ["string", "null"], description: "Name des Lieferanten/Händlers." },
      category: {
        type: ["string", "null"],
        description: `Grobe Ausgabenkategorie. Bevorzugt eine aus: ${KNOWN_CATEGORIES.join(", ")}.`,
      },
      currency: { type: ["string", "null"], description: "Währung als ISO-Code, z. B. EUR." },
      confidence: {
        type: ["number", "null"],
        description: "Selbsteinschätzung der Lesbarkeit 0..1.",
      },
    },
    required: [
      "expense_date",
      "gross",
      "net",
      "vat_rate",
      "vat_amount",
      "vendor",
      "category",
      "currency",
      "confidence",
    ],
    additionalProperties: false,
  },
};

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

/** Leitet fehlende USt-Felder aus den vorhandenen ab (Brutto/Netto/Satz). */
function deriveVat(r: ReceiptExtraction): ReceiptExtraction {
  const out = { ...r };
  if (out.gross != null && out.net == null && out.vat_rate != null) {
    out.net = Math.round((out.gross / (1 + out.vat_rate / 100)) * 100) / 100;
  }
  if (out.gross != null && out.net != null && out.vat_amount == null) {
    out.vat_amount = Math.round((out.gross - out.net) * 100) / 100;
  }
  if (out.gross != null && out.net != null && out.vat_rate == null && out.net > 0) {
    out.vat_rate = Math.round((out.gross / out.net - 1) * 100);
  }
  return out;
}

export class OcrUnavailableError extends Error {}

/**
 * Extrahiert Belegfelder. Wirft `OcrUnavailableError`, wenn kein API-Key gesetzt
 * ist — der Aufrufer kann dann ohne Vorbefüllung fortfahren (manuelle Erfassung).
 */
export async function extractReceipt(
  buffer: Buffer,
  mime: string
): Promise<ReceiptExtraction> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new OcrUnavailableError("ANTHROPIC_API_KEY nicht gesetzt");
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.OCR_MODEL || "claude-haiku-4-5";
  const data = buffer.toString("base64");

  const lowerMime = (mime || "").toLowerCase();
  const isPdf = lowerMime.includes("pdf");
  const mediaType = SUPPORTED_IMAGE_TYPES.has(lowerMime) ? lowerMime : "image/jpeg";

  const docBlock: Anthropic.ContentBlockParam = isPdf
    ? {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data },
      }
    : {
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          data,
        },
      };

  const message = await client.messages.create({
    model,
    max_tokens: 1024,
    tools: [RECEIPT_TOOL],
    tool_choice: { type: "tool", name: "record_receipt" },
    messages: [
      {
        role: "user",
        content: [
          docBlock,
          {
            type: "text",
            text:
              "Das ist ein Beleg/eine Rechnung einer österreichischen Ferienvermietung. " +
              "Lies die Felder aus und rufe das Tool record_receipt auf. Achte besonders auf " +
              "Bruttobetrag, USt-Satz und -Betrag sowie das Belegdatum.",
          },
        ],
      },
    ],
  });

  const toolUse = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "record_receipt"
  );
  if (!toolUse) {
    throw new Error("OCR lieferte keine strukturierten Daten.");
  }

  const raw = toolUse.input as Record<string, unknown>;
  const parsed: ReceiptExtraction = {
    expense_date:
      typeof raw.expense_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.expense_date)
        ? raw.expense_date
        : null,
    gross: toNum(raw.gross),
    net: toNum(raw.net),
    vat_rate: toNum(raw.vat_rate),
    vat_amount: toNum(raw.vat_amount),
    vendor: typeof raw.vendor === "string" ? raw.vendor.slice(0, 200) : null,
    category: typeof raw.category === "string" ? raw.category.slice(0, 100) : null,
    currency: typeof raw.currency === "string" ? raw.currency.slice(0, 8).toUpperCase() : null,
    confidence: toNum(raw.confidence),
  };

  return deriveVat(parsed);
}
