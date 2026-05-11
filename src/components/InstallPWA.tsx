import { X, Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export default function InstallPWA() {
  const { isInstallable, isInstalled, install, dismiss } = usePWAInstall();

  if (!isInstallable || isInstalled) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 border border-gray-200 dark:border-gray-700">
        <button
          onClick={dismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Download className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900 dark:text-white text-sm">
              Install TodoList App
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Add to home screen for quick access
            </p>
          </div>
        </div>
        <button
          onClick={install}
          className="mt-3 w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Install
        </button>
      </div>
    </div>
  );
}