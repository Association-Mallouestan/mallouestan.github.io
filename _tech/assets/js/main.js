async function registerServiceWorker() {
    const sw_registeration = Date.now();

    const local_sw_registeration = localStorage.getItem("sw_registeration");

    console.log(`local_sw_registeration: ${local_sw_registeration}`);
    console.log(`sw_registeration: ${sw_registeration}`);

    async function installSw(){
        try {
            const registration = await navigator.serviceWorker.register(
            "/sw.js"
            );
            localStorage.setItem("sw_registeration", sw_registeration);
            console.log(
            "Service Worker registered with scope:",
            registration.scope
            );
        } catch (error) {
            console.error("Service Worker registration failed:", error);
        }
    }

    if ("serviceWorker" in navigator) {

        if(local_sw_registeration && local_sw_registeration + 36000 > sw_registeration) {
            console.log(`It would seem that the registered service worker is still valid`);
            if((await navigator.serviceWorker.getRegistrations()).length == 0) {
                console.log("But no service worker running");
                await installSw();
            }
        } else {
            console.log(`The registered service worker is expired or not registered`);
            await Promise.all((await navigator.serviceWorker.getRegistrations()).map(sw => sw.unregister()));
            await installSw();
        }
    }
  }

  registerServiceWorker();
