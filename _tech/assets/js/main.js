import { register } from "./serviceWorkerRegistration.js";
import { bootstrap } from "./standalone.js"

// Register the service worker managing the cache
register();

// Check if the site is running in standalone mode (PWA) 
if (window.matchMedia("(display-mode: standalone)").matches) {
    bootstrap();
} 