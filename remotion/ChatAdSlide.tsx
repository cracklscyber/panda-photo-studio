import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,

  Sequence,
  staticFile,
  useCurrentFrame,

} from "remotion";
import { loadFont } from "@remotion/google-fonts/BricolageGrotesque";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "700", "800"],
  subsets: ["latin"],
});

// ─── Tokens ───────────────────────────────────────────────────────────────────
const GREEN       = "#25D97F";
const BUBBLE_USER = "rgba(32, 110, 72, 0.55)";  // transluzentes Glas-Grün
const BUBBLE_LUNA = "rgba(38, 50, 82, 0.58)";   // transluzentes Glas-Blau
const PAD_H       = 64;

const cl = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fadeUp(frame: number, a: number, b: number, dy = 48): React.CSSProperties {
  return {
    opacity:   interpolate(frame, [a, b], [0, 1], cl),
    transform: `translateY(${interpolate(frame, [a, b], [dy, 0], { ...cl, easing: Easing.out(Easing.cubic) })}px)`,
  };
}

function fadeIn(frame: number, a: number, b: number): React.CSSProperties {
  return { opacity: interpolate(frame, [a, b], [0, 1], cl) };
}

function bubbleIn(frame: number, startF: number): React.CSSProperties {
  const t = frame - startF;
  return {
    opacity: interpolate(t, [0, 50], [0, 1], { ...cl, easing: Easing.out(Easing.cubic) }),
  };
}

// ─── Background ───────────────────────────────────────────────────────────────
const Background: React.FC = () => (
  <AbsoluteFill style={{
    background: [
      "radial-gradient(ellipse at 82% 4%,  rgba(105,35,210,0.65) 0%, transparent 42%)",
      "radial-gradient(ellipse at 12% 92%, rgba(18,110,70,0.30)  0%, transparent 38%)",
      "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.02) 0%, transparent 55%)",
      "linear-gradient(160deg, #0c0f20 0%, #0f0d22 100%)",
    ].join(", "),
  }} />
);

// ─── Chat bubble tails (SVG) ──────────────────────────────────────────────────
const TailRight: React.FC<{ color: string }> = ({ color }) => (
  <svg width="11" height="16" viewBox="0 0 11 16"
    style={{ position: "absolute", bottom: 0, right: -10, display: "block" }}>
    <path d="M0,0 L0,16 L11,16 Z" fill={color} />
  </svg>
);

const TailLeft: React.FC<{ color: string }> = ({ color }) => (
  <svg width="11" height="16" viewBox="0 0 11 16"
    style={{ position: "absolute", bottom: 0, left: -10, display: "block" }}>
    <path d="M11,0 L11,16 L0,16 Z" fill={color} />
  </svg>
);

// ─── Single bubble ────────────────────────────────────────────────────────────
interface BubbleProps {
  side: "user" | "luna";
  text: string;
  time: string;
  ticks?: "single" | "double";
  style?: React.CSSProperties;
}

const Bubble: React.FC<BubbleProps> = ({ side, text, time, ticks, style }) => {
  const isUser = side === "user";
  const bg = isUser ? BUBBLE_USER : BUBBLE_LUNA;
  const AVATAR_D = 56;

  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      alignItems: "flex-end",
      gap: 10,
      paddingLeft:  isUser ? PAD_H * 0.5 : PAD_H * 0.9,
      paddingRight: isUser ? PAD_H * 2.0 : PAD_H * 0.5,
      ...style,
    }}>
      {/* Luna avatar — left side */}
      {!isUser && (
        <div style={{
          width: AVATAR_D, height: AVATAR_D, borderRadius: "50%",
          overflow: "hidden", flexShrink: 0, marginBottom: 2,
          border: "2.5px solid rgba(255,255,255,0.18)",
        }}>
          <Img
            src={staticFile("luna-avatar-business.png")}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 10%" }}
          />
        </div>
      )}

      {/* Bubble body */}
      <div style={{
        position: "relative",
        background: bg,
        backdropFilter: "blur(20px) saturate(1.5)",
        borderRadius: isUser ? "18px 18px 2px 18px" : "18px 18px 18px 2px",
        border: isUser
          ? "1px solid rgba(60,200,110,0.18)"
          : "1px solid rgba(80,110,180,0.18)",
        padding: "16px 20px 10px 20px",
        maxWidth: 660,
      }}>
        {/* Text */}
        <p style={{
          fontFamily, fontWeight: 700, fontSize: 31,
          color: "#fff", lineHeight: 1.45, margin: 0, marginBottom: 6,
        }}>
          {text}
        </p>

        {/* Timestamp + ticks */}
        <div style={{
          display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 5,
        }}>
          <span style={{ fontFamily, fontWeight: 400, fontSize: 20, color: "rgba(255,255,255,0.42)" }}>
            {time}
          </span>
          {ticks && (
            <span style={{ fontSize: 18, color: ticks === "double" ? GREEN : "rgba(255,255,255,0.42)", lineHeight: 1 }}>
              {ticks === "double" ? "✓✓" : "✓"}
            </span>
          )}
        </div>

        {/* Tail */}
        {isUser  ? <TailRight color={bg} /> : <TailLeft color={bg} />}
      </div>
    </div>
  );
};

// ─── Main composition ─────────────────────────────────────────────────────────
export const ChatAdSlide: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Background />

      {/* ── Headline ── */}
      <div style={{
        position: "absolute", top: 72, left: PAD_H, right: PAD_H,
      }}>
        <div style={{
          fontFamily, fontWeight: 800, fontSize: 82,
          color: "#fff", lineHeight: 1.05, letterSpacing: "-2px",
        }}>
          Website erstellen.
        </div>
        <div style={{
          fontFamily, fontWeight: 800, fontSize: 82,
          color: "#fff", lineHeight: 1.05, letterSpacing: "-2px",
        }}>
          Einfach per <span style={{ color: GREEN }}>WhatsApp.</span>
        </div>
        <p style={{
          fontFamily, fontWeight: 400, fontSize: 26,
          color: "rgba(255,255,255,0.55)", margin: "12px 0 0",
          letterSpacing: "0.01em",
        }}>
          Deine KI-Assistentin für lokale Unternehmen.
        </p>
      </div>

      {/* ── Chat bubbles ── */}
      <div style={{
        position: "absolute", top: 420, left: 0, right: 0,
        display: "flex", flexDirection: "column", gap: 28,
      }}>
        <Sequence from={28} layout="none">
          <Bubble
            side="user"
            text="Hey Luna 👋 Ich brauche eine Website für mein Yogastudio. Bilder schicke ich dir gleich."
            time="09:41"
            ticks="single"
            style={bubbleIn(frame, 28)}
          />
        </Sequence>

        <Sequence from={70} layout="none">
          <Bubble
            side="luna"
            text="Klar! Erzähl mir etwas über dein Studio. Hast du Design-Vorstellungen?"
            time="09:41"
            style={bubbleIn(frame, 70)}
          />
        </Sequence>

        <Sequence from={114} layout="none">
          <Bubble
            side="user"
            text="München, Vinyasa & Yin. Ruhig, viel Weißraum – Buchung direkt auf der Seite!"
            time="09:42"
            ticks="double"
            style={bubbleIn(frame, 114)}
          />
        </Sequence>
      </div>

      {/* ── Footer: Luna.ai ── */}
      <div style={{
        position: "absolute", bottom: 56, left: PAD_H,
        display: "flex", alignItems: "center", gap: 12,
        ...fadeIn(frame, 120, 138),
      }}>
        <div style={{
          width: 16, height: 16, borderRadius: "50%", background: GREEN,
          boxShadow: `0 0 10px ${GREEN}`,
        }} />
        <span style={{
          fontFamily, fontWeight: 800, fontSize: 52,
          letterSpacing: "-0.5px",
        }}>
          <span style={{ color: "#fff" }}>Luna</span>
          <span style={{ color: "rgba(255,255,255,0.45)" }}>.ai</span>
        </span>
      </div>
    </AbsoluteFill>
  );
};
