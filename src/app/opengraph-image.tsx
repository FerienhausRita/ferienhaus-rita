import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Ferienhaus Rita – Ferienwohnungen in Kals am Großglockner";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          backgroundColor: "#faf8f5",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "#1c1917",
              fontFamily: "serif",
              lineHeight: 1.1,
            }}
          >
            Ferienhaus Rita
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#c8a96e",
              fontWeight: 600,
              letterSpacing: "0.05em",
            }}
          >
            Kals am Großglockner · Osttirol
          </div>
        </div>

        <div
          style={{
            width: 120,
            height: 3,
            backgroundColor: "#c8a96e",
            marginTop: 32,
            marginBottom: 32,
            display: "flex",
          }}
        />

        <div
          style={{
            fontSize: 24,
            color: "#78716c",
            lineHeight: 1.5,
            maxWidth: 700,
          }}
        >
          Vier liebevoll eingerichtete Ferienwohnungen am Fuße des Großglockners
        </div>

        <div
          style={{
            fontSize: 16,
            color: "#a8a29e",
            marginTop: "auto",
            letterSpacing: "0.05em",
          }}
        >
          www.ferienhaus-rita-kals.at
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
