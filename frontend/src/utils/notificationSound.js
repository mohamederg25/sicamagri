/**
 * notificationSound — Play alert sounds using Web Audio API
 * ==========================================================
 *
 * Generates alert sounds programmatically — no audio files needed.
 * Uses the Web Audio API for cross-browser compatibility.
 *
 * Functions:
 *   playCriticalAlert()  — 3 rapid beeps (alarm-like)
 *   playWarningAlert()   — 2 slower beeps
 *   playInfoAlert()      — 1 soft beep
 *   setSoundEnabled(on)  — Enable/disable all sounds (persisted to localStorage)
 *   isSoundEnabled()     — Check if sounds are enabled
 */

const SOUND_STORAGE_KEY = 'pep_notification_sound';

let audioCtx = null;

/**
 * Get or create the AudioContext (lazy init).
 * Chrome requires user interaction before creating AudioContext.
 */
const getAudioContext = () => {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null; // Web Audio API not supported
    }
  }
  // Resume if suspended (needed after page load, before user interaction)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

/**
 * Play a tone at the given frequency for the given duration.
 */
const playTone = (freq, duration, type = 'sine', volume = 0.3) => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, ctx.currentTime);

  // Fade in/out to avoid clicks
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
  gainNode.gain.setValueAtTime(volume, ctx.currentTime + duration - 0.05);
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
};

/**
 * Play 3 rapid high-pitched beeps for critical alerts.
 */
export const playCriticalAlert = () => {
  if (!isSoundEnabled()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // First beep
  playTone(880, 0.15, 'square', 0.25);
  // Second beep (slightly higher)
  setTimeout(() => playTone(1100, 0.15, 'square', 0.25), 200);
  // Third beep (even higher)
  setTimeout(() => playTone(1320, 0.2, 'sawtooth', 0.2), 400);
};

/**
 * Play 2 medium beeps for warning alerts.
 */
export const playWarningAlert = () => {
  if (!isSoundEnabled()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  // First beep
  playTone(660, 0.2, 'triangle', 0.2);
  // Second beep
  setTimeout(() => playTone(660, 0.25, 'triangle', 0.2), 300);
};

/**
 * Play 1 soft beep for info alerts.
 */
export const playInfoAlert = () => {
  if (!isSoundEnabled()) return;

  playTone(520, 0.2, 'sine', 0.15);
};

/**
 * Enable or disable notification sounds (persisted).
 */
export const setSoundEnabled = (on) => {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, on ? 'true' : 'false');
  } catch { /* ignore */ }
};

/**
 * Check if notification sounds are enabled.
 */
export const isSoundEnabled = () => {
  try {
    const val = localStorage.getItem(SOUND_STORAGE_KEY);
    // Default to true (sounds enabled)
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
};

/**
 * Toggle sound on/off — returns the new state.
 */
export const toggleSound = () => {
  const next = !isSoundEnabled();
  setSoundEnabled(next);
  return next;
};
