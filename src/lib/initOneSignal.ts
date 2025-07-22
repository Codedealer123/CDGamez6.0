// src/lib/onesignal.ts

// Declare the OneSignal global for TypeScript safety
declare global {
  interface Window {
    OneSignalDeferred?: ((sdk: any) => void)[];
  }
}

export function initOneSignal(): void {
  if (typeof window === 'undefined') return; // Skip SSR

  // Ensure deferred array exists
  window.OneSignalDeferred = window.OneSignalDeferred || [];

  // Push the init config into the deferred queue
  window.OneSignalDeferred.push(async function (OneSignal) {
    await OneSignal.init({
      appId: '4adc5515-c922-4e13-a5a1-ca06ebdd15b1',

      // ✅ Show bell icon
      notifyButton: {
        enable: true
      },

      // ✅ Enable on localhost for dev
      allowLocalhostAsSecureOrigin: true
    });
  });

  // Inject the OneSignal SDK script dynamically
  const script = document.createElement('script');
  script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
  script.defer = true;
  document.head.appendChild(script);
}
