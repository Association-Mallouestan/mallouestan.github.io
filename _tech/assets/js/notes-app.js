import escapeStringRegexp from "escape-string-regexp";

function uuidv4() {
  return "00000000-0000-0000-8000-000000000000".replace(/[018]/g, (c) =>
    (
      +c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))
    ).toString(16)
  );
}

if (!window.uuid) window.uuid = uuidv4();

/** Global Variables */
const priorities_icons = [
  "sunny-outline",
  "cloudy-outline",
  "rainy-outline",
  "thunderstorm-outline",
  "skull-outline",
];

const mainChannel = new BroadcastChannel("notes_channel");
const customsNotes = new Map(); // local in-memory cache

/** Cache Note Manager */

/**
 * @param {string} action
 * @param {string | null} key
 * @param {Note | null} data
 * @returns {Promise<any>}
 */
async function handleNoteCache(action, key = null, data = null) {
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

/** BroadCast Notes  */

/**
 * @param {string} action
 * @param {Note} note
 * @returns
 */
function takeActions(action, note = undefined) {
  console.log(action);

  switch (action) {
    case "getAll":
      return handleNoteCache("get");
    case "save":
      return handleNoteCache(
        "put",
        `${
          /global/.test(note.paragrapheLink)
            ? "/global"
            : note.paragrapheLink.match(/\/r\/[^#]+/)[0]
        }-${note.id}`,
        note
      );
    case "delete":
      return handleNoteCache(
        "delete",
        `${
          /global/.test(note.paragrapheLink)
            ? "/global"
            : note.paragrapheLink.match(/\/r\/[^#]+/)[0]
        }-${note.id}`
      );
    default:
      throw new Error("Bad auction");
  }
}

/**
 * @param {Note} note
 * @param {boolean} needPath
 */
function renderNoteDisplay(note, needPath = true) {
  const {
    id,
    noteContent,
    color,
    pin,
    priority,
    paragrapheLink,
    selectionData,
  } = note;

  const mainContainer = document.getElementById("note-tag");
  const subContainer = document.createElement("div");
  subContainer.classList.add("note");

  const selectedText = selectionData?.selectedText ?? "";

  const container = document.createElement("code");
  container.id = note.id;
  container.classList.add("note-display", "is-pinned");

  const currentColor = Number.isInteger(color) ? color : 0;
  container.setAttribute("ccolor", currentColor);

  const inputElement = document.createElement("textarea");
  inputElement.wrap = "soft";
  inputElement.placeholder = "Vous pouvez créer une note ici...";
  inputElement.value = noteContent || "";

  const saveButton = document.createElement("ion-icon");
  saveButton.name = "save-outline";
  saveButton.classList.add("save");
  if (noteContent) saveButton.classList.add("hidden");
  saveButton.addEventListener("click", async () => {
    console.log(note);

    await takeActions("save", note);
    saveButton.classList.add("hidden");
    mainChannel.postMessage({ uuid: window.uuid, note });
  });

  inputElement.addEventListener("input", () => {
    note.noteContent = inputElement.value;
    if (inputElement.scrollHeight > 100) {
      inputElement.style.height = `${inputElement.scrollHeight}px`;
    }
    container.style.height = inputElement.style.height;
    saveButton.classList.remove("hidden");
  });

  const highlightedTextEl = document.createElement("em");
  highlightedTextEl.classList.add("annoted");
  highlightedTextEl.setAttribute("ccolor", currentColor);
  highlightedTextEl.textContent = selectedText;
  highlightedTextEl.addEventListener("click", () => {
    if (/global/.test(paragrapheLink)) {
      note.selectionData.selectedText =
        prompt("title of your note >") || note.selectionData.selectedText;
      highlightedTextEl.textContent = note.selectionData.selectedText;
      mainChannel.postMessage({ uuid: window.uuid, note });
    } else {
      if (window.opener.location.href !== paragrapheLink) {
        window.opener.location.href = paragrapheLink;

        const waitForOpenerLoad = setInterval(() => {
          try {
            if (window.opener.document.readyState === "complete") {
              clearInterval(waitForOpenerLoad);
              window.opener.location.hash = `note-${note.id}`;
            }
          } catch (e) {
            clearInterval(waitForOpenerLoad);
          }
        }, 100);
      } else {
        window.opener.location.hash = `note-${note.id}`;
      }
    }
  });

  if (needPath || /global/.test(paragrapheLink)) {
    const link = document.createElement("p");
    link.innerText = /global/.test(paragrapheLink)
      ? "/global"
      : paragrapheLink.match(/\/r\/[^#]+/)[0];
    subContainer.appendChild(link);
  }

  // Color cycling
  const colorButton = document.createElement("ion-icon");
  colorButton.name = "color-palette-outline";
  colorButton.classList.add("color");
  colorButton.addEventListener("click", () => {
    let currentColor = parseInt(container.getAttribute("ccolor") || "0", 10);
    currentColor = (currentColor + 1) % 5;
    container.setAttribute("ccolor", currentColor);
    highlightedTextEl.setAttribute("ccolor", currentColor);
    note.color = currentColor;
    saveButton.classList.remove("hidden");
  });

  // Priority cycling
  const currentPriority = Number.isInteger(priority) ? priority : 0;
  const priorityButton = document.createElement("ion-icon");
  priorityButton.name = priorities_icons[currentPriority];
  priorityButton.classList.add("priority", "hidden");
  priorityButton.addEventListener("click", () => {
    let currentIndex = priorities_icons.indexOf(priorityButton.name);
    const newPriority = (currentIndex + 1) % priorities_icons.length;
    priorityButton.name = priorities_icons[newPriority];
    note.priority = newPriority;
    saveButton.classList.remove("hidden");
  });

  const issueButton = document.createElement("ion-icon");
  issueButton.name = "logo-github";
  issueButton.classList.add("issue", "hidden");

  const moreoptionsButton = document.createElement("ion-icon");
  moreoptionsButton.name = "add";
  moreoptionsButton.classList.add("moreoptions");

  const deleteButton = document.createElement("ion-icon");
  deleteButton.name = "trash-outline";
  deleteButton.classList.add("delete", "hidden");
  deleteButton.addEventListener("click", async () => {
    container.remove();
    highlightedTextEl.remove();
    await takeActions("delete", note);
    subContainer.remove();
    mainChannel.postMessage({ uuid: window.uuid, note });
  });

  issueButton.addEventListener("click", () => {
    moreoptionsButton.classList.remove("hidden");
    issueButton.classList.add("hidden");
    deleteButton.classList.add("hidden");

    const ntab = window.open(
      `https://github.com/Association-Mallouestan/mallouestan.github.io/issues/new?title=${encodeURIComponent(
        "Problème avec " + window.location.pathname
      )}&body=${encodeURIComponent(
        selectedText + " -> " + inputElement.value
      )}`,
      "_blank"
    );
    ntab?.focus();
  });

  moreoptionsButton.addEventListener("click", () => {
    issueButton.classList.toggle("hidden");
    deleteButton.classList.toggle("hidden");
    moreoptionsButton.classList.toggle("hidden");
    priorityButton.classList.toggle("hidden");

    if (
      moreoptionsButton.classList.contains("hidden") &&
      parseInt(inputElement.style.height, 10) < 100
    ) {
      inputElement.style.height = "100px";
      container.style.height = inputElement.style.height;
    }
  });

  const pinButton = document.createElement("ion-icon");
  pinButton.name = "magnet";
  pinButton.classList.add("pin");
  pinButton.style.pointerEvents = "none";
  pinButton.style.color = "gray";

  container.append(
    saveButton,
    deleteButton,
    colorButton,
    issueButton,
    priorityButton,
    moreoptionsButton,
    inputElement,
    pinButton
  );

  subContainer.append(highlightedTextEl, container);
  mainContainer.appendChild(subContainer);
}

/**
 * @returns string[]
 */
async function extractRStringsFromSitemap() {
  const res = await fetch("/sitemap.xml");
  const text = await res.text();
  const urls = [...text.matchAll(/<loc>(.*?)<\/loc>/g)].map((e) => e[1]);
  return ["global", ...urls.filter((u) => /\/r\/.*/.test(u))];
}

/**
 * @param {string} labelNode
 * @param {Node} parentElement
 * @param {string} filterKey
 * @param {string} searchInput
 * @param {Node} chipsContainer
 */
function createChip(
  labelNode,
  parentElement,
  filterKey,
  searchInput,
  chipsContainer
) {
  const chip = document.createElement("div");
  chip.classList.add("chip");
  labelNode.classList.add("text-chip");
  chip.appendChild(labelNode);

  const deleteButton = document.createElement("ion-icon");
  deleteButton.name = "add";
  deleteButton.classList.add("close-button");
  deleteButton.addEventListener("click", () => {
    if (filterKey) delete searchInput.filters[filterKey];
    parentElement.classList.remove("disableContainer");
    chip.remove();
  });

  chip.appendChild(deleteButton);
  chipsContainer.appendChild(chip);
}

document.addEventListener("DOMContentLoaded", async () => {
  /* Header Elements */
  const inputSearchedText = document.getElementById("search-input");
  const chipsContainer = document.getElementById("chips");
  const regexSearch = document.getElementById("regexSearch");
  const caseSensitif = document.getElementById("caseSensitif");
  const searchButton = document.getElementById("search-note");
  const addNoteButton = document.getElementById("general-add");
  const closeViewer = document.getElementById("close-viewer");

  /* sortes */

  const orderByPriority = document.getElementById("priorityOrder");
  const orderByColor = document.getElementById("colorOrder");
  const pageOrder = document.getElementById("pageOrder");

  /* Filters Elements */
  const colorFilter = document.getElementById("colorFilter");
  const colorFilterButton = document.getElementById("colorFilterButton");
  const priorityFilter = document.getElementById("priorityFilter");
  const priorityFilterButton = document.getElementById("priorityFilterButton");
  const pageFilter = document.getElementById("pageFilter");
  const pageFilterButton = document.getElementById("pageFilterButton");

  /** containers */
  const noteViewer = document.getElementById("note-viewer");
  const noteTag = document.getElementById("note-tag");

  /** trigger */
  const notesFab = document.getElementById("notes-fab");

  /* Header Elements actions */
  const searchInput = {
    isRegex: false,
    isCaseSensitive: false,
    text: "",
    filters: {},
  };

  regexSearch?.addEventListener("click", (e) => {
    searchInput.isRegex = !searchInput.isRegex;
    document.getElementById("regexSearch")?.classList.toggle("selected");
    e.target.classList.toggle("active", searchInput.isRegex);
  });

  caseSensitif?.addEventListener("click", (e) => {
    searchInput.isCaseSensitive = !searchInput.isCaseSensitive;
    document.getElementById("caseSensitif")?.classList.toggle("selected");
    e.target.classList.toggle("active", searchInput.isCaseSensitive);
  });

  inputSearchedText.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && inputSearchedText.value === "") {
      const lastChip = chipsContainer.lastElementChild;
      if (lastChip) {
        const chipText = lastChip.innerText;
        console.log(chipText);
        if (/Filtré par couleur : /.test(chipText)) {
          delete searchInput.filters.color;
          colorFilter.classList.remove("disableContainer");
        } else if (/Filtré par priorité : /.test(chipText)) {
          delete searchInput.filters.priority;
          priorityFilter.classList.remove("disableContainer");
        } else if (/Filtré par page : /.test(chipText)) {
          delete searchInput.filters.page;
          pageFilter.classList.remove("disableContainer");
        }
        lastChip.remove();
      }
    }
  });

  searchButton.addEventListener("click", async () => {
    noteTag.innerHTML = "No content";
    let inputText = inputSearchedText?.value ?? "";
    if (!searchInput.isRegex) inputText = escapeStringRegexp(inputText);
    const flags = searchInput.isCaseSensitive ? undefined : "i";
    searchInput.text = new RegExp(inputText, flags);

    const pagePattern = searchInput.filters.page
      ? new RegExp(escapeStringRegexp(searchInput.filters.page))
      : null;

    const allNotes = await takeActions("getAll");

    const filteredNotes =
      allNotes?.filter((note) => {
        if (!searchInput.text.test(note.noteContent)) return false;
        if (
          searchInput.filters.color !== undefined &&
          note.color !== searchInput.filters.color
        )
          return false;
        if (
          searchInput.filters.priority !== undefined &&
          note.priority !== searchInput.filters.priority
        )
          return false;
        if (pagePattern && !pagePattern.test(note.paragrapheLink)) return false;
        return true;
      }) ?? [];

    if (filteredNotes.length > 0) {
      noteTag.innerHTML = "";
      filteredNotes.forEach(renderNoteDisplay);
    }
  });

  addNoteButton?.addEventListener("click", () => {
    noteTag.innerHTML = "";
    const newNote = {
      id: Date.now(),
      noteContent: "",
      color: 1,
      noteContent: "",
      pin: true,
      priority: 1,
      paragrapheLink: "global",
      selectionData: {
        selectedText: "Global Note Title",
        path: [],
      },
    };

    newNote.paragrapheLink = `/global-${newNote.id}`;

    renderNoteDisplay(newNote);
  });

  closeViewer?.addEventListener("click", () => {
    noteViewer.style.display = "none";
  });

  /**
   * sorts
   */

  orderByColor.addEventListener("click", () => {
    orderByColor.classList.toggle("asc");

    const items = Array.from(noteTag.children);
    items.sort((a, b) => {
      const aColor = a.lastChild.getAttribute("ccolor");
      const bColor = b.lastChild.getAttribute("ccolor");

      return orderByColor.classList.contains("asc")
        ? aColor - bColor
        : bColor - aColor;
    });

    items.forEach((item) => noteTag.appendChild(item));
  });

  orderByPriority.addEventListener("click", () => {
    orderByPriority.classList.toggle("asc");

    const items = Array.from(noteTag.children);
    items.sort((a, b) => {
      const priorityA =
        priorities_icons.indexOf(a.querySelector(".priority").name) ?? 0;
      const priorityB =
        priorities_icons.indexOf(b.querySelector(".priority").name) ?? 0;

      return orderByPriority.classList.contains("asc")
        ? priorityA - priorityB
        : priorityB - priorityA;
    });

    items.forEach((item) => noteTag.appendChild(item));
  });

  pageOrder.addEventListener("click", () => {
    pageOrder.classList.toggle("asc");

    const items = Array.from(noteTag.children);
    items.reduce((groups, note) => {
      const key = note.firstChild.innerHTML;
      if (!groups[key]) groups[key] = [];
      groups[key].push(note);
      return groups;
    });

    items.forEach((item) => noteTag.appendChild(item));
  });

  /**
   * filters Functionnalities
   */
  const colorContainer = document.createElement("div");
  colorContainer.classList.add("filterContainer");
  for (let i = 0; i < 5; i++) {
    const colorOption = document.createElement("p");
    colorOption.classList.add("filter-options", "filter-options-color");
    colorOption.setAttribute("ccolor", i);
    colorOption.innerText = `Couleur ${i}`;
    colorOption.addEventListener("click", () => {
      searchInput.filters.color = i;
      colorContainer.classList.remove("out");
      colorFilter.classList.add("disableContainer");
      const colorChipText = document.createElement("div");
      colorChipText.innerText = `Filtré par couleur : ${i}`;
      createChip(
        colorChipText,
        colorFilter,
        "color",
        searchInput,
        chipsContainer
      );
    });
    colorContainer.appendChild(colorOption);
  }
  colorFilter.appendChild(colorContainer);

  colorFilterButton?.addEventListener("click", () => {
    colorContainer.classList.toggle("out");
  });

  const priorityContainer = document.createElement("div");
  priorityContainer.classList.add("filterContainer");
  priorities_icons.forEach((iconName, i) => {
    const text = document.createElement("p");
    text.classList.add("filter-options");
    text.innerText = "Criticité : ";
    const icon = document.createElement("ion-icon");
    icon.name = iconName;
    text.appendChild(icon);
    text.addEventListener("click", () => {
      searchInput.filters.priority = i;
      priorityContainer.classList.remove("out");
      const priorityChip = document.createElement("div");
      priorityChip.innerHTML = "Filtré par priorité : ";
      const iconElem = document.createElement("ion-icon");
      iconElem.name = iconName;
      priorityChip.appendChild(iconElem);
      priorityFilter.classList.add("disableContainer");
      createChip(
        priorityChip,
        priorityFilter,
        "priority",
        searchInput,
        chipsContainer
      );
    });
    priorityContainer.appendChild(text);
  });
  priorityFilter.appendChild(priorityContainer);

  priorityFilterButton?.addEventListener("click", () => {
    priorityContainer.classList.toggle("out");
  });

  const pageContainer = document.createElement("div");
  pageContainer.classList.add("filterContainer");

  extractRStringsFromSitemap().then((pages) => {
    pages.forEach((page) => {
      const p = document.createElement("p");
      p.classList.add("filter-options");
      p.innerText = page;
      p.addEventListener("click", () => {
        searchInput.filters.page = page;
        pageContainer.classList.remove("out");
        const chipText = document.createElement("div");
        chipText.innerText = `Filtré par page : ${page}`;
        createChip(chipText, pageFilter, "page", searchInput, chipsContainer);
        pageFilter.classList.add("disableContainer");
      });
      pageContainer.appendChild(p);
    });
  });

  pageFilter.appendChild(pageContainer);

  pageFilterButton?.addEventListener("click", () => {
    pageContainer.classList.toggle("out");
  });

  /**
   * Other functionnalities
   */

  // Open a fullscreen kiosk-style popup window with basic content
  async function openKioskWindow() {
    const popupWindow = window.open(
      "",
      "_blank",
      "popup=true,width=800,height=600,top=100,left=100"
    );

    if (popupWindow) {
      const clonedDocument = document.cloneNode(true);
      clonedDocument.getElementsByClassName("footer")[0]?.remove();
      clonedDocument.getElementsByClassName("c-header")[0]?.remove();
      clonedDocument.getElementsByClassName("c-page")[0]?.remove();
      clonedDocument.getElementById("note-viewer").style.display = "block";
      clonedDocument.getElementById("main-app")?.remove();
      clonedDocument.getElementById("close-viewer")?.remove();
      clonedDocument.title = "Note Editor";

      popupWindow.document.writeln(
        new XMLSerializer().serializeToString(clonedDocument)
      );

      // Close document so we can safely inject scripts
      popupWindow.document.close();

      // Inject the scripts properly (no document.write)
      const scriptModule = popupWindow.document.createElement("script");
      scriptModule.type = "module";
      scriptModule.src =
        "https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js";
      popupWindow.document.head.appendChild(scriptModule);

      const scriptNoModule = popupWindow.document.createElement("script");
      scriptNoModule.setAttribute("nomodule", "");
      scriptNoModule.src =
        "https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js";
      popupWindow.document.head.appendChild(scriptNoModule);
    }
  }

  notesFab?.addEventListener("click", () => {
    noteViewer.style.display = "block";
  });

  /** button for the kiosk mod @TODO replace this montruosity */
  const button = document.createElement("button");
  button.textContent = "Launch Kiosk Window";
  button.style.padding = "10px 20px";
  button.style.fontSize = "16px";
  button.onclick = openKioskWindow;
  document.body.appendChild(button);

  // Main channel message listener
  mainChannel.onmessage = async (ev) => {
    const { uuid, note } = ev.data;
    console.log(ev.data);

    if (window.uuid == uuid) {
      console.log("same window");
      return;
    }

    const noteElement = document.getElementById(note.id);
    const textarea = noteElement?.querySelector("textarea");
    if (!textarea) return;

    console.log(noteElement);

    // 🔍 Check filters
    if (searchInput?.text && window.opener) {
      const { color, page } = searchInput.filters;

      const matchesCriteria =
        (!color || note.color === color) &&
        (!page || note.page === page) &&
        (!searchInput.priority || note.priority === searchInput.priority) &&
        searchInput.text?.test(note.noteContent);

      if (!matchesCriteria) return;
      console.log("Match pass");

      // 💥 Render new note
      renderNoteDisplay(note);
    } // 💡 NEW: Update color and priority display if note already exists
    else {
      console.log(note.color);

      // 🔁 Update color
      noteElement.setAttribute("ccolor", note.color ?? 0);
      console.log(noteElement.attributes.ccolor);

      const highlight = noteElement.parentElement?.querySelector("em.annoted");
      highlight.setAttribute("ccolor", note.color ?? 0);

      // 🔁 Update priority icon
      noteElement.querySelector(".priority").name =
        priorities_icons[note.priority];

      textarea.value = note.noteContent;
    }
  };
});
