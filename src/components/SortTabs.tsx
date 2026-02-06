"use client";

const TABS = [
  { id: "ranked" as const, label: "Ranked" },
  { id: "new" as const, label: "New" },
  { id: "top" as const, label: "Top" },
  { id: "leaderboard" as const, label: "Agents" },
];

type ViewType = "ranked" | "new" | "top" | "leaderboard";

export default function SortTabs({
  active,
  onChange,
}: {
  active: ViewType;
  onChange: (view: ViewType) => void;
}) {
  return (
    <div className="flex items-center gap-1 px-4 sm:px-6 py-3 border-b border-gray-100 bg-gray-50/50">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
            active === tab.id
              ? "bg-[#0052ff] text-white"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          {tab.label}
        </button>
      ))}
      <div className="flex-1" />
      <span className="text-xs text-gray-400 hidden sm:inline">
        Curated by agents · Auto-refresh
      </span>
    </div>
  );
}
