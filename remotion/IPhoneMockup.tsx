import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
} from "remotion";

/* ── Small icon helpers (clean SVG, no emoji) ── */
const IconPlus: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a8a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IconCamera: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a8a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);
const IconMic: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);
const IconBack: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const IconPhone: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
const IconVideo: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);
const IconCheckCheck: React.FC<{ color?: string }> = ({ color = "#53bdeb" }) => (
  <svg width="14" height="10" viewBox="0 0 16 11" fill="none">
    <path d="M11.071.653L4.504 7.22 1.928 4.645 1 5.572 4.504 9.076 12 1.58z" fill={color} />
    <path d="M15.071.653L8.504 7.22 6 4.716 5.072 5.644 8.504 9.076 16 1.58z" fill={color} />
  </svg>
);

/* ── Showroom product photo placeholder (swap for user upload) ── */
const ShowroomPhoto: React.FC = () => (
  <div
    style={{
      width: "100%",
      aspectRatio: "1 / 1",
      borderRadius: 8,
      overflow: "hidden",
      position: "relative",
      background:
        "linear-gradient(180deg, #efe6dc 0%, #efe6dc 55%, #caa885 55%, #b08b64 100%)",
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(ellipse at 20% 10%, rgba(255,240,220,0.7) 0%, transparent 55%)",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: "18%",
        transform: "translateX(-50%)",
        width: "42%",
        height: "10%",
        background: "linear-gradient(180deg, #e8d9c5 0%, #c9b291 100%)",
        borderRadius: 2,
        boxShadow: "0 6px 14px rgba(0,0,0,0.15)",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: "28%",
        transform: "translateX(-50%)",
        width: "22%",
        height: "34%",
        background:
          "linear-gradient(135deg, #f5f1ec 0%, #d9cfc2 55%, #a7997f 100%)",
        borderRadius: "46% 46% 40% 40% / 30% 30% 60% 60%",
        boxShadow:
          "inset -6px -4px 14px rgba(0,0,0,0.12), 0 8px 18px rgba(0,0,0,0.18)",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: "60%",
        transform: "translateX(-50%)",
        width: "10%",
        height: "7%",
        background: "linear-gradient(135deg, #ebe4d8 0%, #c7b99e 100%)",
        borderRadius: "40% 40% 20% 20%",
      }}
    />
  </div>
);

/* ── Typing indicator (three bouncing dots) ── */
const TypingDots: React.FC = () => {
  const frame = useCurrentFrame();
  const dot = (offset: number) => {
    const t = (frame + offset) % 24;
    const y = t < 12 ? Math.sin((t / 12) * Math.PI) * -3 : 0;
    return y;
  };
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "4px 2px" }}>
      {[0, 8, 16].map((o, i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            background: "#8a8a8a",
            transform: `translateY(${dot(o)}px)`,
          }}
        />
      ))}
    </div>
  );
};

const Bubble: React.FC<{
  side: "left" | "right";
  opacity: number;
  translateY: number;
  children: React.ReactNode;
  width?: string;
  padded?: boolean;
}> = ({ side, opacity, translateY, children, width, padded = true }) => {
  const bg = side === "right" ? "#DCF8C6" : "#FFFFFF";
  const radius =
    side === "right" ? "10px 10px 2px 10px" : "10px 10px 10px 2px";
  return (
    <div
      style={{
        alignSelf: side === "right" ? "flex-end" : "flex-start",
        maxWidth: width ?? "82%",
        width,
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div
        style={{
          background: bg,
          borderRadius: radius,
          padding: padded ? "7px 10px" : 3,
          fontSize: 12,
          color: "#1a1a1a",
          lineHeight: 1.35,
          boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
        }}
      >
        {children}
      </div>
    </div>
  );
};

/* ── WhatsApp chat screen with animation ── */
const WhatsAppChat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // user bubble entrance
  const userSpring = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const userOp = interpolate(userSpring, [0, 1], [0, 1]);
  const userY = interpolate(userSpring, [0, 1], [10, 0]);

  // typing indicator window
  const typingStart = 40;
  const typingEnd = 75;
  const typingOp = interpolate(
    frame,
    [typingStart, typingStart + 6, typingEnd - 6, typingEnd],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // bot text
  const botTextSpring = spring({ frame: frame - 75, fps, config: { damping: 14 } });
  const botTextOp = interpolate(botTextSpring, [0, 1], [0, 1]);
  const botTextY = interpolate(botTextSpring, [0, 1], [10, 0]);

  // bot image
  const botImgSpring = spring({ frame: frame - 110, fps, config: { damping: 14 } });
  const botImgOp = interpolate(botImgSpring, [0, 1], [0, 1]);
  const botImgY = interpolate(botImgSpring, [0, 1], [10, 0]);

  const chatBg = "#ECE5DD";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        background: chatBg,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header (directly at top, no status bar) */}
      <div
        style={{
          background: "#075E54",
          color: "white",
          padding: "38px 12px 10px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <IconBack />
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: 15,
            fontWeight: 700,
            color: "white",
          }}
        >
          R
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Romy.ai</div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>online</div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <IconVideo />
          <IconPhone />
        </div>
      </div>

      {/* Chat body */}
      <div
        style={{
          flex: 1,
          padding: "14px 10px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          overflow: "hidden",
        }}
      >
        <Bubble side="right" opacity={userOp} translateY={userY}>
          Ich brauche ein Showroom-Foto von meinem Möbelstück.
        </Bubble>

        {typingOp > 0.02 && (
          <div
            style={{
              alignSelf: "flex-start",
              opacity: typingOp,
              background: "#FFFFFF",
              borderRadius: "10px 10px 10px 2px",
              padding: "6px 10px",
              boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
            }}
          >
            <TypingDots />
          </div>
        )}

        {botTextOp > 0.02 && (
          <Bubble side="left" opacity={botTextOp} translateY={botTextY}>
            Klar — schick mir dein Möbelstück und ich setz es dir in einen Showroom.
          </Bubble>
        )}

        {botImgOp > 0.02 && (
          <Bubble
            side="left"
            opacity={botImgOp}
            translateY={botImgY}
            width="70%"
            padded={false}
          >
            <ShowroomPhoto />
            <div
              style={{
                padding: "4px 6px 2px",
                fontSize: 11,
                color: "#1a1a1a",
                lineHeight: 1.3,
              }}
            >
              Dein Möbelstück im Showroom.
            </div>
          </Bubble>
        )}
      </div>

      {/* Input bar */}
      <div
        style={{
          background: "#F0F0F0",
          padding: "8px 8px 10px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderTop: "0.5px solid rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            flex: 1,
            background: "white",
            borderRadius: 20,
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "#8a8a8a",
            minHeight: 22,
          }}
        >
          <IconPlus />
          <span style={{ flex: 1 }}>Nachricht</span>
          <IconCamera />
        </div>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "#25D366",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <IconMic />
        </div>
      </div>
    </div>
  );
};

/* ── iPhone frame ── */
const IPhoneFrame: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const phoneWidth = 340;
  const phoneHeight = 700;
  const borderRadius = 52;
  const bezelWidth = 10;
  const screenRadius = 44;
  const notchWidth = 120;
  const notchHeight = 28;
  const homeBarWidth = 120;
  const homeBarHeight = 5;

  return (
    <div style={{ position: "relative", width: phoneWidth, height: phoneHeight }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius,
          background: "linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)",
          boxShadow:
            "0 40px 80px rgba(0,0,0,0.25), 0 10px 30px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1)",
        }}
      />
      <div style={{ position: "absolute", right: -2.5, top: 160, width: 3, height: 65, borderRadius: "0 2px 2px 0", background: "#2a2a2a" }} />
      <div style={{ position: "absolute", left: -2.5, top: 130, width: 3, height: 32, borderRadius: "2px 0 0 2px", background: "#2a2a2a" }} />
      <div style={{ position: "absolute", left: -2.5, top: 175, width: 3, height: 32, borderRadius: "2px 0 0 2px", background: "#2a2a2a" }} />
      <div style={{ position: "absolute", left: -2.5, top: 95, width: 3, height: 18, borderRadius: "2px 0 0 2px", background: "#2a2a2a" }} />

      <div
        style={{
          position: "absolute",
          top: bezelWidth,
          left: bezelWidth,
          right: bezelWidth,
          bottom: bezelWidth,
          borderRadius: screenRadius,
          background: "#ECE5DD",
          overflow: "hidden",
        }}
      >
        {children}
      </div>

      <div
        style={{
          position: "absolute",
          top: bezelWidth + 10,
          left: "50%",
          transform: "translateX(-50%)",
          width: notchWidth,
          height: notchHeight,
          borderRadius: notchHeight / 2,
          background: "#1a1a1a",
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: bezelWidth + 8,
          left: "50%",
          transform: "translateX(-50%)",
          width: homeBarWidth,
          height: homeBarHeight,
          borderRadius: homeBarHeight / 2,
          background: "rgba(255,255,255,0.35)",
          zIndex: 2,
        }}
      />
    </div>
  );
};

export const IPhoneMockupSlide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phoneIn = spring({ frame, fps, config: { damping: 16 } });
  const phoneScale = interpolate(phoneIn, [0, 1], [0.94, 1]);
  const phoneOp = interpolate(phoneIn, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        background: `
          radial-gradient(ellipse at 15% 18%, rgba(255,170,200,0.30) 0%, transparent 50%),
          radial-gradient(ellipse at 85% 20%, rgba(130,190,255,0.28) 0%, transparent 50%),
          radial-gradient(ellipse at 25% 80%, rgba(130,230,180,0.24) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 78%, rgba(255,180,210,0.22) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 45%, rgba(180,200,255,0.14) 0%, transparent 55%),
          linear-gradient(160deg, #3a3550 0%, #363e5a 40%, #3e3a58 70%, #343248 100%)
        `,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div style={{ opacity: phoneOp, transform: `scale(${phoneScale})` }}>
        <IPhoneFrame>
          <WhatsAppChat />
        </IPhoneFrame>
      </div>
    </AbsoluteFill>
  );
};
