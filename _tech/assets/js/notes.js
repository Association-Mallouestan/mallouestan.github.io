// Making global variables for debugging purposes and dynamic access
window.customNotes = { notes: [], storage: {} };
const cn = window.customNotes;

// Global variables

const BASE_SELECTOR = "article.post";

const PIN_ICONS = ["magnet-outline", "magnet"];
const PRIORITY_ICONS = [
  "sunny-outline",
  "cloudy-outline",
  "rainy-outline",
  "thunderstorm-outline",
  "skull-outline",
];

cn.PIN_ICONS = PIN_ICONS;
cn.PRIORITY_ICONS = PRIORITY_ICONS

/*
   Storage for custom notes
   This handles storage and can be changed to use a different storage method
*/

async function saveNote(note) {
  const cache = await caches.open("custom-notes");
  const response = new Response(JSON.stringify(note), {
    headers: { "Content-Type": "application/json" },
  });
  await cache.put(`${window.location.pathname}-${note.id}`, response);
}
cn.storage.saveNote = saveNote;

async function deleteAllNotes() {
  const cache = await caches.delete("custom-notes");
}
cn.storage.deleteAllNotes = deleteAllNotes;

async function deleteNote(note) {
  const cache = await caches.open("custom-notes");
  await cache.delete(`${window.location.pathname}-${note.id}`);
}
cn.storage.deleteNote = deleteNote;

async function getNotesByPath(path) {
  const cache = await caches.open("custom-notes");
  const keys = await cache.keys();
  return await Promise.all(
    keys
      .filter((request) => request.url.includes(path))
      .map((request) => cache.match(request))
  );
}
cn.storage.getNotesByPath = getNotesByPath;

async function getAllNotes() {
  const cache = await caches.open("custom-notes");
  const keys = await cache.keys();
  return await Promise.all(
    keys
      .map((request) => cache.match(request))
  );
}
cn.storage.getAllNotes = getAllNotes;

/* 
  Vanilla markdown notes
*/

function puttawayAllNotes() {
  document.querySelectorAll("note.out").forEach(n => {
    n.classList.remove("out")
  });
}

function parseVanillaMarkdownNotes() {
  const vanillaNotes = document.querySelectorAll("em + note");
  if (vanillaNotes.length > 0) {
    const baseNode = document.querySelector(BASE_SELECTOR);
    const button = document.createElement("ion-icon");
    button.name = "play-skip-back-outline";
    button.id = "btn-toggle-with-annotations";

    button.addEventListener("click", () => {
      baseNode.classList.toggle("with-annotations");
      button.classList.toggle("with-annotations");
    });

    baseNode.insertBefore(button, baseNode.firstChild);
  }
  vanillaNotes.forEach((note, i) => {
    const child = note.appendChild(document.createElement("ion-icon"));
    child.setAttribute("name", "return-down-forward-outline");
    child.classList.add("toggle");

    child.addEventListener("click", (_) => {
      puttawayAllNotes();
      note.classList.toggle("out");
    });

    note.previousElementSibling.addEventListener("click", (_) => {
      puttawayAllNotes();
      note.classList.toggle("out");
    });

    note.previousElementSibling.classList.add("annoted");

    if (i % 2) {
      note.classList.add("odd");
    }
  });
}
cn.parseVanillaMarkdownNotes = parseVanillaMarkdownNotes;

/*
  Custom notes
  This handles the custom notes, which are stored in the browser's cache
*/

function customNoteCreationEventManagement() {

  //Adding the button to create new notes
  const noteButton = document.createElement("ion-icon");
  noteButton.classList.add("addnote");
  noteButton.name = "add";
  document.body.appendChild(noteButton);

  //Event handler for creating new notes
  const handleSelection = (event) => {
    const selection = window.getSelection();
    const selectedText = selection.toString();

    //check if it is a valid selection and is a child of #main-app
    if (!selection || !selection.rangeCount || !document.querySelector(BASE_SELECTOR).contains(selection.anchorNode)) {
      noteButton.style.display = "none";
      return;
    }
    
    console.log(selection);
    if (
      selectedText.length > 0 &&
      selection.baseNode === selection.extentNode &&
      selection.extentNode === selection.focusNode
    ) {
      console.log("Selection is valid");
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      noteButton.style.top = `${(rect.top + rect.bottom) / 2 + document.body.scrollTop - 16
        }px`;
      noteButton.style.right = "16px";
      noteButton.style.display = "block";
    } else {
      noteButton.style.display = "none";
    }
  };

  let textSection = document.querySelector("article.post");
  // textSection.addEventListener("mouseup", handleSelection);
  document.addEventListener("selectionchange", handleSelection);
  // textSection.addEventListener("touchend", handleSelection);


  // Adding event listener
  noteButton.addEventListener("mousedown", (event) => {
    renderNote(null, null, null, null, null, true);
    noteButton.style.display = "none";
  });
}
cn.customNoteCreationEventManagement = customNoteCreationEventManagement;

function renderNote(
  noteIdArg,
  noteContent,
  color,
  isPined,
  priorityNumber,
  out
) {
  // Get the selected text
  const selection = window.getSelection();
  const selectedText = selection.toString();
  const paragraphNode = selection.baseNode.nodeType == 3 ?
    selection.baseNode.parentElement :
    selection.baseNode;

  if (selectedText.length > 0) {
    const noteId = noteIdArg || Date.now();

    const range = selection.getRangeAt(0);
    const selectionData = {
      startOffset: range.startOffset,
      endOffset: range.endOffset,
      path: getPathTo(
        selection.baseNode,
        document.querySelector("article.post")
      ),
      selectedText: selectedText,
    };

    // Create container for the notes
    const container = document.createElement("note");
    container.setAttribute("npath", selectionData.path.join(","));
    container.setAttribute("ccolor", color || 0);
    if (out) {
      container.classList.add("out");
    }

    // Create an input element for the note
    const inputElement = document.createElement("textarea");
    inputElement.wrap = "soft";
    inputElement.placeholder =
      "Vous pouvez créer une note ici pensez a bien sauvegarder avec le bouton ci-dessus. Ces notes sont conserver uniquement sur votre appareil (localement) et ne sont communiqué à aucun service externe. Commentez, critiquer, surligné...";
    inputElement.value = noteContent || "";
    let previousValue = inputElement.value;

    // Create a span element with highligt
    const highlightedTextEl = document.createElement("em");
    highlightedTextEl.classList.add("annoted");
    highlightedTextEl.setAttribute("ccolor", color || 0);
    highlightedTextEl.id = "ht-" + noteId;
    highlightedTextEl.textContent = selectedText;
    selectedText;
    highlightedTextEl.addEventListener("click", () => {
      puttawayAllNotes();
      container.classList.toggle("out");
    });

    // Create ion-icon button for toggleing the note
    const toggleButton = document.createElement("ion-icon");
    toggleButton.classList.add("toggle");
    toggleButton.name = "return-down-forward-outline";
    toggleButton.addEventListener("click", () => {
      puttawayAllNotes();
      container.classList.toggle("out");
    });

    // Create ion-icon button for saving the note
    const saveButton = document.createElement("ion-icon");
    saveButton.name = "save-outline";
    saveButton.classList.add("save");
    if (noteContent) {
      saveButton.classList.add("hidden");
    }
    saveButton.addEventListener("click", function () {
      const currentNameIndexPriority = PRIORITY_ICONS.indexOf(
        priorityButton.name
      );
      const note = {
        id: noteId,
        selectionData: selectionData,
        noteContent: inputElement.value,
        color: parseInt(container.getAttribute("ccolor") || 0),
        priority: currentNameIndexPriority || 0,
        pin: pinButton.name == PIN_ICONS[1],
        pagePathname: container.ownerDocument.location.pathname,
        paragraph: paragraphNode.innerHTML
      };

      console.log(note);

      manageNoteSaving(note, cn.notes);

      previousValue = inputElement.value;
      saveButton.classList.add("hidden");
    });

    // Create ion-icon button for changing the color
    const colorButton = document.createElement("ion-icon");
    colorButton.name = "color-palette-outline";
    colorButton.classList.add("color");
    colorButton.addEventListener("click", () => {
      let currentColor = parseInt(container.getAttribute("ccolor") || 0);
      currentColor = (currentColor + 1) % 5; // Cycle through 0, 1, and 2
      container.setAttribute("ccolor", currentColor);

      highlightedTextEl.setAttribute("ccolor", currentColor);
      saveButton.classList.remove("hidden");
    });

    // Create ion-icon button for deleting the note
    const deleteButton = document.createElement("ion-icon");
    deleteButton.name = "trash-outline";
    deleteButton.classList.add("delete", "hidden");
    deleteButton.addEventListener("click", () => {
      container.remove();
      highlightedTextEl.remove();

      const text = document.createTextNode(selectedText);

      range.insertNode(text);
      text.parentElement.normalize();

      manageNoteDeletion({ id: noteId, selectionData }, cn.notes);
    });

    // Create ion-icon button for adding an issue to github
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
        )}&body=${encodeURIComponent(
          selectionData.selectedText + " -> " + inputElement.value
        )}`,
        "_blank"
      );
      ntab.focus();
    });

    // Create ion-icon button for priorities
    const priorityButton = document.createElement("ion-icon");
    priorityButton.name = PRIORITY_ICONS[priorityNumber ?? 0];
    priorityButton.classList.add("priority", "hidden");
    priorityButton.addEventListener("click", () => {
      let currentNameIndex = PRIORITY_ICONS.indexOf(priorityButton.name);
      const newPriority = (currentNameIndex + 1) % PRIORITY_ICONS.length;
      priorityButton.name = PRIORITY_ICONS[newPriority];
      saveButton.classList.remove("hidden");
    });

    // Create ion-icon button for moreoptions the note
    const moreoptionsButton = document.createElement("ion-icon");
    moreoptionsButton.name = "add";
    moreoptionsButton.classList.add("moreoptions");
    moreoptionsButton.addEventListener("click", () => {
      issueButton.classList.toggle("hidden");
      deleteButton.classList.toggle("hidden");
      moreoptionsButton.classList.toggle("hidden");
      priorityButton.classList.toggle("hidden");

      if (moreoptionsButton.classList.contains("hidden") && parseInt(inputElement.style.height, 10) < 100) {
        inputElement.style.height = "100px"
      }
    });

    // pin me
    const pinButton = document.createElement("ion-icon");
    pinButton.name = PIN_ICONS[isPined ? 1 : 0];
    pinButton.classList.add("pin");


    const pinnedCardPlaceHolder = document.createElement("span");

    pinButton.addEventListener("click", () => {
      const isPinned = !container.classList.contains("is-pinned");

      if (isPinned) {

        let nodeCursor = container.parentElement;
        while (
          nodeCursor?.nextSibling?.tagName === 'NOTE' &&
          nodeCursor?.nextSibling?.getAttribute("npath")?.split(",").at(-1) < selectionData.path.at(-1)
        ) {
          nodeCursor = nodeCursor.nextSibling;
        }

        nodeCursor.after(container);

        highlightedTextEl.after(pinnedCardPlaceHolder);
      } else {
        pinnedCardPlaceHolder.parentNode.replaceChild(container, pinnedCardPlaceHolder);
        container.classList.add("out")
      }

      pinButton.name = PIN_ICONS[isPinned ? 1 : 0];
      container.classList.toggle("is-pinned");

      saveButton.classList.remove("hidden");
    });

    // Event listener for the input element
    inputElement.addEventListener("input", () => {
      if (inputElement.value == "" || inputElement.value !== previousValue) {
        saveButton.classList.remove("hidden");
      } else {
        saveButton.classList.add("hidden");
      }

      inputElement.style.height = `${inputElement.scrollHeight}px`
    });


    // Append the elements to a container
    container.appendChild(toggleButton);
    container.appendChild(saveButton);
    container.appendChild(deleteButton);
    container.appendChild(colorButton);
    container.appendChild(issueButton);
    container.appendChild(priorityButton);
    container.appendChild(moreoptionsButton);
    container.appendChild(pinButton);

    container.appendChild(inputElement);

    // Replace the selected text with the (container)
    range.deleteContents();
    if (isPined) {
      let baseNode = document.querySelector("article.post");
      for (let index = 0; index < selectionData.path.length; index++) {
        if (selectionData.path[index] == -1) break;
        baseNode = baseNode.childNodes[selectionData.path[index]];
      }
      let nodeCursor = baseNode.parentElement;
      while (
        nodeCursor?.nextSibling?.tagName === 'NOTE' &&
        nodeCursor?.nextSibling?.getAttribute("npath")?.split(",").at(-1) < selectionData.path.at(-1)
      ) {
        nodeCursor = nodeCursor.nextSibling;
      }

      nodeCursor.after(container);

      container.classList.add("is-pinned");
    } else {
      range.insertNode(container);
    };
    range.insertNode(highlightedTextEl);
    if (isPined) {
      highlightedTextEl.after(pinnedCardPlaceHolder);
      highlightedTextEl.after(document.createTextNode(""));
    }
    selection.removeAllRanges();
    inputElement.style.height = `${inputElement.scrollHeight}px`
  }
}
cn.renderNote = renderNote;

async function manageNoteSaving(note, pageNotes) {
  await saveNote(note);

  await Promise.all(getSiblings(pageNotes, note).map(n => {
    n.paragraph = note.paragraph
    return saveNote(n)
  }));


  const savedNote = cn.notes.find((n) => n.id == note.id);
  if (savedNote) {
    for (const key in note) {
      if (Object.prototype.hasOwnProperty.call(note, key)) {
        savedNote[key] = note[key];
      }
    }
  } else {
    const olderBrothers = getOlderBrothers(pageNotes, note);

    const currentNotePosition =
      note.selectionData.path[note.selectionData.path.length - 1];
    olderBrothers.forEach((n) => {
      const olderBrotherPosition = n.selectionData.path.pop();
      const newPosition = olderBrotherPosition + 4;


      if (olderBrotherPosition == currentNotePosition) {
        const lengthOfRange = n.selectionData.endOffset - n.selectionData.startOffset;
        n.selectionData.startOffset -= note.selectionData.endOffset;
        n.selectionData.endOffset =
          n.selectionData.startOffset + lengthOfRange;
      }

      n.selectionData.path.push(newPosition);
      manageNoteSaving(n, pageNotes);
    });

    cn.notes.push(note);
  }
}
cn.manageNoteSaving = manageNoteSaving;

async function manageNoteDeletion(note, pageNotes) {
  await deleteNote(note);

  const olderBrothers = getOlderBrothers(pageNotes, note);

  const currentNotePosition =
    note.selectionData.path[note.selectionData.path.length - 1];
  olderBrothers.forEach((n) => {
    const olderBrotherPosition = n.selectionData.path.pop();
    const newPosition = olderBrotherPosition - 4;

    if (newPosition == currentNotePosition) {
      const lengthOfSelection =
        n.selectionData.endOffset - n.selectionData.startOffset;
      n.selectionData.startOffset += note.selectionData.endOffset;
      n.selectionData.endOffset =
        n.selectionData.startOffset + lengthOfSelection;
    }
    n.selectionData.path.push(newPosition);
    console.log(n);
    saveNote(n);
  });

  cn.notes.splice(cn.notes.findIndex((n) => n.id == note.id), 1);
}
cn.manageNoteDeletion = manageNoteDeletion;

async function manageNoteRetrieval() {
  const noteFiles = await getNotesByPath(window.location.pathname);
  //Putting the notes in order
  const notes = (await Promise.all(noteFiles.map((file) => file.json())))
    .sort((a, b) => {
      for (let i = 0; i < Math.min(a.selectionData.path.length, b.selectionData.path.length); i++) {
        if (a.selectionData.path[i] !== b.selectionData.path[i]) {
          return a.selectionData.path[i] - b.selectionData.path[i];
        }
      }
      return a.selectionData.path.length - b.selectionData.path.length; // If paths are identical for the checked portion, shorter comes first
    });

  cn.notes.push(...notes);
}
cn.manageNoteRetrieval = manageNoteRetrieval;

async function renderAllCustomNotes() {

  const baseNode = document.querySelector(BASE_SELECTOR);
  const selection = window.getSelection();

  // Adding known notes
  cn.notes.forEach((note) => {
    const range = document.createRange();

    let baseNodePointer = baseNode;
    for (let index = 0; index < note.selectionData.path.length; index++) {
      if (note.selectionData.path[index] == -1) break;
      baseNodePointer = baseNodePointer.childNodes[note.selectionData.path[index]];
    }

    try {
      console.log(baseNodePointer);
      range.setStart(baseNodePointer, note.selectionData.startOffset);
      range.setEnd(baseNodePointer, note.selectionData.endOffset);

      selection.removeAllRanges();
      selection.addRange(range);

      renderNote(
        note.id,
        note.noteContent,
        note.color,
        note.pin,
        note.priority
      );
      selection.removeAllRanges();
    } catch (e) {
      console.log(e);
      //Transformer en global note
    }
  });
}
cn.renderAllCustomNotes = renderAllCustomNotes;

/*
  Helper functions
*/

function getPathTo(base, to) {
  const parent = base.parentElement;

  if (parent === to || parent === document.body) {
    return [Array.from(parent.childNodes).indexOf(base)];
  } else {
    let tmp = getPathTo(parent, to);
    tmp.push(Array.from(parent.childNodes).indexOf(base));
    return tmp;
  }
}
cn.getPathTo = getPathTo;

function getOlderBrothers(pageNotes, note) {
  return pageNotes.filter((n) => {
    if (n.selectionData.path.length != note.selectionData.path.length)
      return false;
    let lastIndex = note.selectionData.path.length - 1;
    if (
      n.selectionData.path[lastIndex] <= note.selectionData.path[lastIndex]
    ) {
      return false;
    }
    for (let index = 0; index < lastIndex; index++) {
      if (note.selectionData.path[index] != n.selectionData.path[index])
        return false;
    }
    return true;
  });
}
cn.getOlderBrothers = getOlderBrothers;

function getSiblings(pageNotes, note) {
  return pageNotes.filter((n) => {
    if (n.id == note.id) return false
    if (n.selectionData.path.length != note.selectionData.path.length)
      return false;
    let lastIndex = note.selectionData.path.length - 1;
    for (let index = 0; index < lastIndex; index++) {
      if (note.selectionData.path[index] != n.selectionData.path[index])
        return false;
    }
    return true;
  });
}
cn.getSiblings = getSiblings;



/* 
  Bootstrapping the script
  This is the entry point of the script, where we initialize the custom notes and set up event listeners.
*/

document.addEventListener("DOMContentLoaded", async () => {
  // Detecting notes in vanilla markdown
  parseVanillaMarkdownNotes();

  /* # Managing custom notes */
  // Starting with event management for creating notes
  customNoteCreationEventManagement();

  // Retrieving existing notes from the cache
  await manageNoteRetrieval();
  await renderAllCustomNotes();

});
