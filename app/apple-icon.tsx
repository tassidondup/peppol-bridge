import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#052E16",
          borderRadius: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="110" height="110" viewBox="0 0 32 32" fill="none">
          <rect x="5" y="13" width="5" height="13" rx="2.5" fill="white" />
          <rect x="22" y="13" width="5" height="13" rx="2.5" fill="white" />
          <rect x="7.5" y="16" width="17" height="3.5" rx="1.75" fill="#10B981" />
          <circle cx="7.5" cy="10" r="4" fill="white" />
          <circle cx="24.5" cy="10" r="4" fill="white" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
