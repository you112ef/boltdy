/**
 * Mobile utility functions for bolt.diy
 */

export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768;
}

export function isTablet(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth > 768 && window.innerWidth <= 1024;
}

export function isDesktop(): boolean {
  if (typeof window === 'undefined') return true;
  return window.innerWidth > 1024;
}

export function getTouchTargetSize(): string {
  return isMobile() ? 'var(--mobile-touch-target)' : '2rem';
}

export function getMobilePadding(): string {
  return isMobile() ? 'var(--mobile-padding)' : '1rem';
}

export function getResponsiveFontSize(base: string = '1rem'): string {
  if (typeof window === 'undefined') return base;
  
  if (isMobile()) {
    return 'var(--mobile-font-scale)';
  }
  return base;
}

export function handleMobileViewport() {
  if (typeof window === 'undefined') return;

  // Handle viewport height on mobile browsers
  const setVH = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  setVH();
  window.addEventListener('resize', setVH);
  window.addEventListener('orientationchange', setVH);
}

export function preventZoomOnInput() {
  if (typeof window === 'undefined') return;

  // Prevent zoom on input focus for iOS
  const inputs = document.querySelectorAll('input, textarea, select');
  inputs.forEach((input) => {
    const element = input as HTMLInputElement;
    if (element.style.fontSize !== '16px') {
      element.style.fontSize = '16px';
    }
  });
}

export function setupMobileEventListeners() {
  if (typeof window === 'undefined') return;

  // Handle safe area insets
  const updateSafeArea = () => {
    const safeAreaTop = getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)') || '0px';
    const safeAreaBottom = getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)') || '0px';
    const safeAreaLeft = getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-left)') || '0px';
    const safeAreaRight = getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-right)') || '0px';

    document.documentElement.style.setProperty('--safe-area-top', safeAreaTop);
    document.documentElement.style.setProperty('--safe-area-bottom', safeAreaBottom);
    document.documentElement.style.setProperty('--safe-area-left', safeAreaLeft);
    document.documentElement.style.setProperty('--safe-area-right', safeAreaRight);
  };

  updateSafeArea();
  window.addEventListener('resize', updateSafeArea);
  window.addEventListener('orientationchange', updateSafeArea);
}

export class MobileUtils {
  static init() {
    console.log('Initializing mobile utilities');
    handleMobileViewport();
    preventZoomOnInput();
    setupMobileEventListeners();
  }

  static addTouchEvents() {
    if (typeof window === 'undefined') return;

    // Add touch-friendly click events
    document.addEventListener('touchstart', () => {}, { passive: true });
    document.addEventListener('touchmove', () => {}, { passive: true });
    document.addEventListener('touchend', () => {}, { passive: true });
  }

  static optimizeScrolling() {
    if (typeof window === 'undefined') return;

    // Optimize scrolling performance
    const scrollableElements = document.querySelectorAll('[data-scrollable]');
    scrollableElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      htmlElement.style.webkitOverflowScrolling = 'touch';
      htmlElement.style.overscrollBehavior = 'contain';
    });
  }
}