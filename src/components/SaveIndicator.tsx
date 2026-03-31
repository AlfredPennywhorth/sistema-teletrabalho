import { Cloud, Check, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../utils/cn';

export function SaveIndicator() {
  const { isSyncing } = useStore();

  return (
    <div className={cn(
      "fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border transition-all duration-500 z-50",
      isSyncing 
        ? "bg-blue-50 border-blue-200 text-blue-600 translate-y-0 opacity-100" 
        : "bg-emerald-50 border-emerald-200 text-emerald-600 translate-y-2 opacity-0 pointer-events-none"
    )}>
      {isSyncing ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs font-medium">Sincronizando...</span>
        </>
      ) : (
        <>
          <Cloud className="w-4 h-4" />
          <Check className="w-3 h-3 -ml-2 -mb-2" />
          <span className="text-xs font-medium">Salvo na nuvem</span>
        </>
      )}
    </div>
  );
}
