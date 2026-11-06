import type { Metadata } from "next";
import { connection } from "next/server";
import { DesignSystem } from "@/components/design/design-system";

export const metadata: Metadata = {
  title: "Дизайн-система",
  robots: { index: false, follow: false },
};

export default async function DesignSystemPage() {
  // The page is rendered per request, so that the scripts get the nonce of the
  // Content Security Policy (see proxy.ts).
  await connection();

  return <DesignSystem />;
}
