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
    "admin.tabAttendance": "Attendance",
    "admin.tabResults": "Results",
    "admin.tabAnnouncements": "Announcements",
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
    "admin.date": "Date",
    "admin.status": "Status",
    "admin.note": "Note (optional)",
    "admin.attendanceTitle": "Mark Attendance",
    "admin.addAttendance": "Add Attendance",
    "admin.recentAttendance": "Recent Attendance",
    "admin.selectStudent": "Select a student to see entries.",
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
    "admin.tabAttendance": "हजेरी",
    "admin.tabResults": "निकाल",
    "admin.tabAnnouncements": "घोषणा",
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
    "admin.date": "दिनांक",
    "admin.status": "स्थिती",
    "admin.note": "टीप (पर्यायी)",
    "admin.attendanceTitle": "हजेरी नोंदवा",
    "admin.addAttendance": "हजेरी जोडा",
    "admin.recentAttendance": "अलीकडील हजेरी",
    "admin.selectStudent": "नोंदी पाहण्यासाठी विद्यार्थी निवडा.",
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

var state = { students: [], selectedAtt: "", selectedRes: "" };

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
  if (state.selectedAtt) renderAttendanceList(state.selectedAtt);
  if (state.selectedRes) renderResultList(state.selectedRes);
  renderAnnouncements();
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
      return { id: d.id, name: data.name || "", email: data.email || "", phone: data.phone || "", batch: data.batch || "", schedule: data.schedule || "" };
    });
    state.students.sort(function (a, b) { return a.name.localeCompare(b.name); });
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
  ["attStudent", "resStudent"].forEach(function (id) {
    var sel = el(id);
    if (!sel) return;
    var current = sel.value;
    sel.textContent = "";
    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = t("admin.selectStudent");
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

/* ---------------- Attendance ---------------- */
function renderAttendanceList(uid) {
  var wrap = el("attendanceListWrap");
  if (!wrap) return;
  if (!uid) {
    wrap.textContent = "";
    var p = document.createElement("p"); p.className = "empty-state"; p.textContent = t("admin.selectStudent");
    wrap.appendChild(p); return;
  }
  getDocs(collection(db, "students", uid, "attendance")).then(function (qs) {
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
    [t("col.date"), t("col.status"), t("col.note"), t("col.actions")].forEach(function (h) { htr.appendChild(cell("th", h)); });
    thead.appendChild(htr); table.appendChild(thead);
    var tbody = document.createElement("tbody");
    rows.forEach(function (r) {
      var tr = document.createElement("tr");
      tr.appendChild(cell("td", fmtDate(r.date)));
      tr.appendChild(cell("td", r.status === "present" ? t("status.present") : t("status.absent")));
      tr.appendChild(cell("td", r.note || ""));
      var td = document.createElement("td");
      td.appendChild(makeDeleteBtn(function () { return deleteDoc(doc(db, "students", uid, "attendance", r.id)); }, function () { renderAttendanceList(uid); }));
      tr.appendChild(td);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
  }).catch(function () { /* leave as-is */ });
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

/* ---------------- Form handlers ---------------- */
function initAttendanceForm() {
  var form = el("attendanceForm");
  var note = el("attendanceNote");
  var sel = el("attStudent");
  if (sel) sel.addEventListener("change", function () { state.selectedAtt = sel.value; renderAttendanceList(sel.value); });
  if (!form) return;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var uid = sel.value;
    var date = form.elements.date.value;
    var status = form.elements.status.value;
    var noteVal = form.elements.note.value.trim();
    if (!uid || !date || !status) { setNote(note, t("admin.errRequired"), "err"); return; }
    var btn = form.querySelector("button[type=submit]");
    if (btn) btn.disabled = true;
    addDoc(collection(db, "students", uid, "attendance"), { date: date, status: status, note: noteVal, createdAt: serverTimestamp() })
      .then(function () {
        setNote(note, t("admin.added"), "ok");
        form.elements.note.value = "";
        state.selectedAtt = uid;
        renderAttendanceList(uid);
      })
      .catch(function () { setNote(note, t("admin.errSave"), "err"); })
      .finally(function () { if (btn) btn.disabled = false; });
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
    initAttendanceForm();
    initResultForm();
    initAnnounceForm();

    loadStudents().then(function () {
      renderStudents();
      populateStudentSelects();
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
