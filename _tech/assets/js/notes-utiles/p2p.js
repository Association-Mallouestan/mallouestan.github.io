var conf = { iceServers: [{ "urls": "stun:stun.l.google.com:19302" }] };
var pc = new RTCPeerConnection(conf);
let _chatChannel

const p2pInfo = document.createElement("textarea")
const connectButton = document.createElement("button")
connectButton.innerText = "ConnectButton"
const toOther = document.createElement("p")

function errHandler(err) {
    console.log(err);
}

function sendMsg(text) {
    _chatChannel.send(text);
}

pc.ondatachannel = function (e) {

    console.log('chatChannel Received -', e);
    _chatChannel = e.channel;
    chatChannel(e.channel);
    
};

pc.onicecandidate = function (e) {
    var cand = e.candidate;
    if (!cand) {
        console.log('iceGatheringState complete\n', pc.localDescription.sdp);
        toOther.innerText = JSON.stringify(pc.localDescription);
    } else {
        console.log(cand.candidate);
    }
}
pc.oniceconnectionstatechange = function () {
    console.log('iceconnectionstatechange: ', pc.iceConnectionState);
}

pc.ontrack = function (e) {
    console.log('remote ontrack', e.streams);
    remote.srcObject = e.streams[0];
}
pc.onconnection = function (e) {
    console.log('onconnection ', e);
}

const localremote = new Map()

connectButton.addEventListener("click", () => {
    if(p2pInfo.value) {
        var _remoteOffer = new RTCSessionDescription(JSON.parse(p2pInfo.value));
        console.log('remoteOffer \n', _remoteOffer);
        pc.setRemoteDescription(_remoteOffer).then(function () {
            console.log('setRemoteDescription ok');
            if (_remoteOffer.type == "offer") {
                pc.createAnswer().then(function (description) {
                    console.log('createAnswer 200 ok \n', description);
                    pc.setLocalDescription(description).then(function () { }).catch(errHandler);
                    toOther.innerText = JSON.stringify(pc.localDescription);
                }).catch(errHandler);
            }
        }).catch(errHandler);
    }

    if(!toOther.getAttribute("set")) {
        _chatChannel = pc.createDataChannel('chatChannel');
        // _fileChannel.binaryType = 'arraybuffer';
        chatChannel(_chatChannel);
        
        pc.createOffer().then(des => {
            console.log('createOffer ok ');
            pc.setLocalDescription(des).then(() => {
                setTimeout(function () {
                    if (pc.iceGatheringState == "complete") {
                        return;
                    } else {
                        console.log('after GetherTimeout');
                        toOther.innerText = JSON.stringify(pc.localDescription);
                        toOther.setAttribute("set", 1)
                    }
                }, 2000);
                console.log('setLocalDescription ok');
            }).catch(errHandler);
            // For chat
        }).catch(errHandler);
    }
  
})


function chatChannel() {
    _chatChannel.onopen = function (e) {
        console.log('chat channel is open', e);
    }
    _chatChannel.onmessage = function (e) {
       console.log(e.data)
    }
    _chatChannel.onclose = function () {
        console.log('chat channel closed');
    }
}

const container = document.createElement("div")
container.appendChild(connectButton)
container.appendChild(p2pInfo)
container.appendChild(toOther)

export {
  sendMsg,
  container
}
