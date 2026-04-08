import Hero from "@/components/sections/Hero";
import ApartmentOverview from "@/components/sections/ApartmentOverview";
import HighlightsSection from "@/components/sections/HighlightsSection";
import RegionPreview from "@/components/sections/RegionPreview";
import TestimonialSection from "@/components/sections/TestimonialSection";
import CTASection from "@/components/sections/CTASection";
import AnimateIn from "@/components/ui/AnimateIn";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <Hero />
      <AnimateIn>
        <ApartmentOverview />
      </AnimateIn>
      <AnimateIn>
        <HighlightsSection />
      </AnimateIn>
      <AnimateIn>
        <RegionPreview />
      </AnimateIn>
      <AnimateIn>
        <TestimonialSection />
      </AnimateIn>
      <AnimateIn>
        <CTASection />
      </AnimateIn>
    </>
  );
}
