import {
  uuidv4,
  pin_icons,
  priorities_icons,
  mainChannel,
} from "./notes-utiles/contants";

import {
  handleNoteCache
} from "./notes-utiles/notes-functions"

const customNotes = [];

if (!window.uuid) window.uuid = uuidv4();

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

async function saveNote(note) {
  const noteKey = `${window.location.pathname}-${note.id}`;

  await handleNoteCache("put", noteKey, note);

  const existingNoteIndex = customNotes.findIndex((n) => n.id == note.id);
  if (existingNoteIndex !== -1) {
    // Update existing note
    Object.assign(customNotes[existingNoteIndex], note);
  } else {
    // Adjust positioning for older brothers
    const olderBrothers = customNotes.filter((n) => {
      if (n.selectionData.path.length !== note.selectionData.path.length)
        return false;
      const lastIndex = note.selectionData.path.length - 1;
      if (n.selectionData.path[lastIndex] < note.selectionData.path[lastIndex])
        return false;
      for (let i = 0; i < lastIndex; i++) {
        if (note.selectionData.path[i] !== n.selectionData.path[i])
          return false;
      }
      return true;
    });

    const currentNotePosition =
      note.selectionData.path[note.selectionData.path.length - 1];
    olderBrothers.forEach((n) => {
      const olderBrotherPosition = n.selectionData.path.pop();
      const newPosition = olderBrotherPosition + 4;

      const rangeLength =
        n.selectionData.endOffset - n.selectionData.startOffset;

      if (olderBrotherPosition === currentNotePosition) {
        n.selectionData.startOffset -= note.selectionData.endOffset;
        n.selectionData.endOffset = n.selectionData.startOffset + rangeLength;
      }

      n.selectionData.path.push(newPosition);
      saveNote(n); // recursively update & store
    });

    customNotes.push(note);
  }
}

async function deleteNote(note) {
  const noteKey = `${window.location.pathname}-${note.id}`;
  await handleNoteCache("delete", noteKey);

  const olderBrothers = customNotes.filter((n) => {
    if (n.selectionData.path.length !== note.selectionData.path.length)
      return false;
    const lastIndex = note.selectionData.path.length - 1;
    if (n.selectionData.path[lastIndex] <= note.selectionData.path[lastIndex])
      return false;
    for (let i = 0; i < lastIndex; i++) {
      if (note.selectionData.path[i] !== n.selectionData.path[i]) return false;
    }
    return true;
  });

  const currentNotePosition =
    note.selectionData.path[note.selectionData.path.length - 1];
  olderBrothers.forEach((n) => {
    const olderBrotherPosition = n.selectionData.path.pop();
    const newPosition = olderBrotherPosition - 4;

    if (newPosition === currentNotePosition) {
      const rangeLength =
        n.selectionData.endOffset - n.selectionData.startOffset;
      n.selectionData.startOffset += note.selectionData.endOffset;
      n.selectionData.endOffset = n.selectionData.startOffset + rangeLength;
    }

    n.selectionData.path.push(newPosition);
    saveNote(n);
  });

  const index = customNotes.findIndex((n) => n.id === note.id);
  if (index !== -1) customNotes.splice(index, 1);
}

function wrapSelectedText(
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
    const container = document.createElement("code");
    container.id = noteId;
    console.log(selectionData.path.join(","));

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
    highlightedTextEl.textContent = selectedText;
    selectedText;
    highlightedTextEl.addEventListener("click", () => {
      container.classList.toggle("out");
    });

    // Create ion-icon button for toggleing the note
    const toggleButton = document.createElement("ion-icon");
    toggleButton.classList.add("toggle");
    toggleButton.name = "return-down-forward-outline";
    toggleButton.addEventListener("click", () => {
      container.classList.toggle("out");
    });

    // Create ion-icon button for saving the note
    const saveButton = document.createElement("ion-icon");
    saveButton.name = "save-outline";
    saveButton.classList.add("save");
    if (noteContent) {
      saveButton.classList.add("hidden");
    }
    saveButton.addEventListener("click", () => {
      const currentNameIndexPriority = priorities_icons.indexOf(
        priorityButton.name
      );
      const note = {
        id: noteId,
        selectionData: selectionData,
        noteContent: inputElement.value,
        color: parseInt(container.getAttribute("ccolor") || 0),
        priority: currentNameIndexPriority || 0,
        pin: pinButton.name == pin_icons[1],
        paragrapheLink: document.location.origin + document.location.pathname,
      };

      saveNote(note);
      previousValue = inputElement.value;
      saveButton.classList.add("hidden");

      mainChannel.postMessage({ uuid: window.uuid, note });
      console.log("Posted Message");
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

      deleteNote({ id: noteId, selectionData });
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
    priorityButton.name = priorities_icons[priorityNumber ?? 0];
    priorityButton.classList.add("priority", "hidden");
    priorityButton.addEventListener("click", () => {
      let currentNameIndex = priorities_icons.indexOf(priorityButton.name);
      const newPriority = (currentNameIndex + 1) % priorities_icons.length;
      priorityButton.name = priorities_icons[newPriority];
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

      if (
        moreoptionsButton.classList.contains("hidden") &&
        parseInt(inputElement.style.height, 10) < 100
      ) {
        inputElement.style.height = "100px";
      }
    });

    // pin me
    const pinButton = document.createElement("ion-icon");
    pinButton.name = pin_icons[isPined ? 1 : 0];
    pinButton.classList.add("pin");

    const pinnedCardPlaceHolder = document.createElement("span");

    pinButton.addEventListener("click", () => {
      const isPinned = !container.classList.contains("is-pinned");

      if (isPinned) {
        let nodeCursor = container.parentElement;
        while (
          nodeCursor?.nextSibling?.tagName === "CODE" &&
          nodeCursor?.nextSibling?.getAttribute("npath")?.split(",").at(-1) <
            selectionData.path.at(-1)
        ) {
          nodeCursor = nodeCursor.nextSibling;
          console.log(nodeCursor);
        }

        nodeCursor.after(container);
        console.log(nodeCursor);

        highlightedTextEl.after(pinnedCardPlaceHolder);
      } else {
        pinnedCardPlaceHolder.parentNode.replaceChild(
          container,
          pinnedCardPlaceHolder
        );
        container.classList.add("out");
      }

      pinButton.name = pin_icons[isPinned ? 1 : 0];
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

      inputElement.style.height = `${inputElement.scrollHeight}px`;
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
        nodeCursor?.nextSibling?.tagName === "CODE" &&
        nodeCursor?.nextSibling?.getAttribute("npath")?.split(",").at(-1) <
          selectionData.path.at(-1)
      ) {
        nodeCursor = nodeCursor.nextSibling;
        console.log(nodeCursor);
      }

      nodeCursor.after(container);
      console.log(nodeCursor);

      container.classList.add("is-pinned");
    } else {
      range.insertNode(container);
    }
    range.insertNode(highlightedTextEl);
    if (isPined) {
      highlightedTextEl.after(pinnedCardPlaceHolder);
    }
    selection.removeAllRanges();
    inputElement.style.height = `${inputElement.scrollHeight}px`;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  window.addEventListener("hashchange", () => {
    const hash = window.location.hash;
    if (hash.startsWith("#note-")) {
      const noteId = hash.replace("#note-", "");
      const noteEl = document.getElementById(noteId);
      document
        .querySelectorAll(".out")
        .forEach((c) => c.classList.remove("out"));
      console.log(noteId);
      if (noteEl) {
        noteEl.classList.add("out");

        const noteRect = noteEl.getBoundingClientRect();
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const offsetTop =
          noteRect.top + scrollTop - windowHeight / 2 + noteRect.height / 2;

        window.scrollTo({
          top: offsetTop,
          behavior: "smooth",
        });

        noteEl.style.transition = "background-color 0.5s";
        noteEl.style.backgroundColor = "#ffff99";
        setTimeout(() => {
          noteEl.style.backgroundColor = "";
        }, 2000);
      }
    }
  });

  // Detecting notes in vanilla markdown
  document.querySelectorAll("em + code").forEach((e, i) => {
    const child = e.appendChild(document.createElement("ion-icon"));
    child.setAttribute("name", "return-down-forward-outline");
    child.classList.add("toggle");
    child.addEventListener("click", (_) => {
      e.classList.toggle("out");
    });

    e.previousElementSibling.addEventListener("click", (_) => {
      e.classList.toggle("out");
    });

    e.previousElementSibling.classList.add("annoted");

    if (i % 2) {
      e.classList.add("odd");
    }
  });

  // Managing custom notes
  // Starting with event management for creating notes
  const noteButton = document.createElement("ion-icon");
  noteButton.classList.add("addnote");
  noteButton.name = "add";
  document.body.appendChild(noteButton);

  //Event handler for creating new notes

  const handleSelection = (event) => {
    const selection = window.getSelection();
    const selectedText = selection.toString();

    if (
      selectedText.length > 0 &&
      selection.baseNode === selection.extentNode &&
      selection.extentNode === selection.focusNode
    ) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      noteButton.style.top = `${
        (rect.top + rect.bottom) / 2 + window.scrollY
      }px`;
      noteButton.style.right = "32px";
      noteButton.style.display = "block";
    } else {
      noteButton.style.display = "none";
    }
  };

  let textSection = document.querySelector("article.post");
  textSection.addEventListener("mouseup", handleSelection);
  textSection.addEventListener("touchend", handleSelection);

  //Retrieving previous notes
  // Retrieving previous notes using handleNoteCache
  const allNotes = await handleNoteCache("get");


  const notes = allNotes
    .filter((note) => {
      return (
        note.paragrapheLink ===
        document.location.origin + document.location.pathname
      );
    })
    .sort((a, b) => {
      for (
        let i = 0;
        i < Math.min(a.selectionData.path.length, b.selectionData.path.length);
        i++
      ) {
        if (a.selectionData.path[i] !== b.selectionData.path[i]) {
          return a.selectionData.path[i] - b.selectionData.path[i];
        }
      }
      return a.selectionData.path.length - b.selectionData.path.length;
    });
  console.log(notes);

  customNotes.push(...notes);

  const post = document.querySelector("article.post");
  const selection = window.getSelection();
  const obsoleteNotes = [];

  // Adding known notes
  notes.forEach((note) => {
    const range = document.createRange();

    let baseNode = post;
    for (let index = 0; index < note.selectionData.path.length; index++) {
      if (note.selectionData.path[index] == -1) break;
      baseNode = baseNode.childNodes[note.selectionData.path[index]];
    }

    try {
      console.log(baseNode, note.selectionData.path);
      range.setStart(baseNode, note.selectionData.startOffset);
      range.setEnd(baseNode, note.selectionData.endOffset);

      selection.removeAllRanges();
      selection.addRange(range);

      wrapSelectedText(
        note.id,
        note.noteContent,
        note.color,
        note.pin,
        note.priority
      );
      selection.removeAllRanges();
    } catch (e) {
      console.log(e);
      obsoleteNotes.push(note);
    }
  });

  // Adding event listener
  noteButton.addEventListener("mousedown", (event) => {
    wrapSelectedText(null, null, null, null, null, true);
    noteButton.style.display = "none";
  });

  // Manage obsolete notes
  obsoleteNotes.forEach((note) => {
    const noteContainer = document.createElement("div");
    noteContainer.classList.add("obsoleteNote");

    const deleteButton = document.createElement("ion-icon");
    deleteButton.name = "trash-outline";
    deleteButton.classList.add("delete");
    deleteButton.addEventListener("click", () => {
      const notePinned = document.getElementById(`${note.id}-pinned`);

      notePinned.remove();

      noteContainer.remove();

      deleteNote(note);
    });

    noteContainer.innerHTML = `<span class="old"> Texte surligné: ${note.selectionData.selectedText}" </span><br/> Vous aviez commentez: <span class="old"> ${note.noteContent} </span>`;
    noteContainer.appendChild(deleteButton);
    post.after(noteContainer);
  });
});
