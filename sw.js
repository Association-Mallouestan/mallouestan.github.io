
const cacheName = "ocv2";
const cacheAddUrls = [
  "/id", 
  "/", 
  "/404", 
  "/assets/main.css", 
  "/images/logo.jpg",
  "https://unpkg.com/ionicons@4.5.0/dist/fonts/ionicons.woff2?v=4.5.0-3",
  "https://unpkg.com/ionicons@4.5.0/dist/fonts/ionicons.woff2",
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap",
  "https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2",
  "/assets/js/scripts.js",
  "/assets/js/main.js",
  "/assets/js/common.js",
  "https://unpkg.com/ionicons@4.5.0/dist/css/ionicons.min.css",
  "/images/favicons/android-chrome-192x192.png",
  "/images/favicons/favicon.ico"
];
const cacheExpiry = {
  default: 3600000, //1h
  images: 120*3600000 //5j
}

let timestamp = 0;

async function initialCacheLoad(){
  console.debug("Loading initial data")
  
  // console.debug("    Fetching the files listed in sitemap")
  let response = await fetch("/sitemap.xml").then(t => t.text());
  const urls = response.matchAll(/<loc>\/(.*)<.loc>/g).map(e => e[1]);
  const cache = await caches.open(cacheName);


  // console.debug(`      Adding ${urls.length} files to the cache`)
  await Promise.all(urls.map(async (file) => {
      return cache.add(file);
  }));

  // console.debug(`      Adding ${cacheAddUrls.length} files to the cache`)
  await Promise.all(cacheAddUrls.map(async (file) => {
    return cache.add(file);
}));
}

// Installing the Service Worker
self.addEventListener("install", async (event) => {
  console.debug("Installing service worker");
  try {
    await initialCacheLoad();
  } catch (error) {
    console.error("Service Worker installation failed:", error);
  }
});

self.addEventListener("fetch", (ev) => {
  ev.respondWith(staleWhileRevalidate(ev));
});

function isCacheExpired(cacheDate, url){
  if(/(png|jpg|jpeg|svg)$/i.test(url)){
    return cacheDate.getTime() + cacheExpiry.images > Date.now();
  } else {
    return cacheDate.getTime() + cacheExpiry.default > Date.now();
  }
}

async function staleWhileRevalidate(ev) {
  try {
    // Return the cache response
    // Revalidate as well and update cache
    const [cacheResponse, cache] = await Promise.all([
      caches.match(ev.request),
      caches.open(cacheName)
    ]);

    if(cacheResponse){
      let cacheDateParent = cacheResponse.clone().headers.entries().find(e => e[0] == "date");
      if(cacheDateParent){
        let cacheDate = new Date(cacheDateParent[1]);
        if(isCacheExpired(cacheDate, ev.request.url)){
          console.log(`Serving ${ev.request.url} from cache stored at ${cacheDate}`);
          return cacheResponse;
        } else {
          console.log(`Cache has expired for ${ev.request.url}, age: ${(Date.now() - cacheDate.getTime())/1000}`)
        }
      }
    } 
    try {
      const fetchResponse = await fetch(ev.request);
      cache.put(ev.request, fetchResponse.clone())
        .then(a => console.log(`Storing ${ev.request.url} in cache`));
      console.log(`Serving ${ev.request.url} from network`)
      return fetchResponse;
    } catch (err) {
      // Most likely no internet
      if(cacheResponse) {
        return cacheResponse;
      } 
      throw "Nothing to respond";
    }


  } catch (err) {
    const cache = await caches.open(cacheName);
    if(/(png|jpg|jpeg)$/i.test(ev.request.url)){
      console.log(`    Detecting image request so substituting with logo`)
      return await cache.match("/images/logo.jpg");
    } else {
      console.log(err);
      return await cache.match("/404");
    }
  }
}

self.addEventListener('activate', function(event) {
    console.log('Claiming control');
    return self.clients.claim();
  });

