import { useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { usePWAInstall, triggerInstallDialog } from '../hooks/usePWAInstall';

function InstallPWAComponent() {
  const { showInstallDialog, showDialog, dismissDialog, triggerInstall } = usePWAInstall();

  useEffect(() => {
    const handler = () => showDialog();
    window.addEventListener('showInstallDialog', handler);
    return () => window.removeEventListener('showInstallDialog', handler);
  }, [showDialog]);

  if (!showInstallDialog) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={dismissDialog} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <button
          onClick={dismissDialog}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0 mb-4">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Install TodoList Pro
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Add to home screen for quick access
          </p>
          <button
            onClick={triggerInstall}
            className="w-full py-3 px-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}

export default InstallPWAComponent;