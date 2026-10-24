import { ModulesList } from "@/components/modules/modules-list";
import { countTasksByModule, listPublishedModules } from "@/lib/appwrite/modules";
import { listUserProgress } from "@/lib/appwrite/progress";
import { requireAuth } from "@/lib/utils/auth";
import { checkNameAndRedirect } from "@/lib/utils/auth-redirect";

export default async function ModulesPage() {
  const { user, profile } = await requireAuth();

  checkNameAndRedirect(profile);

  const modules = await listPublishedModules();

  const [tasksCountMap, progressData] = await Promise.all([
    countTasksByModule(modules.map((module) => module.id)),
    listUserProgress(user.$id),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <ModulesList modules={modules} userProgress={progressData} tasksCountMap={tasksCountMap} />
    </div>
  );
}
