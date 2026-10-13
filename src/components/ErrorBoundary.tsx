import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Download, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, showDetails: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Zen Task Calendar caught an unhandled error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleEmergencyExport = () => {
    try {
      const rawTasks = localStorage.getItem('noteapp_tasks_v1');
      const rawLists = localStorage.getItem('noteapp_lists_v1');

      const tasks = rawTasks ? JSON.parse(rawTasks) : [];
      const lists = rawLists ? JSON.parse(rawLists) : [];

      const emergencyBackup = {
        exportedAt: new Date().toISOString(),
        tasks,
        lists,
      };

      const blob = new Blob([JSON.stringify(emergencyBackup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zen-emergency-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to export emergency backup. Please check your browser developer tools.');
    }
  };

  private handleResetCache = () => {
    if (window.confirm('This will clear the app cache and reload. Your exported backups remain safe on your device. Continue?')) {
      try {
        localStorage.removeItem('noteapp_tasks_v1');
        localStorage.removeItem('noteapp_lists_v1');
        window.location.reload();
      } catch {
        window.location.reload();
      }
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#fffaf8] text-gray-800 font-sans">
          <div className="max-w-md w-full bg-white/95 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-pink-100 shadow-[0_16px_50px_rgba(244,114,182,0.12)] text-center animate-slide-up-fade">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-400">
              <AlertCircle size={32} />
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">
              A Gentle Pause 🌸
            </h1>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Something unexpected happened, but your notes and progress remain safely stored on this device.
            </p>

            <div className="flex flex-col gap-2.5 mb-6">
              <button
                onClick={this.handleReload}
                className="w-full py-3 px-5 rounded-2xl bg-pink-400 hover:bg-pink-500 text-white font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
              >
                <RefreshCw size={16} />
                Reload Application
              </button>

              <button
                onClick={this.handleEmergencyExport}
                className="w-full py-2.5 px-5 rounded-2xl bg-pink-50 hover:bg-pink-100/70 text-pink-700 font-medium text-xs transition-colors border border-pink-100 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download size={14} />
                Download Emergency Backup (.json)
              </button>
            </div>

            <div className="pt-4 border-t border-pink-50 flex items-center justify-between text-xs text-gray-400">
              <button
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                className="hover:text-pink-500 transition-colors cursor-pointer underline"
              >
                {this.state.showDetails ? 'Hide details' : 'Show details'}
              </button>

              <button
                onClick={this.handleResetCache}
                className="hover:text-rose-500 transition-colors cursor-pointer flex items-center gap-1"
              >
                <RotateCcw size={12} />
                Reset Cache
              </button>
            </div>

            {this.state.showDetails && this.state.error && (
              <div className="mt-4 p-3 rounded-xl bg-gray-50 text-left border border-gray-100 text-[11px] font-mono text-gray-600 max-h-40 overflow-y-auto">
                <p className="font-semibold text-rose-600 mb-1">{this.state.error.name}: {this.state.error.message}</p>
                <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
