const customNotes = [];

function getPathTo(base, to){
    const parent = base.parentElement;

    if(parent === to || parent === document.body){
        return [Array.from(parent.childNodes).indexOf(base)];
    } else {
        let tmp = getPathTo(parent, to);
        tmp.push(Array.from(parent.childNodes).indexOf(base));
        return tmp;
    }
}

async function saveNote(note){
    return caches.open('custom-notes')
        .then((cache) =>{
            const response = new Response(JSON.stringify(note), {
                headers: { 'Content-Type': 'application/json' }
            });
            return cache.put(`${window.location.pathname}-${note.id}`, response);
        })
        .then(() => {


            const savedNote = customNotes.find(n => n.id == note.id)
            if(savedNote){
                for (const key in note) {
                    if (Object.prototype.hasOwnProperty.call(note, key)) {
                        savedNote[key] = note[key];
                    }
                }
            } else {

                const olderBrothers = customNotes.filter(n => {
                    if(n.selectionData.path.length != note.selectionData.path.length)
                        return false;
                    let lastIndex = note.selectionData.path.length - 1
                    if(n.selectionData.path[lastIndex] < note.selectionData.path[lastIndex]){
                        return false;
                    }
                    for (let index = 0; index < lastIndex; index++) {
                        if(note.selectionData.path[index] != n.selectionData.path[index])
                            return false
                    }
                    return true
                });

                const mainOldPositon = note.selectionData.path[note.selectionData.path.length - 1];
                olderBrothers.forEach(n => {
                    const oldPosition = n.selectionData.path.pop();
                    const newPosition = oldPosition + 4;

                    if(newPosition == mainOldPositon) {
                        const lengthOfSelection = n.selectionData.endOffset - n.selectionData.startOffset;
                        n.selectionData.startOffset -= note.selectionData.endOffset;
                        n.selectionData.endOffset = n.selectionData.startOffset + lengthOfSelection;
                    }
                    n.selectionData.path.push(newPosition);

                    saveNote(n);
                });

                customNotes.push(note);
            }
        }) 
}

async function deleteNote(note){
    await caches.open('custom-notes')
        .then((cache) =>{
            return cache.delete(`${window.location.pathname}-${note.id}`);
        })
        .then(() =>{
            const olderBrothers = customNotes.filter(n => {
                if(n.selectionData.path.length != note.selectionData.path.length)
                    return false;
                let lastIndex = note.selectionData.path.length - 1
                if(n.selectionData.path[lastIndex] <= note.selectionData.path[lastIndex]){
                    return false;
                }
                for (let index = 0; index < lastIndex; index++) {
                    if(note.selectionData.path[index] != n.selectionData.path[index])
                        return false
                }
                return true
            });

            const mainOldPositon = note.selectionData.path[note.selectionData.path.length - 1];
            olderBrothers.forEach(n => {
                const oldPosition = n.selectionData.path.pop();
                const newPosition = oldPosition - 4;

                if(newPosition == mainOldPositon) {
                    const lengthOfSelection = n.selectionData.endOffset - n.selectionData.startOffset;
                    n.selectionData.startOffset += note.selectionData.endOffset;
                    n.selectionData.endOffset = n.selectionData.startOffset + lengthOfSelection;
                }
                n.selectionData.path.push(newPosition);

                saveNote(n);
            })

            customNotes.splice(customNotes.findIndex(n => n.id == note.id))
        })
}

function wrapSelectedText(noteIdArg, noteContent, color, out) {
    // Get the selected text
    const selection = window.getSelection();
    const selectedText = selection.toString();
    
    if (selectedText.length > 0) {
        const noteId = noteIdArg || Date.now();
        
        const range = selection.getRangeAt(0);
        const selectionData = {
            startOffset: range.startOffset,
            endOffset: range.endOffset,
            path: getPathTo(selection.baseNode, document.querySelector("article.post")),
            selectedText: selectedText
        };

        // Create container for the notes
        const container = document.createElement('code');
        container.setAttribute("ccolor", color || 0);
        if(out){
            container.classList.add("out");
        }

        // Create an input element for the note
        const inputElement = document.createElement('textarea');
        inputElement.wrap = 'soft';
        inputElement.placeholder = 'Vous pouvez créer une note ici pensez a bien sauvegarder avec le bouton ci-dessus. Ces notes sont conserver uniquement sur votre appareil (localement) et ne sont communiqué à aucun service externe. Commentez, critiquer, surligné...';
        inputElement.value = noteContent || "";
        let previousValue = inputElement.value;

        // Create a span element with custom tag
        const customTag = document.createElement('em');
        customTag.classList.add("annoted");
        customTag.setAttribute("ccolor", color || 0);
        customTag.textContent = selectedText;
selectedText;
        customTag.addEventListener('click', () => {
            container.classList.toggle("out");
        });

        // Create ion-icon button for toggleing the note
        const toggleButton = document.createElement('ion-icon');
        toggleButton.classList.add("toggle");
        toggleButton.name = 'return-down-forward-outline';
        toggleButton.addEventListener('click', () => {
            container.classList.toggle("out");
        });

        // Create ion-icon button for saving the note
        const saveButton = document.createElement('ion-icon');
        saveButton.name = 'save-outline';
        saveButton.classList.add("save");
        if(noteContent){
            saveButton.classList.add('hidden');
        }
        saveButton.addEventListener('click', () => {

            const note = {
                id: noteId,
                selectionData: selectionData, 
                noteContent: inputElement.value,
                color: parseInt(container.getAttribute('ccolor') || 0)
            };
          
            saveNote(note);

            previousValue = inputElement.value;
            saveButton.classList.add('hidden');
        });

        // Create ion-icon button for changing the color
        const colorButton = document.createElement('ion-icon');
        colorButton.name = 'color-palette-outline';
        colorButton.classList.add("color");
        colorButton.addEventListener('click', () => {
            let currentColor = parseInt(container.getAttribute('ccolor') || 0);
            currentColor = (currentColor + 1) % 5; // Cycle through 0, 1, and 2
            container.setAttribute('ccolor', currentColor);

            customTag.setAttribute('ccolor', currentColor);
            saveButton.classList.remove('hidden');
        });

        // Create ion-icon button for deleting the note
        const deleteButton = document.createElement('ion-icon');
        deleteButton.name = 'trash-outline';
        deleteButton.classList.add("delete");
        deleteButton.addEventListener('click', () => {
            container.remove();
            customTag.remove();

            const text = document.createTextNode(selectedText);
        
            range.insertNode(text);
            text.parentElement.normalize();
            
            deleteNote({id: noteId, selectionData})
        });

        // Create ion-icon button for adding an issue to github
        const issueButton = document.createElement('ion-icon');
        issueButton.name = 'logo-github';
        issueButton.classList.add("issue");
        issueButton.addEventListener('click', () => {
            const ntab = window.open(
                `https://github.com/Association-Mallouestan/mallouestan.github.io/issues/new?title=${encodeURIComponent("Problème avec "+window.location.pathname)}&body=${encodeURIComponent(selectionData.selectedText + " -> " + inputElement.value)}`
                , '_blank'
            );
            ntab.focus();
        });


        // Event listener for the input element
        inputElement.addEventListener('input', () => {
            if (inputElement.value == "" || inputElement.value !== previousValue) {
            saveButton.classList.remove('hidden');
            } else {
            saveButton.classList.add('hidden');
            }
        });

        // Append the elements to a container
        container.appendChild(inputElement);
        container.appendChild(toggleButton);
        container.appendChild(saveButton);
        container.appendChild(deleteButton);
        container.appendChild(colorButton);
        container.appendChild(issueButton);

        // Replace the selected text with the container
        range.deleteContents();
        range.insertNode(container);
        range.insertNode(customTag);

        selection.removeAllRanges();

    }
}

window.onload = async () => {

    // Detecting notes in vanilla markdown
    document.querySelectorAll("em + code").forEach((e, i) => {
        const child = e.appendChild(document.createElement("ion-icon"));
        child.setAttribute("name", "return-down-forward-outline");
        child.classList.add("toggle");
        child.addEventListener("click", _ => {
            e.classList.toggle("out");
        });

        e.previousElementSibling.addEventListener("click", _ => {
            e.classList.toggle("out");
        });

        e.previousElementSibling.classList.add("annoted")

        if(i%2){
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
    
        if (selectedText.length > 0 
            && selection.baseNode === selection.extentNode 
            && selection.extentNode === selection.focusNode) {
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
    
                    noteButton.style.top = `${(rect.top+rect.bottom)/2 + window.scrollY}px`;
                    noteButton.style.right = "32px";
                    noteButton.style.display = 'block';
                } else {
                    noteButton.style.display = 'none';
                }
    };

    let textSection = document.querySelector('article.post');
    textSection.addEventListener('mouseup', handleSelection);
    textSection.addEventListener('touchend', handleSelection);



    //Retrieving previous notes
    const cache = await caches.open("custom-notes");
    const keys = await cache.keys();
    const noteFiles = await Promise.all(
        keys
            .filter((request) => request.url.includes(window.location.pathname))
            .map(request => cache.match(request))
    );
    const notes = await Promise.all(noteFiles.map(file => file.json()));

    customNotes.push(...notes);

    const post = document.querySelector("article.post")
    const selection = window.getSelection();
    const obsoleteNotes = [];

    // Adding known notes
    notes.forEach(note => {
        const range = document.createRange();
        console.log(note);

        let baseNode = post;
        for (let index = 0; index < note.selectionData.path.length; index++) {
            if(note.selectionData.path[index] == -1) break;
            baseNode = baseNode.childNodes[note.selectionData.path[index]];
        }

        try {
            range.setStart(baseNode, note.selectionData.startOffset);
            range.setEnd(baseNode, note.selectionData.endOffset);
    
            selection.removeAllRanges();
            selection.addRange(range);
    
            wrapSelectedText(note.id, note.noteContent, note.color);
            selection.removeAllRanges();
        } catch (e) {
            console.log(e);
            obsoleteNotes.push(note);
        }
    })

    // Adding event listener
    noteButton.addEventListener('mousedown', (event) => {
        wrapSelectedText(null,null,null, true);
        noteButton.style.display = 'none';
    });

    // Manage obsolete notes
    obsoleteNotes.forEach(note => {
        const noteContainer = document.createElement("div");
        noteContainer.classList.add("obsoleteNote");

        const deleteButton = document.createElement('ion-icon');
        deleteButton.name = 'trash-outline';
        deleteButton.classList.add("delete");
        deleteButton.addEventListener('click', () => {
            noteContainer.remove();
            
           
            deleteNote(note);
        });

        noteContainer.innerHTML = `<span class="old"> Texte surligné: ${note.selectionData.selectedText}" </span><br/> Vous aviez commentez: <span class="old"> ${note.noteContent} </span>`
        noteContainer.appendChild(deleteButton);
        post.after(noteContainer);
    })
}