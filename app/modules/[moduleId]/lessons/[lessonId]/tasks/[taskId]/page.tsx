import { redirect } from "next/navigation";
import { getTask } from "@/lib/appwrite/tasks";
import { requireAuth } from "@/lib/utils/auth";

export default async function LegacyTaskPage({
  params,
}: {
  params: Promise<{ moduleId: string; lessonId: string; taskId: string }>;
}) {
  const { moduleId, taskId } = await params;
  await requireAuth();

  const task = await getTask(taskId);
  redirect(`/modules/${task?.module_id || moduleId}/tasks/${taskId}`);
}
