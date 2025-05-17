import escapeStringRegexp from "escape-string-regexp";

/** Global Variables */
const priorities_icons = [
  "sunny-outline",
  "cloudy-outline",
  "rainy-outline",
  "thunderstorm-outline",
  "skull-outline",
];

const mainChannel = new BroadcastChannel("notes_channel");

const cachePromise = caches.open("custom-notes");

/** Cache Note Manager */

/**
 * @param {string} action
 * @param {string | null} key
 * @param {Note} data
 * @returns Error or note or nothing
 */
async function handleNoteCache(action, key = null, data = null) {
  const cache = await cachePromise;
  const fullKey = `${key}`;

  switch (action) {
    case "get":
      return key ? await cache.match(fullKey) : await cache.matchAll();
    case "put":
      if (!data) throw new Error("No data provided for cache put.");
      const response = new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });

      await cache.put(fullKey, response);
      break;
    case "delete":
      await cache.delete(fullKey);
      break;
    default:
      throw new Error("Unknown cache action.");
  }
}

/**
 * @returns Notes[]
 */
async function retreiveAllNotes() {
  const responses = await handleNoteCache("get");
  const allNotes = (
    await Promise.all(responses.map((res) => res.json()))
  ).flat();

  return allNotes;
}

/** BroadCast Notes  */

/**
 * @param {string} action
 * @param {Note} note
 * @returns
 */
function loadBroadCastChannel(action, note = undefined) {
  console.log(action);

  switch (action) {
    case "getAll":
      return retreiveAllNotes();
    case "save":
      return handleNoteCache("put", `${note.paragrapheLink}-${note.id}`, note);
    case "delete":
      return handleNoteCache("delete", `${note.paragrapheLink}-${note.id}`);
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

  // Create the note container
  const container = document.createElement("code");
  container.classList.add("note-display", "is-pinned");
  container.setAttribute("ccolor", color || 0);

  // Create and initialize the editable textarea
  const inputElement = document.createElement("textarea");
  inputElement.wrap = "soft";
  inputElement.placeholder = "Vous pouvez créer une note ici...";
  inputElement.value = noteContent || "";

  // Save button for manual note saving
  const saveButton = document.createElement("ion-icon");
  saveButton.name = "save-outline";
  saveButton.classList.add("save");
  if (noteContent) saveButton.classList.add("hidden");
  saveButton.addEventListener("click", async () => {
    await loadBroadCastChannel("save", note);
    saveButton.classList.add("hidden");
    mainChannel.postMessage("update")
  });

  // Track input changes for autosize and save trigger
  inputElement.addEventListener("input", () => {
    note.noteContent = inputElement.value;
    if (inputElement.scrollHeight > 100) {
      inputElement.style.height = `${inputElement.scrollHeight}px`;
    }
    container.style.height = inputElement.style.height;
    saveButton.classList.remove("hidden");
  });

  mainChannel.onmessage = async (ev) => {
    const data = await handleNoteCache("get", `${note.paragrapheLink}-${note.id}`)
    const cacheNote = await data.json()
    inputElement.value = cacheNote.noteContent
    highlightedTextEl.value = cacheNote.paragrapheLink
    
  }

  // Annotated text label that can be renamed
  const highlightedTextEl = document.createElement("em");
  highlightedTextEl.classList.add("annoted");
  highlightedTextEl.setAttribute("ccolor", color || 0);
  highlightedTextEl.textContent = selectedText;
  highlightedTextEl.addEventListener("click", () => {
    if (/global/.test(paragrapheLink)) {
      note.selectionData.selectedText =
        prompt("title of your note >") || note.selectionData.selectedText;
      highlightedTextEl.textContent = note.selectionData.selectedText;
      mainChannel.postMessage("update")
    }
  });

  // Optionally show the paragraph link
  if (needPath || /global/.test(paragrapheLink)) {
    const link = document.createElement("p");
    link.innerText = paragrapheLink;
    subContainer.appendChild(link);
  }

  // Button to cycle through note colors
  const colorButton = document.createElement("ion-icon");
  colorButton.name = "color-palette-outline";
  colorButton.classList.add("color");
  colorButton.addEventListener("click", () => {
    let currentColor = parseInt(container.getAttribute("ccolor") || 0);
    currentColor = (currentColor + 1) % 5;
    container.setAttribute("ccolor", currentColor);
    highlightedTextEl.setAttribute("ccolor", currentColor);
    saveButton.classList.remove("hidden");
  });

  // Button to change priority icon
  const priorityButton = document.createElement("ion-icon");
  priorityButton.name = priorities_icons[priority ?? 0];
  priorityButton.classList.add("priority", "hidden");
  priorityButton.addEventListener("click", () => {
    let currentNameIndex = priorities_icons.indexOf(priorityButton.name);
    const newPriority = (currentNameIndex + 1) % priorities_icons.length;
    priorityButton.name = priorities_icons[newPriority];
    saveButton.classList.remove("hidden");
  });

  // Button to report note issues on GitHub
  const issueButton = document.createElement("ion-icon");
  issueButton.name = "logo-github";
  issueButton.classList.add("issue", "hidden");

  // Button to expand extra options
  const moreoptionsButton = document.createElement("ion-icon");
  moreoptionsButton.name = "add";
  moreoptionsButton.classList.add("moreoptions");

  // Button to delete the note
  const deleteButton = document.createElement("ion-icon");
  deleteButton.name = "trash-outline";
  deleteButton.classList.add("delete", "hidden");
  deleteButton.addEventListener("click", async () => {
    container.remove();
    highlightedTextEl.remove();
    await loadBroadCastChannel("delete", note);
    
    subContainer.remove();
  });

  // Show GitHub link for issue reporting
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

  // Toggle extra note options
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

  // Pin icon (non-functional but visible)
  const pinButton = document.createElement("ion-icon");
  pinButton.name = "magnet";
  pinButton.classList.add("pin");
  pinButton.style.pointerEvents = "none";
  pinButton.style.color = "gray";

  // Append all interactive elements to the note container
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

  // Final assembly of the note block
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
  const chipsContainer = document.getElementById("chips");
  const inputSearchedText = document.getElementById("search-input");
  const searchButton = document.getElementById("search-note");
  const colorFilter = document.getElementById("colorFilter");
  const priorityFilter = document.getElementById("priorityFilter");
  const pageFilter = document.getElementById("pageFilter");
  const noteViewer = document.getElementById("note-viewer");
  const notesFab = document.getElementById("notes-fab");
  const closeViewer = document.getElementById("close-viewer");
  const addNoteButton = document.getElementById("general-add");

  const searchInput = {
    isRegex: false,
    isCaseSensitive: false,
    text: "",
    filters: {},
  };

  document.getElementById("regexSearch")?.addEventListener("click", (e) => {
    searchInput.isRegex = !searchInput.isRegex;
    document.getElementById("regexSearch")?.classList.toggle("selected");
    e.target.classList.toggle("active", searchInput.isRegex);
  });

  document.getElementById("caseSensitif")?.addEventListener("click", (e) => {
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
    const noteTag = document.getElementById("note-tag");
    noteTag.innerHTML = "No content";
    let inputText = inputSearchedText?.value ?? "";
    if (!searchInput.isRegex) inputText = escapeStringRegexp(inputText);
    const flags = searchInput.isCaseSensitive ? undefined : "i";
    searchInput.text = new RegExp(inputText, flags);

    const pagePattern = searchInput.filters.page
      ? new RegExp(escapeStringRegexp(searchInput.filters.page))
      : null;

    const allNotes = await loadBroadCastChannel("getAll");

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

  document
    .getElementById("colorFilterButton")
    ?.addEventListener("click", () => {
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

  document
    .getElementById("priorityFilterButton")
    ?.addEventListener("click", () => {
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

  document.getElementById("pageFilterButton")?.addEventListener("click", () => {
    pageContainer.classList.toggle("out");
  });

  notesFab?.addEventListener("click", () => {
    noteViewer.style.display = "block";
  });

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

  closeViewer?.addEventListener("click", () => {
    noteViewer.style.display = "none";
    window.location.reload();
  });

  addNoteButton?.addEventListener("click", () => {
    const noteTag = document.getElementById("note-tag");
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
    renderNoteDisplay(newNote);
  });

  const button = document.createElement("button");
  button.textContent = "Launch Kiosk Window";
  button.style.padding = "10px 20px";
  button.style.fontSize = "16px";
  button.onclick = openKioskWindow;
  document.body.appendChild(button);
});
