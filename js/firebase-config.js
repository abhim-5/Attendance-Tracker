// js/firebase-config.js

// Your Firebase config (replace with actual values)
const firebaseConfig = {
  apiKey: "AIzaSyC9MYJnrYVfdvd-EIzaWpPGke_JMeqDC3A",
  authDomain: "attendance-tracker-5c723.firebaseapp.com",
  projectId: "attendance-tracker-5c723",
  storageBucket: "attendance-tracker-5c723.appspot.com",
  messagingSenderId: "541637758089",
  appId: "1:541637758089:web:3294563b083fa9fb34ca58"
};

// Initialize Firebase once
firebase.initializeApp(firebaseConfig);

// Make db and auth globally accessible
window.db = firebase.firestore();
window.auth = firebase.auth();



