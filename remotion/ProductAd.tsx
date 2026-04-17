import React from "react";
import { AbsoluteFill } from "remotion";

/* ── Dark Glass Card ── */
const DarkGlassCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      background: "linear-gradient(160deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.04) 100%)",
      backdropFilter: "blur(50px)",
      WebkitBackdropFilter: "blur(50px)",
      borderRadius: 36,
      border: "1.5px solid rgba(255,255,255,0.1)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)",
      padding: "72px 56px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 36,
      maxWidth: 880,
      width: "100%",
    }}
  >
    {children}
  </div>
);

export const ProductAdSlide: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: `
          radial-gradient(ellipse at 15% 20%, rgba(37,211,102,0.15) 0%, transparent 50%),
          radial-gradient(ellipse at 85% 15%, rgba(180,130,220,0.18) 0%, transparent 45%),
          radial-gradient(ellipse at 70% 80%, rgba(160,100,200,0.14) 0%, transparent 50%),
          radial-gradient(ellipse at 25% 75%, rgba(37,211,102,0.08) 0%, transparent 45%),
          radial-gradient(ellipse at 50% 45%, rgba(200,160,230,0.10) 0%, transparent 55%),
          linear-gradient(160deg, #1a1a2e 0%, #16132b 40%, #1a1025 70%, #141414 100%)
        `,
        justifyContent: "center",
        alignItems: "center",
        padding: 60,
      }}
    >
      <DarkGlassCard>
        {/* Romy.ai large */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "rgba(255,255,255,0.9)",
            letterSpacing: "-0.03em",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          Romy<span style={{ color: "rgba(255,255,255,0.35)" }}>.ai</span>
        </div>

        {/* Main headline */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.2,
            letterSpacing: "-0.03em",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          Produktfotos.
          <br />
          Per <span style={{ color: "#25D366" }}>WhatsApp</span>.
          <br />
          In Sekunden.
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 26,
            color: "rgba(255,255,255,0.4)",
            textAlign: "center",
            lineHeight: 1.6,
            fontWeight: 400,
            fontFamily: "system-ui, -apple-system, sans-serif",
            maxWidth: 650,
          }}
        >
          Professionelle Produktfotos. Ohne Fotograf, ohne Studio.
        </div>
      </DarkGlassCard>
    </AbsoluteFill>
  );
};
