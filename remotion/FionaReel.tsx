import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  continueRender,
  delayRender,
  staticFile,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadInstrumentSerif } from "@remotion/google-fonts/InstrumentSerif";

const Sans = '"Geist", Impact, "Arial Black", sans-serif';
const Serif = '"Instrument Serif", Georgia, serif';

loadInstrumentSerif("normal", { weights: ["400"], subsets: ["latin"] });
loadInstrumentSerif("italic", { weights: ["400"], subsets: ["latin"] });

const FontInjector: React.FC = () => (
  <style
    dangerouslySetInnerHTML={{
      __html: `@import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800;900&display=block');`,
    }}
  />
);

const FIONA_GREEN = "#1f6b3a";
const DARK_GREEN = "#0d4a2a";
const CHAT_BG = "#efe5d4";
const DATE_PILL = "#d6cab3";
const OUT_BUBBLE = "#d9fdd3";
const IN_BUBBLE = "#ffffff";
const READ_BLUE = "#53bdeb";

const useBubbleAnim = (start: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - start,
    fps,
    config: { damping: 18, stiffness: 170 },
  });
  return {
    opacity: frame < start ? 0 : progress,
    transform: `translateY(${(1 - progress) * 24}px)`,
  };
};

const Checkmarks: React.FC<{ color?: string }> = ({ color = READ_BLUE }) => (
  <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
    <path
      d="M1 7L5 11L12 3"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7 7L11 11L21 1"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const VerifiedBadge: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 1L3 5v6c0 5.5 3.84 10.74 9 12 5.16-1.26 9-6.5 9-12V5l-9-4z"
      fill="#7de29b"
    />
    <path
      d="M8 12l2.5 2.5L16 9"
      stroke={DARK_GREEN}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

const IconVideo: React.FC = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
    <rect x="2" y="6" width="14" height="12" rx="2" />
    <path d="M16 10l5-3v10l-5-3z" />
  </svg>
);

const IconPhone: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
    <path d="M20 15.5c-1.2 0-2.5-.2-3.6-.6-.3-.1-.7 0-1 .2l-2.2 2.2c-2.8-1.4-5.1-3.8-6.6-6.6l2.2-2.2c.3-.3.3-.7.2-1-.4-1.1-.6-2.4-.6-3.6 0-.6-.4-1-1-1H4c-.6 0-1 .4-1 1 0 9.4 7.6 17 17 17 .6 0 1-.4 1-1v-3.4c0-.6-.4-1-1-1z" />
  </svg>
);

const IconBack: React.FC = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const IconPlay: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const IconMic: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366">
    <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.92V21h2v-3.08A7 7 0 0019 11h-2z" />
  </svg>
);

const Waveform: React.FC<{ color?: string }> = ({ color = "#5a7a5a" }) => {
  const heights = [
    6, 10, 14, 8, 18, 22, 16, 12, 20, 24, 18, 14, 10, 16, 22, 26, 20, 14, 10, 8,
    14, 18, 22, 16, 12, 8, 14, 20, 18, 14, 10, 16, 20, 14, 8,
  ];
  return (
    <svg width="210" height="44" viewBox="0 0 280 32">
      {heights.map((h, i) => (
        <rect
          key={i}
          x={i * 8}
          y={16 - h / 2}
          width={3}
          height={h}
          rx={1.5}
          fill={color}
        />
      ))}
    </svg>
  );
};

const FionaPortrait: React.FC<{ size: number }> = ({ size }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      overflow: "hidden",
      flexShrink: 0,
      boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
    }}
  >
    <Img
      src={staticFile("fiona-portrait.png")}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  </div>
);

const LisaAvatar: React.FC<{ size: number }> = ({ size }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: "#1f6b3a",
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: Sans,
      fontWeight: 700,
      fontSize: size * 0.55,
      flexShrink: 0,
    }}
  >
    L
  </div>
);

const CalendarPreview: React.FC = () => {
  const days = ["MO", "DI", "MI", "DO", "FR", "SA", "SO"];
  const nums = [27, 28, 29, 30, 1, 2, 3];
  // Abstract "blurred photo preview" gradients — feels like a real
  // content image without bundling 7 stock photos.
  const previews = [
    // Mo — warm latte / morning
    "radial-gradient(circle at 30% 30%, #f3c89a 0%, #c98a55 35%, #7a3d1c 100%)",
    // Di — golden hour pastry
    "radial-gradient(circle at 65% 35%, #f7d68a 0%, #c79532 40%, #6f4a14 100%)",
    // Mi — terracotta interior
    "radial-gradient(circle at 40% 65%, #f1a373 0%, #c2683a 45%, #6b2e15 100%)",
    // Do — sunlit bread / yellow
    "radial-gradient(circle at 55% 40%, #f9e092 0%, #d6ac3d 40%, #6e5318 100%)",
    // Fr — fresh greens / herbs
    "radial-gradient(circle at 35% 55%, #b6d99a 0%, #6fa86a 40%, #2c5232 100%)",
    // Sa — orange product flat-lay
    "radial-gradient(circle at 60% 50%, #f6b888 0%, #d8782e 40%, #6d3a16 100%)",
    // So — soft neutral / rest day
    "radial-gradient(circle at 45% 45%, #ece5db 0%, #b8b0a2 50%, #6b675d 100%)",
  ];
  const tints = [
    "#c94a4a",
    "#b58b3b",
    "#c26a2e",
    "#d4a73a",
    "#6fa86a",
    "#d8782e",
    "#cccccc",
  ];
  return (
    <div
      style={{
        background: "#f2e8d3",
        borderRadius: 8,
        padding: 12,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: FIONA_GREEN,
        }}
      >
        Vorschau
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#888",
          marginBottom: 10,
        }}
      >
        Mo, 27. April – So, 03. Mai · KW 18
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 3,
          marginBottom: 3,
        }}
      >
        {days.map((d) => (
          <div
            key={d}
            style={{
              fontSize: 10,
              color: "#888",
              textAlign: "center",
              fontWeight: 600,
            }}
          >
            {d}
          </div>
        ))}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 3,
        }}
      >
        {nums.map((n, i) => (
          <div
            key={i}
            style={{
              position: "relative",
              height: 44,
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            {/* Blurred "photo preview" — abstract gradient that reads as image */}
            <div
              style={{
                position: "absolute",
                inset: -4,
                background: previews[i],
                filter: "blur(2.5px) saturate(1.1)",
              }}
            />
            {/* Color tint overlay for cohesion with brand */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: tints[i],
                mixBlendMode: "color",
                opacity: 0.45,
              }}
            />
            {/* Subtle dark fade at the bottom so the date stays legible */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 55%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                right: 4,
                bottom: 4,
                color: "white",
                fontSize: 11,
                fontWeight: 700,
                textShadow: "0 1px 2px rgba(0,0,0,0.4)",
              }}
            >
              {n}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Phone: React.FC = () => {
  const W = 500;
  const H = Math.round(W * 2.05); // 1025
  const screenRadius = 48;

  return (
    <div
      style={{
        width: W,
        height: H,
        borderRadius: screenRadius + 8,
        background: "#1a1a1a",
        padding: 6,
        boxShadow:
          "0 40px 80px rgba(0,0,0,0.25), 0 15px 30px rgba(0,0,0,0.15)",
        position: "relative",
      }}
    >
      {/* Screen */}
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: screenRadius,
          background: CHAT_BG,
          overflow: "hidden",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header (includes status bar area under Dynamic Island) */}
        <div
          style={{
            background: DARK_GREEN,
            paddingTop: 14,
            color: "white",
            flexShrink: 0,
          }}
        >
          {/* iOS status bar removed — cleaner ad framing */}

          {/* Chat header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 14px 12px",
            }}
          >
            <IconBack />
            <FionaPortrait size={44} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  fontFamily: Sans,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                Fiona
                <VerifiedBadge />
              </div>
              <div style={{ fontSize: 13, opacity: 0.8, fontFamily: Sans }}>
                online
              </div>
            </div>
            <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
              <IconVideo />
              <IconPhone />
            </div>
          </div>
        </div>

        {/* Chat body */}
        <div
          style={{
            flex: 1,
            padding: "18px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            fontFamily: Sans,
            overflow: "hidden",
          }}
        >
          {/* HEUTE date pill */}
          <div
            style={{
              alignSelf: "center",
              background: DATE_PILL,
              color: "#555",
              fontSize: 12,
              padding: "5px 14px",
              borderRadius: 8,
              fontWeight: 600,
              letterSpacing: "0.14em",
            }}
          >
            HEUTE
          </div>

          {/* Voice message LEFT (incoming — Lisa's voice) */}
          <div
            style={{
              ...useBubbleAnim(20),
              alignSelf: "flex-start",
              display: "flex",
              alignItems: "flex-end",
              gap: 6,
              maxWidth: "85%",
            }}
            data-voice-bubble
          >
            <LisaAvatar size={40} />
            <div
              style={{
                background: IN_BUBBLE,
                borderRadius: "16px 16px 16px 6px",
                padding: "16px 18px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                boxShadow: "0 1px 1px rgba(0,0,0,0.08)",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "#e8f0e5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconPlay size={42} />
              </div>
              <Waveform />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 4,
                  fontSize: 16,
                  color: "#888",
                }}
              >
                <div>0:07</div>
                <div>19:07</div>
              </div>
            </div>
          </div>

          {/* Fiona reply RIGHT (outgoing) */}
          <div
            style={{
              ...useBubbleAnim(250),
              alignSelf: "flex-end",
              maxWidth: "78%",
              background: OUT_BUBBLE,
              borderRadius: "12px 12px 4px 12px",
              padding: "10px 14px 6px",
              boxShadow: "0 1px 1px rgba(0,0,0,0.08)",
              fontSize: 16,
              color: "#1a1a1a",
              lineHeight: 1.35,
            }}
          >
            Ja klar, ich bearbeite die Bilder und plane den Content für die
            kommende Woche.
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 4,
                marginTop: 4,
                fontSize: 11,
                color: "#667",
              }}
            >
              19:07 <Checkmarks />
            </div>
          </div>

          {/* Calendar preview RIGHT (outgoing) */}
          <div
            style={{
              ...useBubbleAnim(295),
              alignSelf: "flex-end",
              maxWidth: "80%",
              background: OUT_BUBBLE,
              borderRadius: "12px 12px 4px 12px",
              padding: 6,
              boxShadow: "0 1px 1px rgba(0,0,0,0.08)",
            }}
          >
            <CalendarPreview />
            <div style={{ padding: "8px 8px 4px" }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#1a1a1a",
                  marginBottom: 3,
                }}
              >
                Dein Content-Kalender · KW 18
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#555",
                  lineHeight: 1.3,
                  marginBottom: 4,
                }}
              >
                7 Posts geplant für Instagram, Facebook, TikTok & Google. Tippe,
                um zu prüfen und freizugeben.
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#888",
                  letterSpacing: "0.1em",
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                HEYFIONA.AI
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 12,
                  color: "#1f6b3a",
                  borderTop: "1px solid rgba(0,0,0,0.06)",
                  paddingTop: 6,
                }}
              >
                <div style={{ textDecoration: "underline" }}>
                  heyfiona.ai/kalender/lisa-kw18
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    color: "#667",
                  }}
                >
                  19:08 <Checkmarks />
                </div>
              </div>
            </div>
          </div>

          {/* Fertig! RIGHT (outgoing) */}
          <div
            style={{
              ...useBubbleAnim(360),
              alignSelf: "flex-end",
              background: OUT_BUBBLE,
              borderRadius: "12px 12px 4px 12px",
              padding: "10px 16px 6px",
              boxShadow: "0 1px 1px rgba(0,0,0,0.08)",
              fontSize: 17,
              color: "#1a1a1a",
              fontWeight: 600,
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
            }}
          >
            <span>Fertig!</span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                color: "#667",
                fontWeight: 400,
                marginBottom: 1,
              }}
            >
              19:08 <Checkmarks />
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Island */}
      <div
        style={{
          position: "absolute",
          top: 14,
          left: "50%",
          transform: "translateX(-50%)",
          width: 130,
          height: 36,
          background: "#0a0a0a",
          borderRadius: 20,
          zIndex: 10,
        }}
      />
    </div>
  );
};

export const FionaReel: React.FC<{ voice?: "nadine" | "sarah" }> = ({
  voice = "nadine",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade in whole scene
  const sceneIn = spring({ frame, fps, config: { damping: 20, stiffness: 90 } });

  const voiceSrc =
    voice === "sarah"
      ? staticFile("fiona-voice-sarah.mp3")
      : staticFile("fiona-voice-nadine.mp3");

  return (
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(135deg, #ebf2e4 0%, #d8e9c8 55%, #b8d9a8 100%)",
        fontFamily: Sans,
        opacity: sceneIn,
      }}
    >
      <FontInjector />
      {/* Voice message audio — starts when voice bubble appears */}
      <Sequence from={20}>
        <Audio src={voiceSrc} />
      </Sequence>
      {/* Top brand */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 120,
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <FionaPortrait size={160} />
          <div
            style={{
              fontFamily: Serif,
              fontStyle: "italic",
              fontSize: 140,
              color: FIONA_GREEN,
              lineHeight: 1,
              fontWeight: 700,
            }}
          >
            fiona
          </div>
        </div>
        <div
          style={{
            fontSize: 22,
            letterSpacing: "0.28em",
            color: "#2a3a2a",
            fontWeight: 600,
            marginTop: 6,
          }}
        >
          DEINE KI-MARKETING-ASSISTENTIN
        </div>
      </div>

      {/* iPhone centered */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 420,
          transform: "translateX(-50%)",
        }}
      >
        <Phone />
      </div>

      {/* Bottom tagline */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 110,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
          textAlign: "center",
          padding: "0 60px",
        }}
      >
        <div
          style={{
            fontSize: 20,
            letterSpacing: "0.32em",
            color: FIONA_GREEN,
            fontWeight: 700,
          }}
        >
          DEIN CONTENT-KALENDER
        </div>
        <div
          style={{
            fontSize: 84,
            color: "#0f3a1f",
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
          }}
        >
          Eine Sprachnachricht.
          <br />
          Eine{" "}
          <span
            style={{
              fontFamily: Serif,
              fontStyle: "italic",
              fontWeight: 400,
              color: FIONA_GREEN,
            }}
          >
            ganze
          </span>{" "}
          Woche Content.
        </div>
      </div>
    </AbsoluteFill>
  );
};
