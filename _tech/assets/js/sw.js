import {urls as precacheUrls} from "./precache.js";

const cacheName = "mdbfiles2";

const cacheExpiry = {
  default: 36e3, //1h
  images: 120*36e5 //5j
}

let timestamp = 0;

async function KVStoreFactory() {
  const kvstore = {}; 
  kvstore.cache = await caches.open(cacheName + '_kvstore'); // Open (or create) a cache
  
  kvstore.setKV = async function setKV(key, value) {
    const response = new Response(JSON.stringify(value)); // Convert value to response
    await kvstore.cache.put(key, response); // Store it in cache
  };

  kvstore.getKV = async function getKV(key) {
    const response = await kvstore.cache.match(key); // Try to find the response
    return response ? await response.json() : null; // Parse JSON if exists
  };

  return kvstore;
}

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

function isCacheExpired(cachedTimestamp, url) {
  if (/(png|jpg|jpeg|svg)$/i.test(url)) {
    // If current time is greater than (cached time + the longer expiry), then it is expired
    return (cachedTimestamp + cacheExpiry.images) < Date.now();
  } else {
    // For non-images, use the default expiry
    return (cachedTimestamp + cacheExpiry.default) < Date.now();
  }
}

async function cacheResponseWithTimestamp(request, response) {
  const kvstore = await KVStoreFactory();

  await kvstore.setKV(request.url, Date.now());
  const cache = await caches.open(cacheName);
  await cache.put(request, response);
}
async function staleWhileRevalidate(ev) {

  const cache = await caches.open(cacheName);
  const kvstore = await KVStoreFactory();

  try {
    const cachedResponse = await cache.match(ev.request);

    if (cachedResponse) {
      const cachedTimestamp = parseInt(await kvstore.getKV(ev.request.url));
      if (cachedTimestamp) {
        if (!isCacheExpired(cachedTimestamp, ev.request.url)) {
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
        await cacheResponseWithTimestamp(ev.request, fetchResponse.clone());
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