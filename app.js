import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
  signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { 
  getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBEFLX4Uy4jTzoSyEdzYzOSEd2lqn8ifbE",
  authDomain: "axtargetbotwebsite.firebaseapp.com",
  projectId: "axtargetbotwebsite",
  storageBucket: "axtargetbotwebsite.firebasestorage.app",
  messagingSenderId: "808698399196",
  appId: "1:808698399196:web:61b6be0721b94f24c3a719",
  measurementId: "G-VLWZG4Q5TD"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const mineBtn = document.getElementById("mine-btn");
const balanceEl = document.getElementById("balance");
const mineStatus = document.getElementById("mine-status");
const refLink = document.getElementById("ref-link");
const profileIcon = document.getElementById("profile-icon");
const loginBtn = document.getElementById("login-btn");
const registerBtn = document.getElementById("register-btn");
const authModal = document.getElementById("auth-modal");

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    loginBtn.style.display = "none";
    registerBtn.style.display = "none";
    profileIcon.classList.remove("hidden");
    profileIcon.innerText = user.email.charAt(0).toUpperCase();
    refLink.value = `${window.location.origin}?ref=${user.email}`;
    await loadUserData();
  } else {
    currentUser = null;
    profileIcon.classList.add("hidden");
    loginBtn.style.display = "inline-block";
    registerBtn.style.display = "inline-block";
    balanceEl.innerHTML = "0.00000000 AGC";
  }
});

async function loadUserData() {
  const userDoc = doc(db, "users", currentUser.uid);
  const snapshot = await getDoc(userDoc);
  if (!snapshot.exists()) {
    await setDoc(userDoc, { balance: 0, lastMine: null, createdAt: serverTimestamp() });
  } else {
    const data = snapshot.data();
    balanceEl.innerHTML = `${data.balance.toFixed(8)} AGC`;
    checkMineAvailability(data.lastMine);
  }
}

async function checkMineAvailability(lastMine) {
  if (!lastMine) {
    mineBtn.disabled = false;
    mineStatus.innerText = "Hazırsan! 24 saatlıq kazıma edə bilərsən.";
    return;
  }
  const diff = Date.now() - lastMine.toMillis();
  if (diff >= 24 * 60 * 60 * 1000) {
    mineBtn.disabled = false;
    mineStatus.innerText = "24 saat keçib, yeni kazıma başlaya bilərsən.";
  } else {
    mineBtn.disabled = true;
    mineStatus.innerText = "Kazım aktivdir. 24 saat tamamlanmayıb.";
  }
}

mineBtn.addEventListener("click", async () => {
  if (!currentUser) {
    alert("Zəhmət olmasa giriş et və ya qeydiyyatdan keç!");
    return;
  }
  mineBtn.disabled = true;
  mineStatus.innerText = "Kazım başladı...";
  const userDoc = doc(db, "users", currentUser.uid);
  const snapshot = await getDoc(userDoc);
  let balance = snapshot.data().balance + 0.000001;
  await updateDoc(userDoc, { balance, lastMine: serverTimestamp() });
  balanceEl.innerHTML = `${balance.toFixed(8)} AGC`;
  mineStatus.innerText = "Kazım tamamlandı! 24 saatdan sonra yenidən kazıma edə bilərsən.";
});

loginBtn.onclick = () => showAuthModal("login");
registerBtn.onclick = () => showAuthModal("register");

function showAuthModal(type) {
  authModal.classList.remove("hidden");
  const title = document.getElementById("auth-title");
  const password2 = document.getElementById("auth-password2");
  const switchText = document.getElementById("auth-switch");
  const submitBtn = document.getElementById("auth-submit");

  if (type === "login") {
    title.textContent = "Giriş et";
    password2.classList.add("hidden");
    switchText.innerHTML = `Hesabın yoxdur? <a href="#" id="toRegister">Qeydiyyat</a>`;
    submitBtn.onclick = loginUser;
  } else {
    title.textContent = "Qeydiyyat";
    password2.classList.remove("hidden");
    switchText.innerHTML = `Artıq hesabın var? <a href="#" id="toLogin">Giriş</a>`;
    submitBtn.onclick = registerUser;
  }

  switchText.querySelector("a").onclick = (e) => {
    e.preventDefault();
    showAuthModal(type === "login" ? "register" : "login");
  };
}

async function registerUser() {
  const email = document.getElementById("auth-email").value;
  const password = document.getElementById("auth-password").value;
  const password2 = document.getElementById("auth-password2").value;
  if (password !== password2) return alert("Şifrələr eyni olmalıdır!");
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", userCred.user.uid), { balance: 0, lastMine: null, createdAt: serverTimestamp() });
    authModal.classList.add("hidden");
  } catch (err) {
    alert(err.message);
  }
}

async function loginUser() {
  const email = document.getElementById("auth-email").value;
  const password = document.getElementById("auth-password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    authModal.classList.add("hidden");
  } catch (err) {
    alert("Email və ya şifrə yalnışdır!");
  }
}
