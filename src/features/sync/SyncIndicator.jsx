import { useSheetsSync } from '@features/sync/useSheetsSync';

export default function SyncIndicator() {
  const { syncStatus, isConnected, lastSyncTime } = useSheetsSync();

  const connected = isConnected();

  if (!connected) return null;

  const statusConfig = {
    idle: {
      dot: 'bg-green-500 animate-pulse',
      text: 'Synced',
      textColor: 'text-green-600 animate-pulse',
    },
    syncing: {
      dot: 'bg-indigo-500 animate-pulse',
      text: 'Syncing...',
      textColor: 'text-indigo-600',
    },
    error: {
      dot: 'bg-red-500',
      text: 'Sync error',
      textColor: 'text-red-600',
    },
    offline: {
      dot: 'bg-slate-400',
      text: 'Offline',
      textColor: 'text-slate-500',
    },
  };

  const config = statusConfig[syncStatus] || statusConfig.idle;

  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      <span className={`text-xs font-medium ${config.textColor}`}>
        {config.text}
      </span>
    </div>
  );
}
