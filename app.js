import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
  signOut, onAuthStateChanged, sendEmailVerification
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

// Elementlər
const mineBtn = document.getElementById("mine-btn");
const balanceEl = document.getElementById("balance");
const mineStatus = document.getElementById("mine-status");
const countdownEl = document.getElementById("countdown");
const profileIcon = document.getElementById("profile-icon");
const logoutMenu = document.getElementById("logout-menu");
const loginBtn = document.getElementById("login-btn");
const registerBtn = document.getElementById("register-btn");
const withdrawBtn = document.getElementById("withdraw-btn");
const authModal = document.getElementById("auth-modal");

let currentUser = null;
let miningInterval = null;
let countdownInterval = null;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    await user.reload();
    if (!user.emailVerified) {
      alert("Email ünvanını təsdiqləməlisən! Emailinə gələn linkə bax.");
      await signOut(auth);
      return;
    }

    currentUser = user;
    loginBtn.style.display = "none";
    registerBtn.style.display = "none";
    profileIcon.classList.remove("hidden");
    profileIcon.innerText = user.email.charAt(0).toUpperCase();
    await loadUserData();
  } else {
    currentUser = null;
    profileIcon.classList.add("hidden");
    logoutMenu.classList.add("hidden");
    loginBtn.style.display = "inline-block";
    registerBtn.style.display = "inline-block";
    balanceEl.innerHTML = "0.00000000 AGC";
    clearIntervals();
  }
});

async function loadUserData() {
  const userDoc = doc(db, "users", currentUser.uid);
  const snapshot = await getDoc(userDoc);
  if (!snapshot.exists()) {
    await setDoc(userDoc, { balance: 0, lastMine: null, miningActive: false });
  } else {
    const data = snapshot.data();
    balanceEl.innerHTML = `${data.balance.toFixed(8)} AGC`;
    if (data.miningActive && data.lastMine) {
      const diff = Date.now() - data.lastMine.toMillis();
      if (diff < 24 * 60 * 60 * 1000) startMiningCountdown(data.lastMine.toMillis(), data.balance);
    }
  }
}

mineBtn.addEventListener("click", async () => {
  if (!currentUser) return alert("Zəhmət olmasa giriş et və ya qeydiyyatdan keç!");

  const now = Date.now();
  const userDoc = doc(db, "users", currentUser.uid);
  await updateDoc(userDoc, { lastMine: serverTimestamp(), miningActive: true });
  startMiningCountdown(now, (await getDoc(userDoc)).data().balance);
});

function startMiningCountdown(startTime, balance) {
  mineBtn.disabled = true;
  mineStatus.innerText = "Kazım aktivdir...";
  const duration = 24 * 60 * 60 * 1000;
  const endTime = startTime + duration;

  clearIntervals();

  miningInterval = setInterval(async () => {
    const now = Date.now();
    const progress = Math.min((now - startTime) / duration, 1);
    const newBalance = balance + progress * 0.000001;
    balanceEl.innerHTML = `${newBalance.toFixed(8)} AGC`;
    if (progress >= 1) {
      clearIntervals();
      mineBtn.disabled = false;
      mineStatus.innerText = "Kazım bitdi! Yenidən başlaya bilərsən.";
      const userDoc = doc(db, "users", currentUser.uid);
      await updateDoc(userDoc, { balance: newBalance, miningActive: false });
    }
  }, 3000);

  countdownInterval = setInterval(() => {
    const remaining = endTime - Date.now();
    if (remaining <= 0) {
      countdownEl.innerText = "00:00:00 qaldı";
      clearInterval(countdownInterval);
    } else {
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      countdownEl.innerText = `${h.toString().padStart(2, '0')}:${m
        .toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} qaldı`;
    }
  }, 1000);
}

function clearIntervals() {
  clearInterval(miningInterval);
  clearInterval(countdownInterval);
}

// Çıxış menyusu
profileIcon.onclick = () => {
  logoutMenu.classList.toggle("hidden");
};

logoutMenu.onclick = async () => {
  await signOut(auth);
  alert("Uğurla çıxış etdiniz.");
};

// Pul köçürmə
withdrawBtn.onclick = () => {
  alert("💰 Pul köçürmə sistemi tezliklə aktiv olunacaqdır!");
};

// Modal əməliyyatları (login/register)
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
    await sendEmailVerification(userCred.user);
    await setDoc(doc(db, "users", userCred.user.uid), { balance: 0, lastMine: null, miningActive: false });
    alert("Email ünvanına təsdiq linki göndərildi. Lütfən emailini yoxla.");
    await signOut(auth);
    authModal.classList.add("hidden");
  } catch (err) {
    alert(err.message);
  }
}

async function loginUser() {
  const email = document.getElementById("auth-email").value;
  const password = document.getElementById("auth-password").value;
  try {
    const user = await signInWithEmailAndPassword(auth, email, password);
    if (!user.user.emailVerified) {
      alert("Email təsdiqlənməyib! Zəhmət olmasa emailini təsdiqlə.");
      await signOut(auth);
      return;
    }
    authModal.classList.add("hidden");
  } catch (err) {
    alert("Email və ya şifrə yalnışdır!");
  }
}
