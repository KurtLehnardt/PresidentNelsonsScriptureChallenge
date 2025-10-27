const firebaseConfig = {
  apiKey: "AIzaSyA-2A9XpV8svuy_dtAV6pdyO6K3CUzhDmM",
  authDomain: "scripture-challenge-2017.firebaseapp.com",
  projectId: "scripture-challenge-2017",
  storageBucket: "scripture-challenge-2017.firebasestorage.app",
  messagingSenderId: "417205749142",
  appId: "1:417205749142:web:5d9d53b8fb2a65358049b7",
  measurementId: "G-5FDRMEFN51"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();