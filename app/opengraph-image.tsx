import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#052E16",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px 96px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 48 }}>
          <div
            style={{
              width: 52,
              height: 52,
              background: "rgba(16,185,129,0.15)",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
              <rect x="5" y="13" width="5" height="13" rx="2.5" fill="white" />
              <rect x="22" y="13" width="5" height="13" rx="2.5" fill="white" />
              <rect x="7.5" y="16" width="17" height="3.5" rx="1.75" fill="#10B981" />
              <circle cx="7.5" cy="10" r="4" fill="white" />
              <circle cx="24.5" cy="10" r="4" fill="white" />
            </svg>
          </div>
          <span style={{ fontSize: 28, fontWeight: 700, color: "white", letterSpacing: "-0.5px" }}>
            Korlo
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "white",
            lineHeight: 1.1,
            letterSpacing: "-2px",
            marginBottom: 28,
            maxWidth: 900,
          }}
        >
          Invoice government.{" "}
          <span style={{ color: "#10B981" }}>Get paid in 5 days.</span>
        </div>

        {/* Subtext */}
        <div
          style={{
            fontSize: 26,
            color: "rgba(255,255,255,0.65)",
            lineHeight: 1.5,
            maxWidth: 780,
            marginBottom: 52,
          }}
        >
          AU Peppol e-invoicing for Xero, MYOB, and QuickBooks. Send compliant
          invoices to government agencies in 90 seconds.
        </div>

        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(16,185,129,0.15)",
            border: "1px solid rgba(16,185,129,0.3)",
            borderRadius: 999,
            padding: "10px 22px",
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#10B981",
            }}
          />
          <span style={{ fontSize: 18, fontWeight: 600, color: "#10B981" }}>
            korlo.com.au
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
