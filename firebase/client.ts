import { getApp, getApps, initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCcFpm_Lpex0lKG9fisZQvcxTUZr07Zr_s",
  authDomain: "interviewpro-47a20.firebaseapp.com",
  projectId: "interviewpro-47a20",
  storageBucket: "interviewpro-47a20.firebasestorage.app",
  messagingSenderId: "36121474360",
  appId: "1:36121474360:web:08c22d3af052a4f2efbdcd",
  measurementId: "G-YW7WQWFT0H"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
// const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);