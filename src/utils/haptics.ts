// Haptic feedback utility for mobile and tactile web devices

export const hapticLight = () => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(12);
    } catch {
      // Ignore vibration errors if blocked by browser policy
    }
  }
};

export const hapticSuccess = () => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([15, 45, 18]);
    } catch {
      // Ignore vibration errors
    }
  }
};

export const hapticCelebration = () => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([20, 40, 20, 40, 35]);
    } catch {
      // Ignore vibration errors
    }
  }
};

export const hapticWarning = () => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(28);
    } catch {
      // Ignore vibration errors
    }
  }
};
