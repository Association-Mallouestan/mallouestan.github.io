// import escape from "regexp.escape";
import escapeStringRegexp from 'escape-string-regexp';

const priorities_icons = [
  "sunny-outline",
  "cloudy-outline",
  "rainy-outline",
  "thunderstorm-outline",
  "skull-outline",
];


async function extractRStringsFromSitemap() {
  const response = await fetch("/sitemap.xml").then((t) => t.text());
  const urls = response.matchAll(/<loc>(.*)<.loc>/g).map((e) => e[1]);

  return [...urls.filter((url) => url.match(/^\/r\/[^\/]+$/))];
}

async function saveNote(note) {
  return caches
    .open("custom-notes")
    .then((cache) => {
      // Ensure selectionData is preserved
      const noteToSave = {
        ...note,
        selectionData: note.selectionData, // explicitly retain it
      };

      const response = new Response(JSON.stringify(noteToSave), {
        headers: { "Content-Type": "application/json" },
      });

      return cache.put(`${window.location.pathname}-${note.id}`, response);
    })
    .then(() => {
      const savedNote = customNotes.find((n) => n.id == note.id);
      if (savedNote) {
        for (const key in note) {
          if (Object.prototype.hasOwnProperty.call(note, key)) {
            savedNote[key] = note[key];
          }
        }
      } else {
        customNotes.push(note);
      }
    });
}

async function deleteNote(note) {
  await caches
    .open("custom-notes")
    .then((cache) => {
      return cache.delete(`${window.location.pathname}-${note.id}`);
    })
    .then(() => {
      const index = customNotes.findIndex((n) => n.id == note.id);
      if (index !== -1) {
        customNotes.splice(index, 1);
      }
    });
}

function gotoNoteParagraph(note) {
  if (!note || !note.selectionData || !Array.isArray(note.selectionData.path)) {
    console.warn("Invalid note object");
    return;
  }

  try {
    const path = note.selectionData.path;
    let baseNode = document.querySelector("article.post");

    for (let i = 0; i < path.length; i++) {
      const index = path[i];
      if (index === -1 || !baseNode || !baseNode.childNodes[index]) break;
      baseNode = baseNode.childNodes[index];
    }

    if (!baseNode) {
      console.warn("Target paragraph not found");
      return;
    }

    // Scroll smoothly to the baseNode
    baseNode.scrollIntoView({ behavior: "smooth", block: "center" });

    // Optional: Add a temporary highlight effect
    baseNode.classList.add("goto-highlight");
    setTimeout(() => {
      baseNode.classList.remove("goto-highlight");
    }, 2000);
  } catch (err) {
    console.error("Failed to go to note paragraph:", err);
  }
}

window.gotoNoteParagraph = gotoNoteParagraph

function wrapSelectedText(note, mainContainer) {
  const { id, noteContent, color, priority } = note;

  const container = document.createElement("code");
  container.setAttribute("ccolor", color);
  container.classList.add("is-pinned");

  const inputElement = document.createElement("textarea");
  inputElement.wrap = "soft";
  inputElement.placeholder = "Vous pouvez créer une note ici...";
  inputElement.value = noteContent || "";
  let previousValue = inputElement.value;

  const highlightedTextEl = document.createElement("em");
  highlightedTextEl.classList.add("annoted");
  highlightedTextEl.setAttribute("ccolor", color);
  highlightedTextEl.textContent = note.selectionData.selectedText;

  highlightedTextEl.addEventListener("click", () => {
    container.classList.toggle("out");
    if (/global/.test(note.paragrapheLink)) {
      note.selectionData.selectedText = prompt("title of your global note >")
    }
  });

  const toggleButton = document.createElement("ion-icon");
  toggleButton.classList.add("toggle");
  toggleButton.name = "return-down-forward-outline";
  toggleButton.addEventListener("click", () => {
    container.classList.toggle("out");
  });

  const saveButton = document.createElement("ion-icon");
  saveButton.name = "save-outline";
  saveButton.classList.add("save");
  if (noteContent) saveButton.classList.add("hidden");


  saveButton.addEventListener("click", () => {
    const currentNameIndexPriority = priorities_icons.indexOf(priorityButton.name);
    const updatedNote = {
      id,
      noteContent: inputElement.value,
      color: parseInt(container.getAttribute("ccolor") || 0),
      priority: currentNameIndexPriority || 0,
      pin: note.pin,
      paragrapheLink: note.paragrapheLink,
      selectionData: note.selectionData
    };

    saveNote(updatedNote);
    previousValue = inputElement.value;
    saveButton.classList.add("hidden");
  });

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

  const deleteButton = document.createElement("ion-icon");
  deleteButton.name = "trash-outline";
  deleteButton.classList.add("delete", "hidden");
  deleteButton.addEventListener("click", () => {
    container.remove();
    highlightedTextEl.remove();
    deleteNote({ id });
  });

  const issueButton = document.createElement("ion-icon");
  issueButton.name = "logo-github";
  issueButton.classList.add("issue", "hidden");
  issueButton.addEventListener("click", () => {
    moreoptionsButton.classList.remove("hidden");
    issueButton.classList.add("hidden");
    deleteButton.classList.add("hidden");

    const ntab = window.open(
      `https://github.com/Association-Mallouestan/mallouestan.github.io/issues/new?title=${encodeURIComponent(
        "Problème avec " + window.location.pathname
      )}&body=${encodeURIComponent(inputElement.value)}`,
      "_blank"
    );
    ntab.focus();
  });

  const priorityButton = document.createElement("ion-icon");
  priorityButton.name = priorities_icons[priority ?? 0];
  priorityButton.classList.add("priority", "hidden");
  priorityButton.addEventListener("click", () => {
    let currentNameIndex = priorities_icons.indexOf(priorityButton.name);
    const newPriority = (currentNameIndex + 1) % priorities_icons.length;
    priorityButton.name = priorities_icons[newPriority];
    saveButton.classList.remove("hidden");
  });

  const moreoptionsButton = document.createElement("ion-icon");
  moreoptionsButton.name = "add";
  moreoptionsButton.classList.add("moreoptions");
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
    }
  });

  inputElement.addEventListener("input", () => {
    if (inputElement.value == "" || inputElement.value !== previousValue) {
      saveButton.classList.remove("hidden");
    } else {
      saveButton.classList.add("hidden");
    }
    inputElement.style.height = `${inputElement.scrollHeight}px`;
  });

  // Append all children
  container.appendChild(toggleButton);
  container.appendChild(saveButton);
  container.appendChild(deleteButton);
  container.appendChild(colorButton);
  container.appendChild(issueButton);
  container.appendChild(priorityButton);
  container.appendChild(moreoptionsButton);
  container.appendChild(inputElement);

  mainContainer.appendChild(highlightedTextEl);
  mainContainer.appendChild(container);

  inputElement.style.height = `${inputElement.scrollHeight}px`;
}


function rebuildNoteFromData(note) {

  const mainContainer = document.getElementById("note-tag");
  
  wrapSelectedText(
    note,
    mainContainer
  );


  /*noteIdArg, 
  noteContent, 
  color = 0,
  priorityNumber = 0, 
  mainContainer */
}

document.addEventListener("DOMContentLoaded", async () => {
  const noteViewer = document.getElementById("note-viewer");
  const searchBar = document.getElementById("search-bar");
  const chipsContainer = document.getElementById("chips");
  const inputSearchedText = document.getElementById("note-fab-input");
  const cache = await caches.open("custom-notes");

  const searchInput = {
    isRegex: false,
    isCaseSensitif: false,
    text: "",
    filters: {},
  };

  const colorFilter = document.getElementById("colorFilter");
  const priorityFilter = document.getElementById("priorityFilter");
  const pageFilter = document.getElementById("pageFilter");
  const addNote = document.getElementById("general-add");
  const searchButton = document.getElementById("search-note");

  function createChip(labelNode, parentElement, filterKey) {
    const chip = document.createElement("div");
    chip.classList.add("chip");

    labelNode.classList.add("text-chip");
    chip.appendChild(labelNode);

    const deleteButton = document.createElement("ion-icon");
    deleteButton.name = "add";
    deleteButton.classList.add("close-button", "delete-chips");

    deleteButton.addEventListener("click", () => {
      if (filterKey) {
        delete searchInput.filters[filterKey];
      }
      parentElement.classList.remove("disableContainer");
      chip.remove();
    });

    chip.appendChild(deleteButton);
    chipsContainer.appendChild(chip);
  }

  document.getElementById("notes-fab").addEventListener("click", () => {
    noteViewer.style.display = "block";
  });

  document.getElementById("close-viewer").addEventListener("click", () => {
    window.location.reload();
    noteViewer.style.display = "none";
  });

  document.getElementById("regexSearch").addEventListener("click", (e) => {
    searchInput.isRegex = !searchInput.isRegex;
    e.target.style.background = searchInput.isRegex ? "#110E38" : "none";
    e.target.style.color = searchInput.isRegex ? "white" : "";
  });

  document.getElementById("caseSensitif").addEventListener("click", (e) => {
    searchInput.isCaseSensitive = !searchInput.isCaseSensitive;
    e.target.style.background = searchInput.isCaseSensitive
      ? "#110E38"
      : "none";
    e.target.style.color = searchInput.isCaseSensitive ? "white" : "";
  });

  searchButton.addEventListener("click", async () => {
    document.getElementById("note-tag").innerHTML = ''
    let inputText = inputSearchedText.value;
    if (!searchInput.isRegex) {
      inputText = escapeStringRegexp(inputText);
    }

    const flags = searchInput.isCaseSensitive ? "i" : undefined;
    searchInput.text = new RegExp(inputText, flags);
    console.log(searchInput);

    const pagePattern = searchInput.filters.page
      ? new RegExp(escapeStringRegexp(searchInput.filters.page))
      : null;

    window.searchInput = searchInput;
    const responses = await cache.matchAll();

    // Step 2: Convert all JSON responses into arrays of notes
    const allNotes = (
      await Promise.all(responses.map((res) => res.json()))
    ).flat();

    const filteredNotes = allNotes.filter((note) => {
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
    });

    console.log(filteredNotes);

    window.filteredNotes = filteredNotes;

    if (filteredNotes.length > 0) {
      filteredNotes.forEach(rebuildNoteFromData);
    } else {
      const noNotes = document.createElement("div");
      noNotes.innerText = "No notes found";
      noteTag.appendChild(noNotes);
    }
  });

  addNote.addEventListener("click", () => {

    document.getElementById("note-tag").innerHTML = ''

    const newNote = {
      id: Date.now(),
      noteContent: "Lorem Ipsum",
      color: 1,
      pin: true,
      priority: 1,
      paragrapheLink: "global",
      selectionData: {
        selectedText: "Global Note Title",
      },
    };

    console.log("click");

    const cachePromise = caches.open("custom-notes");

    cachePromise.then(async (cache) => {
      // Get all cached request keys
      const requests = await cache.keys();

      // Filter keys that match "global"
      const matches = requests.filter((req) => req.url.includes("global"));

      // Get all matching responses
      const responses = await Promise.all(
        matches.map((req) => cache.match(req))
      );

      // Parse the responses into usable data
      const filteredNotes = await Promise.all(
        responses.map(async (res) => {
          if (!res) return null;
          try {
            return await res.json();
          } catch (e) {
            return null;
          }
        })
      );

      [newNote]
        .concat(filteredNotes.filter((n) => n !== null))
        .forEach(rebuildNoteFromData);
    });
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

  // Color filter logic
  const colorContainer = document.createElement("div");
  colorContainer.classList.add("filterContainer");

  for (let i = 0; i < 5; i++) {
    const colorOption = document.createElement("p");
    colorOption.classList.add("filter-options", "filter-options-color");
    colorOption.setAttribute("ccolor", i);
    colorOption.innerText = `Couleur ${i}`;

        priorityFilter.classList.remove("out")

      const colorChipText = document.createElement("div");
      colorChipText.innerText = `Filtré par couleur : ${i}`;
      createChip(colorChipText, colorFilter, "color");
    });

        const priorityChip = document.createElement("div")
        priorityChip.innerHTML = "Filtré par "
        const priorityChipIcon = document.createElement("ion-icon");
        priorityChipIcon.name = priorities_icons[i]
        priorityChip.appendChild(priorityChipIcon)

        createChips(priorityChip, priorityFilter)

    })
  }

  colorFilter.appendChild(colorContainer);

  document.getElementById("colorFilterButton").addEventListener("click", () => {
    colorContainer.classList.toggle("out");
  });

  document.getElementById("priorityFilter").addEventListener("click", ()=> {
    priorityContainer.classList.toggle("out")
  })

  priorities_icons.forEach((iconName, i) => {
    const text = document.createElement("p");
    text.classList.add("filter-options");
    text.innerText = "Ciritcité : ";
    const icon = document.createElement("ion-icon");
    icon.name = iconName;

    text.addEventListener("click", () => {
      searchInput.filters.priority = i;
      priorityContainer.classList.remove("out");

      const priorityChip = document.createElement("div");
      priorityChip.innerHTML = "Filtré par priorité : ";
      const iconElem = document.createElement("ion-icon");
      iconElem.name = iconName;
      priorityChip.appendChild(iconElem);

      priorityFilter.classList.add("disableContainer");
      createChip(priorityChip, priorityFilter, "priority");
    });
    text.appendChild(icon);

    priorityContainer.appendChild(text);
  });

  priorityFilter.appendChild(priorityContainer);

  document
    .getElementById("priorityFilterButton")
    .addEventListener("click", () => {
      priorityContainer.classList.toggle("out");
    });

  // Load page filter dynamically after DOM and data ready
  const pagesList = ["global"].concat(await extractRStringsFromSitemap());

  console.log(pagesList);

  const pageContainer = document.createElement("div");
  pageContainer.classList.add("filterContainer");

  pagesList.forEach((page) => {
    const pageOption = document.createElement("p");
    pageOption.classList.add("filter-options");
    pageOption.innerText = `Page : ${page}`;

    pageOption.addEventListener("click", () => {
      searchInput.filters.page = page;
      pageContainer.classList.remove("out");
      pageFilter.classList.add("disableContainer");

      const pageChipText = document.createElement("div");
      pageChipText.innerText = `Filtré par page : ${page}`;
      createChip(pageChipText, pageFilter, "page");
    });

    pageContainer.appendChild(pageOption);
  });

  pageFilter.appendChild(pageContainer);

  document.getElementById("pageFilterButton").addEventListener("click", () => {
    pageContainer.classList.toggle("out");
  });
});
