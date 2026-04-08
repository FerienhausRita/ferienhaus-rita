"use client";

import { useState } from "react";
import {
  createTask,
  toggleTaskStatus,
  deleteTask,
} from "@/app/(admin)/admin/actions";

interface Task {
  id: string;
  booking_id: string | null;
  apartment_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  category: string;
  status: string;
  created_at: string;
}

interface TaskListProps {
  initialTasks: Task[];
}

const categoryConfig: Record<string, { label: string; color: string }> = {
  anreise: { label: "Anreise", color: "bg-blue-100 text-blue-700" },
  abreise: { label: "Abreise", color: "bg-violet-100 text-violet-700" },
  reinigung: { label: "Reinigung", color: "bg-cyan-100 text-cyan-700" },
  wartung: { label: "Wartung", color: "bg-orange-100 text-orange-700" },
  allgemein: { label: "Allgemein", color: "bg-stone-100 text-stone-600" },
};

const apartments = [
  { id: "edelweiss", name: "Edelweiss" },
  { id: "alpenrose", name: "Alpenrose" },
  { id: "bergkristall", name: "Bergkristall" },
  { id: "sonnblick", name: "Sonnblick" },
];

export default function TaskList({ initialTasks }: TaskListProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [filter, setFilter] = useState<"alle" | "offen" | "erledigt">("offen");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  // New task form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("allgemein");
  const [apartmentId, setApartmentId] = useState("");

  const filteredTasks = tasks.filter((t) => {
    if (filter === "offen") return t.status === "offen";
    if (filter === "erledigt") return t.status === "erledigt";
    return true;
  });

  const openCount = tasks.filter((t) => t.status === "offen").length;
  const doneCount = tasks.filter((t) => t.status === "erledigt").length;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading("create");
    const result = await createTask({
      title: title.trim(),
      description: description.trim() || undefined,
      due_date: dueDate || undefined,
      category,
      apartment_id: apartmentId || undefined,
    });

    if (result.success) {
      // Optimistic add
      setTasks((prev) => [
        {
          id: crypto.randomUUID(),
          booking_id: null,
          apartment_id: apartmentId || null,
          title: title.trim(),
          description: description.trim() || null,
          due_date: dueDate || null,
          category,
          status: "offen",
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setTitle("");
      setDescription("");
      setDueDate("");
      setCategory("allgemein");
      setApartmentId("");
      setShowForm(false);
    }
    setLoading(null);
  };

  const handleToggle = async (task: Task) => {
    setLoading(`toggle-${task.id}`);
    const result = await toggleTaskStatus(task.id, task.status);
    if (result.success) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, status: t.status === "offen" ? "erledigt" : "offen" }
            : t
        )
      );
    }
    setLoading(null);
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Aufgabe wirklich löschen?")) return;
    setLoading(`delete-${taskId}`);
    const result = await deleteTask(taskId);
    if (result.success) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }
    setLoading(null);
  };

  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil(
      (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    const formatted = date.toLocaleDateString("de-AT", {
      day: "2-digit",
      month: "2-digit",
    });

    if (diff < 0)
      return { text: `${formatted} (überfällig)`, className: "text-red-500" };
    if (diff === 0)
      return { text: `${formatted} (heute)`, className: "text-amber-600" };
    if (diff === 1)
      return { text: `${formatted} (morgen)`, className: "text-amber-600" };
    return { text: formatted, className: "text-stone-500" };
  };

  return (
    <>
      {/* Filter tabs + Add button */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
          {[
            { key: "offen" as const, label: `Offen (${openCount})` },
            { key: "erledigt" as const, label: `Erledigt (${doneCount})` },
            { key: "alle" as const, label: "Alle" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                filter === f.key
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-xl transition-colors shrink-0"
        >
          + Neue Aufgabe
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-2xl border border-stone-200 p-5 mb-6 space-y-3"
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Aufgabe..."
            className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
            autoFocus
            required
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Beschreibung (optional)"
            rows={2}
            className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50 resize-none"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Fällig am
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Kategorie
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
              >
                {Object.entries(categoryConfig).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Wohnung
              </label>
              <select
                value={apartmentId}
                onChange={(e) => setApartmentId(e.target.value)}
                className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
              >
                <option value="">Keine</option>
                {apartments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={loading === "create" || !title.trim()}
              className="px-5 py-2.5 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {loading === "create" ? "Erstellen..." : "Erstellen"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-800 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {/* Task list */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
            <p className="text-stone-500">
              {filter === "offen"
                ? "Keine offenen Aufgaben"
                : filter === "erledigt"
                ? "Keine erledigten Aufgaben"
                : "Keine Aufgaben vorhanden"}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const cat = categoryConfig[task.category] ?? categoryConfig.allgemein;
            const due = task.due_date ? formatDueDate(task.due_date) : null;
            const isDone = task.status === "erledigt";

            return (
              <div
                key={task.id}
                className={`bg-white rounded-2xl border border-stone-200 px-5 py-4 flex items-start gap-3 transition-opacity ${
                  isDone ? "opacity-60" : ""
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => handleToggle(task)}
                  disabled={loading !== null}
                  className={`mt-0.5 shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                    isDone
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-stone-300 hover:border-[#c8a96e]"
                  }`}
                >
                  {isDone && (
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-sm font-medium ${
                        isDone
                          ? "line-through text-stone-400"
                          : "text-stone-900"
                      }`}
                    >
                      {task.title}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${cat.color}`}
                    >
                      {cat.label}
                    </span>
                    {task.apartment_id && (
                      <span className="text-xs text-stone-400">
                        {apartments.find((a) => a.id === task.apartment_id)
                          ?.name ?? task.apartment_id}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-sm text-stone-500 mt-0.5">
                      {task.description}
                    </p>
                  )}
                  {due && (
                    <p className={`text-xs mt-1 ${due.className}`}>
                      {due.text}
                    </p>
                  )}
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(task.id)}
                  disabled={loading !== null}
                  className="shrink-0 p-1.5 text-stone-300 hover:text-red-500 transition-colors"
                  title="Löschen"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                    />
                  </svg>
                </button>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
