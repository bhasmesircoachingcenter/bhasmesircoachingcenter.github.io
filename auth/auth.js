// =============================================================================
// Auth logic for login.html — login, register, Google sign-in, password reset.
//
// Security notes (see repo codeguard rules):
//  - Login failures show a GENERIC message ("Invalid email or password") so we
//    never reveal whether an email is registered (prevents account enumeration).
//  - We rely on Firebase's own secure, httpOnly-style session handling. We do
//    NOT store auth tokens in localStorage ourselves (only the UI language).
//  - GitHub Pages serves over HTTPS only.
// =============================================================================

import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------------- Bilingual strings (shared bcc-lang key with main site) ---- */
var I18N = {
  en: {
    "meta.title": "Student Login | Bhasme Sir Coaching Center",
    "brand.name": "Bhasme Sir",
    "brand.sub": "Coaching Center",
    "auth.loginTitle": "Student Login",
    "auth.loginIntro": "Sign in to view your batch, attendance, test results and announcements.",
    "auth.loginHint": "Students: login with email from admission · password = 10-digit mobile (no +91).",
    "auth.adminHint": "Admins: use Continue with Google or your full email password.",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.passwordMobile": "Password (10-digit mobile)",
    "auth.forgot": "Forgot password?",
    "auth.loginBtn": "Log In",
    "auth.or": "or",
    "auth.google": "Continue with Google",
    "auth.provisionNote": "Accounts are created by the coaching center after admission. Contact admin if you cannot log in.",
    "auth.registerTitle": "Create Account",
    "auth.registerIntro": "Register as a student to access your personal dashboard.",
    "auth.name": "Full Name",
    "auth.phone": "Mobile Number",
    "auth.confirm": "Confirm Password",
    "auth.registerBtn": "Create Account",
    "auth.haveAccount": "Already have an account?",
    "auth.loginLink": "Log In",
    "auth.forgotTitle": "Reset Password",
    "auth.forgotIntro": "Enter your email and we'll send you a password reset link.",
    "auth.sendReset": "Send Reset Link",
    "auth.backToLogin": "Back to login",
    // dynamic messages
    "msg.fillAll": "Please fill in all fields.",
    "msg.invalidEmail": "Please enter a valid email address.",
    "msg.pwShort": "Password must be at least 6 characters.",
    "msg.pwMismatch": "Passwords do not match.",
    "msg.phoneInvalid": "Please enter a valid 10-digit mobile number.",
    "msg.loginFail": "Invalid email or password.",
    "msg.tooMany": "Too many attempts. Please try again later.",
    "msg.network": "Network error. Please check your connection.",
    "msg.welcome": "Signed in — redirecting…",
    "msg.emailInUse": "This email is already registered. Try logging in instead.",
    "msg.registered": "Account created! A verification email has been sent — please check your inbox and Spam/Promotions folder. Redirecting…",
    "msg.resetSent": "If that email is registered, a reset link has been sent.",
    "msg.popupClosed": "Sign-in was cancelled.",
    "msg.generic": "Something went wrong. Please try again."
  },
  mr: {
    "meta.title": "विद्यार्थी लॉगिन | भस्मे सर कोचिंग सेंटर",
    "brand.name": "भस्मे सर",
    "brand.sub": "कोचिंग सेंटर",
    "auth.loginTitle": "विद्यार्थी लॉगिन",
    "auth.loginIntro": "तुमची बॅच, हजेरी, चाचणी निकाल व घोषणा पाहण्यासाठी साइन इन करा.",
    "auth.loginHint": "विद्यार्थी: प्रवेश अर्जातील ईमेल · पासवर्ड = १० अंकी मोबाइल (+91 नको).",
    "auth.adminHint": "प्रशासक: Google ने सुरू ठेवा किंवा पूर्ण ईमेल पासवर्ड वापरा.",
    "auth.email": "ईमेल",
    "auth.password": "पासवर्ड",
    "auth.passwordMobile": "पासवर्ड (१० अंकी मोबाइल)",
    "auth.forgot": "पासवर्ड विसरलात?",
    "auth.loginBtn": "लॉग इन करा",
    "auth.or": "किंवा",
    "auth.google": "Google ने सुरू ठेवा",
    "auth.provisionNote": "प्रवेशानंतर कोचिंग सेंटर खाते तयार करते. लॉगिन होत नसेल तर प्रशासकाशी संपर्क करा.",
    "auth.registerTitle": "खाते तयार करा",
    "auth.registerIntro": "तुमचा वैयक्तिक डॅशबोर्ड वापरण्यासाठी विद्यार्थी म्हणून नोंदणी करा.",
    "auth.name": "पूर्ण नाव",
    "auth.phone": "मोबाइल नंबर",
    "auth.confirm": "पासवर्डची पुष्टी करा",
    "auth.registerBtn": "खाते तयार करा",
    "auth.haveAccount": "आधीच खाते आहे?",
    "auth.loginLink": "लॉग इन करा",
    "auth.forgotTitle": "पासवर्ड रीसेट करा",
    "auth.forgotIntro": "तुमचा ईमेल टाका, आम्ही पासवर्ड रीसेट लिंक पाठवू.",
    "auth.sendReset": "रीसेट लिंक पाठवा",
    "auth.backToLogin": "लॉगिनकडे परत",
    // dynamic messages
    "msg.fillAll": "कृपया सर्व माहिती भरा.",
    "msg.invalidEmail": "कृपया वैध ईमेल पत्ता भरा.",
    "msg.pwShort": "पासवर्ड किमान ६ अक्षरांचा हवा.",
    "msg.pwMismatch": "पासवर्ड जुळत नाहीत.",
    "msg.phoneInvalid": "कृपया वैध १० अंकी मोबाइल नंबर भरा.",
    "msg.loginFail": "ईमेल किंवा पासवर्ड चुकीचा आहे.",
    "msg.tooMany": "खूप प्रयत्न झाले. कृपया नंतर पुन्हा प्रयत्न करा.",
    "msg.network": "नेटवर्क त्रुटी. कृपया तुमचे कनेक्शन तपासा.",
    "msg.welcome": "साइन इन झाले — पुनर्निर्देशित करत आहोत…",
    "msg.emailInUse": "हा ईमेल आधीच नोंदणीकृत आहे. कृपया लॉग इन करा.",
    "msg.registered": "खाते तयार झाले! पडताळणी ईमेल पाठवला आहे — कृपया तुमचा इनबॉक्स व Spam/Promotions फोल्डर तपासा. पुनर्निर्देशित करत आहोत…",
    "msg.resetSent": "जर तो ईमेल नोंदणीकृत असेल, तर रीसेट लिंक पाठवली आहे.",
    "msg.popupClosed": "साइन-इन रद्द केले.",
    "msg.generic": "काहीतरी चूक झाली. कृपया पुन्हा प्रयत्न करा."
  }
};

var STORAGE_KEY = "bcc-lang";
var lang = "en";
try { lang = localStorage.getItem(STORAGE_KEY) || "en"; } catch (e) {}
if (!I18N[lang]) lang = "en";

function t(key) {
  return (I18N[lang] && I18N[lang][key]) || (I18N.en[key] || key);
}

function applyLang(next) {
  if (!I18N[next]) next = "en";
  lang = next;
  document.documentElement.lang = lang;
  document.body.classList.toggle("lang-mr", lang === "mr");
  if (t("meta.title")) document.title = t("meta.title");
  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    var key = el.getAttribute("data-i18n");
    var dict = I18N[lang];
    if (Object.prototype.hasOwnProperty.call(dict, key)) {
      el.textContent = dict[key];
    }
  });
  var toggle = document.getElementById("langToggle");
  if (toggle) {
    toggle.textContent = lang === "en" ? "मराठी" : "English";
    toggle.setAttribute("aria-label", lang === "en" ? "Switch to Marathi" : "Switch to English");
  }
  try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
}

/* ---------------- Helpers ---------------- */
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validate an Indian mobile: 10 digits (6-9 start), optionally +91 / 0 prefix.
// Returns the normalized 10-digit string, or null if invalid.
function normalizePhone(raw) {
  var digits = (raw || "").replace(/[\s\-()]/g, "");
  digits = digits.replace(/^\+91/, "").replace(/^0+/, "");
  if (/^[6-9]\d{9}$/.test(digits)) return digits;
  return null;
}

function setNote(el, key, type) {
  if (!el) return;
  el.textContent = t(key);
  el.className = "auth-note " + (type || "");
}

// Map Firebase auth error codes to friendly, enumeration-safe message keys.
function loginErrorKey(code) {
  switch (code) {
    case "auth/too-many-requests":
      return "msg.tooMany";
    case "auth/network-request-failed":
      return "msg.network";
    // All credential problems collapse to one generic message (no enumeration).
    case "auth/invalid-email":
    case "auth/user-disabled":
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "msg.loginFail";
    default:
      return "msg.loginFail";
  }
}

function redirectAfterLogin(user) {
  return getDoc(doc(db, "admins", user.uid)).then(function (snap) {
    window.location.href = snap.exists() ? "admin.html" : "portal.html";
  }).catch(function () {
    window.location.href = "portal.html";
  });
}

function redirectToPortal() {
  var user = auth.currentUser;
  if (user) return redirectAfterLogin(user);
  window.location.href = "portal.html";
}

/* ---------------- View switching ---------------- */
var views = {
  login: document.getElementById("loginView"),
  register: document.getElementById("registerView"),
  forgot: document.getElementById("forgotView")
};

function showView(name) {
  Object.keys(views).forEach(function (k) {
    if (views[k]) views[k].classList.toggle("hidden", k !== name);
  });
}

/* ---------------- Wire up the page ---------------- */
applyLang(lang);

var langToggle = document.getElementById("langToggle");
if (langToggle) {
  langToggle.addEventListener("click", function () {
    applyLang(lang === "en" ? "mr" : "en");
  });
}

var showRegister = document.getElementById("showRegister");
var showLogin = document.getElementById("showLogin");
var forgotLink = document.getElementById("forgotLink");
var backToLogin = document.getElementById("backToLogin");
if (showRegister) showRegister.addEventListener("click", function () { showView("register"); });
if (showLogin) showLogin.addEventListener("click", function () { showView("login"); });
if (forgotLink) forgotLink.addEventListener("click", function () { showView("forgot"); });
if (backToLogin) backToLogin.addEventListener("click", function () { showView("login"); });

// If a session already exists, skip the login page entirely.
onAuthStateChanged(auth, function (user) {
  if (user) redirectAfterLogin(user);
});

/* ---------------- Login ---------------- */
var loginForm = document.getElementById("loginForm");
var loginNote = document.getElementById("loginNote");
if (loginForm) {
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = (loginForm.elements.email.value || "").trim();
    var password = loginForm.elements.password.value || "";
    if (!email || !password) { setNote(loginNote, "msg.fillAll", "err"); return; }
    if (!EMAIL_RE.test(email)) { setNote(loginNote, "msg.invalidEmail", "err"); return; }

    var btn = loginForm.querySelector("button[type=submit]");
    if (btn) btn.disabled = true;
    signInWithEmailAndPassword(auth, email, password)
      .then(function () {
        setNote(loginNote, "msg.welcome", "ok");
        redirectToPortal();
      })
      .catch(function (err) {
        setNote(loginNote, loginErrorKey(err && err.code), "err");
        if (btn) btn.disabled = false;
      });
  });
}

/* ---------------- Register ---------------- */
var registerForm = document.getElementById("registerForm");
var registerNote = document.getElementById("registerNote");
if (registerForm) {
  registerForm.addEventListener("submit", function (e) {
    e.preventDefault();
    // Use .elements so the field named "name" is read correctly (form.name is the
    // form's own name attribute, NOT the <input name="name">).
    var els = registerForm.elements;
    var name = (els.name.value || "").trim();
    var email = (els.email.value || "").trim();
    var phoneRaw = (els.phone.value || "").trim();
    var password = els.password.value || "";
    var confirm = els.confirm.value || "";

    if (!name || !email || !password || !confirm) { setNote(registerNote, "msg.fillAll", "err"); return; }
    if (!EMAIL_RE.test(email)) { setNote(registerNote, "msg.invalidEmail", "err"); return; }
    // Phone is required; show the specific phone error for empty OR malformed input.
    var phone = normalizePhone(phoneRaw);
    if (!phone) { setNote(registerNote, "msg.phoneInvalid", "err"); return; }
    if (password.length < 6) { setNote(registerNote, "msg.pwShort", "err"); return; }
    if (password !== confirm) { setNote(registerNote, "msg.pwMismatch", "err"); return; }

    var btn = registerForm.querySelector("button[type=submit]");
    if (btn) btn.disabled = true;

    createUserWithEmailAndPassword(auth, email, password)
      .then(function (cred) {
        var user = cred.user;
        // Set the display name, create the Firestore profile, send verification.
        var tasks = [
          updateProfile(user, { displayName: name }),
          setDoc(doc(db, "students", user.uid), {
            name: name,
            email: email,
            phone: phone,
            batch: "",
            createdAt: serverTimestamp()
          }),
          sendEmailVerification(user)
        ];
        return Promise.allSettled(tasks);
      })
      .then(function () {
        setNote(registerNote, "msg.registered", "ok");
        redirectToPortal();
      })
      .catch(function (err) {
        var code = err && err.code;
        if (code === "auth/email-already-in-use") {
          setNote(registerNote, "msg.emailInUse", "err");
        } else if (code === "auth/invalid-email") {
          setNote(registerNote, "msg.invalidEmail", "err");
        } else if (code === "auth/weak-password") {
          setNote(registerNote, "msg.pwShort", "err");
        } else if (code === "auth/network-request-failed") {
          setNote(registerNote, "msg.network", "err");
        } else {
          setNote(registerNote, "msg.generic", "err");
        }
        if (btn) btn.disabled = false;
      });
  });
}

/* ---------------- Google sign-in ---------------- */
var googleBtn = document.getElementById("googleBtn");
if (googleBtn) {
  googleBtn.addEventListener("click", function () {
    var provider = new GoogleAuthProvider();
    googleBtn.disabled = true;
    signInWithPopup(auth, provider)
      .then(function (cred) {
        var user = cred.user;
        // Create the student profile on first Google sign-in (merge = no overwrite).
        var ref = doc(db, "students", user.uid);
        return getDoc(ref).then(function (snap) {
          if (!snap.exists()) {
            return setDoc(ref, {
              name: user.displayName || "",
              email: user.email || "",
              phone: user.phoneNumber || "",
              batch: "",
              createdAt: serverTimestamp()
            }, { merge: true });
          }
        });
      })
      .then(function () {
        redirectToPortal();
      })
      .catch(function (err) {
        var code = err && err.code;
        if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
          setNote(loginNote, "msg.popupClosed", "err");
        } else if (code === "auth/network-request-failed") {
          setNote(loginNote, "msg.network", "err");
        } else {
          setNote(loginNote, "msg.generic", "err");
        }
        googleBtn.disabled = false;
      });
  });
}

/* ---------------- Forgot password ---------------- */
var forgotForm = document.getElementById("forgotForm");
var forgotNote = document.getElementById("forgotNote");
if (forgotForm) {
  forgotForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = (forgotForm.elements.email.value || "").trim();
    if (!email || !EMAIL_RE.test(email)) { setNote(forgotNote, "msg.invalidEmail", "err"); return; }

    var btn = forgotForm.querySelector("button[type=submit]");
    if (btn) btn.disabled = true;
    sendPasswordResetEmail(auth, email)
      .then(function () {
        // Always show the same generic message (no enumeration of accounts).
        setNote(forgotNote, "msg.resetSent", "ok");
      })
      .catch(function (err) {
        var code = err && err.code;
        if (code === "auth/invalid-email") {
          setNote(forgotNote, "msg.invalidEmail", "err");
        } else if (code === "auth/network-request-failed") {
          setNote(forgotNote, "msg.network", "err");
        } else {
          // Even on user-not-found we show the neutral "reset sent" message.
          setNote(forgotNote, "msg.resetSent", "ok");
        }
      })
      .finally(function () {
        if (btn) btn.disabled = false;
      });
  });
}
