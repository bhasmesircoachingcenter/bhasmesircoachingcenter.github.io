// =============================================================================
// Student portal logic for portal.html.
//  - Auth GUARD: if not signed in, redirect to login.html.
//  - Reads ONLY the current user's data from Firestore (scoped by uid).
//  - Renders batch/schedule, profile, attendance, results, announcements.
//  - Logout + bilingual (shares the bcc-lang key with the main site).
//
// Security: all values from Firestore are rendered with textContent (never
// innerHTML) to avoid any HTML/script injection from stored data. Access is
// additionally enforced server-side by firestore.rules.
// =============================================================================

import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------------- Bilingual strings ---------------- */
var I18N = {
  en: {
    "meta.title": "Student Portal | Bhasme Sir Coaching Center",
    "brand.name": "Bhasme Sir",
    "portal.badge": "Student Portal",
    "portal.loading": "Loading…",
    "portal.logout": "Logout",
    "portal.admin": "Admin",
    "portal.welcome": "Welcome",
    "portal.verify": "Your email isn't verified yet. Please check your inbox (and Spam/Promotions folder).",
    "portal.resend": "Resend verification email",
    "portal.resendOk": "Verification email sent — check your inbox and Spam folder.",
    "portal.resendWait": "Please wait a bit before requesting again.",
    "portal.resendErr": "Could not send right now. Please try again later.",
    "portal.batchTitle": "Batch & Schedule",
    "portal.batch": "Batch",
    "portal.schedule": "Schedule",
    "portal.profileTitle": "Profile",
    "portal.name": "Name",
    "portal.phone": "Phone",
    "portal.attendanceTitle": "Attendance",
    "portal.resultsTitle": "Test Results",
    "portal.announceTitle": "Announcements",
    "portal.noAttendance": "No attendance records yet.",
    "portal.noResults": "No results published yet.",
    "portal.noAnnounce": "No announcements yet.",
    "col.date": "Date",
    "col.status": "Status",
    "col.note": "Note",
    "col.test": "Test",
    "col.subject": "Subject",
    "col.marks": "Marks",
    "status.present": "Present",
    "status.absent": "Absent",
    "msg.notset": "—"
  },
  mr: {
    "meta.title": "विद्यार्थी पोर्टल | भस्मे सर कोचिंग सेंटर",
    "brand.name": "भस्मे सर",
    "portal.badge": "विद्यार्थी पोर्टल",
    "portal.loading": "लोड होत आहे…",
    "portal.logout": "लॉग आउट",
    "portal.admin": "अॅडमिन",
    "portal.welcome": "स्वागत आहे",
    "portal.verify": "तुमचा ईमेल अद्याप पडताळलेला नाही. कृपया तुमचा इनबॉक्स (आणि Spam/Promotions फोल्डर) तपासा.",
    "portal.resend": "पडताळणी ईमेल पुन्हा पाठवा",
    "portal.resendOk": "पडताळणी ईमेल पाठवला — तुमचा इनबॉक्स व Spam फोल्डर तपासा.",
    "portal.resendWait": "कृपया पुन्हा विनंती करण्यापूर्वी थोडा वेळ थांबा.",
    "portal.resendErr": "आत्ता पाठवता आले नाही. कृपया नंतर पुन्हा प्रयत्न करा.",
    "portal.batchTitle": "बॅच व वेळापत्रक",
    "portal.batch": "बॅच",
    "portal.schedule": "वेळापत्रक",
    "portal.profileTitle": "प्रोफाइल",
    "portal.name": "नाव",
    "portal.phone": "फोन",
    "portal.attendanceTitle": "हजेरी",
    "portal.resultsTitle": "चाचणी निकाल",
    "portal.announceTitle": "घोषणा",
    "portal.noAttendance": "अद्याप हजेरी नोंदी नाहीत.",
    "portal.noResults": "अद्याप निकाल प्रकाशित नाहीत.",
    "portal.noAnnounce": "अद्याप घोषणा नाहीत.",
    "col.date": "दिनांक",
    "col.status": "स्थिती",
    "col.note": "टीप",
    "col.test": "चाचणी",
    "col.subject": "विषय",
    "col.marks": "गुण",
    "status.present": "उपस्थित",
    "status.absent": "अनुपस्थित",
    "msg.notset": "—"
  }
};

var STORAGE_KEY = "bcc-lang";
var lang = "en";
try { lang = localStorage.getItem(STORAGE_KEY) || "en"; } catch (e) {}
if (!I18N[lang]) lang = "en";

function t(key) {
  return (I18N[lang] && I18N[lang][key]) || (I18N.en[key] || key);
}

// Holds the latest loaded data so we can re-render on language switch.
var state = { student: null, attendance: [], results: [], announcements: [] };

function applyLang(next) {
  if (!I18N[next]) next = "en";
  lang = next;
  document.documentElement.lang = lang;
  document.body.classList.toggle("lang-mr", lang === "mr");
  if (t("meta.title")) document.title = t("meta.title");
  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    var key = el.getAttribute("data-i18n");
    if (Object.prototype.hasOwnProperty.call(I18N[lang], key)) {
      el.textContent = I18N[lang][key];
    }
  });
  var toggle = document.getElementById("langToggle");
  if (toggle) {
    toggle.textContent = lang === "en" ? "मराठी" : "English";
    toggle.setAttribute("aria-label", lang === "en" ? "Switch to Marathi" : "Switch to English");
  }
  try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  // Re-render dynamic, data-driven sections (they aren't data-i18n driven).
  renderAttendance();
  renderResults();
  renderAnnouncements();
}

/* ---------------- Small DOM helpers ---------------- */
function el(id) { return document.getElementById(id); }

function setText(id, value) {
  var node = el(id);
  if (node) node.textContent = (value === undefined || value === null || value === "") ? t("msg.notset") : value;
}

// Normalize a Firestore date field (Timestamp | string | Date) to a readable string.
function fmtDate(value) {
  if (!value) return t("msg.notset");
  try {
    if (typeof value === "object" && typeof value.toDate === "function") {
      return value.toDate().toLocaleDateString();
    }
    if (value instanceof Date) return value.toLocaleDateString();
  } catch (e) { /* fall through */ }
  return String(value);
}

/* ---------------- Render functions ---------------- */
function renderProfileAndBatch() {
  var s = state.student || {};
  setText("studentName", s.name);
  setText("profileName", s.name);
  setText("profilePhone", s.phone);
  setText("batchVal", s.batch);
  setText("scheduleVal", s.schedule);
}

function renderAttendance() {
  var body = el("attendanceBody");
  if (!body) return;
  body.textContent = "";
  if (!state.attendance.length) {
    var p = document.createElement("p");
    p.className = "empty-state";
    p.textContent = t("portal.noAttendance");
    body.appendChild(p);
    return;
  }
  var table = document.createElement("table");
  table.className = "data-table";
  var thead = document.createElement("thead");
  thead.appendChild(rowOf(["th", t("col.date"), t("col.status"), t("col.note")]));
  table.appendChild(thead);
  var tbody = document.createElement("tbody");
  state.attendance.forEach(function (a) {
    var tr = document.createElement("tr");
    tr.appendChild(cell("td", fmtDate(a.date)));
    var statusTd = document.createElement("td");
    var badge = document.createElement("span");
    var present = a.status === "present";
    badge.className = "badge " + (present ? "present" : "absent");
    badge.textContent = present ? t("status.present") : t("status.absent");
    statusTd.appendChild(badge);
    tr.appendChild(statusTd);
    tr.appendChild(cell("td", a.note || ""));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  body.appendChild(table);
}

function renderResults() {
  var body = el("resultsBody");
  if (!body) return;
  body.textContent = "";
  if (!state.results.length) {
    var p = document.createElement("p");
    p.className = "empty-state";
    p.textContent = t("portal.noResults");
    body.appendChild(p);
    return;
  }
  var table = document.createElement("table");
  table.className = "data-table";
  var thead = document.createElement("thead");
  thead.appendChild(rowOf(["th", t("col.date"), t("col.test"), t("col.subject"), t("col.marks")]));
  table.appendChild(thead);
  var tbody = document.createElement("tbody");
  state.results.forEach(function (r) {
    var tr = document.createElement("tr");
    tr.appendChild(cell("td", fmtDate(r.date)));
    tr.appendChild(cell("td", r.testName || ""));
    tr.appendChild(cell("td", r.subject || ""));
    var marks = (r.marks !== undefined && r.outOf !== undefined) ? (r.marks + " / " + r.outOf) : (r.marks || "");
    tr.appendChild(cell("td", String(marks)));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  body.appendChild(table);
}

function renderAnnouncements() {
  var body = el("announceBody");
  if (!body) return;
  body.textContent = "";
  if (!state.announcements.length) {
    var p = document.createElement("p");
    p.className = "empty-state";
    p.textContent = t("portal.noAnnounce");
    body.appendChild(p);
    return;
  }
  state.announcements.forEach(function (a) {
    var item = document.createElement("div");
    item.className = "announce-item";
    var h = document.createElement("h3");
    h.textContent = a.title || "";
    var time = document.createElement("time");
    time.textContent = fmtDate(a.date);
    var p = document.createElement("p");
    p.textContent = a.body || "";
    item.appendChild(h);
    item.appendChild(time);
    item.appendChild(p);
    body.appendChild(item);
  });
}

function cell(tag, text) {
  var c = document.createElement(tag);
  c.textContent = text;
  return c;
}

function rowOf(parts) {
  var tag = parts[0];
  var tr = document.createElement("tr");
  for (var i = 1; i < parts.length; i++) tr.appendChild(cell(tag, parts[i]));
  return tr;
}

/* ---------------- Data loading (scoped to current user) ---------------- */
function loadStudentData(uid) {
  var studentRef = doc(db, "students", uid);

  var pStudent = getDoc(studentRef).then(function (snap) {
    state.student = snap.exists() ? snap.data() : {};
  }).catch(function () { state.student = {}; });

  var pAttendance = getDocs(query(collection(db, "students", uid, "attendance"), orderBy("date", "desc")))
    .then(function (qs) { state.attendance = qs.docs.map(function (d) { return d.data(); }); })
    .catch(function () { state.attendance = []; });

  var pResults = getDocs(query(collection(db, "students", uid, "results"), orderBy("date", "desc")))
    .then(function (qs) { state.results = qs.docs.map(function (d) { return d.data(); }); })
    .catch(function () { state.results = []; });

  return Promise.allSettled([pStudent, pAttendance, pResults]).then(function () {
    // Announcements: read all, filter to "all" or the student's batch (client-side
    // to avoid requiring a composite index for the MVP).
    var batch = (state.student && state.student.batch) || "";
    return getDocs(query(collection(db, "announcements"), orderBy("date", "desc")))
      .then(function (qs) {
        state.announcements = qs.docs.map(function (d) { return d.data(); }).filter(function (a) {
          return !a.audience || a.audience === "all" || a.audience === batch;
        });
      })
      .catch(function () { state.announcements = []; });
  });
}

/* ---------------- Email verification resend ---------------- */
var verifyWired = false;
function setupVerifyBanner(user) {
  var dismiss = el("dismissVerify");
  if (dismiss && !verifyWired) {
    dismiss.addEventListener("click", function () {
      var banner = el("verifyBanner");
      if (banner) banner.classList.add("hidden");
    });
  }
  var resendBtn = el("resendBtn");
  var note = el("verifyNote");
  if (resendBtn && !verifyWired) {
    resendBtn.addEventListener("click", function () {
      resendBtn.disabled = true;
      if (note) { note.textContent = ""; note.className = "verify-note"; }
      sendEmailVerification(user)
        .then(function () {
          if (note) { note.textContent = t("portal.resendOk"); note.className = "verify-note ok"; }
        })
        .catch(function (err) {
          var code = err && err.code;
          if (note) {
            note.textContent = code === "auth/too-many-requests" ? t("portal.resendWait") : t("portal.resendErr");
            note.className = "verify-note err";
          }
        })
        .finally(function () {
          // Re-enable after a short delay to discourage rapid repeat requests.
          setTimeout(function () { resendBtn.disabled = false; }, 30000);
        });
    });
  }
  verifyWired = true;
}

/* ---------------- Boot ---------------- */
var langToggle = document.getElementById("langToggle");
if (langToggle) {
  langToggle.addEventListener("click", function () {
    applyLang(lang === "en" ? "mr" : "en");
  });
}

var logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", function () {
    signOut(auth).finally(function () { window.location.href = "login.html"; });
  });
}

// Apply initial language to static labels immediately (while loading).
applyLang(lang);

onAuthStateChanged(auth, function (user) {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // Reveal the app shell, hide the loading state.
  var loading = el("loadingView");
  var app = el("appView");
  if (loading) loading.classList.add("hidden");
  if (app) app.classList.remove("hidden");

  setText("studentEmail", user.email || "");

  // Show the resend-verification banner for unverified users (non-blocking).
  var verifyBanner = el("verifyBanner");
  if (verifyBanner) verifyBanner.classList.toggle("hidden", !!user.emailVerified);
  setupVerifyBanner(user);

  // Reveal the Admin link only if this user is an admin (admins/{uid} exists).
  getDoc(doc(db, "admins", user.uid)).then(function (snap) {
    if (snap.exists()) {
      var adminLink = el("adminLink");
      if (adminLink) adminLink.classList.remove("hidden");
    }
  }).catch(function () { /* not admin / unavailable: keep hidden */ });

  loadStudentData(user.uid).then(function () {
    // Ensure email from auth wins if the profile doc lacks it.
    if (state.student && !state.student.email) state.student.email = user.email || "";
    if (state.student && !state.student.name) state.student.name = user.displayName || "";
    renderProfileAndBatch();
    renderAttendance();
    renderResults();
    renderAnnouncements();
  });
});
