export const INTRO_STORAGE_KEY = 'ab_intro_seen';

// La intro se muestra una sola vez por sesión y nunca si el usuario pidió menos movimiento
export function debeMostrarIntro() {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    return sessionStorage.getItem(INTRO_STORAGE_KEY) !== '1';
  } catch {
    return true;
  }
}
