import { LandingBenefits } from "@/components/landing/landing-benefits";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingFinalCta } from "@/components/landing/landing-final-cta";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingProof } from "@/components/landing/landing-proof";
import { TaglineReveal } from "@/components/landing/tagline-reveal";

export function LandingPage() {
  return (
    <div className="overflow-x-hidden">
      <LandingHero />
      <TaglineReveal />
      <LandingBenefits />
      <LandingHowItWorks />
      <LandingProof />
      <LandingFaq />
      <LandingFinalCta />
    </div>
  );
}
