/* eslint-disable @typescript-eslint/no-unused-vars */
import "./App.css";
import { initializeApp } from "firebase/app";
import "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAxyPNXeY3UJdsp3OBwF3X0Zhh61pbu32s",
  authDomain: "webrtc-dba87.firebaseapp.com",
  projectId: "webrtc-dba87",
  storageBucket: "webrtc-dba87.appspot.com",
  messagingSenderId: "863277901348",
  appId: "1:863277901348:web:20576e251c26ef1d449ab1",
  measurementId: "G-3NR4Q1EW65",
};

// Initialize Firebase
const firestore = initializeApp(firebaseConfig);

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

const pc = new RTCPeerConnection(servers);
let localStream: MediaStream;
let remoteStream: MediaStream;

const webcamButton = document.getElementById("webcamButton");
const webcamVideo = document.getElementById("webcamVideo");
const callButton = document.getElementById("callButton");
const callInput = document.getElementById("callInput");
const answerButton = document.getElementById("answerButton");
const remoteVideo = document.getElementById("remoteVideo");
const hangupButton = document.getElementById("hangupButton");

const handleWebcamButtonClick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  remoteStream = new MediaStream();

  //push tracks from local stream to peer connection
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  // Pull tracks from remote stream, add to video stream
  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  webcamVideo?.srcObject = localStream;
  remoteVideo?.srcObject = remoteStream;

  callButton?.disabled = false;
  answerButton?.disabled = false;
  webcamButton?.disabled = true;
};

function App() {
  return (
    <>
      <h2>1. Start your Webcam</h2>
      <div className="videos">
        <span>
          <h3>Local Stream</h3>
          <video id="webcamVideo" autoPlay playsInline></video>
        </span>
        <span>
          <h3>Remote Stream</h3>
          <video id="remoteVideo" autoPlay playsInline></video>
        </span>
      </div>

      <button id="webcamButton" onClick={handleWebcamButtonClick}>
        Start webcam
      </button>
      <h2>2. Create a new call</h2>
      <button id="callButton" disabled>
        Create Call (offer)
      </button>

      <h2>3. Join a call</h2>
      <p>Answer the call from a different browser window or device</p>

      <input id="callInput" />
      <button id="answerButton" disabled>
        Answer
      </button>

      <h2>4. Hangup</h2>
      <button id="hangupButton" disabled>
        Hangup
      </button>
    </>
  );
}

export default App;
