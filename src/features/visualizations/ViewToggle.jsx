const views = [
  { id: 'bar', label: 'Bar', icon: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="12" width="4" height="8" rx="1" />
      <rect x="10" y="6" width="4" height="14" rx="1" />
      <rect x="17" y="9" width="4" height="11" rx="1" />
    </svg>
  )},
  { id: 'line', label: 'Line', icon: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="4 18 9 11 14 14 20 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )},
  { id: 'pie', label: 'Pie', icon: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M12 2a10 10 0 0110 10H12V2z" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  )},
  { id: 'area', label: 'Area', icon: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M4 20l4-8 4 4 4-6 4 2v8H4z" fill="currentColor" fillOpacity={0.15} strokeLinejoin="round" />
    </svg>
  )},
  { id: 'treemap', label: 'Treemap', icon: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 12a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
    </svg>
  )},
  { id: 'sankey', label: 'Sankey', icon: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="1" y="4" width="4" height="16" rx="1" />
      <rect x="10" y="3" width="4" height="7" rx="1" />
      <rect x="10" y="14" width="4" height="7" rx="1" />
      <rect x="19" y="6" width="4" height="12" rx="1" />
      <path d="M5 8 C8 8 8 6 10 6" strokeLinecap="round" fill="none" />
      <path d="M5 16 C8 16 8 18 10 18" strokeLinecap="round" fill="none" />
    </svg>
  )},
];

export default function ViewToggle({ currentView, onViewChange }) {
  return (
    <div className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1 dark:bg-slate-700">
      {views.map((view) => {
        const isActive = currentView === view.id;
        return (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
              isActive
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {view.icon}
            <span className="hidden sm:inline">{view.label}</span>
          </button>
        );
      })}
    </div>
  );
}
