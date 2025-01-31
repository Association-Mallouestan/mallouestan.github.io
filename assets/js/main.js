async function registerServiceWorker() {
    const swReleaseNumber = 1;

    const localSwNumber = localStorage.getItem("swReleaseNumber");

    async function installSw(){
        try {
            const registration = await navigator.serviceWorker.register(
            "/sw.js"
            );
            localStorage.setItem("swReleaseNumber", swReleaseNumber);
            console.log(
            "Service Worker registered with scope:",
            registration.scope
            );
        } catch (error) {
            console.error("Service Worker registration failed:", error);
        }
    }

    if ("serviceWorker" in navigator) {

        if(localSwNumber && localSwNumber == swReleaseNumber){
            console.log(`It would seem that the registered SW matches current`)
            if((await navigator.serviceWorker.getRegistrations()).length == 0) {
                console.log("But no service worker running");
                await installSw();
            }
        } else {
            console.log(`SW number does not match, hence cleanup`);
            await Promise.all((await navigator.serviceWorker.getRegistrations()).map(sw => sw.unregister()));

            await installSw();
        }
    }
  }

  registerServiceWorker();
