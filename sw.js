
const cacheName = "mdbfiles";
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
  "/assets/js/notes.js",
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
      console.log(file);
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

function isCacheExpired(cacheDate, url) {
  if (/(png|jpg|jpeg|svg)$/i.test(url)) {
    // If current time is greater than (cached time + the longer expiry), then it is expired
    return (cacheDate.getTime() + cacheExpiry.images) < Date.now();
  } else {
    // For non-images, use the default expiry
    return (cacheDate.getTime() + cacheExpiry.default) < Date.now();
  }
}

async function cacheResponseWithTimestamp(request, response) {
  const clonedResponse = response.clone();
  const headers = new Headers(clonedResponse.headers);

  headers.append('X-Cache-Timestamp', Date.now().toString());

  const timestampedResponse = new Response(clonedResponse.body, {
    status: clonedResponse.status,
    statusText: clonedResponse.statusText,
    headers: headers
  });

  const cache = await caches.open(cacheName);
  await cache.put(request, timestampedResponse);
}
async function staleWhileRevalidate(ev) {

  try {
    const [cachedResponse, cache] = await Promise.all([
      caches.match(ev.request),
      caches.open(cacheName)
    ]);

    if (cachedResponse) {
      const cachedTimestamp = cachedResponse.headers.get('X-Cache-Timestamp');
      if (cachedTimestamp) {
        const cacheDate = new Date(parseInt(cachedTimestamp));
        if (!isCacheExpired(cacheDate, ev.request.url)) {
          console.log(`${ev.request.url} from cache`);
          return cachedResponse;
        } else {
          console.log(`${ev.request.url} is expired`);
        }
      }
    }

    try {
      const fetchResponse = await fetch(ev.request);
      if (fetchResponse && fetchResponse.status === 200) {
        await cacheResponseWithTimestamp(ev.request, fetchResponse);
      }
      return fetchResponse;
    } catch (err) {
      console.log(err);
      if (cachedResponse) {
        console.log(`${ev.request.url} from cache because fetching failed`);
        return cachedResponse;
      }
      throw new Error('Nothing to respond with');
    }
  } catch (err) {
    log.cached = true;
    console.error('Handling fetch event failed', err);
    const cache = await caches.open(cacheName);
    if (/(png|jpg|jpeg)$/i.test(ev.request.url)) {
      console.log(`${ev.request.url} replaced by logo`);
      return await cache.match("/images/logo.jpg");
    } else {
      console.log(`${ev.request.url} replaced by 404`);
      return await cache.match("/404");
    }
  }
}

self.addEventListener('activate', function(event) {
    console.log('Claiming control');
    return self.clients.claim();
  });