import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/utils/auth";

export default async function Home() {
  const user = await getCurrentAccount();

  if (!user) {
    redirect("/login");
  }

  redirect("/modules");
}
