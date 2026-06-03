import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

loadFraunces("normal", { weights: ["400", "500", "600"], subsets: ["latin"] });
loadFraunces("italic", { weights: ["400", "500"], subsets: ["latin"] });
loadInter("normal", { weights: ["400", "500", "600"], subsets: ["latin"] });

const Serif = '"Fraunces", Georgia, serif';
const Sans = '"Inter", system-ui, -apple-system, sans-serif';
const Mono = '"SF Mono", "JetBrains Mono", ui-monospace, monospace';

const BG = "#f3e9d8";
const INK = "#2a1a0e";
const ACCENT = "#b8543a";
const MUTED = "#7a6552";
const HAIRLINE = "rgba(42,26,14,0.14)";

const SECTION_H = 1350;
const OPEN_FRAMES = 24;
const FIRST_PAGE_HOLD = 50;
const SCROLL_FRAMES = 36;
const SECOND_PAGE_HOLD = 40;
const FADE_OUT_FRAMES = 14;

export const TapIndicator: React.FC<{
  startFrame: number;
  cx: number;
  cy: number;
}> = ({ startFrame, cx, cy }) => {
  const frame = useCurrentFrame();
  const t = frame - startFrame;
  if (t < 0 || t > 28) return null;

  const rippleScale = interpolate(t, [0, 22], [0.5, 2.0], {
    extrapolateRight: "clamp",
  });
  const rippleOpacity = interpolate(t, [0, 4, 22], [0, 0.5, 0], {
    extrapolateRight: "clamp",
  });
  const dotScale = interpolate(t, [0, 4, 12], [0.7, 1.05, 1], {
    extrapolateRight: "clamp",
  });
  const dotOpacity = interpolate(t, [0, 4, 18, 26], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
  });

  const ringSize = 100;
  const dotSize = 60;

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: cx - ringSize / 2,
          top: cy - ringSize / 2,
          width: ringSize,
          height: ringSize,
          borderRadius: "50%",
          border: "5px solid #1a1a1a",
          transform: `scale(${rippleScale})`,
          opacity: rippleOpacity,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: cx - dotSize / 2,
          top: cy - dotSize / 2,
          width: dotSize,
          height: dotSize,
          borderRadius: "50%",
          backgroundColor: "rgba(26,26,26,0.55)",
          transform: `scale(${dotScale})`,
          opacity: dotOpacity,
        }}
      />
    </>
  );
};

const CafeNav: React.FC<{ active?: "Rösterei" | "Sorten" | "Abo" | "Besuchen" }> = ({
  active = "Rösterei",
}) => {
  const items: Array<"Rösterei" | "Sorten" | "Abo" | "Besuchen"> = [
    "Rösterei",
    "Sorten",
    "Abo",
    "Besuchen",
  ];
  return (
    <div
      style={{
        position: "absolute",
        left: 50,
        right: 50,
        top: 38,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        color: INK,
        zIndex: 5,
      }}
    >
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <div
          style={{
            fontFamily: Serif,
            fontStyle: "italic",
            fontSize: 36,
            letterSpacing: -0.4,
            fontWeight: 400,
          }}
        >
          Café Mira
        </div>
        <div
          style={{
            fontFamily: Mono,
            fontSize: 11,
            letterSpacing: 2.4,
            color: MUTED,
            textTransform: "uppercase",
          }}
        >
          Est. 2019
        </div>
      </div>

      {/* Center nav */}
      <div
        style={{
          display: "flex",
          gap: 38,
          fontFamily: Sans,
          fontSize: 17,
          color: INK,
        }}
      >
        {items.map((it) => (
          <span
            key={it}
            style={{
              borderBottom:
                it === active ? `1.5px solid ${INK}` : "1.5px solid transparent",
              paddingBottom: 4,
              fontWeight: it === active ? 500 : 400,
            }}
          >
            {it}
          </span>
        ))}
      </div>

      {/* Location pill */}
      <div
        style={{
          fontFamily: Mono,
          fontSize: 12,
          letterSpacing: 2.4,
          textTransform: "uppercase",
          color: INK,
          border: `1.5px solid ${INK}`,
          borderRadius: 999,
          padding: "12px 22px",
        }}
      >
        München · Glockenbach
      </div>
    </div>
  );
};

// Circular stamp/seal for the hero image overlay.
const RoastStamp: React.FC = () => {
  const size = 168;
  const r = 72;
  return (
    <div
      style={{
        position: "absolute",
        left: -38,
        top: 110,
        width: size,
        height: size,
        borderRadius: "50%",
        background: BG,
        boxShadow: "0 18px 38px rgba(42,26,14,0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 3,
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <path
            id="stamp-top"
            d={`M ${size / 2 - r} ${size / 2}
                a ${r} ${r} 0 1 1 ${r * 2} 0`}
            fill="none"
          />
          <path
            id="stamp-bottom"
            d={`M ${size / 2 - r} ${size / 2}
                a ${r} ${r} 0 1 0 ${r * 2} 0`}
            fill="none"
          />
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={INK}
          strokeWidth={1.2}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r - 8}
          fill="none"
          stroke={INK}
          strokeWidth={0.6}
          opacity={0.4}
        />
        <text
          fontFamily="Fraunces, Georgia, serif"
          fontSize={11}
          letterSpacing={2.6}
          fill={INK}
        >
          <textPath href="#stamp-top" startOffset="50%" textAnchor="middle">
            ROAST · MO 09:00 · CAFÉ MIRA
          </textPath>
        </text>
        <text
          fontFamily="Fraunces, Georgia, serif"
          fontSize={11}
          letterSpacing={2.6}
          fill={INK}
        >
          <textPath href="#stamp-bottom" startOffset="50%" textAnchor="middle">
            FRESH · SEIT 2019 · FRESH
          </textPath>
        </text>
        <text
          x={size / 2}
          y={size / 2 - 6}
          fontFamily="Fraunces, Georgia, serif"
          fontStyle="italic"
          fontSize={14}
          fill={INK}
          textAnchor="middle"
          opacity={0.7}
        >
          seit
        </text>
        <text
          x={size / 2}
          y={size / 2 + 16}
          fontFamily="Fraunces, Georgia, serif"
          fontSize={22}
          fill={INK}
          textAnchor="middle"
          fontWeight={500}
        >
          2019
        </text>
      </svg>
    </div>
  );
};

const CoffeeVisual: React.FC<{
  kind: "cups" | "beans" | "latte" | "bag";
  objectPosition?: string;
}> = ({ kind, objectPosition = "center" }) => {
  const src = `cafe-mira-assets/${kind}.png`;
  return (
    <Img
      src={staticFile(src)}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition,
        display: "block",
      }}
    />
  );
};

const MiniCard: React.FC<{
  kind: "beans" | "latte" | "bag";
  title: string;
  label: string;
}> = ({ kind, title, label }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "108px 1fr",
      gap: 18,
      alignItems: "center",
      background: "rgba(255,248,237,0.72)",
      border: "1px solid rgba(63,40,25,0.08)",
      borderRadius: 18,
      padding: 14,
      boxShadow: "0 18px 38px rgba(63,40,25,0.08)",
    }}
  >
    <div style={{ width: 108, height: 92 }}>
      <CoffeeVisual kind={kind} />
    </div>
    <div>
      <div
        style={{
          fontFamily: Mono,
          fontSize: 11,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "#a07458",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: Serif, fontSize: 22, lineHeight: 1.1, color: "#3f2819", fontWeight: 500 }}>
        {title}
      </div>
    </div>
  </div>
);

const HeroWebsite: React.FC = () => (
  <div
    style={{
      position: "relative",
      height: SECTION_H,
      backgroundColor: BG,
      color: INK,
      overflow: "hidden",
      fontFamily: Sans,
    }}
  >
    <CafeNav active="Rösterei" />

    {/* Main layout: hero row on top, variety cards full-width below */}
    <div
      style={{
        position: "absolute",
        left: 50,
        right: 50,
        top: 130,
        bottom: 50,
        display: "flex",
        flexDirection: "column",
        gap: 40,
      }}
    >
      {/* TOP: two columns — text + cropped hero image */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: 32,
        }}
      >
        {/* LEFT: headline + body + CTAs + stats */}
        <div
          style={{
            paddingTop: 50,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontFamily: Serif,
              fontSize: 76,
              fontWeight: 500,
              lineHeight: 0.98,
              letterSpacing: -2.6,
              color: INK,
            }}
          >
            Handgerösteter
            <br />
            Kaffee aus
            <br />
            <span
              style={{
                fontStyle: "italic",
                fontWeight: 400,
                color: ACCENT,
              }}
            >
              München.
            </span>
          </div>

          <div
            style={{
              marginTop: 38,
              fontSize: 21,
              lineHeight: 1.5,
              color: INK,
              opacity: 0.78,
              maxWidth: 520,
            }}
          >
            Kleine Chargen. Direkt von Farm zu Tasse. Jeden Montag frisch
            geröstet in der Glockenbachwerkstatt — und am Donnerstag bei dir
            zu Hause.
          </div>

          {/* CTAs */}
          <div
            style={{
              marginTop: 44,
              display: "flex",
              alignItems: "center",
              gap: 32,
            }}
          >
            <div
              style={{
                background: INK,
                color: "#fff",
                borderRadius: 999,
                padding: "20px 32px",
                fontFamily: Sans,
                fontSize: 13,
                letterSpacing: 2.4,
                textTransform: "uppercase",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              Sorten entdecken <span style={{ fontSize: 16 }}>→</span>
            </div>
            <div
              style={{
                fontFamily: Sans,
                fontSize: 14,
                letterSpacing: 0.4,
                color: INK,
                borderBottom: `1.5px solid ${INK}`,
                paddingBottom: 4,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              Abo abschließen <span>→</span>
            </div>
          </div>

          {/* Stats row */}
          <div
            style={{
              marginTop: 56,
              paddingTop: 32,
              borderTop: `1px solid ${HAIRLINE}`,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 32,
            }}
          >
            {[
              {
                big: "12",
                small: "SORTEN",
                sub: "single origin & blends",
                italic: false,
              },
              {
                big: "3",
                small: "TAGE",
                sub: "vom rösten zur tasse",
                italic: false,
              },
              {
                big: "Mo",
                small: "· 09",
                sub: "jeden montag früh",
                italic: true,
              },
            ].map((row) => (
              <div key={row.sub}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                  <div
                    style={{
                      fontFamily: Serif,
                      fontSize: 50,
                      fontWeight: 500,
                      lineHeight: 1,
                      fontStyle: row.italic ? "italic" : "normal",
                    }}
                  >
                    {row.big}
                  </div>
                  <div
                    style={{
                      fontFamily: Mono,
                      fontSize: 12,
                      letterSpacing: 2.4,
                      color: MUTED,
                      textTransform: "uppercase",
                    }}
                  >
                    {row.small}
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontFamily: Sans,
                    fontSize: 13,
                    color: MUTED,
                    lineHeight: 1.4,
                  }}
                >
                  {row.sub}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: cropped hero image (height matches left column) */}
        <div
          style={{
            position: "relative",
            minHeight: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              overflow: "hidden",
              boxShadow: "0 30px 80px rgba(42,26,14,0.18)",
              background: BG,
            }}
          >
            <Img
              src={staticFile("cafe-mira-assets/beans.png")}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "100%",
                height: "142%",
                objectFit: "cover",
                objectPosition: "center top",
                display: "block",
              }}
            />
          </div>

          <RoastStamp />
        </div>
      </div>

      {/* BOTTOM: three variety cards spanning full width */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 20,
        }}
      >
        {[
          {
            name: "Yirgacheffe",
            origin: "Ethiopia · Sidamo",
            notes: "Bergamotte · Jasmin · Zitrus",
            roast: "Filter · hell",
            price: "14",
          },
          {
            name: "Colombia",
            origin: "Huila · La Plata",
            notes: "Schokolade · Karamell · Nuss",
            roast: "Espresso · mittel",
            price: "12",
          },
          {
            name: "Guatemala",
            origin: "Antigua · Acatenango",
            notes: "Kakao · Honig · Mandel",
            roast: "Espresso · dunkel",
            price: "13",
          },
        ].map((v) => (
          <div
            key={v.name}
            style={{
              border: `1px solid ${HAIRLINE}`,
              borderRadius: 18,
              padding: "28px 28px 24px",
              background: "rgba(255,248,237,0.55)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: 0,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: Mono,
                  fontSize: 11,
                  letterSpacing: 2.4,
                  textTransform: "uppercase",
                  color: ACCENT,
                  marginBottom: 14,
                }}
              >
                {v.roast}
              </div>
              <div
                style={{
                  fontFamily: Serif,
                  fontSize: 36,
                  fontWeight: 500,
                  lineHeight: 1.05,
                  color: INK,
                  letterSpacing: -0.6,
                }}
              >
                {v.name}
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontFamily: Sans,
                  fontSize: 13,
                  color: MUTED,
                }}
              >
                {v.origin}
              </div>
              <div
                style={{
                  marginTop: 18,
                  fontFamily: Sans,
                  fontSize: 14,
                  lineHeight: 1.45,
                  color: INK,
                  opacity: 0.78,
                }}
              >
                {v.notes}
              </div>
            </div>
            <div
              style={{
                marginTop: 22,
                paddingTop: 18,
                borderTop: `1px solid ${HAIRLINE}`,
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  fontFamily: Serif,
                  fontSize: 28,
                  fontWeight: 500,
                  color: INK,
                }}
              >
                {v.price}
                <span
                  style={{
                    fontFamily: Sans,
                    fontSize: 14,
                    color: MUTED,
                    marginLeft: 4,
                  }}
                >
                  €/250g
                </span>
              </div>
              <div
                style={{
                  fontFamily: Mono,
                  fontSize: 11,
                  letterSpacing: 2.4,
                  textTransform: "uppercase",
                  color: INK,
                  borderBottom: `1.5px solid ${INK}`,
                  paddingBottom: 2,
                }}
              >
                In den Warenkorb →
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const RoastingWebsite: React.FC = () => (
  <div
    style={{
      position: "relative",
      height: SECTION_H,
      backgroundColor: BG,
      color: INK,
      fontFamily: Sans,
      overflow: "hidden",
    }}
  >
    <CafeNav active="Rösterei" />

    {/* Two-column layout: image left, copy right */}
    <div
      style={{
        position: "absolute",
        left: 50,
        right: 50,
        top: 150,
        bottom: 70,
        display: "grid",
        gridTemplateColumns: "0.95fr 1.05fr",
        gap: 60,
        alignItems: "start",
      }}
    >
      {/* LEFT: photo with caption + quote card overlay */}
      <div style={{ position: "relative", height: "100%", minWidth: 0 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            boxShadow: "0 30px 70px rgba(42,26,14,0.18)",
          }}
        >
          <CoffeeVisual kind="cups" />
          {/* Bottom-fade so the caption sits cleanly */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 140,
              background:
                "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 100%)",
            }}
          />
        </div>

        {/* Caption pill bottom-left on image */}
        <div
          style={{
            position: "absolute",
            left: 22,
            bottom: 22,
            fontFamily: Mono,
            fontSize: 11,
            letterSpacing: 2.4,
            textTransform: "uppercase",
            color: "#fff",
            zIndex: 3,
          }}
        >
          Werkstatt · 1948 Probat
        </div>

        {/* Quote card overlay (bottom-right of image) */}
        <div
          style={{
            position: "absolute",
            right: -60,
            bottom: 50,
            width: 380,
            background: BG,
            border: `1px solid ${HAIRLINE}`,
            padding: "22px 26px 24px",
            boxShadow: "0 24px 50px rgba(42,26,14,0.18)",
            zIndex: 4,
          }}
        >
          <div
            style={{
              fontFamily: Mono,
              fontSize: 11,
              letterSpacing: 1.8,
              color: MUTED,
              marginBottom: 14,
            }}
          >
            Mira Hofbauer · Gründerin & Rösterin
          </div>
          <div
            style={{
              fontFamily: Serif,
              fontStyle: "italic",
              fontSize: 24,
              fontWeight: 400,
              lineHeight: 1.28,
              letterSpacing: -0.4,
              color: INK,
            }}
          >
            „Drei Tage. Mehr braucht ein Kaffee zwischen Farm und Tasse nicht."
          </div>
        </div>
      </div>

      {/* RIGHT: chapter, headline, paragraphs, numbered items */}
      <div style={{ paddingTop: 8, minWidth: 0 }}>
        <div
          style={{
            fontFamily: Mono,
            fontSize: 12,
            letterSpacing: 2.6,
            textTransform: "uppercase",
            color: MUTED,
            marginBottom: 28,
          }}
        >
          Kapitel 01 · Die Rösterei
        </div>

        <div
          style={{
            fontFamily: Serif,
            fontSize: 76,
            fontWeight: 500,
            lineHeight: 1.0,
            letterSpacing: -2.2,
          }}
        >
          Eine Werkstatt im
          <br />
          <span
            style={{
              fontStyle: "italic",
              fontWeight: 400,
              color: ACCENT,
            }}
          >
            Glockenbach.
          </span>
        </div>

        <div
          style={{
            marginTop: 36,
            fontSize: 19,
            lineHeight: 1.55,
            color: INK,
            opacity: 0.82,
          }}
        >
          In einer alten Buchbinderei in der Pestalozzistraße rösten wir seit
          2019 Kaffee in kleinen Chargen. Auf einem 1948er Probat UG-15. Drei
          Kilo pro Trommel. Sechzehn Minuten pro Röstung.
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 19,
            lineHeight: 1.55,
            color: INK,
            opacity: 0.82,
          }}
        >
          Wir arbeiten direkt mit acht Farmen in Äthiopien, Kolumbien und
          Guatemala. Keine Zwischenhändler, keine Lagerung über Monate. Die
          Bohnen, die du am Donnerstag in der Hand hältst, waren am Montag
          noch im Trommeln und vor zehn Wochen noch in Limu.
        </div>

        {/* Numbered three-up */}
        <div
          style={{
            marginTop: 54,
            paddingTop: 28,
            borderTop: `1px solid ${HAIRLINE}`,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 28,
          }}
        >
          {[
            {
              n: "01",
              title: "Direkt aus dem Ursprung",
              body: "Acht Farmen, persönlich besucht.",
            },
            {
              n: "02",
              title: "Kleine Chargen",
              body: "Drei Kilo. Nie mehr, nie weniger.",
            },
            {
              n: "03",
              title: "Hell geröstet",
              body: "Damit der Kaffee schmeckt — nicht die Röstung.",
            },
          ].map((it) => (
            <div key={it.n}>
              <div
                style={{
                  fontFamily: Mono,
                  fontSize: 12,
                  letterSpacing: 2.6,
                  color: ACCENT,
                  marginBottom: 14,
                }}
              >
                {it.n}
              </div>
              <div
                style={{
                  fontFamily: Serif,
                  fontSize: 22,
                  fontWeight: 500,
                  lineHeight: 1.15,
                  letterSpacing: -0.5,
                  marginBottom: 10,
                }}
              >
                {it.title}
              </div>
              <div
                style={{
                  fontFamily: Sans,
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: MUTED,
                }}
              >
                {it.body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const CafeSiteSlide: React.FC<{
  startFrame: number;
  tapCx?: number;
  tapCy?: number;
}> = ({ startFrame, tapCx = 540, tapCy = 1010 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame - startFrame;

  const TOTAL =
    OPEN_FRAMES +
    FIRST_PAGE_HOLD +
    SCROLL_FRAMES +
    SECOND_PAGE_HOLD +
    FADE_OUT_FRAMES;
  if (t < 0 || t > TOTAL) return null;

  const open = spring({
    frame: t,
    fps,
    config: { damping: 30, stiffness: 100, mass: 0.9 },
  });
  const scaleIn = interpolate(open, [0, 1], [0.92, 1]);
  const liftIn = interpolate(open, [0, 1], [28, 0]);
  const fadeIn = interpolate(t, [0, OPEN_FRAMES * 0.65], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scrollStart = OPEN_FRAMES + FIRST_PAGE_HOLD;
  const scrollEnd = scrollStart + SCROLL_FRAMES;
  const scrollY = interpolate(
    t,
    [scrollStart, scrollEnd],
    [0, -SECTION_H],
    {
      easing: Easing.inOut(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const fadeOut = interpolate(t, [TOTAL - FADE_OUT_FRAMES, TOTAL], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        opacity: fadeIn * fadeOut,
        transform: `translateY(${liftIn}px) scale(${scaleIn})`,
        transformOrigin: `${tapCx}px ${tapCy}px`,
      }}
    >
      <AbsoluteFill
        style={{
          backgroundColor: "#F5EDE0",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: SECTION_H * 2,
            transform: `translateY(${scrollY}px)`,
          }}
        >
          <HeroWebsite />
          <RoastingWebsite />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const WhatsAppGlyph: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path
      fill="#07120c"
      d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
    />
  </svg>
);

export const EndCTA: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame - startFrame;
  if (t < 0) return null;

  const overlayOpacity = interpolate(t, [0, 14], [0, 1], {
    extrapolateRight: "clamp",
  });
  const headlineSpring = spring({
    frame: Math.max(0, t - 4),
    fps,
    config: { damping: 18, stiffness: 130, mass: 0.7 },
  });
  const pillSpring = spring({
    frame: Math.max(0, t - 14),
    fps,
    config: { damping: 16, stiffness: 130, mass: 0.7 },
  });
  const headlineY = interpolate(headlineSpring, [0, 1], [40, 0]);
  const pillY = interpolate(pillSpring, [0, 1], [50, 0]);
  const pillScale = interpolate(pillSpring, [0, 1], [0.94, 1]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "rgba(239, 232, 222, 0.98)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: overlayOpacity,
      }}
    >
      <div
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 20,
          color: "#1a1a1a",
          opacity: 0.55,
          letterSpacing: 8,
          textTransform: "uppercase",
          marginBottom: 36,
        }}
      >
        Luna.ai
      </div>
      <div
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 64,
          fontWeight: 700,
          letterSpacing: -1.2,
          color: "#1a1a1a",
          textAlign: "center",
          lineHeight: 1.05,
          padding: "0 60px",
          transform: `translateY(${headlineY}px)`,
        }}
      >
        Jetzt kostenlos testen!
      </div>
      <div
        style={{
          marginTop: 56,
          backgroundColor: "#21e66b",
          color: "#07120c",
          padding: "26px 44px",
          borderRadius: 999,
          fontFamily: "Inter, sans-serif",
          fontSize: 30,
          fontWeight: 600,
          letterSpacing: 0.2,
          display: "flex",
          alignItems: "center",
          gap: 18,
          boxShadow: "0 22px 50px rgba(33,230,107,0.32)",
          transform: `translateY(${pillY}px) scale(${pillScale})`,
        }}
      >
        <WhatsAppGlyph size={44} />
        Jetzt per WhatsApp starten
      </div>
      <div
        style={{
          marginTop: 30,
          fontFamily: "Inter, sans-serif",
          fontSize: 18,
          color: "#1a1a1a",
          opacity: 0.55,
          letterSpacing: 0.5,
        }}
      >
        luna.ai
      </div>
    </AbsoluteFill>
  );
};
