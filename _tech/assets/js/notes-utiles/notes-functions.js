export const customsNotes = new Map(); // local in-memory cache

/**
 * @param {string} action
 * @param {string | null} key
 * @param {Note | null} data
 * @returns {Promise<any>}
 */
export async function handleNoteCache(action, key = null, data = null) {
    const isCacheSupported =
      typeof caches !== "undefined" && typeof caches.open === "function";
    const fullKey = key ? String(key) : null;
  
    const dbPromise = indexedDB.open("NotesDB", 1);
    const db = await new Promise((resolve, reject) => {
      dbPromise.onupgradeneeded = () => {
        const db = dbPromise.result;
        if (!db.objectStoreNames.contains("notes")) {
          db.createObjectStore("notes");
        }
      };
      dbPromise.onsuccess = () => resolve(dbPromise.result);
      dbPromise.onerror = () => reject(dbPromise.error);
    });
  
    const idb = {
      get: async (key) => {
        const tx = db.transaction("notes", "readonly").objectStore("notes");
        return new Promise((resolve, reject) => {
          const req = tx.get(key);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => reject(req.error);
        });
      },
      put: async (key, value) => {
        const tx = db.transaction("notes", "readwrite").objectStore("notes");
        return new Promise((resolve, reject) => {
          const req = tx.put(value, key);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      },
      delete: async (key) => {
        const tx = db.transaction("notes", "readwrite").objectStore("notes");
        return new Promise((resolve, reject) => {
          const req = tx.delete(key);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      },
      getAll: async () => {
        const tx = db.transaction("notes", "readonly").objectStore("notes");
        return new Promise((resolve, reject) => {
          const req = tx.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
      },
    };
  
    switch (action) {
      case "get":
        if (!fullKey) {
          if (isCacheSupported) {
            const cache = await caches.open("custom-notes");
            const responses = await cache.matchAll();
            const results = await Promise.all(responses.map((res) => res.json()));
            results.forEach((note, i) => customsNotes.set(`note-${i}`, note));
            return results;
          }
          const allNotes = await idb.getAll();
          allNotes.forEach((note, i) => customsNotes.set(`note-${i}`, note));
          return allNotes;
        }
  
        if (customsNotes.has(fullKey)) return customsNotes.get(fullKey);
  
        if (isCacheSupported) {
          const cache = await caches.open("custom-notes");
          const match = await cache.match(fullKey);
          if (match) {
            const note = await match.json();
            customsNotes.set(fullKey, note);
            return note;
          }
        }
  
        const idbNote = await idb.get(fullKey);
        if (idbNote) customsNotes.set(fullKey, idbNote);
        return idbNote;
  
      case "put":
        if (!fullKey || !data)
          throw new Error("Key and data are required for 'put'.");
        customsNotes.set(fullKey, data);
  
        if (isCacheSupported) {
          const cache = await caches.open("custom-notes");
          await cache.put(
            fullKey,
            new Response(JSON.stringify(data), {
              headers: { "Content-Type": "application/json" },
            })
          );
        } else {
          await idb.put(fullKey, data);
        }
        break;
  
      case "delete":
        if (!fullKey) throw new Error("Key is required for 'delete'.");
        customsNotes.delete(fullKey);
  
        if (isCacheSupported) {
          const cache = await caches.open("custom-notes");
          await cache.delete(fullKey);
        } else {
          await idb.delete(fullKey);
        }
        break;
  
      default:
        throw new Error(`Unknown cache action: ${action}`);
    }
  }