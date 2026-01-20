
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyCetJFlex7Mh8yKTUbElRoYgJDAfJjbTk0",
  authDomain: "farmer-d7745.firebaseapp.com",
  projectId: "farmer-d7745",
  storageBucket: "farmer-d7745.firebasestorage.app",
  messagingSenderId: "8130459441",
  appId: "1:8130459441:web:f1e226c300da01fd8e6210",
  measurementId: "G-705VYPXGM7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export default app;
