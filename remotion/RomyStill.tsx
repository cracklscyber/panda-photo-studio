import React from "react";
import { AbsoluteFill } from "remotion";

export const RomyStillSlide: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: `
          radial-gradient(ellipse at 30% 20%, rgba(37,211,102,0.12) 0%, transparent 50%),
          radial-gradient(ellipse at 70% 75%, rgba(37,211,102,0.08) 0%, transparent 50%),
          radial-gradient(ellipse at 60% 40%, rgba(220,200,190,0.2) 0%, transparent 50%),
          linear-gradient(180deg, #faf9f6 0%, #f5f0ec 50%, #faf9f6 100%)
        `,
        justifyContent: "center",
        alignItems: "center",
        padding: 60,
      }}
    >
      <div
        style={{
          background: "linear-gradient(160deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.35) 100%)",
          backdropFilter: "blur(50px)",
          WebkitBackdropFilter: "blur(50px)",
          borderRadius: 36,
          border: "1.5px solid rgba(255,255,255,0.5)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)",
          padding: "80px 64px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
          maxWidth: 880,
          width: "100%",
        }}
      >
        <div
          style={{
            fontSize: 160,
            fontWeight: 700,
            color: "#1a1a1a",
            letterSpacing: "-0.04em",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          Romy<span style={{ color: "#a3a3a3" }}>.ai</span>
        </div>
        <div
          style={{
            fontSize: 36,
            color: "#8a8a8a",
            letterSpacing: "0.05em",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          Website per WhatsApp
        </div>
      </div>
    </AbsoluteFill>
  );
};
