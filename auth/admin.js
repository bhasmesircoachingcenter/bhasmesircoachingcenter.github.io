// =============================================================================
// Admin panel logic for admin.html.
//  - Auth guard: not signed in -> login.html.
//  - Admin check: doc exists at admins/{uid}. Non-admins see a "Not authorized"
//    screen and never see the admin tools.
//  - Manage students (edit batch/schedule/phone), attendance, results,
//    announcements. All dynamic text rendered via textContent (injection-safe).
//
// Note on indexes: we read each collection with a SINGLE-field order("date")
// or sort client-side, and never combine where()+orderBy() on different fields,
// so NO Firestore composite index is required.
// =============================================================================

import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------------- Bilingual strings ---------------- */
var I18N = {
  en: {
    "meta.title": "Admin Panel | Bhasme Sir Coaching Center",
    "brand.name": "Bhasme Sir",
    "admin.badge": "Admin Panel",
    "admin.title": "Admin Panel",
    "admin.portalLink": "Portal",
    "portal.logout": "Logout",
    "portal.loading": "Loading…",
    "admin.deniedTitle": "Not authorized",
    "admin.deniedBody": "This area is for administrators only.",
    "admin.backToPortal": "Back to portal",
    "admin.tabStudents": "Students",
    "admin.tabDetails": "Student Details",
    "admin.tabAttendance": "Attendance",
    "admin.tabResults": "Results",
    "admin.tabAnnouncements": "Announcements",
    "admin.tabBroadcast": "Email Students",
    "admin.studentsTitle": "Students",
    "admin.loadingStudents": "Loading students…",
    "admin.noStudents": "No students registered yet.",
    "admin.edit": "Edit",
    "admin.save": "Save",
    "admin.cancel": "Cancel",
    "admin.batch": "Batch",
    "admin.schedule": "Schedule",
    "admin.phone": "Phone",
    "admin.saved": "Saved.",
    "admin.student": "Student",
    "admin.selectStudent": "Select a student to see entries.",
    "admin.date": "Date",
    "admin.status": "Status",
    "admin.note": "Note (optional)",
    "admin.attendanceTitle": "Mark Daily Attendance",
    "admin.attendanceHint": "Choose a date, mark each registered student Present or Absent, then save. Records are stored in your Google Sheet (Attendance tab).",
    "admin.attAllPresent": "All Present",
    "admin.attAllAbsent": "All Absent",
    "admin.attSave": "Save Attendance to Sheet",
    "admin.attLoading": "Loading students…",
    "admin.attNoStudents": "No registered students yet. Students appear here after they sign up on the portal.",
    "admin.attSummary": "{present} present · {absent} absent · {total} students",
    "admin.attSaved": "Attendance saved to Google Sheet.",
    "admin.attSavedPortal": "Attendance saved (Sheet + student portal).",
    "admin.attErrLoad": "Could not load attendance. Redeploy Apps Script, then try again.",
    "admin.attErrSave": "Could not save attendance. Redeploy Apps Script, then try again.",
    "admin.colAttStatus": "Attendance",
    "admin.resultsTitle": "Add Test Result",
    "admin.testName": "Test Name",
    "admin.subject": "Subject",
    "admin.marks": "Marks",
    "admin.outOf": "Out Of",
    "admin.addResult": "Add Result",
    "admin.recentResults": "Recent Results",
    "admin.announceTitle": "Post Announcement",
    "admin.annTitle": "Title",
    "admin.annBody": "Message",
    "admin.audience": "Audience (\"all\" or a batch name)",
    "admin.postAnnounce": "Post Announcement",
    "admin.existingAnnounce": "Existing Announcements",
    "admin.noAnnounce": "No announcements yet.",
    "admin.broadcastTitle": "Broadcast Email",
    "admin.bcAudienceLabel": "Send to",
    "admin.bcAudReg": "Registered portal students",
    "admin.bcAudSheet": "Enquiry contacts (Google Sheet)",
    "admin.bcAudBoth": "Both (registered + enquiry)",
    "admin.bcSubject": "Subject",
    "admin.bcBody": "Message",
    "admin.bcSend": "Send Email",
    "admin.bcCount": "{n} of {total} registered students have an email on file.",
    "admin.bcCountSheet": "Will send to all enquiry contacts in the Google Sheet.",
    "admin.bcCountBoth": "{n} registered student(s) + all enquiry contacts in the Google Sheet.",
    "admin.bcNoRecipients": "No registered students have an email on file yet.",
    "admin.bcConfirm": "Send this email to {n} registered student(s)?",
    "admin.bcConfirmSheet": "Send this email to all enquiry contacts in the Google Sheet?",
    "admin.bcConfirmBoth": "Send to {n} registered student(s) plus all enquiry contacts in the Google Sheet?",
    "admin.bcSending": "Sending…",
    "admin.bcQueued": "✅ Email queued to {n} registered student(s).",
    "admin.bcQueuedSheet": "✅ Email queued to your enquiry contacts.",
    "admin.bcQueuedBoth": "✅ Email queued to registered students + enquiry contacts.",
    "admin.bcErrSend": "Could not send. Please try again.",
    "admin.bcMissing": "Please enter a subject and message.",
    "admin.detailsTitle": "Student Details",
    "admin.detailsSource": "Source",
    "admin.detailsSrcRegistered": "Registered students (portal)",
    "admin.detailsSrcEnquiry": "Enquiry contacts (Google Sheet)",
    "admin.detailsSrcAdmission": "Admission form (Google Form)",
    "admin.detailsSrcBoth": "Both (merged & de-duplicated by email)",
    "admin.detailsLoading": "Loading…",
    "admin.detailsCount": "Showing {n} records",
    "admin.detailsEmpty": "No records to show.",
    "admin.detailsErr": "Could not load enquiry contacts. Redeploy Apps Script (new version), then refresh.",
    "admin.detailsErrAdmission": "Could not load admission form responses. Redeploy Apps Script (new version), then refresh.",
    "admin.detailsUnauthorized": "Not signed in as admin. On this phone, log in with bhasmesircoachingcenter@gmail.com in the admin panel.",
    "admin.detailsTimeout": "Loading timed out on slow network. Pull down to refresh or try again on Wi‑Fi.",
    "dcol.name": "Name",
    "dcol.email": "Email",
    "dcol.phone": "Phone",
    "dcol.batch": "Batch",
    "dcol.schedule": "Schedule",
    "dcol.registered": "Registered",
    "dcol.timestamp": "Timestamp",
    "dcol.purpose": "Purpose",
    "dcol.course": "Course",
    "dcol.message": "Message",
    "dcol.language": "Language",
    "dcol.source": "Source",
    "dcol.details": "Details",
    "dcol.admDob": "Date of Birth",
    "dcol.admAge": "Age",
    "dcol.admGender": "Gender",
    "dcol.admSchool": "School",
    "dcol.admClass": "Class",
    "dcol.admMarks": "Marks (%)",
    "dcol.admMedium": "Medium",
    "dcol.admFather": "Father / Guardian",
    "dcol.admMother": "Mother",
    "dcol.admOccupation": "Occupation",
    "dcol.admAltMobile": "Alt. Mobile",
    "dcol.admAddress": "Address",
    "dcol.admReferral": "Referral",
    "dcol.admNote": "Note",
    "dcol.admFeePlan": "Fee plan",
    "dcol.admPayMode": "Pay mode",
    "src.registered": "Registered",
    "src.enquiry": "Enquiry",
    "src.both": "Both",
    "admin.delete": "Delete",
    "admin.confirmDelete": "Delete this entry?",
    "admin.added": "Added.",
    "admin.deleted": "Deleted.",
    "admin.posted": "Announcement posted.",
    "admin.errSave": "Could not save. Please try again.",
    "admin.errRequired": "Please fill in all required fields.",
    "admin.errMarks": "Marks must be a number and not exceed Out Of.",
    "status.present": "Present",
    "status.absent": "Absent",
    "col.date": "Date",
    "col.status": "Status",
    "col.note": "Note",
    "col.test": "Test",
    "col.subject": "Subject",
    "col.marks": "Marks",
    "col.actions": "Actions",
    "dash": "—"
  },
  mr: {
    "meta.title": "अॅडमिन पॅनेल | भस्मे सर कोचिंग सेंटर",
    "brand.name": "भस्मे सर",
    "admin.badge": "अॅडमिन पॅनेल",
    "admin.title": "अॅडमिन पॅनेल",
    "admin.portalLink": "पोर्टल",
    "portal.logout": "लॉग आउट",
    "portal.loading": "लोड होत आहे…",
    "admin.deniedTitle": "प्रवेश नाही",
    "admin.deniedBody": "हा भाग फक्त प्रशासकांसाठी आहे.",
    "admin.backToPortal": "पोर्टलकडे परत",
    "admin.tabStudents": "विद्यार्थी",
    "admin.tabDetails": "विद्यार्थी तपशील",
    "admin.tabAttendance": "हजेरी",
    "admin.tabResults": "निकाल",
    "admin.tabAnnouncements": "घोषणा",
    "admin.tabBroadcast": "विद्यार्थ्यांना ईमेल",
    "admin.studentsTitle": "विद्यार्थी",
    "admin.loadingStudents": "विद्यार्थी लोड होत आहेत…",
    "admin.noStudents": "अद्याप कोणी विद्यार्थी नोंदणीकृत नाही.",
    "admin.edit": "संपादित करा",
    "admin.save": "जतन करा",
    "admin.cancel": "रद्द करा",
    "admin.batch": "बॅच",
    "admin.schedule": "वेळापत्रक",
    "admin.phone": "फोन",
    "admin.saved": "जतन झाले.",
    "admin.student": "विद्यार्थी",
    "admin.selectStudent": "नोंदी पाहण्यासाठी विद्यार्थी निवडा.",
    "admin.date": "दिनांक",
    "admin.status": "स्थिती",
    "admin.note": "टीप (पर्यायी)",
    "admin.attendanceTitle": "दैनिक हजेरी नोंदवा",
    "admin.attendanceHint": "दिनांक निवडा, प्रत्येक नोंदणीकृत विद्यार्थ्यासाठी हजर/गैरहजर निवडा आणि जतन करा. नोंदी Google Sheet (Attendance टॅब) मध्ये जतन होतात.",
    "admin.attAllPresent": "सर्व हजर",
    "admin.attAllAbsent": "सर्व गैरहजर",
    "admin.attSave": "हजेरी Sheet मध्ये जतन करा",
    "admin.attLoading": "विद्यार्थी लोड होत आहेत…",
    "admin.attNoStudents": "अद्याप कोणी विद्यार्थी नोंदणीकृत नाही.",
    "admin.attSummary": "{present} हजर · {absent} गैरहजर · {total} विद्यार्थी",
    "admin.attSaved": "हजेरी Google Sheet मध्ये जतन झाली.",
    "admin.attSavedPortal": "हजेरी जतन झाली (Sheet + विद्यार्थी पोर्टल).",
    "admin.attErrLoad": "हजेरी लोड करता आली नाही. Apps Script पुन्हा डिप्लॉय करा.",
    "admin.attErrSave": "हजेरी जतन करता आली नाही. Apps Script पुन्हा डिप्लॉय करा.",
    "admin.colAttStatus": "हजेरी",
    "admin.resultsTitle": "चाचणी निकाल जोडा",
    "admin.testName": "चाचणीचे नाव",
    "admin.subject": "विषय",
    "admin.marks": "गुण",
    "admin.outOf": "एकूण पैकी",
    "admin.addResult": "निकाल जोडा",
    "admin.recentResults": "अलीकडील निकाल",
    "admin.announceTitle": "घोषणा करा",
    "admin.annTitle": "शीर्षक",
    "admin.annBody": "संदेश",
    "admin.audience": "प्रेक्षक (\"all\" किंवा बॅचचे नाव)",
    "admin.postAnnounce": "घोषणा प्रकाशित करा",
    "admin.existingAnnounce": "विद्यमान घोषणा",
    "admin.noAnnounce": "अद्याप घोषणा नाहीत.",
    "admin.broadcastTitle": "ईमेल पाठवा",
    "admin.bcAudienceLabel": "यांना पाठवा",
    "admin.bcAudReg": "नोंदणीकृत पोर्टल विद्यार्थी",
    "admin.bcAudSheet": "चौकशी संपर्क (Google Sheet)",
    "admin.bcAudBoth": "दोन्ही (नोंदणीकृत + चौकशी)",
    "admin.bcSubject": "विषय",
    "admin.bcBody": "संदेश",
    "admin.bcSend": "ईमेल पाठवा",
    "admin.bcCount": "{total} पैकी {n} नोंदणीकृत विद्यार्थ्यांचा ईमेल नोंदलेला आहे.",
    "admin.bcCountSheet": "Google Sheet मधील सर्व चौकशी संपर्कांना पाठवले जाईल.",
    "admin.bcCountBoth": "{n} नोंदणीकृत विद्यार्थी + Google Sheet मधील सर्व चौकशी संपर्क.",
    "admin.bcNoRecipients": "अद्याप कोणत्याही नोंदणीकृत विद्यार्थ्याचा ईमेल नोंदलेला नाही.",
    "admin.bcConfirm": "हा ईमेल {n} नोंदणीकृत विद्यार्थ्यांना पाठवायचा?",
    "admin.bcConfirmSheet": "हा ईमेल Google Sheet मधील सर्व चौकशी संपर्कांना पाठवायचा?",
    "admin.bcConfirmBoth": "{n} नोंदणीकृत विद्यार्थी व Google Sheet मधील सर्व चौकशी संपर्कांना पाठवायचा?",
    "admin.bcSending": "पाठवत आहे…",
    "admin.bcQueued": "✅ ईमेल {n} नोंदणीकृत विद्यार्थ्यांना पाठवण्यासाठी रांगेत ठेवला.",
    "admin.bcQueuedSheet": "✅ ईमेल तुमच्या चौकशी संपर्कांना पाठवण्यासाठी रांगेत ठेवला.",
    "admin.bcQueuedBoth": "✅ ईमेल नोंदणीकृत विद्यार्थी + चौकशी संपर्कांना पाठवण्यासाठी रांगेत ठेवला.",
    "admin.bcErrSend": "पाठवता आले नाही. कृपया पुन्हा प्रयत्न करा.",
    "admin.bcMissing": "कृपया विषय व संदेश भरा.",
    "admin.detailsTitle": "विद्यार्थी तपशील",
    "admin.detailsSource": "स्रोत",
    "admin.detailsSrcRegistered": "नोंदणीकृत विद्यार्थी (पोर्टल)",
    "admin.detailsSrcEnquiry": "चौकशी संपर्क (Google Sheet)",
    "admin.detailsSrcAdmission": "प्रवेश अर्ज (Google Form)",
    "admin.detailsSrcBoth": "दोन्ही (ईमेलनुसार एकत्रित व डुप्लिकेट काढून)",
    "admin.detailsLoading": "लोड होत आहे…",
    "admin.detailsCount": "{n} नोंदी दर्शवित आहे",
    "admin.detailsEmpty": "दर्शविण्यासाठी नोंदी नाहीत.",
    "admin.detailsErr": "चौकशी संपर्क लोड करता आले नाहीत. Apps Script पुन्हा डिप्लॉय करा, नंतर रिफ्रेश करा.",
    "admin.detailsErrAdmission": "प्रवेश अर्ज प्रतिसाद लोड करता आले नाहीत. Apps Script पुन्हा डिप्लॉय करा, नंतर रिफ्रेश करा.",
    "admin.detailsUnauthorized": "अॅडमिन म्हणून साइन इन नाही. या फोनवर bhasmesircoachingcenter@gmail.com ने लॉगिन करा.",
    "admin.detailsTimeout": "नेटवर्क मंद असल्याने वेळ संपली. पुन्हा प्रयत्न करा किंवा Wi‑Fi वापरा.",
    "dcol.name": "नाव",
    "dcol.email": "ईमेल",
    "dcol.phone": "फोन",
    "dcol.batch": "बॅच",
    "dcol.schedule": "वेळापत्रक",
    "dcol.registered": "नोंदणी",
    "dcol.timestamp": "वेळ",
    "dcol.purpose": "उद्देश",
    "dcol.course": "अभ्यासक्रम",
    "dcol.message": "संदेश",
    "dcol.language": "भाषा",
    "dcol.source": "स्रोत",
    "dcol.details": "तपशील",
    "dcol.admDob": "जन्मतारीख",
    "dcol.admAge": "वय",
    "dcol.admGender": "लिंग",
    "dcol.admSchool": "शाळा",
    "dcol.admClass": "इयत्ता",
    "dcol.admMarks": "गुण (%)",
    "dcol.admMedium": "माध्यम",
    "dcol.admFather": "वडील / पालक",
    "dcol.admMother": "आई",
    "dcol.admOccupation": "व्यवसाय",
    "dcol.admAltMobile": "पर्यायी मोबाइल",
    "dcol.admAddress": "पत्ता",
    "dcol.admReferral": "संदर्भ",
    "dcol.admNote": "टीप",
    "dcol.admFeePlan": "फी योजना",
    "dcol.admPayMode": "पेमेंट पद्धत",
    "src.registered": "नोंदणीकृत",
    "src.enquiry": "चौकशी",
    "src.both": "दोन्ही",
    "admin.delete": "हटवा",
    "admin.confirmDelete": "ही नोंद हटवायची?",
    "admin.added": "जोडले.",
    "admin.deleted": "हटवले.",
    "admin.posted": "घोषणा प्रकाशित झाली.",
    "admin.errSave": "जतन करता आले नाही. कृपया पुन्हा प्रयत्न करा.",
    "admin.errRequired": "कृपया सर्व आवश्यक माहिती भरा.",
    "admin.errMarks": "गुण संख्या असावेत व एकूण पैकीपेक्षा जास्त नसावेत.",
    "status.present": "उपस्थित",
    "status.absent": "अनुपस्थित",
    "col.date": "दिनांक",
    "col.status": "स्थिती",
    "col.note": "टीप",
    "col.test": "चाचणी",
    "col.subject": "विषय",
    "col.marks": "गुण",
    "col.actions": "क्रिया",
    "dash": "—"
  }
};

var STORAGE_KEY = "bcc-lang";
var lang = "en";
try { lang = localStorage.getItem(STORAGE_KEY) || "en"; } catch (e) {}
if (!I18N[lang]) lang = "en";

function t(key) { return (I18N[lang] && I18N[lang][key]) || (I18N.en[key] || key); }

var state = {
  students: [],
  studentsLoaded: false,
  selectedRes: "",
  attendanceDate: "",
  attendanceMap: {},
  // Student Details tab
  detailsSource: "registered",
  detailsInit: false,
  enquiries: null, // cached enquiry rows fetched from the sheet via JSONP
  admissions: null // cached admission form rows from Admissions tab
};

// Basic email shape check (matches auth.js). Used to filter broadcast recipients.
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public Apps Script Web App endpoint (same URL used for enquiries in script.js).
// Authorization for broadcasts is done by passing the admin's Firebase ID token,
// which the server verifies — no static secret/token is embedded here.
var SHEET_ENDPOINT = "https://script.google.com/macros/s/AKfycbxQbeYdQSdP7eP6sEvDV6knfsCAGmaIJhNS3cyHqfYP7eH6coPUErVaLUCl5l-IEMQJlA/exec";

function applyLang(next) {
  if (!I18N[next]) next = "en";
  lang = next;
  document.documentElement.lang = lang;
  document.body.classList.toggle("lang-mr", lang === "mr");
  if (t("meta.title")) document.title = t("meta.title");
  document.querySelectorAll("[data-i18n]").forEach(function (node) {
    var key = node.getAttribute("data-i18n");
    if (Object.prototype.hasOwnProperty.call(I18N[lang], key)) node.textContent = I18N[lang][key];
  });
  var toggle = document.getElementById("langToggle");
  if (toggle) {
    toggle.textContent = lang === "en" ? "मराठी" : "English";
    toggle.setAttribute("aria-label", lang === "en" ? "Switch to Marathi" : "Switch to English");
  }
  try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  // Re-render data-driven sections that aren't covered by data-i18n.
  renderStudents();
  if (state.attendanceDate) {
    renderAttendanceGrid();
    updateAttSummary();
  }
  if (state.selectedRes) renderResultList(state.selectedRes);
  renderAnnouncements();
  updateBroadcastCount();
  if (state.detailsInit) renderDetails();
}

/* ---------------- Helpers ---------------- */
function el(id) { return document.getElementById(id); }

function setNote(node, msg, type) {
  if (!node) return;
  node.textContent = msg;
  node.className = "admin-note " + (type || "");
}

function todayIso() {
  var d = new Date();
  var m = String(d.getMonth() + 1).padStart(2, "0");
  var day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + day;
}

function fmtDate(value) {
  if (!value) return t("dash");
  try {
    if (value && typeof value.toDate === "function") return value.toDate().toLocaleDateString();
  } catch (e) { /* ignore */ }
  return String(value);
}

function cell(tag, text) { var c = document.createElement(tag); c.textContent = text; return c; }

function sortByDateDesc(arr) {
  return arr.slice().sort(function (a, b) {
    var av = a.date && a.date.toDate ? a.date.toDate().getTime() : Date.parse(a.date) || 0;
    var bv = b.date && b.date.toDate ? b.date.toDate().getTime() : Date.parse(b.date) || 0;
    return bv - av;
  });
}

/* ---------------- Students ---------------- */
function loadStudents() {
  return getDocs(collection(db, "students")).then(function (qs) {
    state.students = qs.docs.map(function (d) {
      var data = d.data() || {};
      return { id: d.id, name: data.name || "", email: data.email || "", phone: data.phone || "", batch: data.batch || "", schedule: data.schedule || "", createdAt: data.createdAt || null };
    });
    state.students.sort(function (a, b) { return a.name.localeCompare(b.name); });
    state.studentsLoaded = true;
  });
}

function renderStudents() {
  var wrap = el("studentsList");
  if (!wrap) return;
  wrap.textContent = "";
  if (!state.students.length) {
    var p = document.createElement("p");
    p.className = "empty-state";
    p.textContent = t("admin.noStudents");
    wrap.appendChild(p);
    return;
  }
  state.students.forEach(function (s) {
    var row = document.createElement("div");
    row.className = "student-row";

    var meta = document.createElement("div");
    meta.className = "student-meta";
    var strong = document.createElement("strong");
    strong.textContent = s.name || t("dash");
    var small = document.createElement("small");
    small.textContent = (s.email || "") + (s.batch ? " · " + s.batch : "");
    meta.appendChild(strong);
    meta.appendChild(small);

    var editBtn = document.createElement("button");
    editBtn.className = "admin-tab";
    editBtn.type = "button";
    editBtn.textContent = t("admin.edit");

    var editor = document.createElement("div");
    editor.className = "student-edit";

    var batchField = makeField(t("admin.batch"), s.batch);
    var schedField = makeField(t("admin.schedule"), s.schedule);
    var phoneField = makeField(t("admin.phone"), s.phone);

    var actions = document.createElement("div");
    actions.className = "actions";
    var saveBtn = document.createElement("button");
    saveBtn.className = "btn btn-primary";
    saveBtn.type = "button";
    saveBtn.textContent = t("admin.save");
    var note = document.createElement("p");
    note.className = "admin-note";
    actions.appendChild(saveBtn);
    actions.appendChild(note);

    editor.appendChild(batchField.wrap);
    editor.appendChild(schedField.wrap);
    editor.appendChild(phoneField.wrap);
    editor.appendChild(actions);

    editBtn.addEventListener("click", function () { editor.classList.toggle("open"); });

    saveBtn.addEventListener("click", function () {
      saveBtn.disabled = true;
      setNote(note, "", "");
      setDoc(doc(db, "students", s.id), {
        batch: batchField.input.value.trim(),
        schedule: schedField.input.value.trim(),
        phone: phoneField.input.value.trim()
      }, { merge: true }).then(function () {
        s.batch = batchField.input.value.trim();
        s.schedule = schedField.input.value.trim();
        s.phone = phoneField.input.value.trim();
        small.textContent = (s.email || "") + (s.batch ? " · " + s.batch : "");
        setNote(note, t("admin.saved"), "ok");
      }).catch(function () {
        setNote(note, t("admin.errSave"), "err");
      }).finally(function () {
        saveBtn.disabled = false;
      });
    });

    row.appendChild(meta);
    row.appendChild(editBtn);
    row.appendChild(editor);
    wrap.appendChild(row);
  });
}

function makeField(labelText, value) {
  var wrap = document.createElement("div");
  wrap.className = "field";
  var label = document.createElement("label");
  label.textContent = labelText;
  var input = document.createElement("input");
  input.type = "text";
  input.value = value || "";
  wrap.appendChild(label);
  wrap.appendChild(input);
  return { wrap: wrap, input: input };
}

function populateStudentSelects() {
  var sel = el("resStudent");
  if (!sel) return;
  ensureStudents().then(function () {
    var current = sel.value;
    sel.textContent = "";
    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = t("admin.student");
    sel.appendChild(placeholder);
    state.students.forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.name + (s.email ? " (" + s.email + ")" : "");
      sel.appendChild(opt);
    });
    if (current) sel.value = current;
  });
}

/* ---------------- Daily attendance (Google Sheet + portal) ---------------- */

function studentAttKey(s) {
  var email = studentSheetEmail(s).toLowerCase();
  return email || ("id:" + s.id);
}

function studentSheetEmail(s) {
  return (s.email || "").trim();
}

function sheetAdminRequest(action, fields) {
  return new Promise(function (resolve, reject) {
    var user = auth.currentUser;
    if (!user) { reject(new Error("no-user")); return; }
    user.getIdToken().then(function (idToken) {
      var cbName = "__bccSh_" + Date.now();
      var params = new URLSearchParams();
      params.append("action", action);
      params.append("idToken", idToken);
      params.append("callback", cbName);
      Object.keys(fields || {}).forEach(function (k) {
        params.append(k, fields[k]);
      });

      var timer = setTimeout(function () { reject(new Error("timeout")); }, 30000);

      function finish(payload) {
        clearTimeout(timer);
        if (payload && payload.result === "success") resolve(payload);
        else reject(new Error((payload && payload.error) || "bad-response"));
      }

      function fallbackJsonp() {
        var script = document.createElement("script");
        function cleanup() {
          clearTimeout(timer);
          try { delete window[cbName]; } catch (e) { window[cbName] = undefined; }
          if (script.parentNode) script.parentNode.removeChild(script);
        }
        window[cbName] = function (payload) { cleanup(); finish(payload); };
        script.onerror = function () { cleanup(); reject(new Error("network")); };
        script.src = SHEET_ENDPOINT + "?" + params.toString();
        document.head.appendChild(script);
      }

      fetch(SHEET_ENDPOINT, { method: "POST", body: params, redirect: "follow" })
        .then(function (r) { return r.text(); })
        .then(function (text) { finish(parseJsonpText(text)); })
        .catch(fallbackJsonp);
    }).catch(reject);
  });
}

function updateAttSummary() {
  var node = el("attSummary");
  if (!node) return;
  var present = 0;
  var absent = 0;
  state.students.forEach(function (s) {
    var rec = state.attendanceMap[studentAttKey(s)] || { status: "present" };
    if (rec.status === "absent") absent++;
    else present++;
  });
  node.textContent = t("admin.attSummary")
    .replace("{present}", present)
    .replace("{absent}", absent)
    .replace("{total}", state.students.length);
}

function setAttStatus(key, status, rowEl) {
  state.attendanceMap[key] = state.attendanceMap[key] || { status: "present", note: "" };
  state.attendanceMap[key].status = status;
  if (rowEl) {
    rowEl.querySelectorAll(".att-pill").forEach(function (btn) { btn.classList.remove("active"); });
    var active = rowEl.querySelector(".att-pill." + status);
    if (active) active.classList.add("active");
  }
  updateAttSummary();
}

function renderAttendanceGrid() {
  var wrap = el("attendanceGridWrap");
  if (!wrap) return;
  wrap.textContent = "";

  if (!state.students.length) {
    var empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = t("admin.attNoStudents");
    wrap.appendChild(empty);
    updateAttSummary();
    return;
  }

  var table = document.createElement("table");
  table.className = "data-table";
  var thead = document.createElement("thead");
  var htr = document.createElement("tr");
  [t("dcol.name"), t("dcol.batch"), t("admin.colAttStatus"), t("admin.note")].forEach(function (h) {
    htr.appendChild(cell("th", h));
  });
  thead.appendChild(htr);
  table.appendChild(thead);

  var tbody = document.createElement("tbody");
  state.students.forEach(function (s) {
    var key = studentAttKey(s);
    var rec = state.attendanceMap[key] || { status: "present", note: "" };
    var tr = document.createElement("tr");

    var tdName = cell("td", s.name || t("dash"));
    tdName.className = "att-name";
    tr.appendChild(tdName);
    tr.appendChild(cell("td", s.batch || t("dash")));

    var tdStatus = document.createElement("td");
    var btns = document.createElement("div");
    btns.className = "att-status-btns";

    var pBtn = document.createElement("button");
    pBtn.type = "button";
    pBtn.className = "att-pill present" + (rec.status === "present" ? " active" : "");
    pBtn.textContent = t("status.present");
    pBtn.addEventListener("click", function () { setAttStatus(key, "present", tr); });

    var aBtn = document.createElement("button");
    aBtn.type = "button";
    aBtn.className = "att-pill absent" + (rec.status === "absent" ? " active" : "");
    aBtn.textContent = t("status.absent");
    aBtn.addEventListener("click", function () { setAttStatus(key, "absent", tr); });

    btns.appendChild(pBtn);
    btns.appendChild(aBtn);
    tdStatus.appendChild(btns);
    tr.appendChild(tdStatus);

    var tdNote = document.createElement("td");
    var noteInput = document.createElement("input");
    noteInput.type = "text";
    noteInput.className = "att-note-input";
    noteInput.maxLength = 120;
    noteInput.value = rec.note || "";
    noteInput.addEventListener("input", function () {
      state.attendanceMap[key] = state.attendanceMap[key] || { status: "present", note: "" };
      state.attendanceMap[key].note = noteInput.value.trim();
    });
    tdNote.appendChild(noteInput);
    tr.appendChild(tdNote);

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  updateAttSummary();
}

function loadAttendanceForDate(date) {
  var wrap = el("attendanceGridWrap");
  var note = el("attendanceNote");
  if (wrap) {
    wrap.textContent = "";
    var loading = document.createElement("p");
    loading.className = "empty-state";
    loading.textContent = t("admin.attLoading");
    wrap.appendChild(loading);
  }
  if (note) setNote(note, "", "");

  ensureStudents().then(function () {
    if (!state.students.length) {
      renderAttendanceGrid();
      return;
    }

    state.attendanceMap = {};
    state.students.forEach(function (s) {
      state.attendanceMap[studentAttKey(s)] = { status: "present", note: "" };
    });

    return sheetAdminRequest("attendance", { subaction: "get", date: date })
      .then(function (payload) {
        (payload.records || []).forEach(function (r) {
          var email = String(r.email || "").trim().toLowerCase();
          var key = email || ("name:" + String(r.name || "").trim().toLowerCase());
          if (!key || key === "name:") return;
          state.attendanceMap[key] = {
            status: r.status === "absent" ? "absent" : "present",
            note: r.note || ""
          };
        });
        renderAttendanceGrid();
      })
      .catch(function () {
        renderAttendanceGrid();
        if (note) setNote(note, t("admin.attErrLoad"), "err");
      });
  });
}

function saveDailyAttendance() {
  var note = el("attendanceNote");
  var saveBtn = el("attSaveBtn");
  var dateInput = el("attDate");
  var date = (dateInput && dateInput.value) || state.attendanceDate || todayIso();

  if (!date) {
    if (note) setNote(note, t("admin.errRequired"), "err");
    return;
  }
  if (!state.students.length) {
    if (note) setNote(note, t("admin.attNoStudents"), "err");
    return;
  }

  var records = state.students.map(function (s) {
    var key = studentAttKey(s);
    var rec = state.attendanceMap[key] || { status: "present", note: "" };
    return {
      name: s.name || "",
      email: studentSheetEmail(s),
      batch: s.batch || "",
      status: rec.status === "absent" ? "absent" : "present",
      note: rec.note || ""
    };
  });

  if (saveBtn) saveBtn.disabled = true;
  if (note) setNote(note, "", "");

  sheetAdminRequest("attendance", {
    subaction: "save",
    date: date,
    records: JSON.stringify(records)
  }).then(function () {
    return Promise.all(state.students.map(function (s) {
      var key = studentAttKey(s);
      var rec = state.attendanceMap[key] || { status: "present", note: "" };
      return setDoc(doc(db, "students", s.id, "attendance", date), {
        date: date,
        status: rec.status === "absent" ? "absent" : "present",
        note: rec.note || "",
        updatedAt: serverTimestamp()
      }, { merge: true });
    }));
  }).then(function () {
    if (note) setNote(note, t("admin.attSavedPortal"), "ok");
  }).catch(function () {
    if (note) setNote(note, t("admin.attErrSave"), "err");
  }).finally(function () {
    if (saveBtn) saveBtn.disabled = false;
  });
}

function initDailyAttendance() {
  var dateInput = el("attDate");
  var saveBtn = el("attSaveBtn");
  var allP = el("attAllPresent");
  var allA = el("attAllAbsent");
  if (!dateInput) return;

  state.attendanceDate = dateInput.value || todayIso();

  dateInput.addEventListener("change", function () {
    state.attendanceDate = dateInput.value;
    loadAttendanceForDate(state.attendanceDate);
  });

  if (allP) {
    allP.addEventListener("click", function () {
      state.students.forEach(function (s) {
        var k = studentAttKey(s);
        state.attendanceMap[k] = state.attendanceMap[k] || { status: "present", note: "" };
        state.attendanceMap[k].status = "present";
      });
      renderAttendanceGrid();
    });
  }

  if (allA) {
    allA.addEventListener("click", function () {
      state.students.forEach(function (s) {
        var k = studentAttKey(s);
        state.attendanceMap[k] = state.attendanceMap[k] || { status: "absent", note: "" };
        state.attendanceMap[k].status = "absent";
      });
      renderAttendanceGrid();
    });
  }

  if (saveBtn) saveBtn.addEventListener("click", saveDailyAttendance);
}

/* ---------------- Results ---------------- */
function renderResultList(uid) {
  var wrap = el("resultListWrap");
  if (!wrap) return;
  if (!uid) {
    wrap.textContent = "";
    var p = document.createElement("p"); p.className = "empty-state"; p.textContent = t("admin.selectStudent");
    wrap.appendChild(p); return;
  }
  getDocs(collection(db, "students", uid, "results")).then(function (qs) {
    var rows = sortByDateDesc(qs.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }));
    wrap.textContent = "";
    if (!rows.length) {
      var p = document.createElement("p"); p.className = "empty-state"; p.textContent = t("admin.selectStudent");
      wrap.appendChild(p); return;
    }
    var table = document.createElement("table");
    table.className = "data-table";
    var thead = document.createElement("thead");
    var htr = document.createElement("tr");
    [t("col.date"), t("col.test"), t("col.subject"), t("col.marks"), t("col.actions")].forEach(function (h) { htr.appendChild(cell("th", h)); });
    thead.appendChild(htr); table.appendChild(thead);
    var tbody = document.createElement("tbody");
    rows.forEach(function (r) {
      var tr = document.createElement("tr");
      tr.appendChild(cell("td", fmtDate(r.date)));
      tr.appendChild(cell("td", r.testName || ""));
      tr.appendChild(cell("td", r.subject || ""));
      tr.appendChild(cell("td", (r.marks !== undefined ? r.marks : "") + " / " + (r.outOf !== undefined ? r.outOf : "")));
      var td = document.createElement("td");
      td.appendChild(makeDeleteBtn(function () { return deleteDoc(doc(db, "students", uid, "results", r.id)); }, function () { renderResultList(uid); }));
      tr.appendChild(td);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
  }).catch(function () { /* leave as-is */ });
}

/* ---------------- Announcements ---------------- */
function renderAnnouncements() {
  var wrap = el("announceList");
  if (!wrap) return;
  getDocs(collection(db, "announcements")).then(function (qs) {
    var rows = sortByDateDesc(qs.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }));
    wrap.textContent = "";
    if (!rows.length) {
      var p = document.createElement("p"); p.className = "empty-state"; p.textContent = t("admin.noAnnounce");
      wrap.appendChild(p); return;
    }
    rows.forEach(function (a) {
      var item = document.createElement("div");
      item.className = "announce-item";
      var h = document.createElement("h3"); h.textContent = a.title || "";
      var time = document.createElement("time");
      time.textContent = fmtDate(a.date) + (a.audience ? " · " + a.audience : "");
      var body = document.createElement("p"); body.textContent = a.body || "";
      var del = makeDeleteBtn(function () { return deleteDoc(doc(db, "announcements", a.id)); }, renderAnnouncements);
      item.appendChild(h);
      item.appendChild(time);
      item.appendChild(body);
      item.appendChild(del);
      wrap.appendChild(item);
    });
  }).catch(function () { /* leave as-is */ });
}

function makeDeleteBtn(action, after) {
  var btn = document.createElement("button");
  btn.className = "icon-btn";
  btn.type = "button";
  btn.textContent = t("admin.delete");
  btn.addEventListener("click", function () {
    if (!window.confirm(t("admin.confirmDelete"))) return;
    btn.disabled = true;
    action().then(function () { if (after) after(); }).catch(function () { btn.disabled = false; });
  });
  return btn;
}

/* ---------------- Tabs ---------------- */
function initTabs() {
  var tabs = document.querySelectorAll(".admin-tab[data-tab]");
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var name = tab.getAttribute("data-tab");
      tabs.forEach(function (t2) { t2.classList.toggle("active", t2 === tab); });
      document.querySelectorAll(".admin-panel").forEach(function (panel) {
        panel.classList.toggle("active", panel.id === "panel-" + name);
      });
    });
  });
}

function initResultForm() {
  var form = el("resultForm");
  var note = el("resultNote");
  var sel = el("resStudent");
  if (sel) sel.addEventListener("change", function () { state.selectedRes = sel.value; renderResultList(sel.value); });
  if (!form) return;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var uid = sel.value;
    var testName = form.elements.testName.value.trim();
    var subject = form.elements.subject.value.trim();
    var marks = parseFloat(form.elements.marks.value);
    var outOf = parseFloat(form.elements.outOf.value);
    var date = form.elements.date.value;
    if (!uid || !testName || !subject || !date || form.elements.marks.value === "" || form.elements.outOf.value === "") {
      setNote(note, t("admin.errRequired"), "err"); return;
    }
    if (isNaN(marks) || isNaN(outOf) || outOf <= 0 || marks < 0 || marks > outOf) {
      setNote(note, t("admin.errMarks"), "err"); return;
    }
    var btn = form.querySelector("button[type=submit]");
    if (btn) btn.disabled = true;
    addDoc(collection(db, "students", uid, "results"), { testName: testName, subject: subject, marks: marks, outOf: outOf, date: date, createdAt: serverTimestamp() })
      .then(function () {
        setNote(note, t("admin.added"), "ok");
        form.elements.testName.value = ""; form.elements.subject.value = "";
        form.elements.marks.value = ""; form.elements.outOf.value = "";
        state.selectedRes = uid;
        renderResultList(uid);
      })
      .catch(function () { setNote(note, t("admin.errSave"), "err"); })
      .finally(function () { if (btn) btn.disabled = false; });
  });
}

function initAnnounceForm() {
  var form = el("announceForm");
  var note = el("announceNote");
  if (!form) return;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var title = form.elements.title.value.trim();
    var body = form.elements.body.value.trim();
    var date = form.elements.date.value;
    var audience = form.elements.audience.value.trim() || "all";
    if (!title || !body || !date) { setNote(note, t("admin.errRequired"), "err"); return; }
    var btn = form.querySelector("button[type=submit]");
    if (btn) btn.disabled = true;
    addDoc(collection(db, "announcements"), { title: title, body: body, date: date, audience: audience, createdAt: serverTimestamp() })
      .then(function () {
        setNote(note, t("admin.posted"), "ok");
        form.elements.title.value = ""; form.elements.body.value = "";
        renderAnnouncements();
      })
      .catch(function () { setNote(note, t("admin.errSave"), "err"); })
      .finally(function () { if (btn) btn.disabled = false; });
  });
}

/* ---------------- Broadcast email ---------------- */
// Collect every non-empty, valid-looking, de-duplicated student email.
function collectRecipients() {
  var seen = {};
  var emails = [];
  state.students.forEach(function (s) {
    var e = (s.email || "").trim().toLowerCase();
    if (e && EMAIL_RE.test(e) && !Object.prototype.hasOwnProperty.call(seen, e)) {
      seen[e] = true;
      emails.push(e);
    }
  });
  return emails;
}

// Which recipient list is selected: "registered" | "sheet" | "both".
function getAudience() {
  var form = el("broadcastForm");
  if (!form || !form.elements || !form.elements.audience) return "registered";
  return form.elements.audience.value || "registered";
}

function updateBroadcastCount() {
  var node = el("broadcastCount");
  if (!node) return;
  var audience = getAudience();
  var recipients = collectRecipients();
  if (audience === "sheet") {
    setNote(node, t("admin.bcCountSheet"), "");
    return;
  }
  if (audience === "both") {
    setNote(node, t("admin.bcCountBoth").replace("{n}", recipients.length), "");
    return;
  }
  // registered
  if (!recipients.length) {
    setNote(node, t("admin.bcNoRecipients"), "");
    return;
  }
  setNote(node, t("admin.bcCount").replace("{n}", recipients.length).replace("{total}", state.students.length), "");
}

function initBroadcastForm() {
  var form = el("broadcastForm");
  var note = el("broadcastNote");
  if (!form) return;

  // Recompute the recipient summary whenever the audience changes.
  var radios = form.querySelectorAll('input[name="audience"]');
  for (var i = 0; i < radios.length; i++) {
    radios[i].addEventListener("change", updateBroadcastCount);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var subject = form.elements.subject.value.trim();
    var body = form.elements.body.value.trim();
    if (!subject || !body) { setNote(note, t("admin.bcMissing"), "err"); return; }

    var audience = getAudience();
    var recipients = collectRecipients();

    // Only "registered" requires client-collected emails; sheet/both let the
    // server pull contacts from the enquiry Google Sheet.
    if (audience === "registered" && !recipients.length) {
      setNote(note, t("admin.bcNoRecipients"), "err");
      return;
    }

    var confirmMsg;
    if (audience === "sheet") confirmMsg = t("admin.bcConfirmSheet");
    else if (audience === "both") confirmMsg = t("admin.bcConfirmBoth").replace("{n}", recipients.length);
    else confirmMsg = t("admin.bcConfirm").replace("{n}", recipients.length);
    if (!window.confirm(confirmMsg)) return;

    var btn = form.querySelector("button[type=submit]");
    if (btn) btn.disabled = true;
    setNote(note, t("admin.bcSending"), "");

    var user = auth.currentUser;
    Promise.resolve(user ? user.getIdToken() : Promise.reject(new Error("no-user")))
      .then(function (idToken) {
        var params = new URLSearchParams();
        params.append("action", "broadcast");
        params.append("idToken", idToken);
        params.append("subject", subject);
        params.append("body", body);
        params.append("audience", audience);
        // Registered/both: send the client-collected Firestore emails. The server
        // ignores this for "sheet" and reads the sheet's Email column itself.
        params.append("recipients", recipients.join(","));
        params.append("lang", lang);
        // no-cors: the response is opaque/unreadable by design (cross-origin Apps Script).
        return fetch(SHEET_ENDPOINT, { method: "POST", body: params, mode: "no-cors", keepalive: true });
      })
      .then(function () {
        // Opaque response — show an optimistic success message per audience.
        var okMsg;
        if (audience === "sheet") okMsg = t("admin.bcQueuedSheet");
        else if (audience === "both") okMsg = t("admin.bcQueuedBoth");
        else okMsg = t("admin.bcQueued").replace("{n}", recipients.length);
        setNote(note, okMsg, "ok");
        form.elements.subject.value = "";
        form.elements.body.value = "";
      })
      .catch(function () {
        setNote(note, t("admin.bcErrSend"), "err");
      })
      .finally(function () {
        if (btn) btn.disabled = false;
      });
  });
}

/* ---------------- Student Details (table view) ---------------- */
// Coerce any sheet/Firestore value to display text, falling back to an em dash.
function dtext(v) {
  if (v === undefined || v === null || v === "") return t("dash");
  return String(v);
}

// Ensure the Firestore students list is loaded once (reuse if already present).
function ensureStudents() {
  if (state.studentsLoaded) return Promise.resolve();
  return loadStudents().catch(function () { /* leave students as-is on failure */ });
}

// Fetch enquiry contacts from Apps Script. Uses POST first (mobile-friendly — token not in URL),
// then falls back to JSONP GET.
function fetchEnquiriesJsonp(idToken, cbName) {
  return new Promise(function (resolve, reject) {
    var script = document.createElement("script");
    var timer = setTimeout(function () { cleanup(); reject(new Error("timeout")); }, 30000);

    function cleanup() {
      clearTimeout(timer);
      try { delete window[cbName]; } catch (e) { window[cbName] = undefined; }
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[cbName] = function (payload) {
      cleanup();
      if (payload && payload.result === "success" && Array.isArray(payload.rows)) {
        resolve(payload.rows);
      } else {
        reject(new Error((payload && payload.error) || "bad-response"));
      }
    };

    script.onerror = function () { cleanup(); reject(new Error("network")); };
    script.src = SHEET_ENDPOINT +
      "?action=enquiries&idToken=" + encodeURIComponent(idToken) +
      "&callback=" + encodeURIComponent(cbName);
    document.head.appendChild(script);
  });
}

function parseJsonpText(text) {
  if (!text) throw new Error("bad-response");
  var start = text.indexOf("(");
  var end = text.lastIndexOf(")");
  if (start === -1 || end <= start) throw new Error("bad-response");
  return JSON.parse(text.slice(start + 1, end));
}

function fetchEnquiries() {
  return new Promise(function (resolve, reject) {
    var user = auth.currentUser;
    if (!user) { reject(new Error("no-user")); return; }
    user.getIdToken().then(function (idToken) {
      var cbName = "__bccEnq_" + Date.now();
      var params = new URLSearchParams();
      params.append("action", "enquiries");
      params.append("idToken", idToken);
      params.append("callback", cbName);

      var timer = setTimeout(function () {
        reject(new Error("timeout"));
      }, 30000);

      function done(rows) {
        clearTimeout(timer);
        resolve(rows);
      }
      function fail(err) {
        clearTimeout(timer);
        reject(err);
      }

      fetch(SHEET_ENDPOINT, { method: "POST", body: params, redirect: "follow" })
        .then(function (r) { return r.text(); })
        .then(function (text) {
          var payload = parseJsonpText(text);
          if (payload && payload.result === "success" && Array.isArray(payload.rows)) {
            done(payload.rows);
          } else {
            fail(new Error((payload && payload.error) || "bad-response"));
          }
        })
        .catch(function () {
          fetchEnquiriesJsonp(idToken, cbName).then(done, fail);
        });
    }).catch(reject);
  });
}

// Load enquiry rows once and cache them for the session.
function ensureEnquiries() {
  if (state.enquiries) return Promise.resolve(state.enquiries);
  return fetchEnquiries().then(function (rows) {
    state.enquiries = Array.isArray(rows) ? rows : [];
    return state.enquiries;
  });
}

function fetchAdmissionsJsonp(idToken, cbName) {
  return new Promise(function (resolve, reject) {
    var script = document.createElement("script");
    var timer = setTimeout(function () { cleanup(); reject(new Error("timeout")); }, 30000);

    function cleanup() {
      clearTimeout(timer);
      try { delete window[cbName]; } catch (e) { window[cbName] = undefined; }
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[cbName] = function (payload) {
      cleanup();
      if (payload && payload.result === "success" && Array.isArray(payload.rows)) {
        resolve(payload.rows);
      } else {
        reject(new Error((payload && payload.error) || "bad-response"));
      }
    };

    script.onerror = function () { cleanup(); reject(new Error("network")); };
    script.src = SHEET_ENDPOINT +
      "?action=admissions&idToken=" + encodeURIComponent(idToken) +
      "&callback=" + encodeURIComponent(cbName);
    document.head.appendChild(script);
  });
}

function fetchAdmissions() {
  return new Promise(function (resolve, reject) {
    var user = auth.currentUser;
    if (!user) { reject(new Error("no-user")); return; }
    user.getIdToken().then(function (idToken) {
      var cbName = "__bccAdm_" + Date.now();
      var params = new URLSearchParams();
      params.append("action", "admissions");
      params.append("idToken", idToken);
      params.append("callback", cbName);

      var timer = setTimeout(function () {
        reject(new Error("timeout"));
      }, 30000);

      function done(rows) {
        clearTimeout(timer);
        resolve(rows);
      }
      function fail(err) {
        clearTimeout(timer);
        reject(err);
      }

      fetch(SHEET_ENDPOINT, { method: "POST", body: params, redirect: "follow" })
        .then(function (r) { return r.text(); })
        .then(function (text) {
          var payload = parseJsonpText(text);
          if (payload && payload.result === "success" && Array.isArray(payload.rows)) {
            done(payload.rows);
          } else {
            fail(new Error((payload && payload.error) || "bad-response"));
          }
        })
        .catch(function () {
          fetchAdmissionsJsonp(idToken, cbName).then(done, fail);
        });
    }).catch(reject);
  });
}

function ensureAdmissions() {
  if (state.admissions) return Promise.resolve(state.admissions);
  return fetchAdmissions().then(function (rows) {
    state.admissions = Array.isArray(rows) ? rows : [];
    return state.admissions;
  });
}

// Build a real <table> from header strings + an array of string-cell rows.
// Every cell is created with textContent (via cell()), so untrusted sheet/message
// content can never be interpreted as HTML.
function buildDetailsTable(headers, rows) {
  var table = document.createElement("table");
  table.className = "data-table";
  var thead = document.createElement("thead");
  var htr = document.createElement("tr");
  headers.forEach(function (h) { htr.appendChild(cell("th", h)); });
  thead.appendChild(htr);
  table.appendChild(thead);
  var tbody = document.createElement("tbody");
  rows.forEach(function (r) {
    var tr = document.createElement("tr");
    r.forEach(function (val) { tr.appendChild(cell("td", val)); });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function registeredHeaders() {
  return [t("dcol.name"), t("dcol.email"), t("dcol.phone"), t("dcol.batch"), t("dcol.schedule"), t("dcol.registered")];
}
function buildRegisteredRows() {
  return state.students.map(function (s) {
    return [dtext(s.name), dtext(s.email), dtext(s.phone), dtext(s.batch), dtext(s.schedule), fmtDate(s.createdAt)];
  });
}

// Enquiry rows are header-mapped objects keyed by the sheet's HEADERS.
function enquiryHeaders() {
  return [t("dcol.timestamp"), t("dcol.name"), t("dcol.phone"), t("dcol.email"), t("dcol.purpose"), t("dcol.course"), t("dcol.message"), t("dcol.language")];
}
function buildEnquiryRows(rows) {
  return rows.map(function (r) {
    r = r || {};
    return [dtext(r.Timestamp), dtext(r.Name), dtext(r.Phone), dtext(r.Email), dtext(r.Purpose), dtext(r.Course), dtext(r.Message), dtext(r.Language)];
  });
}

function admissionHeaders() {
  return [
    t("dcol.timestamp"), t("dcol.name"), t("dcol.admClass"), t("dcol.phone"), t("dcol.email"),
    t("dcol.admDob"), t("dcol.admAge"), t("dcol.admGender"), t("dcol.admSchool"), t("dcol.admMarks"),
    t("dcol.admMedium"), t("dcol.admFather"), t("dcol.admMother"), t("dcol.admOccupation"),
    t("dcol.admAltMobile"), t("dcol.admAddress"), t("dcol.batch"), t("dcol.admReferral"),
    t("dcol.admNote"), t("dcol.admFeePlan"), t("dcol.admPayMode")
  ];
}
function fmtAdmissionDate(v) {
  if (!v) return t("dash");
  var d = new Date(v);
  if (!isNaN(d.getTime())) return d.toLocaleDateString();
  return dtext(v);
}
function buildAdmissionRows(rows) {
  return rows.map(function (r) {
    r = r || {};
    return [
      dtext(r.Timestamp), dtext(r.Name), dtext(r.Class), dtext(r.Mobile), dtext(r.Email),
      fmtAdmissionDate(r.DOB), dtext(r.Age), dtext(r.Gender), dtext(r.School), dtext(r.Marks),
      dtext(r.Medium), dtext(r.Father), dtext(r.Mother), dtext(r.Occupation),
      dtext(r.AltMobile), dtext(r.Address), dtext(r.Batch), dtext(r.Referral),
      dtext(r.Note), dtext(r.FeePlan), dtext(r.PayMode)
    ];
  });
}

// Merge registered + enquiry into one set, de-duplicated by lowercased email.
function bothHeaders() {
  return [t("dcol.source"), t("dcol.name"), t("dcol.email"), t("dcol.phone"), t("dcol.details")];
}
function joinDetails(parts) {
  var clean = parts.filter(function (p) { return p && String(p).trim(); });
  return clean.length ? clean.join(" · ") : t("dash");
}
function buildBothRows(students, enquiries) {
  var map = {};
  var order = [];
  function entryFor(email, fallbackKey) {
    var e = (email || "").trim().toLowerCase();
    var key = e ? "e:" + e : "u:" + fallbackKey;
    if (!map[key]) {
      map[key] = { name: "", email: email || "", phone: "", details: "", reg: false, enq: false };
      order.push(key);
    }
    return map[key];
  }
  (students || []).forEach(function (s, i) {
    var en = entryFor(s.email, "r" + i);
    en.reg = true;
    if (!en.name) en.name = s.name || "";
    if (!en.email) en.email = s.email || "";
    if (!en.phone) en.phone = s.phone || "";
    var regDetails = joinDetails([s.batch, s.schedule]);
    en.details = en.details ? en.details : (regDetails === t("dash") ? "" : regDetails);
  });
  (enquiries || []).forEach(function (r, i) {
    r = r || {};
    var en = entryFor(r.Email, "q" + i);
    en.enq = true;
    if (!en.name) en.name = r.Name || "";
    if (!en.email) en.email = r.Email || "";
    if (!en.phone) en.phone = r.Phone || "";
    var enqDetails = joinDetails([r.Purpose, r.Course]);
    if (enqDetails !== t("dash")) {
      en.details = en.details ? en.details + " · " + enqDetails : enqDetails;
    }
  });
  return order.map(function (key) {
    var e = map[key];
    var srcLabel = e.reg && e.enq ? t("src.both") : (e.reg ? t("src.registered") : t("src.enquiry"));
    return [srcLabel, dtext(e.name), dtext(e.email), dtext(e.phone), e.details ? e.details : t("dash")];
  });
}

function setDetailsCount(n) {
  var node = el("detailsCount");
  if (node) setNote(node, t("admin.detailsCount").replace("{n}", n), "");
}
function detailsMessage(text) {
  var wrap = el("detailsTableWrap");
  if (!wrap) return;
  wrap.textContent = "";
  var p = document.createElement("p");
  p.className = "empty-state";
  p.textContent = text;
  wrap.appendChild(p);
}
function setDetailsLoading() {
  detailsMessage(t("admin.detailsLoading"));
  var node = el("detailsCount");
  if (node) setNote(node, "", "");
}
function setDetailsError(err, src) {
  var code = err && err.message;
  if (code === "unauthorized") detailsMessage(t("admin.detailsUnauthorized"));
  else if (code === "timeout") detailsMessage(t("admin.detailsTimeout"));
  else if (src === "admission") detailsMessage(t("admin.detailsErrAdmission"));
  else detailsMessage(t("admin.detailsErr"));
  var node = el("detailsCount");
  if (node) setNote(node, "", "");
}
function showDetailsTable(headers, rows) {
  var wrap = el("detailsTableWrap");
  if (!wrap) return;
  if (!rows.length) {
    detailsMessage(t("admin.detailsEmpty"));
    setDetailsCount(0);
    return;
  }
  wrap.textContent = "";
  wrap.appendChild(buildDetailsTable(headers, rows));
  setDetailsCount(rows.length);
}

function renderDetails() {
  var wrap = el("detailsTableWrap");
  if (!wrap) return;
  var src = state.detailsSource || "registered";
  setDetailsLoading();

  if (src === "registered") {
    ensureStudents().then(function () {
      if (state.detailsSource !== src) return;
      showDetailsTable(registeredHeaders(), buildRegisteredRows());
    });
    return;
  }

  if (src === "enquiry") {
    ensureEnquiries().then(function (enq) {
      if (state.detailsSource !== src) return;
      showDetailsTable(enquiryHeaders(), buildEnquiryRows(enq));
    }).catch(function (err) {
      if (state.detailsSource !== src) return;
      setDetailsError(err, src);
    });
    return;
  }

  if (src === "admission") {
    ensureAdmissions().then(function (adm) {
      if (state.detailsSource !== src) return;
      showDetailsTable(admissionHeaders(), buildAdmissionRows(adm));
    }).catch(function (err) {
      if (state.detailsSource !== src) return;
      setDetailsError(err, src);
    });
    return;
  }

  // both
  Promise.all([ensureStudents(), ensureEnquiries()]).then(function (res) {
    if (state.detailsSource !== src) return;
    showDetailsTable(bothHeaders(), buildBothRows(state.students, res[1]));
  }).catch(function (err) {
    if (state.detailsSource !== src) return;
    setDetailsError(err, src);
  });
}

function initDetailsTab() {
  var sel = el("detailsSource");
  if (!sel) return;
  state.detailsSource = sel.value || "registered";
  state.detailsInit = true;
  sel.addEventListener("change", function () {
    state.detailsSource = sel.value || "registered";
    renderDetails();
  });
  renderDetails();
}

/* ---------------- Boot ---------------- */
var langToggle = document.getElementById("langToggle");
if (langToggle) langToggle.addEventListener("click", function () { applyLang(lang === "en" ? "mr" : "en"); });

var logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) logoutBtn.addEventListener("click", function () {
  signOut(auth).finally(function () { window.location.href = "login.html"; });
});

applyLang(lang);

// Default date inputs to today.
["attDate", "resDate", "annDate"].forEach(function (id) { var n = el(id); if (n && !n.value) n.value = todayIso(); });

onAuthStateChanged(auth, function (user) {
  if (!user) { window.location.href = "login.html"; return; }

  getDoc(doc(db, "admins", user.uid)).then(function (snap) {
    var loading = el("loadingView");
    if (loading) loading.classList.add("hidden");

    if (!snap.exists()) {
      var denied = el("deniedView");
      if (denied) denied.classList.remove("hidden");
      return;
    }

    var app = el("appView");
    if (app) app.classList.remove("hidden");
    var emailEl = el("adminEmail");
    if (emailEl) emailEl.textContent = user.email || "";

    initTabs();
    initDailyAttendance();
    initResultForm();
    initAnnounceForm();
    initBroadcastForm();
    initDetailsTab();

    loadStudents().then(function () {
      renderStudents();
      populateStudentSelects();
      updateBroadcastCount();
      loadAttendanceForDate(state.attendanceDate || todayIso());
      if (state.detailsInit) renderDetails();
    }).catch(function () { renderStudents(); });

    renderAnnouncements();
  }).catch(function () {
    // If the admin check itself fails (e.g., rules/network), treat as not authorized.
    var loading = el("loadingView");
    if (loading) loading.classList.add("hidden");
    var denied = el("deniedView");
    if (denied) denied.classList.remove("hidden");
  });
});
