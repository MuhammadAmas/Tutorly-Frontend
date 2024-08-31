/* eslint-disable @typescript-eslint/no-unused-vars */
import "./App.css";
import { initializeApp } from "firebase/app";
import "firebase/firestore";
import {
  addDoc,
  collection,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  doc,
  getFirestore,
} from "firebase/firestore";
import { useRef, useState } from "react";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const firestore = initializeApp(firebaseConfig);
const database = getFirestore(firestore);

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

const pc = new RTCPeerConnection(servers);

function App() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const callInputRef = useRef<HTMLInputElement | null>(null);
  const callButtonRef = useRef<HTMLButtonElement | null>(null);
  const answerButtonRef = useRef<HTMLButtonElement | null>(null);
  const hangupButtonRef = useRef<HTMLButtonElement | null>(null);
  const webcamButtonRef = useRef<HTMLButtonElement | null>(null);

  const handleWebcamButtonClick = async () => {
    const localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    const remoteStream = new MediaStream();

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

    if (webcamVideoRef.current) {
      webcamVideoRef.current.srcObject = localStream;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    setLocalStream(localStream);
    setRemoteStream(remoteStream);

    // if (callButtonRef.current) callButtonRef.current.disabled = false;
    // if (answerButtonRef.current) answerButtonRef.current.disabled = false;
    // if (webcamButtonRef.current) webcamButtonRef.current.disabled = true;
  };

  const handleCallbuttonClick = async () => {
    console.log("here in call button");
    const callDoc = doc(collection(database, "calls"));
    const offerCandidates = collection(callDoc, "offerCandidates");
    const answerCandidates = collection(callDoc, "answerCandidates");

    callInputRef.current.value = callDoc.id;
    console.log(callInputRef.current.value);

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await addDoc(offerCandidates, event.candidate.toJSON());
      }
    };

    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await setDoc(callDoc, { offer });

    onSnapshot(callDoc, (snapshot) => {
      const data = snapshot.data();
      if (!pc.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        pc.setRemoteDescription(answerDescription);
      }
    });

    // When answered, add candidate to peer connection
    onSnapshot(answerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          console.log("added");
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.addIceCandidate(candidate);
        }
      });
    });

    if (hangupButtonRef.current) hangupButtonRef.current.disabled = false;
  };

  const handleAnswerButtonClick = async () => {
    const callId = callInputRef.current?.value;
    if (!callId) return;

    const callDoc = doc(database, "calls", callId);
    const answerCandidates = collection(callDoc, "answerCandidates");
    const offerCandidates = collection(callDoc, "offerCandidates");

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await addDoc(answerCandidates, event.candidate.toJSON());
      }
    };

    const callData = (await getDoc(callDoc)).data();
    if (!callData) return;

    const offerDescription = callData.offer;
    await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await updateDoc(callDoc, { answer });

    onSnapshot(offerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          console.log("added");
          const data = change.doc.data();
          pc.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });
  };

  return (
    <div>
      <h2>1. Start your Webcam</h2>
      <div className="videos">
        <span>
          <h3>Local Stream</h3>
          <video ref={webcamVideoRef} autoPlay playsInline></video>
        </span>
        <span>
          <h3>Remote Stream</h3>
          <video ref={remoteVideoRef} autoPlay playsInline></video>
        </span>
      </div>

      <button ref={webcamButtonRef} onClick={handleWebcamButtonClick}>
        Start webcam
      </button>
      <h2>2. Create a new call</h2>
      <button ref={callButtonRef} onClick={handleCallbuttonClick}>
        Create Call (offer)
      </button>

      <h2>3. Join a call</h2>
      <p>Answer the call from a different browser window or device</p>
      <input ref={callInputRef} />
      <button ref={answerButtonRef} onClick={handleAnswerButtonClick}>
        Answer
      </button>

      <h2>4. Hangup</h2>
      <button ref={hangupButtonRef} disabled>
        Hangup
      </button>
    </div>
  );
}

export default App;
