import React from "react";
import { Composition } from "remotion";
import { IPhoneScene, type IPhoneSceneProps } from "./IPhoneScene";
import { IPhoneAdSlide } from "./IPhoneAdSlide";
import { HeroSlide } from "./HeroSlide";
import { ChatAdSlide } from "./ChatAdSlide";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/*
        IPhoneScene — 1080×1920 portrait (story / reel format)

        Customize via defaultProps:
          phoneX / phoneY   → center position on canvas
          phoneScale        → 1 = base 393×852 px phone
          clipTop/Bottom/Left/Right → crop in scaled pixels

        Example: phone at bottom-center, cut off at the top 400px of the phone
          phoneY: 1200, phoneScale: 2.0, clipTop: 400
      */}
      <Composition
        id="IPhoneScene"
        component={IPhoneScene}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={
          {
            phoneX: 540,
            phoneY: 1350,
            phoneScale: 2.0,
            clipTop: 0,
            clipBottom: 0,
            clipLeft: 0,
            clipRight: 0,
          } satisfies IPhoneSceneProps
        }
      />

      {/* Ad slide: "Website erstellen. / Einfach per WhatsApp." + iPhone cut off at bottom */}
      <Composition
        id="IPhoneAdSlide"
        component={IPhoneAdSlide}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
      />

      {/* Chat Ad: WhatsApp conversation, 4:5 Meta feed format */}
      <Composition
        id="ChatAdSlide"
        component={ChatAdSlide}
        durationInFrames={185}
        fps={30}
        width={1080}
        height={1350}
      />

      {/* Hero slide: 3-slide sequence, 4:5 format, ~14.7 sec */}
      <Composition
        id="HeroSlide"
        component={HeroSlide}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1350}
      />
    </>
  );
};
