import Link from "next/link";

interface SortHeaderProps {
  column: string;
  label: string;
  currentSort?: string;
  currentDir?: string;
  searchParams?: Record<string, string | undefined>;
  align?: "left" | "right" | "center";
}

/**
 * Klickbarer Spaltenheader für sortierbare Tabellen.
 * Nutzt URL-SearchParams – kein Client-JS nötig.
 */
export default function SortHeader({
  column,
  label,
  currentSort,
  currentDir,
  searchParams = {},
  align = "left",
}: SortHeaderProps) {
  const isActive = currentSort === column;
  const nextDir = isActive && currentDir === "asc" ? "desc" : isActive && currentDir === "desc" ? "asc" : "asc";

  // Preserve existing search params (filter, search, etc.)
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value && key !== "sort" && key !== "dir") {
      params.set(key, value);
    }
  }
  params.set("sort", column);
  params.set("dir", nextDir);

  const alignClass =
    align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";

  return (
    <th className={`px-5 py-3 font-medium`}>
      <Link
        href={`?${params.toString()}`}
        className={`inline-flex items-center gap-1 ${alignClass} hover:text-[#c8a96e] transition-colors ${
          isActive ? "text-[#c8a96e]" : ""
        }`}
      >
        {label}
        <span className="inline-flex flex-col text-[8px] leading-none">
          <span className={isActive && currentDir === "asc" ? "text-[#c8a96e]" : "text-stone-300"}>
            ▲
          </span>
          <span className={isActive && currentDir === "desc" ? "text-[#c8a96e]" : "text-stone-300"}>
            ▼
          </span>
        </span>
      </Link>
    </th>
  );
}
