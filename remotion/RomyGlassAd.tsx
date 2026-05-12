import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CafeSiteSlide, EndCTA, TapIndicator } from "./CafeSiteSlide";

/**
 * Instagram 4:5 (1080x1350) animation of the Romy.ai glass ad.
 * Layout is a pre-rendered PNG at 2160x2700 (scale = 0.5).
 * Chat bubbles + preview card spring in one after the other.
 */

const CANVAS_W = 2160;
const CANVAS_H = 2700;

type ChatItem = {
  kind: "user" | "romy" | "card";
  x: number;
  y: number;
  w: number;
  h: number;
  asset: string;
};

// Hardcoded from assets/video/geometry.json — kept in-source so the
// composition is self-contained and doesn't need a runtime JSON fetch.
const CHAT: ChatItem[] = [
  { kind: "user", x: 871, y: 1092, w: 607, h: 242, asset: "bubble_01.png" },
  { kind: "romy", x: 682, y: 1312, w: 723, h: 242, asset: "bubble_02.png" },
  { kind: "user", x: 862, y: 1532, w: 616, h: 242, asset: "bubble_03.png" },
  { kind: "card", x: 682, y: 1752, w: 796, h: 538, asset: "preview_card.png" },
  { kind: "romy", x: 682, y: 2266, w: 618, h: 182, asset: "bubble_05.png" },
];

// Keep the phone visually filled from the first frame.
const REVEAL_FRAMES = [0, 0, 0, 0, 0];

const ChatAsset: React.FC<{ item: ChatItem; startFrame: number }> = ({
  item,
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame - startFrame;

  const s = spring({
    frame: t,
    fps,
    config: { damping: 18, stiffness: 140, mass: 0.7 },
  });

  const opacity = startFrame === 0 ? 1 : interpolate(t, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Bubbles rise slightly from below, card settles in from a touch further.
  const riseFrom = item.kind === "card" ? 40 : 24;
  const translateY = interpolate(s, [0, 1], [riseFrom, 0]);
  const scale = interpolate(s, [0, 1], [0.96, 1]);

  // Coordinates are in the 2160x2700 canvas space. We render the whole
  // composition in that coordinate space and CSS-transform to the output.
  return (
    <div
      style={{
        position: "absolute",
        left: item.x,
        top: item.y,
        width: item.w,
        height: item.h,
        opacity,
        transform: `translateY(${translateY}px) scale(${scale})`,
        transformOrigin:
          item.kind === "user" ? "bottom right" : "bottom left",
      }}
    >
      <Img
        src={staticFile(`romy-glass-assets/${item.asset}`)}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
};

// Timing — frames at 30fps:
//   0   – 220  chat fills in
//   225        tap on preview card (canvas coords 1080,2021 -> output 540,1010)
//   240 – 460  site opens, holds the first page, then scrolls to the second
//   452 – end  EndCTA fades in after the website has had room to breathe
const TAP_FRAME = 225;
const BROWSER_START = 240;
const ENDCTA_START = 405;
const TAP_OUT_X = 540;
const TAP_OUT_Y = 1010;

export const RomyGlassAd: React.FC = () => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const scale = width / CANVAS_W;

  // Chat phone recedes slightly when the browser starts opening, so it
  // visually "hands off" instead of fighting the new layer for attention.
  const chatRecede = interpolate(
    frame,
    [BROWSER_START - 6, BROWSER_START + 8],
    [1, 0.96],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const chatOpacity = interpolate(
    frame,
    [BROWSER_START - 4, BROWSER_START + 10],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#efe8de" }}>
      <Audio src={staticFile("romy-voice-jessica-chat-v2.mp3")} volume={1} />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: CANVAS_W,
          height: CANVAS_H,
          transform: `scale(${scale * chatRecede})`,
          transformOrigin: "top left",
          opacity: chatOpacity,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: CANVAS_W,
            height: CANVAS_H,
            background:
              "radial-gradient(circle at 18% 16%, rgba(194,225,207,0.75) 0%, transparent 34%), radial-gradient(circle at 86% 10%, rgba(242,218,207,0.9) 0%, transparent 38%), radial-gradient(circle at 55% 82%, rgba(210,196,184,0.78) 0%, transparent 44%), linear-gradient(145deg, #dce8df 0%, #ded9ce 48%, #eadbd2 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: CANVAS_W,
            height: CANVAS_H,
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            opacity: 0.45,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 330,
            left: 0,
            width: CANVAS_W,
            textAlign: "center",
            fontFamily:
              '"Inter", system-ui, -apple-system, sans-serif',
            fontWeight: 800,
            fontSize: 190,
            lineHeight: 0.9,
            letterSpacing: -8,
            color: "#111715",
          }}
        >
          Romy<span style={{ color: "rgba(17,23,21,0.34)" }}>.ai</span>
        </div>
        <div
          style={{
            position: "absolute",
            top: 605,
            left: 0,
            width: CANVAS_W,
            textAlign: "center",
            fontFamily:
              '"Inter", system-ui, -apple-system, sans-serif',
            fontWeight: 400,
            fontSize: 42,
            letterSpacing: -0.4,
            color: "rgba(17,23,21,0.72)",
          }}
        >
          Website per Chat.
        </div>
        <div
          style={{
            position: "absolute",
            left: 628,
            top: 765,
            width: 904,
            height: 1818,
            borderRadius: 106,
            background: "#242628",
            boxShadow:
              "0 58px 140px rgba(58,55,48,0.28), 0 18px 40px rgba(58,55,48,0.18)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 650,
            top: 787,
            width: 860,
            height: 1774,
            borderRadius: 84,
            background: "#ece7df",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: 150,
              background: "#f5efe6",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 300,
              top: 31,
              width: 260,
              height: 70,
              borderRadius: 999,
              background: "#0d0d0d",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 55,
              top: 63,
              fontFamily:
                '"Inter", system-ui, -apple-system, sans-serif',
              fontWeight: 700,
              fontSize: 26,
              color: "#1b1c1b",
            }}
          >
            9:41
          </div>
          <div
            style={{
              position: "absolute",
              right: 55,
              top: 70,
              display: "flex",
              gap: 13,
            }}
          >
            {[0, 1, 2].map((dot) => (
              <span
                key={dot}
                style={{
                  width: 15,
                  height: 15,
                  borderRadius: "50%",
                  background: "#151515",
                }}
              />
            ))}
          </div>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 150,
              width: "100%",
              height: 150,
              background: "#ffffff",
              borderBottom: "1px solid rgba(0,0,0,0.08)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 42,
              top: 203,
              width: 28,
              height: 28,
              borderLeft: "5px solid #333",
              borderBottom: "5px solid #333",
              transform: "rotate(45deg)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 188,
              top: 188,
              fontFamily:
                '"Inter", system-ui, -apple-system, sans-serif',
              fontWeight: 760,
              fontSize: 38,
              color: "#101619",
            }}
          >
            Romy
          </div>
          <div
            style={{
              position: "absolute",
              left: 188,
              top: 233,
              fontFamily:
                '"Inter", system-ui, -apple-system, sans-serif',
              fontWeight: 450,
              fontSize: 25,
              color: "#5a7c74",
            }}
          >
            online
          </div>
          <div
            style={{
              position: "absolute",
              left: 0,
              bottom: 0,
              width: "100%",
              height: 128,
              background: "rgba(236,231,223,0.96)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 40,
              bottom: 29,
              width: 710,
              height: 72,
              borderRadius: 999,
              background: "#ffffff",
              boxShadow: "0 6px 14px rgba(0,0,0,0.10)",
              display: "flex",
              alignItems: "center",
              paddingLeft: 28,
              fontFamily:
                '"Inter", system-ui, -apple-system, sans-serif',
              fontSize: 26,
              color: "rgba(0,0,0,0.34)",
            }}
          >
            Nachricht
          </div>
          <div
            style={{
              position: "absolute",
              right: 28,
              bottom: 30,
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "#08b27d",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily:
                '"Inter", system-ui, -apple-system, sans-serif',
              fontSize: 48,
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            ↑
          </div>
        </div>
        {/* New Romy avatar, cropped to show face, shoulders, and collar. */}
        <div
          style={{
            position: "absolute",
            left: 716,
            top: 960,
            width: 96,
            height: 96,
            borderRadius: "50%",
            overflow: "hidden",
            background: "#ffffff",
          }}
        >
          <Img
            src={staticFile("romy-assistant.png")}
            style={{
              position: "absolute",
              width: 235,
              height: 157,
              left: -66,
              top: 1,
              display: "block",
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 2605,
            width: CANVAS_W,
            textAlign: "center",
            fontFamily:
              '"Inter", system-ui, -apple-system, sans-serif',
            fontWeight: 500,
            fontSize: 24,
            letterSpacing: 1.1,
            color: "rgba(17,23,21,0.36)",
          }}
        >
          romy.ai · Website-Chat
        </div>
        {CHAT.map((item, i) => (
          <ChatAsset key={item.asset} item={item} startFrame={REVEAL_FRAMES[i]} />
        ))}
        {/* Tap on the preview card (lives inside canvas coords). */}
        <TapIndicator startFrame={TAP_FRAME} cx={1080} cy={2021} />
      </div>
      {/* Website + outro live in OUTPUT space (1080x1350) so the rendered
          PNG fills the whole frame, not just the phone screen. */}
      <CafeSiteSlide
        startFrame={BROWSER_START}
        tapCx={TAP_OUT_X}
        tapCy={TAP_OUT_Y}
      />
      <EndCTA startFrame={ENDCTA_START} />
      {/* Output safety: ensure nothing overflows the 1080x1350 output. */}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          width,
          height,
          overflow: "hidden",
        }}
      />
    </AbsoluteFill>
  );
};
