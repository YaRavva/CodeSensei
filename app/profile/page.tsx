import { ProfileContent } from "@/components/profile/profile-content";
import { requireAuth } from "@/lib/utils/auth";

export default async function ProfilePage() {
  const { profile } = await requireAuth();

  return <ProfileContent initialProfile={profile} />;
}
