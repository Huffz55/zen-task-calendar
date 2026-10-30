// Haptic feedback utility for mobile and tactile web devices

export const SETTINGS_HAPTIC_KEY = 'zen_setting_haptic';

let isHapticsEnabled = true;

if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem(SETTINGS_HAPTIC_KEY);
    if (saved !== null) {
      isHapticsEnabled = saved === 'true';
    }
  } catch {}
}

export const setGlobalHapticsEnabled = (enabled: boolean) => {
  isHapticsEnabled = enabled;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SETTINGS_HAPTIC_KEY, String(enabled));
    } catch {}
  }
};

export const isHapticsGloballyEnabled = (): boolean => isHapticsEnabled;

export const hapticLight = () => {
  if (!isHapticsEnabled || typeof window === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(12);
  } catch {}
};

export const hapticSuccess = () => {
  if (!isHapticsEnabled || typeof window === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate([15, 45, 18]);
  } catch {}
};

export const hapticCelebration = () => {
  if (!isHapticsEnabled || typeof window === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate([20, 40, 20, 40, 35]);
  } catch {}
};

export const hapticWarning = () => {
  if (!isHapticsEnabled || typeof window === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(28);
  } catch {}
};
