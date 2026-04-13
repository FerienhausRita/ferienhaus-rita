import { Metadata } from "next";
import { getTasks, getAdminList } from "../actions";
import TaskList from "@/components/admin/TaskList";
import { apartments } from "@/data/apartments";

export const metadata: Metadata = {
  title: "Aufgaben",
};

export const dynamic = "force-dynamic";

export default async function AufgabenPage() {
  const [tasks, admins] = await Promise.all([getTasks(), getAdminList()]);

  const apartmentList = apartments.map((a) => ({ id: a.id, name: a.name }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Aufgaben</h1>
      <TaskList initialTasks={tasks} apartments={apartmentList} admins={admins} />
    </div>
  );
}
