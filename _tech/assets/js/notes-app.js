import escapeStringRegexp from "escape-string-regexp";

async function extractRStringsFromSitemap() {
    const response = await fetch("/sitemap.xml").then(t => t.text());
    const urls = response.matchAll(/<loc>(.*)<.loc>/g).map(e => e[1]);
    
    return [...urls.filter((url) => url.match(/^\/r\/[^\/]+$/))]
}

function rebuildNoteFromData(note) {
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
  const subContainer = document.createElement("div")
  subContainer.classList.add("note")

  const selectedText = selectionData.selectedText;
  const container = document.createElement("code");
  container.classList.add("is-pinned")
  container.classList.add("note-display")

  container.setAttribute("npath", selectionData.path.join(","));
  container.setAttribute("ccolor", color || 0);
  if (!pin) container.classList.add("out");

  const inputElement = document.createElement("textarea");
  inputElement.wrap = "soft";
  inputElement.placeholder = "Vous pouvez créer une note ici...";
  inputElement.value = noteContent || "";

  inputElement.addEventListener("input", () => {
    if (inputElement.value == "" || inputElement.value !== previousValue) {
      saveButton.classList.remove("hidden");
    } else {
      saveButton.classList.add("hidden");
    }

    inputElement.style.height = `${inputElement.scrollHeight}px`
  });

  const highlightedTextEl = document.createElement("em");
  highlightedTextEl.classList.add("annoted");
  highlightedTextEl.setAttribute("ccolor", color || 0);
  highlightedTextEl.textContent = selectedText;
  highlightedTextEl.addEventListener("click", () => {
    window.location.href = note.paragrapheLink
  })

  // Append the core elements

  container.appendChild(inputElement);

  subContainer.appendChild(highlightedTextEl)
  subContainer.appendChild(container)

  // Re-inject elements into DOM based on saved selection path
  mainContainer.appendChild(subContainer);
}

document.addEventListener("DOMContentLoaded", async () => {
  const noteViewer = document.getElementById("note-viewer");
  const searchBar = document.getElementById("search-bar");
  const chipsContainer = document.getElementById("chips");
  const inputSearchedText = document.getElementById("note-fab-input");
  const cache = await caches.open("custom-notes");

  const searchInput = {
    isRegex: false,
    isCaseSensitive: false,
    text: "",
    filters: {},
  };

  const priorities_icons = [
    "sunny-outline",
    "cloudy-outline",
    "rainy-outline",
    "thunderstorm-outline",
    "skull-outline",
  ];

  const colorFilter = document.getElementById("colorFilter");
  const priorityFilter = document.getElementById("priorityFilter");
  const pageFilter = document.getElementById("pageFilter");

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

  document.getElementById("search-note").addEventListener("click", async () => {

    const noteTag = document.getElementById("note-tag");
    noteTag.childNodes.forEach((c) => c.remove())
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

    if (filteredNotes.length > 0) {
        filteredNotes.forEach(rebuildNoteFromData);
    } else {
        const noNotes = document.createElement("div")
        noNotes.innerText = "No notes found"
        noteTag.appendChild(noNotes)
    }

  });

  inputSearchedText.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && inputSearchedText.value === "") {
      const lastChip = chipsContainer.lastElementChild;
      if (lastChip) {
        const chipText = lastChip.innerText;
        console.log(chipText)
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
    colorOption.setAttribute("ccolor", i)
    colorOption.innerText = `Couleur ${i}`;

    colorOption.addEventListener("click", () => {
      searchInput.filters.color = i;
      colorContainer.classList.remove("out");
      colorFilter.classList.add("disableContainer");

      const colorChipText = document.createElement("div");
      colorChipText.innerText = `Filtré par couleur : ${i}`;
      createChip(colorChipText, colorFilter, "color");
    });

    colorContainer.appendChild(colorOption);
  }

  colorFilter.appendChild(colorContainer);

  document.getElementById("colorFilterButton").addEventListener("click", () => {
    colorContainer.classList.toggle("out");
  });

  // Priority filter logic
  const priorityContainer = document.createElement("div");
  priorityContainer.classList.add("filterContainer");

  priorities_icons.forEach((iconName, i) => {

    const text = document.createElement("p")
    text.classList.add("filter-options");
    text.innerText = "Ciritcité : "
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
    text.appendChild(icon)

    priorityContainer.appendChild(text);
  });

  priorityFilter.appendChild(priorityContainer);

  document
    .getElementById("priorityFilterButton")
    .addEventListener("click", () => {
      priorityContainer.classList.toggle("out");
    });

  // Load page filter dynamically after DOM and data ready
  const pagesList = await extractRStringsFromSitemap();

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
