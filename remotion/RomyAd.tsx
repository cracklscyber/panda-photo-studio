import { Composition } from "remotion";
import { RomyAdVideo } from "./RomyAdVideo";
import { ProductAdSlide, LunaProductAdVideo } from "./ProductAd";
import { RomyStillSlide } from "./RomyStill";
import { IPhoneMockupSlide } from "./IPhoneMockup";
import { RomyGlassAd } from "./RomyGlassAd";
import { RomyGlassVideo } from "./RomyGlassVideo";
import { RomyCarouselSlide1, RomyCarouselSlide2 } from "./RomyCarousel";
import { FionaReel } from "./FionaReel";
import { CafeSiteSlide } from "./CafeSiteSlide";

export const RomyAd: React.FC = () => {
  return (
    <>
      <Composition
        id="FionaReel"
        component={FionaReel}
        durationInFrames={420}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ voice: "nadine" as const }}
      />
      <Composition
        id="FionaReelSarah"
        component={FionaReel}
        durationInFrames={420}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ voice: "sarah" as const }}
      />
      <Composition
        id="RomyCarouselSlide1"
        component={RomyCarouselSlide1}
        durationInFrames={1}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="RomyCarouselSlide2"
        component={RomyCarouselSlide2}
        durationInFrames={1}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="RomyGlassAd"
        component={RomyGlassAd}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="RomyGlassVideo"
        component={RomyGlassVideo}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="RomyAd"
        component={RomyAdVideo}
        durationInFrames={330}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="LunaProductAd"
        component={LunaProductAdVideo}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1350}
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
      <Composition
        id="CafeSiteSlide"
        component={CafeSiteSlide}
        durationInFrames={120}
        fps={30}
        width={1080}
        height={1350}
        defaultProps={{ startFrame: 0 }}
      />
    </>
  );
};
