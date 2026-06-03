import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Audio,
  staticFile,
} from "remotion";

const SLIDE_DURATION = 99; // ~3.3s per slide
const FADE = 5;            // 0.17s cut
const TOTAL = 406;         // matches audio (396 frames) + 10 frames

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
    config: { damping: 32, stiffness: 60, mass: 1 },
  });
  return {
    opacity: interpolate(s, [0, 1], [0, 1]),
    y: interpolate(s, [0, 1], [20, 0]),
  };
}

const CARD_STYLE: React.CSSProperties = {
  background: "linear-gradient(160deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 100%)",
  backdropFilter: "blur(60px)",
  WebkitBackdropFilter: "blur(60px)",
  borderRadius: 40,
  border: "1.5px solid rgba(255,255,255,0.1)",
  boxShadow: "0 12px 48px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.09)",
  padding: "76px 64px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 40,
  maxWidth: 900,
  width: "100%",
};

interface LineConfig {
  text: string;
  accent?: string;
  prefix?: string;
}

interface SlideProps {
  localFrame: number;
  fps: number;
  lines: LineConfig[];
}

const Slide: React.FC<SlideProps> = ({ localFrame, fps, lines }) => {
  const cardS = spring({
    frame: Math.max(0, localFrame),
    fps,
    config: { damping: 22, stiffness: 80, mass: 0.8 },
  });
  const cardScale = interpolate(cardS, [0, 1], [0.93, 1]);
  const cardOpacity = interpolate(cardS, [0, 1], [0, 1]);

  const name = useFadeIn(localFrame, 6, fps);
  const l1 = useFadeIn(localFrame, 16, fps);
  const l2 = useFadeIn(localFrame, 24, fps);
  const l3 = useFadeIn(localFrame, 32, fps);
  const lineAnims = [l1, l2, l3];

  const renderLine = (line: LineConfig) => (
    <>
      {line.prefix}
      {line.accent && <span style={{ color: "#25D366" }}>{line.accent}</span>}
      {line.text}
    </>
  );

  return (
    <div style={{ ...CARD_STYLE, transform: `scale(${cardScale})`, opacity: cardOpacity }}>
      <div
        style={{
          fontSize: 44,
          fontWeight: 700,
          color: "rgba(255,255,255,0.55)",
          letterSpacing: "-0.03em",
          fontFamily: "system-ui, -apple-system, sans-serif",
          transform: `translateY(${name.y}px)`,
          opacity: name.opacity,
        }}
      >
        Luna<span style={{ color: "rgba(255,255,255,0.22)" }}>.ai</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        {lines.map((line, i) => (
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
              transform: `translateY(${lineAnims[i].y}px)`,
              opacity: lineAnims[i].opacity,
            }}
          >
            {renderLine(line)}
          </div>
        ))}
      </div>
    </div>
  );
};

const WhatsAppIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path
      fill="#25D366"
      d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
    />
  </svg>
);

const OutroSlide: React.FC<{ localFrame: number; fps: number }> = ({ localFrame, fps }) => {
  const cardS = spring({
    frame: Math.max(0, localFrame),
    fps,
    config: { damping: 22, stiffness: 80, mass: 0.8 },
  });
  const cardScale = interpolate(cardS, [0, 1], [0.93, 1]);
  const cardOpacity = interpolate(cardS, [0, 1], [0, 1]);

  const name = useFadeIn(localFrame, 6, fps);
  const icon = useFadeIn(localFrame, 18, fps);
  const btn = useFadeIn(localFrame, 30, fps);

  return (
    <div style={{ ...CARD_STYLE, transform: `scale(${cardScale})`, opacity: cardOpacity, gap: 48 }}>
      <div
        style={{
          fontSize: 44,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          fontFamily: "system-ui, -apple-system, sans-serif",
          transform: `translateY(${name.y}px)`,
          opacity: name.opacity,
        }}
      >
        <span style={{ color: "#25D366" }}>Luna</span>
        <span style={{ color: "rgba(255,255,255,0.30)" }}>.ai</span>
      </div>

      <div style={{ transform: `translateY(${icon.y}px)`, opacity: icon.opacity }}>
        <WhatsAppIcon size={110} />
      </div>

      <div
        style={{
          transform: `translateY(${btn.y}px)`,
          opacity: btn.opacity,
          background: "#25D366",
          borderRadius: 100,
          padding: "28px 72px",
          fontSize: 52,
          fontWeight: 700,
          color: "#ffffff",
          letterSpacing: "-0.02em",
          fontFamily: "system-ui, -apple-system, sans-serif",
          whiteSpace: "nowrap",
        }}
      >
        Jetzt kostenlos testen
      </div>
    </div>
  );
};

const Orb: React.FC<{ frame: number; x: string; y: string; color: string; delay: number }> = ({
  frame, x, y, color, delay,
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

function slideOpacity(frame: number, start: number, end: number): number {
  const fadeIn = interpolate(frame, [start - FADE, start], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const fadeOut = end < Infinity
    ? interpolate(frame, [end - FADE, end], [1, 0], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
      })
    : 1;
  return Math.min(fadeIn, fadeOut);
}

export const LunaProductAdVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const SD = SLIDE_DURATION;

  const op1 = slideOpacity(frame, 0, SD);
  const op2 = slideOpacity(frame, SD - FADE, 2 * SD);
  const op3 = slideOpacity(frame, 2 * SD - FADE, 3 * SD);
  const op4 = slideOpacity(frame, 3 * SD - FADE, Infinity);

  const local2 = Math.max(0, frame - (SD - FADE));
  const local3 = Math.max(0, frame - (2 * SD - FADE));
  const local4 = Math.max(0, frame - (3 * SD - FADE));

  return (
    <AbsoluteFill style={{ background: "#141414", overflow: "hidden" }}>
      <AbsoluteFill style={{ background: BG }} />
      <Audio src={staticFile("luna-ad-voiceover.mp3")} />
      <Orb frame={frame} x="5%" y="10%" color="rgba(37,211,102,0.22)" delay={0} />
      <Orb frame={frame} x="70%" y="5%" color="rgba(180,130,220,0.22)" delay={60} />
      <Orb frame={frame} x="55%" y="65%" color="rgba(150,90,200,0.18)" delay={120} />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 64, opacity: op1 }}>
        <Slide
          localFrame={frame}
          fps={fps}
          lines={[
            { text: "Deine individuelle Website." },
            { prefix: "Per ", accent: "WhatsApp", text: "." },
          ]}
        />
      </AbsoluteFill>

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 64, opacity: op2 }}>
        <Slide
          localFrame={local2}
          fps={fps}
          lines={[
            { text: "Teile Fotos und Ideen" },
            { prefix: "im ", accent: "Chat", text: "." },
            { accent: "Luna", text: " macht den Rest." },
          ]}
        />
      </AbsoluteFill>

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 64, opacity: op3 }}>
        <Slide
          localFrame={local3}
          fps={fps}
          lines={[
            { text: "Kein Baukasten." },
            { text: "Kein Technikstress." },
            { prefix: "Starte mit ", accent: "Luna", text: "." },
          ]}
        />
      </AbsoluteFill>

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 64, opacity: op4 }}>
        <OutroSlide localFrame={local4} fps={fps} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ─── Legacy still ─── */
export const ProductAdSlide: React.FC = () => (
  <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center", padding: 60 }}>
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
      <div style={{ fontSize: 72, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: "-0.03em", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        Luna<span style={{ color: "rgba(255,255,255,0.35)" }}>.ai</span>
      </div>
      <div style={{ fontSize: 64, fontWeight: 700, color: "#ffffff", textAlign: "center", lineHeight: 1.2, letterSpacing: "-0.03em", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        Produktfotos.<br />Per <span style={{ color: "#25D366" }}>Chat</span>.<br />In Sekunden.
      </div>
    </div>
  </AbsoluteFill>
);
