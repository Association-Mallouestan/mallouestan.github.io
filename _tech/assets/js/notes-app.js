// import escape from "regexp.escape";
import escapeStringRegexp from 'escape-string-regexp';

function createChips(textNode, parentFrom) {
    const chips = document.getElementById("chips")

    const chip = document.createElement("div")
    chip.classList.add("chip")

    // delete button
    const deleteButton = document.createElement("ion-icon");
    deleteButton.name = "add";
    deleteButton.classList.add("close-button", "delete-chips")

    deleteButton.addEventListener("click", () => {
        parentFrom.classList.remove("disableContainer")
        chip.remove()
    })

    textNode.classList.add("text-chip")
    chip.appendChild(textNode)
    chip.appendChild(deleteButton)

    chips.appendChild(chip)

}

document.addEventListener("DOMContentLoaded", async () => {
  const noteViewer = document.getElementById("note-viewer");
  
  const searchInput = {
    isRegex: false,
    isCaseSensitif: false,
    text: "",
    filters: {},
  };

  const searchBar = document.getElementById("search-bar")
  

  document.getElementById("notes-fab").addEventListener("click", () => {
    console.log("clicked");
    noteViewer.style.display = "block";
  });

  document.getElementById("close-viewer").addEventListener("click", () => {
    noteViewer.style.display = "none";
  });

  const regexSearchButton = document.getElementById("regexSearch");
  regexSearchButton.addEventListener("click", () => {
    searchInput.isRegex = !searchInput.isRegex;

    if (searchInput.isRegex) {
      regexSearchButton.style.background = "#110E38";
      regexSearchButton.style.color = "white";
    } else {
      regexSearchButton.style.background = "none";
    }
  });

  const isCaseSensitifButton = document.getElementById("caseSensitif");
  isCaseSensitifButton.addEventListener("click", () => {
    searchInput.isCaseSensitif = !searchInput.isCaseSensitif;

    if (searchInput.isCaseSensitif) {
      isCaseSensitifButton.style.background = "#110E38";
      isCaseSensitifButton.style.color = "white";
    } else {
      isCaseSensitifButton.style.background = "none";
    }
  });

  const inputSearchedText = document.getElementById("note-fab-input");


  document.getElementById("search-note").addEventListener("click", () => {
    let inputText = inputSearchedText.value;

    if (!searchInput.isRegex) {
      inputText = escapeStringRegexp(inputText);
    }

    const regexInput = new RegExp(inputText, searchInput.isCaseSensitif ? "i": undefined);

    searchInput.text = regexInput;
    console.log(searchInput);
  });

  const pageFiler = document.getElementById("pageFiler")

  document.getElementById("pageFilerButton").addEventListener("click", ()=> {
    pageFiler.append()
  })

  /**
   * this is for color selection
   */
  const colorFilter = document.getElementById("colorFilter")

  const colorContainer = document.createElement("div")
  colorContainer.classList.add("filterContainer")

  for (let i = 0; i < 5; i++) {
    const cFilter = document.createElement("p")
    cFilter.classList.add("filter-options")
    cFilter.innerText = `coleur ${i}`
    cFilter.classList.add("ccolor", i)
    colorContainer.appendChild(cFilter)

    cFilter.addEventListener("click", () => {
        searchInput.filters.color = i
        colorContainer.classList.remove("out")
        colorFilter.classList.add("disableContainer")

        const colorChip = document.createElement("div")
        colorChip.innerText = `Filtré par la couleur ${i}`

        createChips(colorChip, colorFilter)
        
    })
  }

  colorFilter.appendChild(colorContainer)

  // color toggle
  document.getElementById("colorFilterButton").addEventListener("click", ()=> {
    colorContainer.classList.toggle("out")
  })

  const priorityFilter = document.getElementById("priorityFilter")

  const priorityContainer = document.createElement("div")
  priorityContainer.classList.add("filterContainer")

  const priorities_icons = [
    "sunny-outline",
    "cloudy-outline",
    "rainy-outline",
    "thunderstorm-outline",
    "skull-outline",
  ];
  
  for (let i = 0; i < 5; i++) {
    const pFilter = document.createElement("ion-icon");
    pFilter.classList.add("filter-options")
    pFilter.name = priorities_icons[i]
    priorityContainer.appendChild(pFilter)
    pFilter.addEventListener("click", () => {
        searchInput.filters.priority = i

        priorityFilter.classList.remove("out")

        priorityFilter.classList.add("disableContainer")

        const priorityChip = document.createElement("div")
        priorityChip.innerHTML = "Filtré par "
        const priorityChipIcon = document.createElement("ion-icon");
        priorityChipIcon.name = priorities_icons[i]
        priorityChip.appendChild(priorityChipIcon)

        createChips(priorityChip, priorityFilter)

    })
  }

  priorityFilter.appendChild(priorityContainer)

  document.getElementById("priorityFilter").addEventListener("click", ()=> {
    priorityContainer.classList.toggle("out")
  })


});
