import {urls as precacheUrls} from "./precache.js";

const cacheName = "mdbfiles2";

const cacheExpiry = {
  default: 3600000, //1h
  images: 120*3600000 //5j
}

let timestamp = 0;

async function initialCacheLoad(){
  console.debug("Loading initial data")
  
  // console.debug("    Fetching the files listed in sitemap")
  let response = await fetch("/sitemap.xml").then(t => t.text());
  const urls = response.matchAll(/<loc>(.*)<.loc>/g).map(e => e[1]);
  const cache = await caches.open(cacheName);

  await Promise.all(urls.map(url => cache.add(url))); 
  await Promise.all(precacheUrls.map(url => cache.add(url)));
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

  const cache = await caches.open(cacheName);

  try {
    const cachedResponse = await cache.match(ev.request);

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
    console.error('Handling fetch event failed', err);
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