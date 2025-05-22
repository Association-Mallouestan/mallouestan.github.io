var conf = { iceServers: [] };
var pc = new RTCPeerConnection(conf);
let _chatChannel;

const p2pInfo = document.createElement("textarea");
const connectButton = document.createElement("button");
connectButton.innerText = "ConnectButton";
const toOther = document.createElement("p");

const modal = document.createElement("div");

// Style modal
modal.style.position = "fixed";
modal.style.top = "100px";
modal.style.left = "100px";
modal.style.width = "300px";
modal.style.background = "#111";
modal.style.color = "#eee";
modal.style.border = "1px solid #555";
modal.style.borderRadius = "8px";
modal.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
modal.style.zIndex = 9999;
modal.style.userSelect = "none";
modal.style.fontFamily = "monospace";
modal.style.overflow = "hidden";

function errHandler(err) {
  console.error(err);
}

/**
 * @type {Map<string, ArrayBuffer>}
 */
const rsa = new Map();
/**
 * @type {Map<string, { pubKey: CryptoKey }>}
 */
const guestsKey = new Map();

// Generate RSA Key Pair
async function retreiveKeys() {
  const { publicKey, privateKey } = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  rsa.set("pub", await window.crypto.subtle.exportKey("spki", publicKey));
  rsa.set("priv", await window.crypto.subtle.exportKey("pkcs8", privateKey));
}

// Convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Import private key for decrypting
async function importPrivateKey() {
  const priv = rsa.get("priv");
  return await crypto.subtle.importKey(
    "pkcs8",
    priv,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );
}

// Send encrypted message to all guests
export async function sendMessage(text) {
//   const encodedText = new TextEncoder().encode(text);

  /*for (const [id, guestKey] of guestsKey.entries()) {
    try {
      const encrypted = await crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        guestKey.pubKey,
        encodedText
      );

      const payload = btoa(
        String.fromCharCode.apply(null, new Uint8Array(encrypted))
      );
    } catch (err) {
      console.error(`Encryption failed for guest ${id}:`, err);
    }
  }*/
  console.log(text);
  _chatChannel.send(text);
  return false;
}

// Handle incoming data channel
pc.ondatachannel = function (e) {
  console.log("chatChannel received:", e);
  _chatChannel = e.channel;
  chatChannel(_chatChannel);
};

// ICE candidate filtering — reject relays
pc.onicecandidate = function (e) {
  const cand = e.candidate;
  if (cand && cand.candidate.includes("relay")) {
    console.warn("Relay candidate rejected.");
    return;
  }

  if (!cand) {
    console.log("ICE gathering complete");
    toOther.innerText = JSON.stringify(pc.localDescription);
  } else {
    console.log("Candidate:", cand.candidate);
  }
};

// Kill connection if no direct ICE path works
pc.oniceconnectionstatechange = function () {
  const state = pc.iceConnectionState;
  console.log("ICE state:", state);
  if (["failed", "disconnected", "closed"].includes(state)) {
    alert("Direct P2P connection failed. Closing.");
    modal.style.display = "block";
    pc.close();
  }
};

pc.onconnection = function (e) {
  console.log("Connection event:", e);
};

// Chat channel logic
function chatChannel() {
  _chatChannel.onopen = async function () {
    console.log("Chat channel open");
    await retreiveKeys();
    const base64Pub = btoa(
      String.fromCharCode.apply(null, new Uint8Array(rsa.get("pub")))
    );
    _chatChannel.send(JSON.stringify({ id: _chatChannel.id, pub: base64Pub }));

    modal.style.display = "none";
  };

  /**
   * 
   * @param {MessageEvent} e 
   */
  _chatChannel.onmessage = async function (e) {
    // try {
    //   const data = JSON.parse(e.data);
    //   const pubArray = base64ToArrayBuffer(data.pub);
    //   const pub = await crypto.subtle.importKey(
    //     "spki",
    //     pubArray,
    //     {
    //       name: "RSA-OAEP",
    //       hash: "SHA-256",
    //     },
    //     true,
    //     ["encrypt"]
    //   );
    //   guestsKey.set(data.id, { pubKey: pub });
    //   window.guestsKey = guestsKey;
    // } catch {
    //   try {
    //     const encryptedBytes = base64ToArrayBuffer(e.data);
    //     const privKey = await importPrivateKey();
    //     const decrypted = await crypto.subtle.decrypt(
    //       { name: "RSA-OAEP" },
    //       privKey,
    //       encryptedBytes
    //     );
    //     const text = new TextDecoder().decode(decrypted);
    //   } catch (err) {
    //     console.error("Decryption failed:", err);
    //   }
    // }

   const dataEvent = new CustomEvent("p2p-messaging", {
    detail: {

    }
   })

   dataEvent.data = e.data

    console.log(dataEvent)

    document.dispatchEvent(dataEvent)

  };

  _chatChannel.onclose = function () {
    modal.style.display = "block";
    console.log("Chat channel closed");
  };
}

// Connect / initiate offer/answer exchange
connectButton.addEventListener("click", () => {
  if (p2pInfo.value) {
    const remoteOffer = new RTCSessionDescription(JSON.parse(p2pInfo.value));
    console.log("Received remote offer", remoteOffer);

    pc.setRemoteDescription(remoteOffer)
      .then(() => {
        if (remoteOffer.type === "offer") {
          pc.createAnswer()
            .then((description) => {
              pc.setLocalDescription(description).catch(errHandler);
              toOther.innerText = JSON.stringify(pc.localDescription);
            })
            .catch(errHandler);
        }
      })
      .catch(errHandler);
  }

  if (!toOther.getAttribute("set")) {
    _chatChannel = pc.createDataChannel("chatChannel");
    chatChannel(_chatChannel);

    pc.createOffer()
      .then((des) => {
        pc.setLocalDescription(des)
          .then(() => {
            setTimeout(() => {
              if (pc.iceGatheringState !== "complete") {
                console.warn("ICE not complete, sending anyway.");
              }
              toOther.innerText = JSON.stringify(pc.localDescription);
              toOther.setAttribute("set", 1);
            }, 2000);
          })
          .catch(errHandler);
      })
      .catch(errHandler);
  }
});

const container = document.createElement("div");
container.appendChild(p2pInfo);
container.appendChild(toOther);
container.appendChild(connectButton);

export function createDraggableModal(contentElement) {
  const header = document.createElement("div");

  // Style header
  header.innerText = "🔒 P2P WebRTC Secure Chat";
  header.style.cursor = "move";
  header.style.padding = "8px";
  header.style.background = "#222";
  header.style.borderBottom = "1px solid #444";
  header.style.borderTopLeftRadius = "8px";
  header.style.borderTopRightRadius = "8px";
  header.style.fontWeight = "bold";

  // Body container
  const body = document.createElement("div");
  body.style.padding = "10px";
  body.style.maxHeight = "400px"; // Set max height
  body.style.overflowY = "auto"; // Add vertical scroll
  body.style.overflowX = "hidden";
  body.appendChild(container);

  modal.appendChild(header);
  modal.appendChild(body);
  contentElement.appendChild(modal);

  // Drag logic
  let isDragging = false;
  let offsetX, offsetY;

  header.addEventListener("mousedown", function (e) {
    isDragging = true;
    offsetX = e.clientX - modal.offsetLeft;
    offsetY = e.clientY - modal.offsetTop;
    document.body.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", function (e) {
    if (isDragging) {
      modal.style.left = e.clientX - offsetX + "px";
      modal.style.top = e.clientY - offsetY + "px";
    }
  });

  document.addEventListener("mouseup", function () {
    isDragging = false;
    document.body.style.cursor = "default";
  });
}
