import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";

/* ── Brand pill (Romy AI) ── */
const BrandPill: React.FC = () => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      background: "rgba(255,255,255,0.65)",
      border: "1px solid rgba(0,0,0,0.06)",
      padding: "10px 18px",
      borderRadius: 999,
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    }}
  >
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: "#1f8f4d",
        color: "white",
        fontWeight: 700,
        fontSize: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      R
    </div>
    <span
      style={{
        fontSize: 22,
        fontWeight: 600,
        color: "#1a1a1a",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      Romy <span style={{ color: "#1f8f4d" }}>AI</span>
    </span>
  </div>
);

/* ── Floating channel chip ── */
const Chip: React.FC<{
  label: string;
  color: string;
  left: number | string;
  top: number | string;
  rotate?: number;
  icon: React.ReactNode;
}> = ({ label, color, left, top, rotate = 0, icon }) => (
  <div
    style={{
      position: "absolute",
      left,
      top,
      transform: `rotate(${rotate}deg)`,
      display: "flex",
      alignItems: "center",
      gap: 10,
      background: "white",
      padding: "12px 20px",
      borderRadius: 14,
      boxShadow: "0 10px 24px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.05)",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontWeight: 700,
      fontSize: 22,
      color: "#1a1a1a",
    }}
  >
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
      }}
    >
      {icon}
    </div>
    {label}
  </div>
);

const IconInstagram = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="white" />
  </svg>
);
const IconChat = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.4 8.4 0 0 1-8.8 8.4 9.3 9.3 0 0 1-3.8-.8L3 21l1.8-5a8 8 0 0 1-.7-3.4A8.4 8.4 0 0 1 12.5 4 8.3 8.3 0 0 1 21 11.5Z" />
    <path d="M8.5 11h7" />
    <path d="M8.5 14h4.5" />
  </svg>
);
const IconTikTok = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
    <path d="M19.3 8.1c-1.3 0-2.5-.4-3.5-1.1v7.5c0 3.5-2.8 6.3-6.3 6.3s-6.3-2.8-6.3-6.3S6 8.2 9.5 8.2c.3 0 .6 0 .8.1v3.3c-.3-.1-.5-.1-.8-.1-1.7 0-3 1.3-3 3s1.3 3 3 3 3-1.3 3-3V2h3.2c.2 2 1.8 3.5 3.8 3.6v2.5z" />
  </svg>
);
const IconFacebook = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
    <path d="M22 12c0-5.5-4.5-10-10-10S2 6.5 2 12c0 5 3.7 9.1 8.4 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7c4.6-.8 8.4-4.9 8.4-9.9z" />
  </svg>
);

/* ═══ SLIDE 1 — "Romy für dein Business" (mint) ═══ */
export const RomyCarouselSlide1: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(160deg, #c5e8cf 0%, #d8ebd3 40%, #e8f0e0 100%)",
        padding: 60,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Brand pill top-left */}
      <div style={{ display: "flex", justifyContent: "flex-start" }}>
        <BrandPill />
      </div>

      {/* Title block */}
      <div
        style={{
          marginTop: 110,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 24,
        }}
      >
        <div style={{ fontSize: 104, fontWeight: 800, lineHeight: 1.02, color: "#1a1a1a" }}>
          <span style={{ fontStyle: "italic", color: "#1f8f4d", fontWeight: 800 }}>Romy</span>{" "}
          für
          <br />
          dein Business
        </div>
        <div style={{ fontSize: 34, color: "#4a4a4a", fontWeight: 500, marginTop: 8 }}>
          Deine KI Social-Media-Managerin
        </div>
      </div>

      {/* Romy cutout — anchored bottom-center */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: -20,
          transform: "translateX(-50%)",
          width: 560,
        }}
      >
        <Img src={staticFile("romy-cutout.png")} style={{ width: "100%", display: "block" }} />
      </div>

      {/* Floating chips */}
      <Chip label="Instagram" color="#E1306C" left={80} top={720} rotate={-4} icon={<IconInstagram />} />
      <Chip label="Chat" color="#25D366" left={720} top={640} rotate={3} icon={<IconChat />} />
      <Chip label="TikTok" color="#000" left={760} top={820} rotate={-2} icon={<IconTikTok />} />
      <Chip label="Facebook" color="#1877F2" left={60} top={920} rotate={2} icon={<IconFacebook />} />

      {/* Page indicator */}
      <div
        style={{
          position: "absolute",
          right: 40,
          bottom: 28,
          background: "rgba(0,0,0,0.85)",
          color: "white",
          padding: "6px 14px",
          borderRadius: 999,
          fontSize: 18,
          fontWeight: 600,
        }}
      >
        1 / 4
      </div>
    </AbsoluteFill>
  );
};

/* ── Realistic iPhone frame (proportions: 393:852 ≈ 1:2.17) ── */
const MiniPhone: React.FC = () => {
  const W = 300;
  const H = Math.round(W * 2.17); // 651
  return (
    <div
      style={{
        width: W,
        height: H,
        borderRadius: 44,
        background: "#1a1a1a",
        padding: 6,
        boxShadow: "0 30px 60px rgba(0,0,0,0.4), 0 8px 20px rgba(0,0,0,0.3)",
        position: "relative",
      }}
    >
      {/* Screen */}
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 38,
          background: "#ECE5DD",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "#075E54",
            padding: "32px 12px 8px",
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "#25D366",
              color: "white",
              fontWeight: 700,
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            R
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600 }}>Romy AI</div>
            <div style={{ fontSize: 9, opacity: 0.85 }}>online · tippt gerade…</div>
          </div>
        </div>

        {/* Chat */}
        <div style={{ padding: "14px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              alignSelf: "flex-end",
              background: "#DCF8C6",
              borderRadius: "10px 10px 2px 10px",
              padding: "8px 10px",
              fontSize: 11,
              color: "#1a1a1a",
              maxWidth: "80%",
            }}
          >
            Post für unseren neuen Sommer-Kaffee?
          </div>
          <div
            style={{
              alignSelf: "flex-start",
              background: "white",
              borderRadius: "10px 10px 10px 2px",
              padding: "8px 10px",
              fontSize: 11,
              color: "#1a1a1a",
              maxWidth: "85%",
              boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
            }}
          >
            Klar! Magst du Foto oder Reel?
          </div>
          <div
            style={{
              alignSelf: "flex-end",
              background: "#DCF8C6",
              borderRadius: "10px 10px 2px 10px",
              padding: "8px 10px",
              fontSize: 11,
              color: "#1a1a1a",
              maxWidth: "80%",
            }}
          >
            Reel bitte — für IG & TikTok
          </div>
          <div
            style={{
              alignSelf: "flex-start",
              background: "#1f8f4d",
              borderRadius: 12,
              padding: 20,
              width: "82%",
              height: 140,
              position: "relative",
              boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,0.9)",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              ▶ Reel · 00:09
            </div>
          </div>
          <div
            style={{
              alignSelf: "flex-start",
              background: "white",
              borderRadius: "10px 10px 10px 2px",
              padding: "8px 10px",
              fontSize: 11,
              color: "#1a1a1a",
              maxWidth: "85%",
              boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
            }}
          >
            Fertig! Auto-Post um 17:00 →
          </div>
        </div>
      </div>

      {/* Notch */}
      <div
        style={{
          position: "absolute",
          top: 14,
          left: "50%",
          transform: "translateX(-50%)",
          width: 90,
          height: 22,
          background: "#1a1a1a",
          borderRadius: 11,
        }}
      />
    </div>
  );
};

/* ═══ SLIDE 2 — "Social Media Posts. In Sekunden. Per Chat." (dark green) ═══ */
export const RomyCarouselSlide2: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg, #083b21 0%, #0f4a2a 50%, #0b3c22 100%)",
        padding: 60,
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "white",
        overflow: "hidden",
      }}
    >
      {/* Brand pill */}
      <div style={{ display: "flex", justifyContent: "flex-start" }}>
        <BrandPill />
      </div>

      {/* Live-badge */}
      <div
        style={{
          display: "inline-flex",
          alignSelf: "flex-start",
          alignItems: "center",
          gap: 10,
          marginTop: 56,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
          padding: "10px 18px",
          borderRadius: 999,
          fontSize: 20,
          fontWeight: 500,
          color: "#7de29b",
          width: "fit-content",
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: 5, background: "#7de29b" }} />
        So einfach wie eine Nachricht
      </div>

      {/* Headline */}
      <div
        style={{
          marginTop: 44,
          fontSize: 94,
          fontWeight: 800,
          lineHeight: 1.02,
          letterSpacing: "-0.02em",
          maxWidth: 680,
        }}
      >
        Social Media
        <br />
        Posts.
        <br />
        <span style={{ color: "#7de29b" }}>In Sekunden.</span>
        <br />
        Per Chat.
      </div>

      {/* Subtitle */}
      <div
        style={{
          marginTop: 32,
          fontSize: 28,
          color: "rgba(255,255,255,0.8)",
          fontWeight: 400,
          lineHeight: 1.4,
          maxWidth: 560,
        }}
      >
        Schreib Romy einfach, was du posten willst —
        <br />
        sie macht den Rest.
      </div>

      {/* iPhone — realistic proportions, anchored bottom-right */}
      <div style={{ position: "absolute", right: 40, bottom: 30 }}>
        <MiniPhone />
      </div>

      {/* Page indicator */}
      <div
        style={{
          position: "absolute",
          right: 40,
          top: 60,
          background: "rgba(0,0,0,0.4)",
          color: "white",
          padding: "6px 14px",
          borderRadius: 999,
          fontSize: 18,
          fontWeight: 600,
        }}
      >
        2 / 4
      </div>
    </AbsoluteFill>
  );
};
