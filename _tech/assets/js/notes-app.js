import escapeStringRegexp from "escape-string-regexp";

const cn = window.customNotes;
const pin_icons = cn.PIN_ICONS;
const priorities_icons = cn.PRIORITY_ICONS;

/**
 * @param {Note} note
 * @param {boolean} needPath
 */
function addNote(note) {
  const {
    id,
    noteContent,
    color,
    pin,
    priority,
    pagePathname,
    selectionData,
    paragraph,
  } = note;

  const mainContainer = document.getElementById("note-tag");
  const subContainer = document.createElement("div");
  subContainer.classList.add("note");
  subContainer.setAttribute("ccolor", color ?? 0);

  const selectedText = selectionData?.selectedText ?? "";

  const containerCodeEm = document.createElement("div");
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
    note.paragraph = paragraphTextP.innerHTML;
    const pageNotes = await Promise.all(
      (
        await cn.storage.getNotesByPath(note.pagePathname)
      ).map((file) => file.json())
    );

    if (note.pagePathname == window.location.pathname) {
      // This is a note for the current page
      const currentNote = document.querySelector(`.page #ht-${note.id}`);
      currentNote.setAttribute("ccolor", note.color);
      currentNote.nextSibling.nextSibling.setAttribute("ccolor", note.color);
      currentNote.nextSibling.nextSibling.getElementsByTagName(
        "textarea"
      )[0].value = note.noteContent;
      currentNote.nextSibling.nextSibling
        .getElementsByClassName("priority")[0]
        .setAttribute("name", priorities_icons[note.priority]);
    }

    await cn.manageNoteSaving(note, pageNotes);
    saveButton.classList.add("hidden");
    document.getElementById("search-note").click();
  });

  note.noteContent = inputElement.value;

  inputElement.style.height = `${inputElement.scrollHeight}px`;
  container.style.height = `${inputElement.scrollHeight + 100}px`;

  inputElement.addEventListener("input", (e) => {
    note.noteContent = inputElement.value;
    inputElement.style.height = `${inputElement.scrollHeight}px`;
    container.style.height = `${inputElement.scrollHeight + 24}px`;
    saveButton.classList.remove("hidden");
  });

  inputElement.addEventListener("keydown", (e) => {

    console.log(e.key);
    
    if (e.key == "Backspace" || e.key== "Delete") {
      inputElement.style.height = "auto";
      container.style.height = `${parseInt(inputElement.style.height, 10)}  + 24px`   
    } 
      
  });

  const highlightedTextEl = document.createElement("div");
  highlightedTextEl.classList.add("annoted", "selected-text-only");
  highlightedTextEl.setAttribute("ccolor", currentColor);
  highlightedTextEl.textContent = selectedText;

  const paragraphTextP = document.createElement("div");
  paragraphTextP.classList.add("paragraph-note");
  paragraphTextP.innerHTML = paragraph;
  Array.from(paragraphTextP.getElementsByTagName("code")).forEach((node) =>
    node.remove()
  );

  const link = document.createElement("p");
  link.innerText = /global/.test(pagePathname)
    ? "/global"
    : pagePathname.split("/").at(-1);
  link.addEventListener("click", () => {
    console.log(pagePathname);
    window.open(pagePathname, "_blank");
  });
  subContainer.appendChild(link);

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

    const noteViewer = document.getElementById("note-tag");
    const el = noteViewer.querySelector("#ht-" + note.id);
    el.setAttribute("ccolor", note.color);
    console.log(el);
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

  //Putting forward the right em
  paragraphTextP.querySelector(`#ht-${note.id}`).classList.add("pertinent");

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

    await cn.storage
      .getNotesByPath(note.pagePathname)
      .then((files) => {
        return Promise.all(files.map((file) => file.json()));
      })
      .then((notes) => cn.manageNoteDeletion(note, notes));
    subContainer.remove();
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

    if (moreoptionsButton.classList.contains("hidden")) {
        container.style.height = "200px"
        inputElement.style.height = "180px"
    } else {
      inputElement.style.height = "auto"
      container.style.height = inputElement.style.height
    }
  });

  const pinButton = document.createElement("ion-icon");
  pinButton.name = pin_icons[1];
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
  containerCodeEm.append(paragraphTextP, highlightedTextEl, container);
  subContainer.appendChild(containerCodeEm);
  mainContainer.appendChild(subContainer);
}

/**
 * @returns string[]
 */
async function extractRStringsFromSitemap() {
  const res = await fetch("/sitemap.xml");
  const text = await res.text();
  const urls = [...text.matchAll(/<loc>(.*?)<\/loc>/g)].map((e) => e[1]);
  return urls.filter((u) => /\/r\/.*/.test(u));
}

document.addEventListener("DOMContentLoaded", async () => {
  // Check if at least one note exists
  if ((await cn.storage.getAllNotes()).length === 0) {
    return;
  }

  document.getElementById("notes-fab").style.display = "block";

  /* Header Elements */
  const searchInput = document.getElementById("search-input");
  const chipsContainer = document.getElementById("chips");
  const regexSearchButton = document.getElementById("regexSearch");
  const caseSensitifButton = document.getElementById("caseSensitif");
  const searchButton = document.getElementById("search-note");
  const closeViewerButton = document.getElementById("close-viewer");
  const resetSearchContextButton = document.getElementById("reset-search");
  const commandButton = document.getElementById("command-button");
  const toggleAscButton = document.getElementById("acs-desc");
  const orderBySelect = document.getElementById("sort-notes");
  const filterByButton = document.getElementById("filter-by");
  const toggleShortButton = document.getElementById("toggl-short");

  /* actions dialogue */
  const actionContainer = document.getElementById("actions");

  /** containers */
  const noteViewer = document.getElementById("note-viewer");
  const noteTag = document.getElementById("note-tag");
  const searchBar = document.getElementById("search-bar");
  const actionsContainer = document.getElementById("actions-container");

  /** trigger */
  const notesFab = document.getElementById("notes-fab");

  /* Global Objects */
  const searchContext = {
    isRegex: false,
    isCaseSensitive: false,
    filters: {
      pages: "",
      colors: "",
      priority: "",
    },
    orderBy: {
      key: "",
      asc: true,
    },
  };

  const filterActions = [
    {
      title: "Filtrer par Page",
      async callback(action) {
        return (await extractRStringsFromSitemap()).map((e) => {
          return {
            title: e.replace(/^\/r\//, ""),
            async callback() {
              action.disable = true;
              addChip(
                "documents-outline",
                e.replace(/^\/r\//, ""),
                function () {
                  searchContext.filters.pages = "";
                  searchInput.focus();
                  action.disable = false;
                }
              );
              resetSearchContextButton.classList.remove("reset-disable");
              searchContext.filters.pages = e;
              exitCommandMode();
            },
          };
        });
      },
      disable: false,
    },
    {
      title: "Filtrer par Couleur",
      async callback(action) {
        return [0, 1, 2, 3, 4].map((e) => {
          return {
            title: `<span ccolor="${e}" class="pastille"/>`,
            async callback() {
              action.disable = true;
              addChip(
                "",
                "Filtre " + `<div ccolor="${e}" class="pastille"/>`,
                function () {
                  searchContext.filters.colors = "";
                  action.disable = false;
                  searchInput.focus();
                }
              );
              resetSearchContextButton.classList.remove("reset-disable");
              searchInput.focus();
              searchContext.filters.colors = e;
              exitCommandMode();
            },
          };
        });
      },
      disable: false,
    },
    {
      title: "Filtrer par Priorité ",
      async callback(action) {
        return priorities_icons.map((e) => {
          return {
            title: `<ion-icon name="${e}"></ion-icon>`,
            async callback() {
              action.disable = true;
              addChip(
                "",
                "Filtre " + `<ion-icon name="${e}"></ion-icon>`,
                function () {
                  searchContext.filters[e] = "";
                  action.disable = false;
                  searchInput.focus();
                }
              );
              resetSearchContextButton.classList.remove("reset-disable");
              searchInput.focus();
              exitCommandMode();
              searchContext.filters.priority = priorities_icons.indexOf(e);
            },
          };
        });
      },

      disable: false,
    },
  ];

  const actions = [
    {
      title: "Quitter mode commande",
      async callback() {
        exitCommandMode();
      },
    },
    ...filterActions,
    // {
    //   title: "Ajouté une note",
    //   async callback() {
    //     addNoteCommands();
    //     exitCommandMode();
    //   },
    // },
    {
      title: "Fermer les notes",
      async callback() {
        noteViewer.style.display = "none";
        exitCommandMode();
      },
    },
    {
      title: `Trier par Page`,
      async callback() {
        orderBySelect.value = "page";
        searchContext.orderBy.key = "page";
        if (searchContext.orderBy.key) {
          search(innerSchearInput);
        }
        exitCommandMode();
      },
    },
    {
      title: "Trier Par priorité",
      async callback() {
        orderBySelect.value = "priority";
        searchContext.orderBy.key = "priority";
        if (searchContext.orderBy.key) {
          search(innerSchearInput);
        }
        exitCommandMode();
      },
    },
    {
      title: "Trier Par couleur",
      async callback() {
        orderBySelect.value = "color";
        searchContext.orderBy.key = "colors";
        if (searchContext.orderBy.key) {
          search(innerSchearInput);
        }
        exitCommandMode();
      },
    },
    {
      title: `Trier par ordre croissant/decroissant`,
      async callback() {
        searchContext.orderBy.asc = !searchContext.orderBy.asc;
        toggleAscButton.classList.toggle("asc");
        search(innerSchearInput);
        exitCommandMode();
      },
    },
    {
      title: `Activé/déactivé respect des majuscules `,
      async callback() {
        searchContext.isRegex = !searchContext.isRegex;
        caseSensitifButton.classList.toggle("active");
        search(innerSchearInput);
        exitCommandMode();
      },
    },
    {
      title: "Activé/déactivé respect les regex",
      async callback() {
        searchContext.isCaseSensitive = !searchContext.isCaseSensitive;
        regexSearchButton.classList.toggle("active");
        search(innerSchearInput);
        exitCommandMode();
      },
    },
    {
      title: "Réinitialiser la recherche",
      async callback() {
        resetSearch();
        exitCommandMode();
      },
    },
    {
      title: "Supprimer toutes les notes",
      async callback() {
        return [
          {
            title: "Annuler: je ne veux pas tout supprimer",
            async callback() {
              currentActions = [actions];
              displayCurrentCommands("");
            },
          },
          {
            title: "Confirmer: Je veux tout supprimer",
            async callback() {
              await cn.storage.deleteAllNotes();
              window.location.reload();
            },
          },
        ];
      },
    },
    {
      title: "Afficher le paragraphe Oui/Non",
      async callback() {
        if (toggleShort) {
          displayShort(toggleShort);
          toggleShort = false;
        } else {
          displayShort(toggleShort);
          toggleShort = true;
        }
      },
    },
  ];

  /* Global Vars */
  let currentActions = [actions];
  let innerSchearInput = "";
  let filteredActions = actions;
  let commandMod = false;
  let commandIndex = 0;
  let toggleShort = false;

  /**
   * Functions Handler
   */

  /**
   * @param {string} text
   */
  function displayCurrentCommands(text) {
    actionContainer.replaceChildren();

    filteractions(text).forEach((k) => {
      const d = document.createElement("div");
      d.innerHTML = k.title;

      actionContainer.appendChild(d);

      d.addEventListener("click", manageCommandCallBack(k));
    });

    commandIndex = 0;
    if (actionContainer.children.length > 0)
      actionContainer.children[commandIndex].classList.add("action-selected");
  }

  /**
   * @param {Object} k
   * @param {Function} k.callback
   * @returns
   */
  function manageCommandCallBack(k) {
    return async () => {
      const cr = await k.callback(k);
      if (cr) {
        currentActions.unshift(cr);
      } else {
        currentActions = [actions];
      }
      displayCurrentCommands();
    };
  }

  /**
   * @description Enter in command Mode
   * @returns {void}
   */
  function enterCommandMode() {
    searchBar.classList.add("command");
    searchInput.classList.add("command");
    regexSearchButton.style.display = "none";
    resetSearchContextButton.style.display = "none";
    caseSensitifButton.style.display = "none";
    searchButton.style.display = "none";
    actionsContainer.classList.add("expanded");
    innerSchearInput = searchInput.value;
    searchInput.value = "";
    displayCurrentCommands();

    commandMod = true;
    searchInput.focus();
  }

  /**
   * @description exit the command Mode
   * @returns {void}
   */
  function exitCommandMode() {
    searchBar.classList.remove("command");
    searchInput.classList.remove("command");
    regexSearchButton.style.display = "block";
    resetSearchContextButton.style.display = "block";
    caseSensitifButton.style.display = "block";
    searchButton.style.display = "block";
    actionsContainer.classList.remove("expanded");

    currentActions = [actions];

    searchInput.value = innerSchearInput;
    commandMod = false;

    searchInput.focus();
  }

  /**
   * @description Create a new chip
   * @param {string} logoName
   * @param {string} title
   * @param {Function} cb
   * @returns {void}
   */
  function addChip(logoName, title, cb) {
    const chip = document.createElement("span");
    chip.classList.add("chip");
    const labelNode = document.createElement("span");

    labelNode.innerHTML = title;
    labelNode.classList.add("text-chip");

    if (logoName) {
      const logoNode = document.createElement("ion-icon");
      logoNode.name = logoName;
      logoNode.classList.add("chip-icon");
      chip.appendChild(logoNode);
    }

    const deleteButton = document.createElement("ion-icon");
    deleteButton.name = "add";

    deleteButton.classList.add("close-button");
    deleteButton.classList.add("chip-icon");
    deleteButton.addEventListener("click", () => {
      cb();
      chip.remove();
      displayCurrentCommands(searchInput.value);
    });
    chip.appendChild(labelNode);
    chip.appendChild(deleteButton);
    chipsContainer.appendChild(chip);
    return searchContext;
  }

  /**
   *
   * @param {string} text
   * @returns
   */
  function filteractions(text) {
    filteredActions = currentActions[0].filter(
      (action) => RegExp(text ?? "", "i").test(action.title) && !action.disable
    );
    return filteredActions;
  }

  /**
   * @description Acctually do the search on the object allNotes
   * @param {string} text
   * @returns {void}
   */
  async function search(text) {
    text ??= "";

    const regText = searchContext.isRegex ? text : escapeStringRegexp(text);

    const isSensitve = searchContext.isCaseSensitive ? undefined : "i";

    const pagePattern = searchContext.filters.pages
      ? new RegExp(escapeStringRegexp(searchContext.filters.pages))
      : null;

    const allNotes = await cn.storage.getAllNotes().then((files) => {
      return Promise.all(files.map((file) => file.json()));
    });

    const regexp = RegExp(regText, isSensitve);
    console.log("regexp", regexp);
    const filteredNotes =
      allNotes.filter((note) => {
        if (pagePattern && !pagePattern.test(note.pagePathname)) return false;
        if (
          searchContext.filters.colors !== "" &&
          note.color !== searchContext.filters.colors
        )
          return false;
        if (
          searchContext.filters.priority !== "" &&
          note.priority !== searchContext.filters.priority
        )
          return false;
        if (
          !regexp.test(note.noteContent) &&
          !regexp.test(note.selectionData.selectedText)
        )
          return false;

        return true;
      }) ?? [];

    if (filteredNotes.length >= 0) {
      noteTag.innerHTML = "";
      console.log(searchContext.orderBy);

      if (searchContext.orderBy.key) {
        filteredNotes.sort(orderNotesHandler).forEach(addNote);
      } else {
        filteredNotes.forEach(addNote);
      }

      orderBySelect.style.display = "block";
      toggleAscButton.style.display = "block";
      toggleShortButton.style.display = "block";
    } else {
      orderBySelect.style.display = "none";
      toggleAscButton.style.display = "none";
      toggleShortButton.style.display = "block";
    }
  }

  /**
   * @param {object} a
   * @param {number} a.color
   * @param {number} a.priority
   * @param {string} a.noteContent
   * @param {object} b
   * @param {number} b.color
   * @param {number} b.priority
   * @param {string} b.noteContent
   * @returns
   */
  function orderNotesHandler(a, b) {
    if (searchContext.orderBy.key === "color") {
      const colorA = a.color;
      const colorB = b.color;
      return searchContext.orderBy.asc ? colorA - colorB : colorB - colorA;
    } else if (searchContext.orderBy.key === "priority") {
      const priorityA = a.priority;
      const priorityB = b.priority;

      return searchContext.orderBy.asc
        ? priorityA - priorityB
        : priorityB - priorityA;
    } else if (searchContext.orderBy.key === "page") {
      const textA = a.noteContent || "";
      const textB = b.noteContent || "";
      return searchContext.orderBy.asc
        ? textA.localeCompare(textB)
        : textB.localeCompare(textA);
    }
  }

  function resetSearch() {
    document.getElementById("chips").innerHTML = "";
    searchContext.filters.pages = "";
    searchContext.filters.colors = "";
    searchContext.filters.priority = "";
    filterActions.forEach((action) => {
      action.disable = false;
    });
    innerSchearInput = "";
    searchInput.value = "";
    search("");
    resetSearchContextButton.classList.add("reset-disable");
  }

  function displayShort(isShort) {
    if (isShort) {
      toggleShortButton.name = "eye-off-outline";
      noteTag.classList.add("display-short");
    } else {
      toggleShortButton.name = "eye-outline";
      noteTag.classList.remove("display-short");
    }
  }

  window.displayShort = displayShort;

  displayCurrentCommands();

  /**
   * Event Handler
   */

  // addNoteButton.addEventListener("click", addNoteCommands);
  /* Header Elements actions */

  regexSearchButton.addEventListener("click", (e) => {
    searchContext.isRegex = !searchContext.isRegex;
    regexSearchButton.classList.toggle("selected");
    e.target.classList.toggle("active", searchContext.isRegex);
  });

  caseSensitifButton?.addEventListener("click", (e) => {
    searchContext.isCaseSensitive = !searchContext.isCaseSensitive;
    document.getElementById("caseSensitifButton")?.classList.toggle("selected");
    e.target.classList.toggle("active", searchContext.isCaseSensitive);
  });

  resetSearchContextButton.addEventListener("click", resetSearch);

  searchBar.addEventListener("click", () => {
    searchInput.focus();
  });

  searchInput.addEventListener("input", () =>
    resetSearchContextButton.classList.remove("reset-disable")
  );

  searchInput.addEventListener("keyup", (e) => {
    switch (e.key) {
      case "Backspace":
        if (!searchInput.value) {
          const lastChip = chipsContainer.lastElementChild;

          if (lastChip) {
            lastChip.getElementsByClassName("close-button")[0].click();
          }
        }
        if (commandMod) {
          displayCurrentCommands(searchInput.value);
        }

        return;
      case "Enter":
        if (commandMod) {
          manageCommandCallBack(filteredActions[commandIndex])().then(
            () => (searchInput.value = "")
          );
        }
        search(searchInput.value);

        return;
      case "Escape":
        if (currentActions.length == 1) {
          exitCommandMode();
        } else {
          currentActions.shift();
          displayCurrentCommands();
        }
        return;
      case ">":
        e.preventDefault();
        searchInput.value = "";
        enterCommandMode();
        displayCurrentCommands();
        return;
      case "ArrowUp":
        if (currentActions.length < 1) return;
        actionContainer.children[commandIndex].classList.remove(
          "action-selected"
        );
        if (commandIndex == 0) commandIndex = currentActions[0].length;
        commandIndex -= 1;
        actionContainer.children[commandIndex].classList.add("action-selected");
        return;
      case "ArrowDown":
        if (currentActions.length < 1) return;
        actionContainer.children[commandIndex].classList.remove(
          "action-selected"
        );
        commandIndex = (commandIndex + 1) % currentActions[0].length;
        actionContainer.children[commandIndex].classList.add("action-selected");
        return;
      default:
        displayCurrentCommands(searchInput.value);
        return;
    }
  });

  toggleShortButton.addEventListener("click", () => {
    if (toggleShort) {
      displayShort(toggleShort);
      toggleShort = false;
    } else {
      displayShort(toggleShort);
      toggleShort = true;
    }
  });

  /**
   * triggerFilter
   */

  filterByButton.addEventListener("click", () => {
    searchInput.focus();
    enterCommandMode();
    currentActions = [filterActions, actions];
    displayCurrentCommands();
  });

  /**
   * search
   */
  searchButton.addEventListener("click", () => {
    noteTag.innerHTML = "No content";
    let inputText = searchInput?.value ?? "";

    search(searchInput.value);
  });

  /**
   * Open Command
   */
  commandButton.addEventListener("click", () => {
    if (commandMod) exitCommandMode();
    else enterCommandMode();
  });

  toggleAscButton.addEventListener("click", () => {
    console.log(searchContext.orderBy.key);

    searchContext.orderBy.asc
      ? toggleAscButton.classList.remove("asc")
      : toggleAscButton.classList.add("asc");
    searchContext.orderBy.asc = !searchContext.orderBy.asc;
    if (searchContext.orderBy.key) {
      search(innerSchearInput);
    }
  });

  /**
   * direction Order
   */
  orderBySelect.addEventListener("change", () => {
    searchContext.orderBy.key = orderBySelect.value;
    search(innerSchearInput);
  });

  /**
   * Close Viewer
   */
  closeViewerButton.addEventListener("click", () => {
    noteViewer.style.display = "none";
    exitCommandMode();
  });

  /**
   * NotesFab actions
   */

  notesFab.addEventListener("click", () => {
    orderBySelect.value = "page";
    searchContext.orderBy.key = "page";

    searchContext.orderBy.value = document.location.pathname;
    noteViewer.style.display = "block";
    searchInput.focus();
    searchInput.value = "";
  });
});
