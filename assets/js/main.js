async function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register(
          "/assets/js/sw.js"
        );
        console.log(
          "Service Worker registered with scope:",
          registration.scope
        );
      } catch (error) {
        console.error("Service Worker registration failed:", error);
      }
    }
  }

  registerServiceWorker();
