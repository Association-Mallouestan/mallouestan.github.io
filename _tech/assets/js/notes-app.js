import escapeStringRegexp from "escape-string-regexp";

async function extractRStringsFromSitemap() {
  try {
    const response = await fetch("/sitemap.xml"); // Adjust path if needed
    const xmlText = await response.text();

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");

    const rStrings = Array.from(xmlDoc.getElementsByTagName("loc"))
      .map((loc) => loc.textContent.trim())
      .filter((url) => /^\/r\/[^\/]+$/.test(url))
      .map((url) => url.replace(/^\/r\//, ""));

    console.log("Extracted strings:", rStrings);
    return rStrings;
  } catch (error) {
    console.error("Error reading sitemap:", error);
    return [];
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const noteViewer = document.getElementById("note-viewer");
  const searchBar = document.getElementById("search-bar");
  const chipsContainer = document.getElementById("chips");
  const inputSearchedText = document.getElementById("note-fab-input");

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

  function createChip(labelNode, parentElement, filterKey) {
    const chip = document.createElement("div");
    chip.classList.add("chip");

    labelNode.classList.add("text-chip");
    chip.appendChild(labelNode);

    const deleteButton = document.createElement("ion-icon");
    deleteButton.name = "close";
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

  document.getElementById("search-note").addEventListener("click", () => {
    let inputText = inputSearchedText.value;
    if (!searchInput.isRegex) {
      inputText = escapeStringRegexp(inputText);
    }

    const flags = searchInput.isCaseSensitive ? "i" : undefined;
    searchInput.text = new RegExp(inputText, flags);
    console.log(searchInput);
  });

  inputSearchedText.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && inputSearchedText.value === "") {
      const lastChip = chipsContainer.lastElementChild;
      if (lastChip) {
        const chipText = lastChip.innerText;
        if (/Filtré par la couleur/.test(chipText)) {
          delete searchInput.filters.color;
          colorFilter.classList.remove("disableContainer");
        } else if (/Filtré par/.test(chipText)) {
          delete searchInput.filters.priority;
          priorityFilter.classList.remove("disableContainer");
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
      colorChipText.innerText = `Filtré par la couleur ${i}`;
      createChip(colorChipText, colorFilter, "color", i);
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
      priorityFilter.classList.remove("out");
      priorityFilter.classList.add("disableContainer");

      const priorityChip = document.createElement("div");
      priorityChip.innerHTML = "Filtré par ";
      const iconElem = document.createElement("ion-icon");
      iconElem.name = iconName;
      priorityChip.appendChild(iconElem);

      createChip(priorityChip, priorityFilter, "priority", i);
    });

    priorityContainer.appendChild(icon);
  });

  priorityFilter.appendChild(priorityContainer);
  priorityFilter.addEventListener("click", () => {
    priorityContainer.classList.toggle("out");
  });
});
