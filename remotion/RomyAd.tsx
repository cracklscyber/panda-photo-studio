import { Composition } from "remotion";
import { RomyAdVideo } from "./RomyAdVideo";
import { ProductAdSlide } from "./ProductAd";
import { RomyStillSlide } from "./RomyStill";
import { IPhoneMockupSlide } from "./IPhoneMockup";

export const RomyAd: React.FC = () => {
  return (
    <>
      <Composition
        id="RomyAd"
        component={RomyAdVideo}
        durationInFrames={330}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="ProductAd"
        component={ProductAdSlide}
        durationInFrames={1}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="RomyStill"
        component={RomyStillSlide}
        durationInFrames={1}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="IPhoneMockup"
        component={IPhoneMockupSlide}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={1350}
      />
    </>
  );
};
