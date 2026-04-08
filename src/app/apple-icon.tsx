import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#c8a96e",
          borderRadius: "20px",
        }}
      >
        <span
          style={{
            fontSize: 90,
            fontFamily: "Georgia, serif",
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-2px",
          }}
        >
          FR
        </span>
      </div>
    ),
    {
      ...size,
    }
  );
}
