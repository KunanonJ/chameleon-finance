const views = [
  { id: 'treemap', label: 'Treemap', icon: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 12a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
    </svg>
  )},
  { id: 'beeswarm', label: 'Beeswarm', icon: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="12" cy="8" r="2.5" />
      <circle cx="12" cy="16" r="2.5" />
      <circle cx="18" cy="12" r="2.5" />
    </svg>
  )},
  { id: 'circlepack', label: 'Circles', icon: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <circle cx="12" cy="12" r="9" strokeWidth={2} />
      <circle cx="10" cy="10" r="4" strokeWidth={1.5} />
      <circle cx="15" cy="14" r="3" strokeWidth={1.5} />
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
    <div className="inline-flex rounded-xl bg-slate-100 p-1">
      {views.map((view) => {
        const isActive = currentView === view.id;
        return (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              isActive
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
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
