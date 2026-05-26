import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";

const SLIDE_DURATION = 150; // 5s per slide
const FADE = 24;            // 0.8s crossfade
const TOTAL = SLIDE_DURATION * 2; // 300 frames = 10s

const BG = `
  radial-gradient(ellipse at 15% 20%, rgba(37,211,102,0.18) 0%, transparent 50%),
  radial-gradient(ellipse at 85% 15%, rgba(180,130,220,0.20) 0%, transparent 45%),
  radial-gradient(ellipse at 70% 80%, rgba(160,100,200,0.16) 0%, transparent 50%),
  radial-gradient(ellipse at 25% 75%, rgba(37,211,102,0.09) 0%, transparent 45%),
  linear-gradient(160deg, #1a1a2e 0%, #16132b 40%, #1a1025 70%, #141414 100%)
`;

function useFadeIn(frame: number, delay: number, fps: number) {
  const s = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: { damping: 22, stiffness: 80, mass: 0.8 },
  });
  return {
    opacity: interpolate(s, [0, 1], [0, 1]),
    y: interpolate(s, [0, 1], [32, 0]),
  };
}

interface SlideProps {
  localFrame: number;
  fps: number;
  line1: string;
  accentWord: string;
  line3: string;
  subtitle: string;
}

const Slide: React.FC<SlideProps> = ({
  localFrame,
  fps,
  line1,
  accentWord,
  line3,
  subtitle,
}) => {
  const cardS = spring({
    frame: Math.max(0, localFrame),
    fps,
    config: { damping: 22, stiffness: 80, mass: 0.8 },
  });
  const cardScale = interpolate(cardS, [0, 1], [0.93, 1]);
  const cardOpacity = interpolate(cardS, [0, 1], [0, 1]);

  const name = useFadeIn(localFrame, 6, fps);
  const h1 = useFadeIn(localFrame, 16, fps);
  const h2 = useFadeIn(localFrame, 24, fps);
  const h3 = useFadeIn(localFrame, 32, fps);
  const sub = useFadeIn(localFrame, 50, fps);

  return (
    <div
      style={{
        transform: `scale(${cardScale})`,
        opacity: cardOpacity,
        background:
          "linear-gradient(160deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 100%)",
        backdropFilter: "blur(60px)",
        WebkitBackdropFilter: "blur(60px)",
        borderRadius: 40,
        border: "1.5px solid rgba(255,255,255,0.1)",
        boxShadow:
          "0 12px 48px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.09)",
        padding: "76px 64px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 40,
        maxWidth: 900,
        width: "100%",
      }}
    >
      {/* Luna.ai */}
      <div
        style={{
          fontSize: 68,
          fontWeight: 700,
          color: "rgba(255,255,255,0.92)",
          letterSpacing: "-0.03em",
          fontFamily: "system-ui, -apple-system, sans-serif",
          transform: `translateY(${name.y}px)`,
          opacity: name.opacity,
        }}
      >
        Luna
        <span style={{ color: "rgba(255,255,255,0.32)" }}>.ai</span>
      </div>

      {/* 3-line headline */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
        }}
      >
        {[
          { text: <>{line1}</>, anim: h1 },
          {
            text: (
              <>
                Per <span style={{ color: "#25D366" }}>{accentWord}</span>.
              </>
            ),
            anim: h2,
          },
          { text: <>{line3}</>, anim: h3 },
        ].map(({ text, anim }, i) => (
          <div
            key={i}
            style={{
              fontSize: 66,
              fontWeight: 700,
              color: "#ffffff",
              textAlign: "center",
              lineHeight: 1.22,
              letterSpacing: "-0.03em",
              fontFamily: "system-ui, -apple-system, sans-serif",
              transform: `translateY(${anim.y}px)`,
              opacity: anim.opacity,
            }}
          >
            {text}
          </div>
        ))}
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: 27,
          color: "rgba(255,255,255,0.38)",
          textAlign: "center",
          lineHeight: 1.65,
          fontWeight: 400,
          fontFamily: "system-ui, -apple-system, sans-serif",
          maxWidth: 680,
          transform: `translateY(${sub.y}px)`,
          opacity: sub.opacity,
        }}
      >
        {subtitle}
      </div>
    </div>
  );
};

/* ─── Animated background orb that drifts slowly ─── */
const Orb: React.FC<{ frame: number; x: string; y: string; color: string; delay: number }> = ({
  frame,
  x,
  y,
  color,
  delay,
}) => {
  const t = (frame + delay) * 0.004;
  const dx = Math.sin(t) * 3;
  const dy = Math.cos(t * 1.3) * 3;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 480,
        height: 480,
        borderRadius: "50%",
        background: color,
        filter: "blur(90px)",
        transform: `translate(${dx}%, ${dy}%)`,
        pointerEvents: "none",
        opacity: 0.55,
      }}
    />
  );
};

export const LunaProductAdVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slide1Opacity = interpolate(
    frame,
    [SLIDE_DURATION - FADE, SLIDE_DURATION],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const slide2Opacity = interpolate(
    frame,
    [SLIDE_DURATION - FADE, SLIDE_DURATION],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const slide2Local = Math.max(0, frame - (SLIDE_DURATION - FADE));

  return (
    <AbsoluteFill style={{ background: "#141414", overflow: "hidden" }}>
      {/* Layered background */}
      <AbsoluteFill style={{ background: BG }} />

      {/* Drifting orbs */}
      <Orb frame={frame} x="5%" y="10%" color="rgba(37,211,102,0.22)" delay={0} />
      <Orb frame={frame} x="70%" y="5%" color="rgba(180,130,220,0.22)" delay={60} />
      <Orb frame={frame} x="55%" y="65%" color="rgba(150,90,200,0.18)" delay={120} />

      {/* Slide 1 — Produktfotos */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: 64,
          opacity: slide1Opacity,
        }}
      >
        <Slide
          localFrame={frame}
          fps={fps}
          line1="Produktfotos."
          accentWord="Chat"
          line3="In Sekunden."
          subtitle="Professionelle Produktfotos. Ohne Fotograf, ohne Studio."
        />
      </AbsoluteFill>

      {/* Slide 2 — Website per WhatsApp */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: 64,
          opacity: slide2Opacity,
        }}
      >
        <Slide
          localFrame={slide2Local}
          fps={fps}
          line1="Deine Website."
          accentWord="WhatsApp"
          line3="Immer aktuell."
          subtitle="Schreib Luna eine Nachricht – sie erstellt deine Website, fügt Inhalte hinzu und hält alles automatisch auf dem neuesten Stand."
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ─── Legacy still (ProductAd) – now with Luna branding ─── */
export const ProductAdSlide: React.FC = () => (
  <AbsoluteFill
    style={{
      background: BG,
      justifyContent: "center",
      alignItems: "center",
      padding: 60,
    }}
  >
    <div
      style={{
        background:
          "linear-gradient(160deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.04) 100%)",
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
      <div
        style={{
          fontSize: 72,
          fontWeight: 700,
          color: "rgba(255,255,255,0.9)",
          letterSpacing: "-0.03em",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        Luna<span style={{ color: "rgba(255,255,255,0.35)" }}>.ai</span>
      </div>
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
        Per <span style={{ color: "#25D366" }}>Chat</span>.
        <br />
        In Sekunden.
      </div>
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
    </div>
  </AbsoluteFill>
);
