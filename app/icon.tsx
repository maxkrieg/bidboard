import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          background: "#4f46e5",
          color: "white",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
          letterSpacing: "-0.5px",
        }}
      >
        BB
      </div>
    ),
    { ...size }
  );
}
