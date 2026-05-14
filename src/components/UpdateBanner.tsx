import { RefreshCw, X } from 'lucide-react';

interface UpdateBannerProps {
  onUpdate: () => void;
  onDismiss: () => void;
  isUpdating?: boolean;
}

export default function UpdateBanner({ onUpdate, onDismiss, isUpdating }: UpdateBannerProps) {
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:max-w-sm bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl shadow-2xl shadow-violet-500/30 border border-white/10 overflow-hidden animate-slide-up z-50">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <RefreshCw className={`w-5 h-5 text-white ${isUpdating ? 'animate-spin' : ''}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm">Update Available</h3>
            <p className="text-white/80 text-xs mt-0.5">A new version is ready. Tap to update.</p>
          </div>
          <button
            onClick={onDismiss}
            className="shrink-0 p-1 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>
        <button
          onClick={onUpdate}
          disabled={isUpdating}
          className="w-full mt-3 py-2 px-4 bg-white text-violet-600 rounded-xl font-medium text-sm hover:bg-white/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isUpdating ? (
            <>Updating...</>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Update Now
            </>
          )}
        </button>
      </div>
    </div>
  );
}