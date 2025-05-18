// webrtc-sync.js — PURE VANILLA JS

let notes = [];
let localConnection;
let dataChannel;
let cryptoKey;

// === Encryption Functions ===
async function deriveKey(passphrase) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({
    name: "PBKDF2",
    salt: enc.encode("sync-salt"),
    iterations: 100000,
    hash: "SHA-256"
  }, keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

async function encrypt(data) {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = enc.encode(JSON.stringify(data));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, encoded);
  return JSON.stringify({ iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) });
}

async function decrypt(payload) {
  const obj = typeof payload === "string" ? JSON.parse(payload) : payload;
  const iv = new Uint8Array(obj.iv);
  const data = new Uint8Array(obj.data);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, data);
  const dec = new TextDecoder();
  return JSON.parse(dec.decode(decrypted));
}

// === Note Management ===
function updateNote(note) {
  const i = notes.findIndex(n => n.id === note.id);
  if (i === -1) notes.push(note);
  else if (note.priority > notes[i].priority) notes[i] = note;
  sendNotes([note]);
}

function mergeNotes(incoming) {
  for (const note of incoming) {
    const i = notes.findIndex(n => n.id === note.id);
    if (i === -1 || note.priority > notes[i].priority) {
      notes[i === -1 ? notes.length : i] = note;
    }
  }
  console.log( JSON.stringify(notes, null, 2));
}

async function sendNotes(noteList) {
  if (dataChannel && dataChannel.readyState === "open") {
    const payload = await encrypt(noteList);
    dataChannel.send(payload);
  }
}

// === Peer Connection ===
async function startConnection(passphrase, isInitiator) {
  cryptoKey = await deriveKey(passphrase);
  localConnection = new RTCPeerConnection();

  if (isInitiator) {
    dataChannel = localConnection.createDataChannel("notes");
    setupChannel(dataChannel);
    const offer = await localConnection.createOffer();
    await localConnection.setLocalDescription(offer);
    await waitForIce(localConnection);
    console.log( JSON.stringify(localConnection.localDescription));
  } else {
    localConnection.ondatachannel = (event) => {
      dataChannel = event.channel;
      setupChannel(dataChannel);
    };
  }

  localConnection.onicecandidate = () => {
    if (localConnection.iceGatheringState === "complete") {
      console.log( JSON.stringify(localConnection.localDescription));
    }
  };
}

function setupChannel(channel) {
  channel.onopen = () => console.log("Channel open");
  channel.onmessage = async event => {
    const decrypted = await decrypt(event.data);
    mergeNotes(decrypted);
  };
}

async function acceptRemoteSignal(signalJSON) {
  const desc = new RTCSessionDescription(JSON.parse(signalJSON));
  await localConnection.setRemoteDescription(desc);
  if (desc.type === "offer") {
    const answer = await localConnection.createAnswer();
    await localConnection.setLocalDescription(answer);
    await waitForIce(localConnection);
    console.log( JSON.stringify(localConnection.localDescription));
  }
}

function waitForIce(pc) {
  return new Promise(resolve => {
    if (pc.iceGatheringState === "complete") return resolve();
    const check = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", check);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", check);
  });
}
