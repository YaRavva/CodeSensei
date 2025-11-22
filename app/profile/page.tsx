import { requireAuth } from "@/lib/utils/auth";
import { ProfileContent } from "@/components/profile/profile-content";

export default async function ProfilePage() {
  const { user, profile } = await requireAuth();

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center gap-4">
          <p>Ошибка загрузки профиля. Пожалуйста, обновите страницу.</p>
        </div>
      </div>
    );
  }

  return <ProfileContent user={user} initialProfile={profile} />;
}
