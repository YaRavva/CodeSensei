import type { Metadata } from "next";
import { DesignSystem } from "@/components/design/design-system";

export const metadata: Metadata = {
  title: "Дизайн-система",
  robots: { index: false, follow: false },
};

export default function DesignSystemPage() {
  return <DesignSystem />;
}
