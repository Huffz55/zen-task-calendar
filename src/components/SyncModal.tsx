import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Cloud, Smartphone, ArrowRight, ShieldCheck, RefreshCw, Sparkles } from 'lucide-react';
import { getSyncKey, isValidSyncKey, generateSyncKey } from '../services/storage/syncKeyManager';
import { switchGlobalSyncKey } from '../services/storage/taskStorage';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (toast: { type?: 'success' | 'error' | 'info'; title?: string; message: string }) => void;
}

export function SyncModal({ isOpen, onClose, onShowToast }: SyncModalProps) {
  const [currentKey, setCurrentKey] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentKey(getSyncKey());
      setInputKey('');
      setErrorMsg('');
      setCopied(false);
      setShowUnlinkConfirm(false);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onShowToast({
        type: 'info',
        title: 'Copied',
        message: 'Sync key copied to clipboard 📋',
      });
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerateNewKey = () => {
    const newKey = generateSyncKey();
    const success = switchGlobalSyncKey(newKey);
    if (success) {
      setCurrentKey(newKey);
      setShowUnlinkConfirm(false);
      onShowToast({
        type: 'success',
        title: 'New Workspace Created 🌸',
        message: `Switched to new workspace: ${newKey}`,
      });
    }
  };

  const handleConnect = () => {
    setErrorMsg('');
    const cleaned = inputKey.trim().toUpperCase();

    if (!cleaned) {
      setErrorMsg('Please enter the pairing key of the device you want to connect to.');
      return;
    }

    if (cleaned === currentKey) {
      setErrorMsg('This code is already the active key for this device.');
      return;
    }

    if (!isValidSyncKey(cleaned)) {
      setErrorMsg("Invalid format! Key must follow the 'ZEN-XXXX-XXXX' format.");
      return;
    }

    setIsConnecting(true);
    try {
      const success = switchGlobalSyncKey(cleaned);
      if (success) {
        setCurrentKey(cleaned);
        onShowToast({
          type: 'success',
          title: 'Device Paired! 🌸',
          message: `Connected to workspace: ${cleaned}. Real-time sync is now active.`,
        });
        onClose();
      } else {
        setErrorMsg('An error occurred during connection.');
      }
    } catch {
      setErrorMsg('Could not establish connection. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-pink-100 overflow-hidden transform transition-all animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-50 flex items-center justify-center text-pink-500">
              <Cloud size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Cloud Sync</h2>
              <p className="text-xs text-gray-400">Instant Real-time Sync across Web & Mobile</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Section 1: Current Device Code */}
          <div className="bg-gradient-to-br from-pink-50/60 to-purple-50/40 p-5 rounded-2xl border border-pink-100/70">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone size={16} className="text-pink-500" />
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Your Sync Key
              </span>
            </div>
            
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              Enter this code on your other devices to sync tasks and lists in real time without refreshing:
            </p>

            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-pink-200 shadow-sm">
              <span className="font-mono text-base font-bold tracking-widest text-pink-600 selection:bg-pink-100">
                {currentKey}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 bg-pink-50 hover:bg-pink-100 text-pink-600 active:scale-95"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-emerald-500" />
                    <span className="text-emerald-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Unlink / Generate New Key */}
            {showUnlinkConfirm ? (
              <div className="mt-3 p-3 bg-rose-50/80 border border-rose-200/80 rounded-xl text-xs flex flex-col gap-2">
                <p className="text-rose-700 font-medium">
                  Are you sure? This device will switch to a new isolated workspace.
                </p>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowUnlinkConfirm(false)}
                    className="px-3 py-1 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateNewKey}
                    className="px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold"
                  >
                    Yes, Unlink
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2.5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowUnlinkConfirm(true)}
                  className="text-[11px] font-medium text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
                >
                  <Sparkles size={12} />
                  <span>Generate New Key (Unlink)</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Pair with Another Device */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <RefreshCw size={16} className="text-gray-500" />
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Pair with Another Device
              </span>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Enter the <strong>ZEN-XXXX-XXXX</strong> code generated on your other device:
            </p>

            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputKey}
                  onChange={(e) => {
                    setInputKey(e.target.value.toUpperCase());
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="e.g. ZEN-7K9P-4X2M"
                  maxLength={13}
                  className="flex-1 px-4 py-2.5 font-mono text-sm uppercase tracking-wider rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400 placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:text-gray-300"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConnect();
                  }}
                />
                <button
                  onClick={handleConnect}
                  disabled={isConnecting || !inputKey.trim()}
                  className="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-40 disabled:hover:bg-pink-500 text-white font-semibold text-sm transition-all duration-200 shadow-sm flex items-center gap-1.5 active:scale-95 shrink-0"
                >
                  <span>Connect</span>
                  <ArrowRight size={15} />
                </button>
              </div>

              {errorMsg && (
                <p className="text-xs font-medium text-rose-500 px-1 animate-shake">
                  ⚠️ {errorMsg}
                </p>
              )}
            </div>
          </div>

          {/* Security Badge */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100 text-[11px] text-gray-400">
            <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
            <span>Your data is privately synced only across devices using this pairing code.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
