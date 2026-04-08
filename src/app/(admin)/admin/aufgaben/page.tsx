import { Metadata } from "next";
import { getTasks } from "../actions";
import TaskList from "@/components/admin/TaskList";

export const metadata: Metadata = {
  title: "Aufgaben",
};

export const dynamic = "force-dynamic";

export default async function AufgabenPage() {
  const tasks = await getTasks();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Aufgaben</h1>
      <TaskList initialTasks={tasks} />
    </div>
  );
}
