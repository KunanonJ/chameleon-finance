import { useState } from 'react';
import { getTypeColor, getTypeLabel } from '@shared/lib/financeConstants';
import { LOGO_API_TOKEN, getColor } from '@shared/lib/constants';

export default function FinanceRecordCard({ record, onEdit, onRemove }) {
  const typeColor = getTypeColor(record.type);
  const hasIncome = record.income > 0;
  const hasExpense = record.expenses > 0;
  const [iconError, setIconError] = useState(false);

  const logoUrl = record.iconDomain && record.iconDomain.length >= 4
    ? `https://img.logo.dev/${record.iconDomain}?token=${LOGO_API_TOKEN}&size=100&retina=true&format=png`
    : null;

  const initial = (record.description || '?')[0].toUpperCase();
  const color = record.color ? getColor(record.color) : null;

  return (
    <div
      className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
      onClick={() => onEdit(record.id)}
    >
      {/* Color bar */}
      {color && (
        <div
          className="h-10 w-1 shrink-0 rounded-full"
          style={{ background: `linear-gradient(180deg, ${color.bg} 0%, ${color.accent} 100%)` }}
        />
      )}

      {/* Brand icon or fallback initial */}
      {record.customIcon ? (
        <img
          src={record.customIcon}
          className="h-10 w-10 shrink-0 rounded-lg object-cover"
          alt={record.description}
        />
      ) : logoUrl && !iconError ? (
        <img
          src={logoUrl}
          className="h-10 w-10 shrink-0 rounded-lg object-contain"
          crossOrigin="anonymous"
          alt={record.description}
          onError={() => setIconError(true)}
        />
      ) : (
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
          style={{ backgroundColor: typeColor }}
        >
          {initial}
        </div>
      )}

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-bold text-slate-900 dark:text-slate-100">
            {record.description}
          </span>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: typeColor + '20', color: typeColor }}
          >
            {getTypeLabel(record.type)}
          </span>
          {record.done && (
            <svg className="h-4 w-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>{record.date}</span>
          {record.dueDate && <span>Due: {record.dueDate}</span>}
          {record.paymentMethod && <span>{record.paymentMethod}</span>}
        </div>
      </div>

      {/* Amount */}
      <div className="shrink-0 text-right">
        {hasIncome && (
          <div className="text-sm font-bold text-green-600 dark:text-green-400">
            +{record.income.toLocaleString()}
          </div>
        )}
        {hasExpense && (
          <div className="text-sm font-bold text-red-600 dark:text-red-400">
            -{record.expenses.toLocaleString()}
          </div>
        )}
        {!hasIncome && !hasExpense && (
          <div className="text-sm font-bold text-slate-400 dark:text-slate-500">-</div>
        )}
        {record.balance > 0 && (
          <div className="text-xs text-slate-400 dark:text-slate-500">
            Bal: {record.balance.toLocaleString()}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(record.id); }}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-indigo-400"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(record.id); }}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-red-400"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
