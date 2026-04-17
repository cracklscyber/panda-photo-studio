import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  Sequence,
  spring,
  useVideoConfig,
} from "remotion";

const useSpring = (startFrame: number, delay = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - startFrame - delay, fps, config: { damping: 14 } });
};

/* ── Warm background ── */
const WarmBg: React.FC<{ frame: number }> = ({ frame }) => {
  const shift = interpolate(frame, [0, 330], [0, 20]);
  return (
    <AbsoluteFill
      style={{
        background: `
          radial-gradient(ellipse at ${30 + shift * 0.3}% 20%, rgba(37,211,102,0.12) 0%, transparent 50%),
          radial-gradient(ellipse at ${70 - shift * 0.2}% 75%, rgba(37,211,102,0.08) 0%, transparent 50%),
          radial-gradient(ellipse at 60% 40%, rgba(220,200,190,0.2) 0%, transparent 50%),
          linear-gradient(180deg, #faf9f6 0%, #f5f0ec 50%, #faf9f6 100%)
        `,
      }}
    />
  );
};

/* ── Glass Card ── */
const GlassCard: React.FC<{ children: React.ReactNode; scale?: number }> = ({ children, scale = 1 }) => (
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
      gap: 40,
      maxWidth: 900,
      width: "100%",
      transform: `scale(${scale})`,
    }}
  >
    {children}
  </div>
);

/* ═══ Scene 1: Romy.ai + Website per WhatsApp (0–80) ═══ */
const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const logoScale = useSpring(0);
  const subOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: "clamp" });
  const subY = interpolate(frame, [30, 50], [20, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80 }}>
      <GlassCard scale={logoScale}>
        <div style={{
          fontSize: 140,
          fontWeight: 700,
          color: "#1a1a1a",
          letterSpacing: "-0.04em",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}>
          Romy<span style={{ color: "#a3a3a3" }}>.ai</span>
        </div>
        <div style={{
          opacity: subOpacity,
          transform: `translateY(${subY}px)`,
          fontSize: 38,
          color: "#8a8a8a",
          letterSpacing: "0.05em",
          fontFamily: "system-ui, sans-serif",
        }}>
          Website per WhatsApp
        </div>
      </GlassCard>
    </AbsoluteFill>
  );
};

/* ═══ Scene 2: Keine Agentur. Kein Baukasten. Nur WhatsApp. (80–160) ═══ */
const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const cardScale = useSpring(0);
  const line1 = interpolate(frame, [10, 25], [0, 1], { extrapolateRight: "clamp" });
  const line2 = interpolate(frame, [25, 40], [0, 1], { extrapolateRight: "clamp" });
  const line3 = interpolate(frame, [40, 55], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80 }}>
      <GlassCard scale={cardScale}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          fontFamily: "system-ui, sans-serif",
        }}>
          <div style={{
            fontSize: 64,
            fontWeight: 700,
            color: "#1a1a1a",
            opacity: line1,
            transform: `translateY(${(1 - line1) * 15}px)`,
          }}>
            Keine Agentur.
          </div>
          <div style={{
            fontSize: 64,
            fontWeight: 700,
            color: "#1a1a1a",
            opacity: line2,
            transform: `translateY(${(1 - line2) * 15}px)`,
          }}>
            Kein Baukasten.
          </div>
          <div style={{
            fontSize: 64,
            fontWeight: 700,
            color: "#25D366",
            opacity: line3,
            transform: `translateY(${(1 - line3) * 15}px)`,
          }}>
            Nur WhatsApp.
          </div>
        </div>
      </GlassCard>
    </AbsoluteFill>
  );
};

/* ═══ Scene 3: Chat Demo (160–230) ═══ */
const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const cardScale = useSpring(0);
  const msg1 = interpolate(frame, [15, 30], [0, 1], { extrapolateRight: "clamp" });
  const msg2 = interpolate(frame, [35, 50], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80 }}>
      <GlassCard scale={cardScale}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
          <div style={{
            opacity: msg1,
            alignSelf: "flex-end",
            background: "#DCF8C6",
            borderRadius: "20px 20px 4px 20px",
            padding: "20px 30px",
            maxWidth: "85%",
            fontSize: 30,
            color: "#1a1a1a",
            fontFamily: "system-ui, sans-serif",
          }}>
            Hi Romy, ich habe ein Café und brauche eine Website.
          </div>
          <div style={{
            opacity: msg2,
            alignSelf: "flex-start",
            background: "rgba(0,0,0,0.04)",
            borderRadius: "20px 20px 20px 4px",
            padding: "20px 30px",
            maxWidth: "85%",
            fontSize: 30,
            color: "#1a1a1a",
            fontFamily: "system-ui, sans-serif",
          }}>
            Super! Wie heißt dein Café und was macht es besonders?
          </div>
        </div>
      </GlassCard>
    </AbsoluteFill>
  );
};

/* ═══ Scene 4: Jederzeit updaten (230–290) ═══ */
const Scene4: React.FC = () => {
  const frame = useCurrentFrame();
  const cardScale = useSpring(0);
  const msgOp = interpolate(frame, [15, 30], [0, 1], { extrapolateRight: "clamp" });
  const liveOp = interpolate(frame, [35, 45], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80 }}>
      <GlassCard scale={cardScale}>
        <div style={{
          fontSize: 52,
          fontWeight: 700,
          color: "#1a1a1a",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
        }}>
          Jederzeit updaten.
        </div>
        <div style={{
          opacity: msgOp,
          alignSelf: "flex-end",
          background: "#DCF8C6",
          borderRadius: "20px 20px 4px 20px",
          padding: "20px 30px",
          fontSize: 28,
          color: "#1a1a1a",
          fontFamily: "system-ui, sans-serif",
        }}>
          Neue Öffnungszeiten: Mo–Fr 8–18 Uhr
        </div>
        <div style={{
          opacity: liveOp,
          display: "flex",
          alignItems: "center",
          gap: 14,
          background: "rgba(37,211,102,0.1)",
          borderRadius: 14,
          padding: "18px 30px",
        }}>
          <div style={{
            width: 14, height: 14, borderRadius: "50%", background: "#25D366",
          }} />
          <span style={{
            fontSize: 28, fontWeight: 600, color: "#25D366", fontFamily: "system-ui, sans-serif",
          }}>
            Sofort live auf deiner Website
          </span>
        </div>
      </GlassCard>
    </AbsoluteFill>
  );
};

/* ═══ Scene 5: CTA (290–330) ═══ */
const Scene5: React.FC = () => {
  const scale = useSpring(0);
  const frame = useCurrentFrame();
  const btnOp = interpolate(frame, [8, 16], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80 }}>
      <GlassCard scale={scale}>
        <div style={{
          fontSize: 100,
          fontWeight: 700,
          color: "#1a1a1a",
          letterSpacing: "-0.04em",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}>
          Romy<span style={{ color: "#a3a3a3" }}>.ai</span>
        </div>
        <div style={{
          opacity: btnOp,
          display: "flex",
          alignItems: "center",
          gap: 14,
          background: "#25D366",
          borderRadius: 16,
          padding: "24px 52px",
          boxShadow: "0 8px 24px rgba(37,211,102,0.25)",
        }}>
          <span style={{
            fontSize: 32, fontWeight: 600, color: "white", fontFamily: "system-ui, sans-serif",
          }}>
            Jetzt auf WhatsApp starten
          </span>
          <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </GlassCard>
    </AbsoluteFill>
  );
};

/* ═══ MAIN ═══ */
export const RomyAdVideo: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <WarmBg frame={frame} />
      <Sequence from={0} durationInFrames={80}><Scene1 /></Sequence>
      <Sequence from={80} durationInFrames={80}><Scene2 /></Sequence>
      <Sequence from={160} durationInFrames={70}><Scene3 /></Sequence>
      <Sequence from={230} durationInFrames={60}><Scene4 /></Sequence>
      <Sequence from={290} durationInFrames={40}><Scene5 /></Sequence>
    </AbsoluteFill>
  );
};
