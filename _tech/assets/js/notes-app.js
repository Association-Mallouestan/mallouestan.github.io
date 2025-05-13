import escapeStringRegexp from "escape-string-regexp";

async function extractRStringsFromSitemap() {
  try {
    const response = await fetch("/sitemap.xml");
    const xmlText = await response.text();

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");

    return Array.from(xmlDoc.getElementsByTagName("loc"))
      .map((loc) => loc.textContent.trim())
      .filter((url) => /^\/r\/[^\/]+$/.test(url))
      .map((url) => url.replace(/^\/r\//, ""));
  } catch (error) {
    console.error("Error reading sitemap:", error);
    return [];
  }
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
  });

  inputSearchedText.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && inputSearchedText.value === "") {
      const lastChip = chipsContainer.lastElementChild;
      if (lastChip) {
        const chipText = lastChip.innerText;
        if (/Filtré par la couleur : /.test(chipText)) {
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
    colorOption.classList.add("filter-options", "ccolor");
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
    const icon = document.createElement("ion-icon");
    icon.classList.add("filter-options");
    icon.name = iconName;

    icon.addEventListener("click", () => {
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

    priorityContainer.appendChild(icon);
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
