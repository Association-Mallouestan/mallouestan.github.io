window.onload = async () => {
  document.getElementById("notes-fab").addEventListener("click", () => {
    console.log("clicked");
    const noteViewer = document.getElementById("note-viewer");
    noteViewer.style.display = "block";
    viewNotes();
  });
};
