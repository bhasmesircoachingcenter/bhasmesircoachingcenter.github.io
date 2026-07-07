// =============================================================================
// Admin panel logic for admin.html.
//  - Auth guard: not signed in -> login.html.
//  - Admin check: doc exists at admins/{uid}. Non-admins see a "Not authorized"
//    screen and never see the admin tools.
//  - Manage portal accounts, attendance, results, announcements.
//
// Note on indexes: we read each collection with a SINGLE-field order("date")
// or sort client-side, and never combine where()+orderBy() on different fields,
// so NO Firestore composite index is required.
// =============================================================================

import { auth, db, provisionAuth } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  deleteUser,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  DEFAULT_REGISTRATION_FEE,
  PAYMENT_PLANS,
  suggestCourseFee,
  detectClassKey,
  formatRupee,
  computeBalance,
  normalizeStudentFeesRecord,
  defaultRatesReferenceHtml
} from "./fees-structure.js";

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
    "admin.tabAccounts": "Portal Accounts",
    "admin.tabDetails": "Student Details",
    "admin.tabAttendance": "Attendance",
    "admin.tabResults": "Results",
    "admin.tabAnnouncements": "Announcements",
    "admin.tabBroadcast": "Email Students",
    "admin.tabFees": "Student Fees",
    "admin.feesTitle": "Student Fees",
    "admin.feesHint": "Capture fees per admitted student (Admissions sheet). Admin only — not shown on website or admission form.",
    "admin.feesLoading": "Loading students…",
    "admin.feesNoStudents": "No students on Admissions sheet yet.",
    "admin.feesColName": "Student",
    "admin.feesColClass": "Class",
    "admin.feesColPlan": "Plan",
    "admin.feesColCourse": "Course fee",
    "admin.feesColPaid": "Paid",
    "admin.feesColBalance": "Balance",
    "admin.feesColStatus": "Status",
    "admin.feesColAction": "Action",
    "admin.feesEdit": "Edit",
    "admin.feesSave": "Save",
    "admin.feesSaved": "Fees saved.",
    "admin.feesErr": "Could not save fees. Try again.",
    "admin.feesErrLoad": "Could not load fees. Check Firestore rules.",
    "admin.feesStatusSet": "Recorded",
    "admin.feesStatusPending": "Not set",
    "admin.feesReg": "Registration fee (₹)",
    "admin.feesAmountPaid": "Amount paid (₹)",
    "admin.feesPaymentDate": "Last payment date",
    "admin.feesReceipt": "Receipt no.",
    "admin.feesNoteField": "Note",
    "admin.feesApplySuggest": "Use suggested fee",
    "admin.feesRefTitle": "Default fee reference (8 months)",
    "admin.feesSearch": "Search student",
    "admin.feesSearchPh": "Name, email or mobile",
    "admin.feesFilterStatus": "Status",
    "admin.feesFilterAll": "All",
    "admin.feesFilterBalance": "Has balance",
    "admin.feesFilterMeta": "Showing {n} of {total} students",
    "admin.feesFilterNone": "No students match your filters.",
    "admin.feesEmailReport": "Email fee report",
    "admin.feesReportSubject": "Student fees report ({n} students)",
    "admin.feesReportConfirm": "Email fee report for {n} student(s) to bhasmesircoachingcenter@gmail.com?",
    "admin.feesReportSending": "Sending fee report…",
    "admin.feesReportSent": "Fee report emailed to admin.",
    "admin.feesReportErr": "Could not send fee report. Try again.",
    "admin.feesReportEmpty": "No students to include in the report.",
    "admin.studentsTitle": "Students",
    "admin.loadingStudents": "Loading students…",
    "admin.noStudents": "No students registered yet.",
    "admin.accountsTitle": "Portal Accounts",
    "admin.accountsHint": "Create login accounts from the Admissions sheet. Students sign in with their email; initial password is their 10-digit mobile number.",
    "admin.accountsLoginHint": "Tell students: Login = email from admission form · Password = 10-digit mobile (no +91). Firebase may send a verification email — they can ignore it and log in.",
    "admin.accountsLoading": "Loading admissions and portal accounts…",
    "admin.accountsPendingTitle": "From Admissions (no account yet)",
    "admin.accountsActiveTitle": "Active portal accounts",
    "admin.accountsColStatus": "Status",
    "admin.accountsStatusPending": "No account",
    "admin.accountsStatusActive": "Active",
    "admin.accountsCreate": "Create account",
    "admin.accountsRemove": "Remove account",
    "admin.accountsCreated": "Account created. Student can log in with email + mobile as password.",
    "admin.accountsRemoved": "Portal account removed.",
    "admin.accountsNoEmail": "Email missing — cannot create account.",
    "admin.accountsInvalidEmail": "Invalid email in Admissions — fix the sheet, then refresh.",
    "admin.accountsNoPhone": "Valid 10-digit mobile required for password.",
    "admin.accountsNoPending": "All admission students already have portal accounts.",
    "admin.accountsNoActive": "No portal accounts yet.",
    "admin.accountsConfirmCreate": "Create portal account for {name}?\n\nLogin: {email}\nPassword: {phone} (10-digit mobile)",
    "admin.accountsConfirmRemove": "Remove portal account for {name}? This deletes their login and profile.",
    "admin.accountsErrCreate": "Could not create account.",
    "admin.accountsErrWeakPassword": "Firebase rejected this password — use a different mobile number or contact support.",
    "admin.accountsErrFirestore": "Login was created but student profile could not be saved. Try Create account again.",
    "admin.accountsErrRemove": "Could not remove account.",
    "admin.accountsErrExists": "This email already has a portal account.",
    "admin.accountsErrFunctions": "Apps Script is outdated — paste latest admission/Code.gs, then Deploy → Manage deployments → New version.",
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
    "admin.attHeaderSub": "Daily roll call · synced to Google Sheet",
    "admin.attQuickMark": "Quick mark",
    "admin.attStatPresent": "Present",
    "admin.attStatAbsent": "Absent",
    "admin.attStatTotal": "Students",
    "admin.attendanceHint": "Students load from the Admissions sheet. Pick a date, filter by class, tick Present, then save to the Attendance tab.",
    "admin.attAllPresent": "All Present",
    "admin.attAllAbsent": "All Absent",
    "admin.attSave": "Save Attendance to Sheet",
    "admin.attLoading": "Loading students…",
    "admin.attNoAdmissions": "No students on the Admissions sheet yet. Submit the online admission form first.",
    "admin.attPresent": "Present",
    "admin.attFilterClass": "Class",
    "admin.attAllClasses": "All classes",
    "admin.attNoClassMatch": "No students in this class.",
    "admin.attSummary": "{present} present · {absent} absent · {total} students",
    "admin.attSummaryFiltered": "{present} present · {absent} absent · {total} in {className}",
    "admin.attSaved": "Attendance saved to Google Sheet.",
    "admin.attSavedPortal": "Attendance saved (Sheet + student portal).",
    "admin.attErrLoad": "Could not load attendance. Redeploy Apps Script, then try again.",
    "admin.attErrSave": "Could not save attendance. Redeploy Apps Script, then try again.",
    "admin.attErrSaveDetail": "Could not save attendance: {detail}",
    "admin.attSavedSheetWarn": "Backup saved in Firebase. Google Sheet sync failed — redeploy Apps Script (new version), then save again.",
    "admin.attSavedPortalWarn": "Attendance saved to Google Sheet. Portal sync had an issue for some students.",
    "admin.attErrRoster": "Apps Script is outdated — paste latest admission/Code.gs, then Deploy → Manage deployments → New version. Your Admissions tab has students but the website cannot read them yet.",
    "admin.attErrScript": "Apps Script missing admissions API. Open Extensions → Apps Script, paste full Code.gs, Deploy → New version.",
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
    "admin.waShare": "Share on WhatsApp",
    "admin.waHint": "Opens WhatsApp with this message ready — choose your Broadcast list or Group, then tap Send. (WhatsApp cannot auto-send to everyone from the website; you pick the list once on your phone.)",
    "admin.waPhonesTitle": "Parent mobiles (for WhatsApp Broadcast list)",
    "admin.waPhonesHint": "Copy these numbers into a WhatsApp Business Broadcast list on +91 70585 05983. Parents must have saved your coaching number.",
    "admin.waPhonesCount": "{n} mobile numbers from Admissions + portal students.",
    "admin.waPhonesCopy": "Copy all numbers",
    "admin.waPhonesCopied": "Copied {n} numbers.",
    "admin.waPhonesNone": "No mobile numbers found yet — check the Admissions sheet.",
    "admin.waNeedMessage": "Enter a title and message first.",
    "admin.existingAnnounce": "Existing Announcements",
    "admin.noAnnounce": "No announcements yet.",
    "admin.broadcastTitle": "Broadcast Email",
    "admin.bcAudienceLabel": "Send to",
    "admin.bcAudPortal": "Portal students (with login)",
    "admin.bcAudAdmissions": "Admitted students (Admissions sheet)",
    "admin.bcAudSheet": "Enquiry contacts (Google Sheet)",
    "admin.bcAudAll": "Everyone (admissions + portal + enquiry)",
    "admin.bcAudBoth": "Portal students + enquiry contacts",
    "admin.bcSubject": "Subject",
    "admin.bcBody": "Message",
    "admin.bcSend": "Send Email",
    "admin.bcCount": "{n} of {total} portal students have an email on file.",
    "admin.bcCountAdmissions": "Will send to all emails in the Admissions sheet.",
    "admin.bcCountSheet": "Will send to all enquiry contacts in the Google Sheet.",
    "admin.bcCountAll": "{n} portal student(s) + Admissions sheet + enquiry contacts.",
    "admin.bcCountBoth": "{n} portal student(s) + all enquiry contacts in the Google Sheet.",
    "admin.bcNoRecipients": "No portal students have an email on file yet.",
    "admin.bcConfirm": "Send this email to {n} portal student(s)?",
    "admin.bcConfirmAdmissions": "Send this email to all admitted students in the Admissions sheet?",
    "admin.bcConfirmSheet": "Send this email to all enquiry contacts in the Google Sheet?",
    "admin.bcConfirmAll": "Send to admitted students, {n} portal student(s), and enquiry contacts?",
    "admin.bcConfirmBoth": "Send to {n} portal student(s) plus all enquiry contacts in the Google Sheet?",
    "admin.bcSending": "Sending…",
    "admin.bcQueued": "✅ Email queued to {n} portal student(s).",
    "admin.bcQueuedAdmissions": "✅ Email queued to admitted students (Admissions sheet).",
    "admin.bcQueuedSheet": "✅ Email queued to your enquiry contacts.",
    "admin.bcQueuedAll": "✅ Email queued to admissions, portal students, and enquiry contacts.",
    "admin.bcQueuedBoth": "✅ Email queued to portal students + enquiry contacts.",
    "admin.bcTemplateBatch": "Use batch-start template (10 July)",
    "admin.bcErrSend": "Could not send. Please try again.",
    "admin.bcMissing": "Please enter a subject and message.",
    "admin.detailsTitle": "Student Details",
    "admin.detailsSource": "Source",
    "admin.detailsSrcEnquiry": "Enquiry contacts (Google Sheet)",
    "admin.detailsSrcAdmission": "Admission form (Google Form)",
    "admin.detailsLoading": "Loading…",
    "admin.detailsCount": "Showing {n} records",
    "admin.detailsEmpty": "No records to show.",
    "admin.detailsErr": "Could not load enquiry contacts. Redeploy Apps Script (new version), then refresh.",
    "admin.detailsErrAdmission": "Could not load admission form responses. Redeploy Apps Script (new version), then refresh.",
    "admin.sheetsTitle": "Google Sheet — student data",
    "admin.sheetsHint": "Open the coaching spreadsheet in Google Sheets or download as Excel. Same data as the tables above.",
    "admin.sheetsLoading": "Loading spreadsheet links…",
    "admin.sheetsErr": "Could not load sheet links. Paste latest admission/Code.gs, then Deploy → New version.",
    "admin.sheetsColTab": "Tab",
    "admin.sheetsColAbout": "Contains",
    "admin.sheetsColOpen": "Open",
    "admin.sheetsColDownload": "Download",
    "admin.sheetsOpenFull": "Open full spreadsheet",
    "admin.sheetsDownloadXlsx": "Download Excel (.xlsx)",
    "admin.sheetsOpenTab": "Open tab",
    "admin.sheetsDownloadCsv": "CSV",
    "admin.sheetsDescAdmissions": "Admission form responses",
    "admin.sheetsDescAttendance": "Daily attendance records",
    "admin.sheetsDescEnquiry": "Website enquiry contacts",
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
    "admin.tabAccounts": "पोर्टल खाती",
    "admin.tabDetails": "विद्यार्थी तपशील",
    "admin.tabAttendance": "हजेरी",
    "admin.tabResults": "निकाल",
    "admin.tabAnnouncements": "घोषणा",
    "admin.tabBroadcast": "विद्यार्थ्यांना ईमेल",
    "admin.tabFees": "विद्यार्थी फी",
    "admin.feesTitle": "विद्यार्थी फी",
    "admin.feesHint": "प्रवेशित विद्यार्थ्यांची फी नोंदवा (Admissions sheet). फक्त अॅडमिन — वेबसाइट/अर्जावर दिसत नाही.",
    "admin.feesLoading": "विद्यार्थी लोड होत आहेत…",
    "admin.feesNoStudents": "Admissions sheet वर अद्याप विद्यार्थी नाहीत.",
    "admin.feesColName": "विद्यार्थी",
    "admin.feesColClass": "इयत्ता",
    "admin.feesColPlan": "योजना",
    "admin.feesColCourse": "अभ्यासक्रम शुल्क",
    "admin.feesColPaid": "भरले",
    "admin.feesColBalance": "बाकी",
    "admin.feesColStatus": "स्थिती",
    "admin.feesColAction": "कृती",
    "admin.feesEdit": "संपादन",
    "admin.feesSave": "जतन करा",
    "admin.feesSaved": "फी जतन झाली.",
    "admin.feesErr": "फी जतन करता आली नाही. पुन्हा प्रयत्न करा.",
    "admin.feesErrLoad": "फी लोड करता आली नाही. Firestore rules तपासा.",
    "admin.feesStatusSet": "नोंदवले",
    "admin.feesStatusPending": "नोंद नाही",
    "admin.feesReg": "नोंदणी शुल्क (₹)",
    "admin.feesAmountPaid": "भरलेली रक्कम (₹)",
    "admin.feesPaymentDate": "शेवटची पेमेंट तारीख",
    "admin.feesReceipt": "पावती क्र.",
    "admin.feesNoteField": "टीप",
    "admin.feesApplySuggest": "सुचवलेली फी वापरा",
    "admin.feesRefTitle": "मूळ फी संदर्भ (८ महिने)",
    "admin.feesSearch": "विद्यार्थी शोधा",
    "admin.feesSearchPh": "नाव, ईमेल किंवा मोबाइल",
    "admin.feesFilterStatus": "स्थिती",
    "admin.feesFilterAll": "सर्व",
    "admin.feesFilterBalance": "बाकी आहे",
    "admin.feesFilterMeta": "{total} पैकी {n} विद्यार्थी",
    "admin.feesFilterNone": "फिल्टरशी जुळणारे विद्यार्थी नाहीत.",
    "admin.feesEmailReport": "फी अहवाल ईमेल करा",
    "admin.feesReportSubject": "विद्यार्थी फी अहवाल ({n} विद्यार्थी)",
    "admin.feesReportConfirm": "{n} विद्यार्थ्यांचा फी अहवाल bhasmesircoachingcenter@gmail.com वर पाठवायचा?",
    "admin.feesReportSending": "फी अहवाल पाठवत आहे…",
    "admin.feesReportSent": "फी अहवाल अॅडमिनला ईमेल झाला.",
    "admin.feesReportErr": "फी अहवाल पाठवता आला नाही. पुन्हा प्रयत्न करा.",
    "admin.feesReportEmpty": "अहवालासाठी विद्यार्थी नाहीत.",
    "admin.studentsTitle": "विद्यार्थी",
    "admin.loadingStudents": "विद्यार्थी लोड होत आहेत…",
    "admin.noStudents": "अद्याप कोणी विद्यार्थी नोंदणीकृत नाही.",
    "admin.accountsTitle": "पोर्टल खाती",
    "admin.accountsHint": "Admissions sheet वरून लॉगिन खाती तयार करा. विद्यार्थी ईमेलने लॉगिन करतात; प्रारंभिक पासवर्ड १० अंकी मोबाइल नंबर.",
    "admin.accountsLoginHint": "विद्यार्थ्यांना सांगा: लॉगिन = प्रवेश अर्जातील ईमेल · पासवर्ड = १० अंकी मोबाइल (+91 नको). Firebase पडताळणी ईमेल पाठवू शकते — लॉगिन करता येईल.",
    "admin.accountsLoading": "प्रवेश व पोर्टल खाती लोड होत आहेत…",
    "admin.accountsPendingTitle": "Admissions मधून (अद्याप खाते नाही)",
    "admin.accountsActiveTitle": "सक्रिय पोर्टल खाती",
    "admin.accountsColStatus": "स्थिती",
    "admin.accountsStatusPending": "खाते नाही",
    "admin.accountsStatusActive": "सक्रिय",
    "admin.accountsCreate": "खाते तयार करा",
    "admin.accountsRemove": "खाते काढा",
    "admin.accountsCreated": "खाते तयार झाले. विद्यार्थी ईमेल + मोबाइल पासवर्डने लॉगिन करू शकतो.",
    "admin.accountsRemoved": "पोर्टल खाते काढले.",
    "admin.accountsNoEmail": "ईमेल नाही — खाते तयार करता येत नाही.",
    "admin.accountsInvalidEmail": "Admissions मध्ये चुकीचा ईमेल — शीट दुरुस्त करा, नंतर रिफ्रेश करा.",
    "admin.accountsNoPhone": "पासवर्डसाठी वैध १० अंकी मोबाइल हवा.",
    "admin.accountsNoPending": "सर्व प्रवेश विद्यार्थ्यांची पोर्टल खाती आहेत.",
    "admin.accountsNoActive": "अद्याप पोर्टल खाती नाहीत.",
    "admin.accountsConfirmCreate": "{name} साठी पोर्टल खाते तयार करायचे?\n\nलॉगिन: {email}\nपासवर्ड: {phone} (१० अंकी मोबाइल)",
    "admin.accountsConfirmRemove": "{name} चे पोर्टल खाते काढायचे? लॉगिन व प्रोफाइल हटवले जाईल.",
    "admin.accountsErrCreate": "खाते तयार करता आले नाही.",
    "admin.accountsErrWeakPassword": "Firebase ने हा पासवर्ड नाकारला — वेगळा मोबाइल वापरा.",
    "admin.accountsErrFirestore": "लॉगिन तयार झाले पण प्रोफाइल जतन झाली नाही. पुन्हा Create account दाबा.",
    "admin.accountsErrRemove": "खाते काढता आले नाही.",
    "admin.accountsErrExists": "या ईमेलवर आधीच पोर्टल खाते आहे.",
    "admin.accountsErrFunctions": "Apps Script जुना आहे — admission/Code.gs paste करा, नंतर Deploy → Manage deployments → New version.",
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
    "admin.attHeaderSub": "दैनिक हजेरी · Google Sheet मध्ये जतन",
    "admin.attQuickMark": "झटपट खूण",
    "admin.attStatPresent": "हजर",
    "admin.attStatAbsent": "गैरहजर",
    "admin.attStatTotal": "विद्यार्थी",
    "admin.attendanceHint": "विद्यार्थी Admissions sheet वरून लोड होतात. दिनांक निवडा, इयत्तेनुसार फिल्टर करा, हजर खूण करा आणि Attendance टॅबमध्ये जतन करा.",
    "admin.attAllPresent": "सर्व हजर",
    "admin.attAllAbsent": "सर्व गैरहजर",
    "admin.attSave": "हजेरी Sheet मध्ये जतन करा",
    "admin.attLoading": "विद्यार्थी लोड होत आहेत…",
    "admin.attNoAdmissions": "Admissions sheet वर अद्याप विद्यार्थी नाहीत. प्रथम ऑनलाइन प्रवेश अर्ज भरा.",
    "admin.attPresent": "हजर",
    "admin.attFilterClass": "इयत्ता",
    "admin.attAllClasses": "सर्व इयत्ता",
    "admin.attNoClassMatch": "या इयत्तेत विद्यार्थी नाहीत.",
    "admin.attSummary": "{present} हजर · {absent} गैरहजर · {total} विद्यार्थी",
    "admin.attSummaryFiltered": "{present} हजर · {absent} गैरहजर · {total} — {className}",
    "admin.attSaved": "हजेरी Google Sheet मध्ये जतन झाली.",
    "admin.attSavedPortal": "हजेरी जतन झाली (Sheet + विद्यार्थी पोर्टल).",
    "admin.attErrLoad": "हजेरी लोड करता आली नाही. Apps Script पुन्हा डिप्लॉय करा.",
    "admin.attErrSave": "हजेरी जतन करता आली नाही. Apps Script पुन्हा डिप्लॉय करा.",
    "admin.attErrSaveDetail": "हजेरी जतन करता आली नाही: {detail}",
    "admin.attSavedPortalWarn": "हजेरी Google Sheet मध्ये जतन झाली. काही विद्यार्थ्यांचा पोर्टल सिंक अपूर्ण.",
    "admin.attSavedSheetWarn": "Firebase मध्ये बॅकअप जतन झाला. Google Sheet सिंक अयशस्वी — Apps Script पुन्हा डिप्लॉय करा.",
    "admin.attErrRoster": "Apps Script जुना आहे — admission/Code.gs paste करा, नंतर Deploy → New version. Admissions टॅबमध्ये विद्यार्थी आहेत पण वेबसाइट अद्याप वाचू शकत नाही.",
    "admin.attErrScript": "Apps Script मध्ये admissions API नाही. Extensions → Apps Script, पूर्ण Code.gs paste करा, Deploy → New version.",
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
    "admin.waShare": "WhatsApp वर शेअर करा",
    "admin.waHint": "WhatsApp उघडेल — तुमची Broadcast list किंवा Group निवडा, नंतर Send दाबा. (वेबसाइटवरून सर्वांना आपोआप WhatsApp जात नाही.)",
    "admin.waPhonesTitle": "पालक मोबाइल (WhatsApp Broadcast साठी)",
    "admin.waPhonesHint": "+91 70585 05983 वर WhatsApp Business Broadcast list मध्ये हे नंबर कॉपी करा. पालकांनी तुमचा नंबर सेव्ह केला असला पाहिजे.",
    "admin.waPhonesCount": "Admissions + पोर्टल विद्यार्थ्यांकडून {n} मोबाइल नंबर.",
    "admin.waPhonesCopy": "सर्व नंबर कॉपी करा",
    "admin.waPhonesCopied": "{n} नंबर कॉपी झाले.",
    "admin.waPhonesNone": "अद्याप मोबाइल नंबर नाहीत — Admissions sheet तपासा.",
    "admin.waNeedMessage": "प्रथम शीर्षक आणि संदेश भरा.",
    "admin.existingAnnounce": "विद्यमान घोषणा",
    "admin.noAnnounce": "अद्याप घोषणा नाहीत.",
    "admin.broadcastTitle": "ईमेल पाठवा",
    "admin.bcAudienceLabel": "यांना पाठवा",
    "admin.bcAudPortal": "पोर्टल विद्यार्थी (लॉगिन असलेले)",
    "admin.bcAudAdmissions": "प्रवेश घेतलेले विद्यार्थी (Admissions sheet)",
    "admin.bcAudSheet": "चौकशी संपर्क (Google Sheet)",
    "admin.bcAudAll": "सर्व (प्रवेश + पोर्टल + चौकशी)",
    "admin.bcAudBoth": "पोर्टल विद्यार्थी + चौकशी संपर्क",
    "admin.bcSubject": "विषय",
    "admin.bcBody": "संदेश",
    "admin.bcSend": "ईमेल पाठवा",
    "admin.bcCount": "{total} पैकी {n} नोंदणीकृत विद्यार्थ्यांचा ईमेल नोंदलेला आहे.",
    "admin.bcCountAdmissions": "Admissions sheet मधील सर्व ईमेलवर पाठवले जाईल.",
    "admin.bcCountSheet": "Google Sheet मधील सर्व चौकशी संपर्कांना पाठवले जाईल.",
    "admin.bcCountAll": "{n} पोर्टल विद्यार्थी + Admissions + चौकशी संपर्क.",
    "admin.bcCountBoth": "{n} नोंदणीकृत विद्यार्थी + Google Sheet मधील सर्व चौकशी संपर्क.",
    "admin.bcNoRecipients": "अद्याप कोणत्याही नोंदणीकृत विद्यार्थ्याचा ईमेल नोंदलेला नाही.",
    "admin.bcConfirm": "हा ईमेल {n} नोंदणीकृत विद्यार्थ्यांना पाठवायचा?",
    "admin.bcConfirmAdmissions": "हा ईमेल Admissions sheet मधील सर्व प्रवेश घेतलेल्या विद्यार्थ्यांना पाठवायचा?",
    "admin.bcConfirmSheet": "हा ईमेल Google Sheet मधील सर्व चौकशी संपर्कांना पाठवायचा?",
    "admin.bcConfirmAll": "प्रवेश, {n} पोर्टल विद्यार्थी आणि चौकशी संपर्कांना पाठवायचा?",
    "admin.bcConfirmBoth": "{n} नोंदणीकृत विद्यार्थी व Google Sheet मधील सर्व चौकशी संपर्कांना पाठवायचा?",
    "admin.bcSending": "पाठवत आहे…",
    "admin.bcQueued": "✅ ईमेल {n} नोंदणीकृत विद्यार्थ्यांना पाठवण्यासाठी रांगेत ठेवला.",
    "admin.bcQueuedAdmissions": "✅ ईमेल Admissions sheet मधील विद्यार्थ्यांना पाठवण्यासाठी रांगेत ठेवला.",
    "admin.bcQueuedSheet": "✅ ईमेल तुमच्या चौकशी संपर्कांना पाठवण्यासाठी रांगेत ठेवला.",
    "admin.bcQueuedAll": "✅ ईमेल प्रवेश, पोर्टल आणि चौकशी संपर्कांना पाठवण्यासाठी रांगेत ठेवला.",
    "admin.bcQueuedBoth": "✅ ईमेल नोंदणीकृत विद्यार्थी + चौकशी संपर्कांना पाठवण्यासाठी रांगेत ठेवला.",
    "admin.bcTemplateBatch": "बैच सुरू टेम्पलेट (१० जुलै)",
    "admin.bcErrSend": "पाठवता आले नाही. कृपया पुन्हा प्रयत्न करा.",
    "admin.bcMissing": "कृपया विषय व संदेश भरा.",
    "admin.detailsTitle": "विद्यार्थी तपशील",
    "admin.detailsSource": "स्रोत",
    "admin.detailsSrcEnquiry": "चौकशी संपर्क (Google Sheet)",
    "admin.detailsSrcAdmission": "प्रवेश अर्ज (Google Form)",
    "admin.detailsLoading": "लोड होत आहे…",
    "admin.detailsCount": "{n} नोंदी दर्शवित आहे",
    "admin.detailsEmpty": "दर्शविण्यासाठी नोंदी नाहीत.",
    "admin.detailsErr": "चौकशी संपर्क लोड करता आले नाहीत. Apps Script पुन्हा डिप्लॉय करा, नंतर रिफ्रेश करा.",
    "admin.detailsErrAdmission": "प्रवेश अर्ज प्रतिसाद लोड करता आले नाहीत. Apps Script पुन्हा डिप्लॉय करा, नंतर रिफ्रेश करा.",
    "admin.sheetsTitle": "Google Sheet — विद्यार्थी डेटा",
    "admin.sheetsHint": "कोचिंग spreadsheet Google Sheets मध्ये उघडा किंवा Excel म्हणून डाउनलोड करा.",
    "admin.sheetsLoading": "Spreadsheet दुवे लोड होत आहेत…",
    "admin.sheetsErr": "Sheet दुवे लोड करता आले नाहीत. admission/Code.gs paste करा, Deploy → New version.",
    "admin.sheetsColTab": "टॅब",
    "admin.sheetsColAbout": "माहिती",
    "admin.sheetsColOpen": "उघडा",
    "admin.sheetsColDownload": "डाउनलोड",
    "admin.sheetsOpenFull": "संपूर्ण spreadsheet उघडा",
    "admin.sheetsDownloadXlsx": "Excel (.xlsx) डाउनलोड",
    "admin.sheetsOpenTab": "टॅब उघडा",
    "admin.sheetsDownloadCsv": "CSV",
    "admin.sheetsDescAdmissions": "प्रवेश अर्ज उत्तरे",
    "admin.sheetsDescAttendance": "दैनिक हजेरी",
    "admin.sheetsDescEnquiry": "वेबसाइट चौकशी संपर्क",
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
  sheetSession: null, // { key, expires }
  attendanceDate: "",
  attendanceMap: {},
  attendanceRoster: [], // students from Admissions sheet (admission form)
  studentFeesMap: {},
  studentFeesInit: false,
  studentFeesEditing: null,
  studentFeesFiltersBound: false,
  // Student Details tab
  detailsSource: "admission",
  detailsInit: false,
  sheetLinks: null,
  sheetLinksError: null,
  enquiries: null, // cached enquiry rows fetched from the sheet via JSONP
  admissions: null, // cached admission form rows from Admissions tab
  accountsInit: false
};

// Basic email shape check (matches auth.js). Used to filter broadcast recipients.
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public Apps Script Web App endpoint (same URL used for enquiries in script.js).
// Authorization for broadcasts is done by passing the admin's Firebase ID token,
// which the server verifies — no static secret/token is embedded here.
var SHEET_ENDPOINT = "https://script.google.com/macros/s/AKfycbxQbeYdQSdP7eP6sEvDV6knfsCAGmaIJhNS3cyHqfYP7eH6coPUErVaLUCl5l-IEMQJlA/exec";
var ADMIN_REPORT_EMAIL = "bhasmesircoachingcenter@gmail.com";

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
  document.querySelectorAll("[data-i18n-placeholder]").forEach(function (node) {
    var key = node.getAttribute("data-i18n-placeholder");
    if (Object.prototype.hasOwnProperty.call(I18N[lang], key)) node.setAttribute("placeholder", I18N[lang][key]);
  });
  var toggle = document.getElementById("langToggle");
  if (toggle) {
    toggle.textContent = lang === "en" ? "मराठी" : "English";
    toggle.setAttribute("aria-label", lang === "en" ? "Switch to Marathi" : "Switch to English");
  }
  try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  // Re-render data-driven sections that aren't covered by data-i18n.
  if (state.accountsInit) renderPortalAccounts();
  if (state.attendanceDate) {
    populateAttClassFilter();
    renderAttendanceGrid();
    updateAttSummary();
  }
  if (state.selectedRes) renderResultList(state.selectedRes);
  renderAnnouncements();
  updateBroadcastCount();
  if (state.detailsInit) renderDetails();
  if (state.sheetLinks || state.sheetLinksError) renderSheetLinks();
  updateWaPhonesPanel();
  if (state.studentFeesInit) renderStudentFeesTable();
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

function appendPortalStudentRow(s, wrap) {
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

  var btnRow = document.createElement("div");
  btnRow.className = "accounts-action-cell";

  var editBtn = document.createElement("button");
  editBtn.className = "admin-tab";
  editBtn.type = "button";
  editBtn.textContent = t("admin.edit");

  var removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "icon-btn accounts-remove-btn";
  removeBtn.textContent = t("admin.accountsRemove");
  removeBtn.addEventListener("click", function () { removePortalAccount(s, removeBtn); });

  btnRow.appendChild(editBtn);
  btnRow.appendChild(removeBtn);

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
      populateStudentSelects();
      updateBroadcastCount();
    }).catch(function () {
      setNote(note, t("admin.errSave"), "err");
    }).finally(function () {
      saveBtn.disabled = false;
    });
  });

  row.appendChild(meta);
  row.appendChild(btnRow);
  row.appendChild(editor);
  wrap.appendChild(row);
}

/* ---------------- Portal accounts (admin-provisioned login) ---------------- */

function normalizePhone(raw) {
  var digits = String(raw || "").replace(/[\s\-()]/g, "");
  digits = digits.replace(/^\+91/, "").replace(/^0+/, "");
  if (/^[6-9]\d{9}$/.test(digits)) return digits;
  return null;
}

function studentByEmail(email) {
  var lower = String(email || "").trim().toLowerCase();
  if (!lower) return null;
  for (var i = 0; i < state.students.length; i++) {
    if ((state.students[i].email || "").trim().toLowerCase() === lower) return state.students[i];
  }
  return null;
}

function admissionAccountRow(r) {
  r = r || {};
  return {
    name: admissionRowField(r, "Name", /name/i),
    email: admissionRowField(r, "Email", /email/i),
    phone: admissionRowField(r, "Mobile", /mobile|whatsapp|phone/i),
    batch: admissionRowField(r, "Class", /class/i) || admissionRowField(r, "Batch", /batch|timing/i)
  };
}

function accountPendingStatus(email, phone) {
  email = String(email || "").trim();
  if (!email) return t("admin.accountsNoEmail");
  if (!EMAIL_RE.test(email)) return t("admin.accountsInvalidEmail");
  if (!normalizePhone(phone)) return t("admin.accountsNoPhone");
  return t("admin.accountsStatusPending");
}

function buildAdmissionAccountList(rows) {
  var seen = {};
  var list = [];
  (rows || []).forEach(function (r) {
    var row = admissionAccountRow(r);
    if (!row.name) return;
    var emailKey = row.email ? row.email.trim().toLowerCase() : "";
    var key = emailKey || ("n:" + row.name.toLowerCase() + "|" + row.phone);
    if (seen[key]) return;
    seen[key] = true;
    list.push(row);
  });
  return list.sort(function (a, b) { return a.name.localeCompare(b.name); });
}

function portalAccountsErrorKey(err) {
  var code = (err && err.code) || (err && err.message) || "";
  if (code === "auth/email-already-in-use") return "admin.accountsErrExists";
  if (code === "auth/invalid-email") return "admin.accountsNoEmail";
  if (code === "auth/weak-password") return "admin.accountsNoPhone";
  if (code === "auth/wrong-password" || code === "auth/invalid-credential" || code === "auth/user-not-found") {
    return "admin.accountsErrRemove";
  }
  if (code === "unauthorized") return "admin.detailsUnauthorized";
  if (code === "timeout") return "admin.detailsTimeout";
  if (code === "firestore-failed") return "admin.accountsErrFirestore";
  return null;
}

function provisionCreateAuthUser(email, phone, name) {
  return createUserWithEmailAndPassword(provisionAuth, email, phone).then(function (cred) {
    var user = cred.user;
    var uid = user.uid;
    var done = name ? updateProfile(user, { displayName: name }) : Promise.resolve();
    return done.then(function () {
      return signOut(provisionAuth).then(function () { return uid; });
    });
  }).catch(function (err) {
    if (err && err.code === "auth/email-already-in-use") {
      return signInWithEmailAndPassword(provisionAuth, email, phone).then(function (cred) {
        var uid = cred.user.uid;
        return signOut(provisionAuth).then(function () { return uid; });
      });
    }
    throw err;
  });
}

function provisionDeleteAuthUser(email, phone) {
  return signInWithEmailAndPassword(provisionAuth, email, phone).then(function (cred) {
    return deleteUser(cred.user).then(function () {
      return signOut(provisionAuth);
    });
  });
}

function deleteSubcollectionDocs(uid, subName) {
  var colRef = collection(db, "students", uid, subName);
  return getDocs(colRef).then(function (snap) {
    if (snap.empty) return;
    var batch = writeBatch(db);
    snap.docs.forEach(function (d) { batch.delete(d.ref); });
    return batch.commit().then(function () {
      return deleteSubcollectionDocs(uid, subName);
    });
  });
}

function deleteStudentFirestoreData(uid) {
  return deleteSubcollectionDocs(uid, "attendance")
    .then(function () { return deleteSubcollectionDocs(uid, "results"); })
    .then(function () { return deleteDoc(doc(db, "students", uid)); })
    .catch(function () { return deleteDoc(doc(db, "students", uid)); });
}

function loadPortalAccounts() {
  var pendingWrap = el("accountsPendingWrap");
  var activeWrap = el("accountsActiveWrap");
  var note = el("accountsNote");
  if (pendingWrap) {
    pendingWrap.textContent = "";
    var loading = document.createElement("p");
    loading.className = "empty-state";
    loading.textContent = t("admin.accountsLoading");
    pendingWrap.appendChild(loading);
  }
  if (activeWrap) activeWrap.textContent = "";
  if (note) setNote(note, "", "");

  return Promise.all([
    ensureAdmissions(true),
    loadStudents().then(function () { return state.students; })
  ]).then(function () {
    renderPortalAccounts();
  }).catch(function () {
    renderPortalAccounts();
    if (note) setNote(note, t("admin.accountsErrCreate"), "err");
  });
}

function renderAccountsTable(headers, rows, actionBuilder) {
  var table = document.createElement("table");
  table.className = "data-table accounts-table";
  var thead = document.createElement("thead");
  var htr = document.createElement("tr");
  headers.forEach(function (h) { htr.appendChild(cell("th", h)); });
  thead.appendChild(htr);
  table.appendChild(thead);
  var tbody = document.createElement("tbody");
  rows.forEach(function (row) {
    var tr = document.createElement("tr");
    row.cells.forEach(function (txt, i) {
      var td = cell("td", txt);
      if (row.nameCell && i === 0) td.className = "att-name";
      if (headers[i]) td.setAttribute("data-label", headers[i]);
      tr.appendChild(td);
    });
    var tdAct = document.createElement("td");
    tdAct.className = "accounts-action-cell";
    var btn = actionBuilder(row);
    if (btn) tdAct.appendChild(btn);
    tr.appendChild(tdAct);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function renderPortalAccounts() {
  var pendingWrap = el("accountsPendingWrap");
  var activeWrap = el("accountsActiveWrap");
  if (!pendingWrap || !activeWrap) return;

  var admissions = buildAdmissionAccountList(state.admissions || []);
  var pending = admissions.filter(function (a) { return !studentByEmail(a.email); });
  var active = state.students.slice().sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });

  pendingWrap.textContent = "";
  activeWrap.textContent = "";

  var pendingHeaders = [t("dcol.name"), t("dcol.email"), t("admin.phone"), t("admin.attFilterClass"), t("admin.accountsColStatus")];
  if (!pending.length) {
    var pEmpty = document.createElement("p");
    pEmpty.className = "empty-state";
    pEmpty.textContent = admissions.length ? t("admin.accountsNoPending") : t("admin.attNoAdmissions");
    pendingWrap.appendChild(pEmpty);
  } else {
    var pendingRows = pending.map(function (a) {
      var email = (a.email || "").trim();
      var phone = normalizePhone(a.phone);
      var canCreate = email && EMAIL_RE.test(email) && phone;
      return {
        data: a,
        nameCell: true,
        cells: [
          a.name || t("dash"),
          email || t("dash"),
          phone || (a.phone || t("dash")),
          a.batch || t("dash"),
          accountPendingStatus(a.email, a.phone)
        ],
        canCreate: canCreate
      };
    });
    pendingWrap.appendChild(renderAccountsTable(pendingHeaders.concat([""]), pendingRows, function (row) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-primary btn-sm";
      btn.textContent = t("admin.accountsCreate");
      if (!row.canCreate) {
        btn.disabled = true;
        return btn;
      }
      btn.addEventListener("click", function () { createPortalAccount(row.data, btn); });
      return btn;
    }));
  }

  if (!active.length) {
    var aEmpty = document.createElement("p");
    aEmpty.className = "empty-state";
    aEmpty.textContent = t("admin.accountsNoActive");
    activeWrap.appendChild(aEmpty);
  } else {
    active.forEach(function (s) { appendPortalStudentRow(s, activeWrap); });
  }
}

function createPortalAccount(admissionRow, btn) {
  var note = el("accountsNote");
  var email = String(admissionRow.email || "").trim().toLowerCase();
  var phone = normalizePhone(admissionRow.phone);
  if (!email || !EMAIL_RE.test(email)) {
    if (note) setNote(note, t("admin.accountsNoEmail"), "err");
    return;
  }
  if (!phone) {
    if (note) setNote(note, t("admin.accountsNoPhone"), "err");
    return;
  }
  var msg = t("admin.accountsConfirmCreate")
    .replace("{name}", admissionRow.name || "")
    .replace("{email}", email)
    .replace("{phone}", phone);
  if (!window.confirm(msg)) return;

  if (btn) btn.disabled = true;
  if (note) setNote(note, "", "");

  provisionCreateAuthUser(email, phone, admissionRow.name).then(function (uid) {
    if (!uid) throw new Error("bad-response");
    return setDoc(doc(db, "students", uid), {
      name: admissionRow.name,
      email: email,
      phone: phone,
      batch: admissionRow.batch || "",
      schedule: "",
      provisionedByAdmin: true,
      createdAt: serverTimestamp()
    }).catch(function () { throw new Error("firestore-failed"); });
  }).then(function () {
    if (note) setNote(note, t("admin.accountsCreated"), "ok");
    return loadStudents().then(function () {
      state.admissions = null;
      return ensureAdmissions(true);
    });
  }).then(function () {
    renderPortalAccounts();
    populateStudentSelects();
    updateBroadcastCount();
  }).catch(function (err) {
    var key = portalAccountsErrorKey(err) || "admin.accountsErrCreate";
    if (note) setNote(note, t(key), "err");
    if (btn) btn.disabled = false;
  });
}

function removePortalAccount(student, btn) {
  var note = el("accountsNote");
  var msg = t("admin.accountsConfirmRemove").replace("{name}", student.name || student.email || "");
  if (!window.confirm(msg)) return;

  if (btn) btn.disabled = true;
  if (note) setNote(note, "", "");

  var phone = normalizePhone(student.phone);
  if (!phone) {
    if (note) setNote(note, t("admin.accountsNoPhone"), "err");
    if (btn) btn.disabled = false;
    return;
  }

  provisionDeleteAuthUser(student.email, phone).then(function () {
    return deleteStudentFirestoreData(student.id);
  }).catch(function (err) {
    if (err && err.code === "auth/user-not-found") {
      return deleteStudentFirestoreData(student.id);
    }
    throw err;
  }).then(function () {
    if (note) setNote(note, t("admin.accountsRemoved"), "ok");
    return loadStudents();
  }).then(function () {
    renderPortalAccounts();
    populateStudentSelects();
    updateBroadcastCount();
  }).catch(function (err) {
    var key = portalAccountsErrorKey(err) || "admin.accountsErrRemove";
    if (note) setNote(note, t(key), "err");
    if (btn) btn.disabled = false;
  });
}

function initAccountsTab() {
  state.accountsInit = true;
  loadPortalAccounts();
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

/* ---------------- Daily attendance (Admissions sheet + Google Sheet) ---------------- */

function admissionRowField(r, exactKey, keyPattern) {
  if (!r) return "";
  if (r[exactKey] && String(r[exactKey]).trim()) return String(r[exactKey]).trim();
  var keys = Object.keys(r);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (k === exactKey) continue;
    if (keyPattern.test(k)) {
      var v = String(r[k] || "").trim();
      if (v) return v;
    }
  }
  return "";
}

function buildAttendanceRoster(admissionRows) {
  var seen = {};
  var list = [];
  (admissionRows || []).forEach(function (r) {
    var name = admissionRowField(r, "Name", /name/i);
    if (!name) return;
    var email = admissionRowField(r, "Email", /email/i);
    var mobile = admissionRowField(r, "Mobile", /mobile|whatsapp|phone/i);
    var batch = admissionRowField(r, "Class", /class/i) || admissionRowField(r, "Batch", /batch|timing/i);
    var key = email && email.indexOf("@") > 0
      ? email.toLowerCase()
      : ("name:" + name.toLowerCase() + "|" + mobile);
    if (seen[key]) return;
    seen[key] = true;
    list.push({ name: name, email: email, mobile: mobile, batch: batch });
  });
  return list.sort(function (a, b) { return a.name.localeCompare(b.name); });
}

function rosterAttKey(s) {
  var email = String(s.email || "").trim().toLowerCase();
  if (email && email.indexOf("@") > 0) return email;
  var name = String(s.name || "").trim().toLowerCase();
  var mobile = String(s.mobile || "").trim();
  return "name:" + name + "|" + mobile;
}

function matchRecordToRosterKey(r) {
  var email = String(r.email || "").trim().toLowerCase();
  if (email && email.indexOf("@") > 0) return email;
  var name = String(r.name || "").trim().toLowerCase();
  for (var i = 0; i < state.attendanceRoster.length; i++) {
    var s = state.attendanceRoster[i];
    if (String(s.name || "").trim().toLowerCase() === name) return rosterAttKey(s);
  }
  return "name:" + name;
}

function rosterSheetEmail(s) {
  var email = String(s.email || "").trim();
  return email && email.indexOf("@") > 0 ? email : "";
}

function portalStudentByEmail(email) {
  if (!email || email.indexOf("@") <= 0) return null;
  var lower = email.toLowerCase();
  for (var i = 0; i < state.students.length; i++) {
    if ((state.students[i].email || "").toLowerCase() === lower) return state.students[i];
  }
  return null;
}

function mapRosterPayload(roster) {
  return (roster || []).map(function (r) {
    return {
      name: String((r && r.name) || "").trim(),
      email: String((r && r.email) || "").trim(),
      mobile: String((r && r.mobile) || "").trim(),
      batch: String((r && r.batch) || "").trim()
    };
  }).filter(function (s) { return s.name; });
}

function tryAttendanceRosterApi() {
  return sheetAdminRequest("attendance", { subaction: "roster" })
    .then(function (payload) { return mapRosterPayload(payload.roster); })
    .catch(function () { return []; });
}

function ensureAttendanceRoster(forceRefresh) {
  if (!forceRefresh && state.attendanceRoster.length) {
    return Promise.resolve(state.attendanceRoster);
  }

  return ensureAdmissions(forceRefresh).then(function (rows) {
    state.attendanceRoster = buildAttendanceRoster(rows);
    if (state.attendanceRoster.length) return state.attendanceRoster;
    return tryAttendanceRosterApi().then(function (roster) {
      state.attendanceRoster = roster;
      return state.attendanceRoster;
    });
  }).catch(function (err) {
    state.admissionsError = err && err.message ? err.message : "fetch-failed";
    return tryAttendanceRosterApi().then(function (roster) {
      state.attendanceRoster = roster;
      return state.attendanceRoster;
    });
  });
}

function parseSheetResponse(text) {
  if (!text) throw new Error("empty-response");
  text = String(text).trim();
  if (text.charAt(0) === "{") return JSON.parse(text);
  return parseJsonpText(text);
}

function buildSheetQueryUrl(idToken, action, fields) {
  var parts = ["action=" + encodeURIComponent(action)];
  if (idToken) parts.push("idToken=" + encodeURIComponent(idToken));
  Object.keys(fields || {}).forEach(function (k) {
    parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(fields[k] == null ? "" : String(fields[k])));
  });
  return SHEET_ENDPOINT + "?" + parts.join("&");
}

function sheetFetchGet(idToken, action, fields) {
  var url = buildSheetQueryUrl(idToken, action, fields);
  return fetch(url, { method: "GET", mode: "cors", credentials: "omit", redirect: "follow" })
    .then(function (r) { return r.text(); })
    .then(function (text) { return parseSheetResponse(text); });
}

function sheetJsonpGet(idToken, action, fields) {
  return new Promise(function (resolve, reject) {
    var cbName = "__bccSh_" + Date.now() + "_" + Math.floor(Math.random() * 1e6);
    fields = Object.assign({}, fields || {});
    fields.callback = cbName;
    var url = buildSheetQueryUrl(idToken, action, fields);
    var timer = setTimeout(function () { reject(new Error("timeout")); }, 45000);
    var script = document.createElement("script");

    function cleanup() {
      clearTimeout(timer);
      try { delete window[cbName]; } catch (e) { window[cbName] = undefined; }
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[cbName] = function (payload) {
      cleanup();
      resolve(payload);
    };
    script.onerror = function () { cleanup(); reject(new Error("network")); };
    script.src = url;
    document.head.appendChild(script);
  });
}

function sheetApiRequest(idToken, action, fields) {
  return sheetFetchGet(idToken, action, fields).catch(function () {
    return sheetJsonpGet(idToken, action, fields);
  }).then(function (payload) {
    if (payload && payload.result === "success") return payload;
    throw new Error((payload && (payload.error || payload.message)) || "bad-response");
  });
}

function ensureSheetAdminSession(idToken) {
  if (state.sheetSession && state.sheetSession.expires > Date.now()) {
    return Promise.resolve(state.sheetSession.key);
  }
  return sheetApiRequest(idToken, "attendance", { subaction: "session" }).then(function (payload) {
    state.sheetSession = { key: payload.session, expires: Date.now() + 240000 };
    return payload.session;
  });
}

function sheetAdminRequest(action, fields) {
  return new Promise(function (resolve, reject) {
    var user = auth.currentUser;
    if (!user) { reject(new Error("no-user")); return; }
    user.getIdToken().then(function (idToken) {
      var isAttendanceSave = action === "attendance" && fields && fields.subaction === "savebits";
      if (isAttendanceSave) {
        ensureSheetAdminSession(idToken).then(function (sessionKey) {
          return sheetApiRequest(null, action, {
            subaction: "savebits",
            date: fields.date,
            bits: fields.bits,
            session: sessionKey
          });
        }).catch(function () {
          return sheetApiRequest(idToken, action, fields);
        }).then(resolve).catch(reject);
        return;
      }
      sheetApiRequest(idToken, action, fields).then(resolve).catch(reject);
    }).catch(reject);
  });
}

function getAttClassFilter() {
  var sel = el("attClassFilter");
  return sel && sel.value ? sel.value : "all";
}

function normalizeAttClass(batch) {
  return String(batch || "").trim();
}

function getFilteredAttendanceRoster() {
  var filter = getAttClassFilter();
  if (!filter || filter === "all") return state.attendanceRoster;
  return state.attendanceRoster.filter(function (s) {
    return normalizeAttClass(s.batch) === filter;
  });
}

function populateAttClassFilter() {
  var sel = el("attClassFilter");
  var wrap = sel ? sel.closest(".att-class-filter") : null;
  if (!sel) return;

  var prev = getAttClassFilter();
  var classes = {};
  state.attendanceRoster.forEach(function (s) {
    var c = normalizeAttClass(s.batch);
    if (c) classes[c] = true;
  });
  var list = Object.keys(classes).sort(function (a, b) { return a.localeCompare(b); });

  sel.textContent = "";
  var allOpt = document.createElement("option");
  allOpt.value = "all";
  allOpt.textContent = t("admin.attAllClasses");
  sel.appendChild(allOpt);
  list.forEach(function (c) {
    var opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  });

  if (prev !== "all" && classes[prev]) sel.value = prev;
  else sel.value = "all";

  if (wrap) wrap.classList.toggle("hidden", !state.attendanceRoster.length);
}

function updateAttSummary() {
  var presentEl = el("attStatPresent");
  var absentEl = el("attStatAbsent");
  var totalEl = el("attStatTotal");
  var metaEl = el("attSummaryMeta");
  var present = 0;
  var absent = 0;
  var roster = getFilteredAttendanceRoster();
  roster.forEach(function (s) {
    var rec = state.attendanceMap[rosterAttKey(s)] || { status: "absent" };
    if (rec.status === "absent") absent++;
    else present++;
  });
  if (presentEl) presentEl.textContent = present;
  if (absentEl) absentEl.textContent = absent;
  if (totalEl) totalEl.textContent = roster.length;
  if (metaEl) {
    var filter = getAttClassFilter();
    metaEl.textContent = filter && filter !== "all" ? filter : "";
    metaEl.classList.toggle("hidden", !filter || filter === "all");
  }
}

function setAttPresentAll(present) {
  getFilteredAttendanceRoster().forEach(function (s) {
    var key = rosterAttKey(s);
    state.attendanceMap[key] = state.attendanceMap[key] || { status: "absent", note: "" };
    state.attendanceMap[key].status = present ? "present" : "absent";
  });
  renderAttendanceGrid();
}

function renderAttendanceGrid() {
  var wrap = el("attendanceGridWrap");
  if (!wrap) return;
  wrap.textContent = "";

  if (!state.attendanceRoster.length) {
    var empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = t("admin.attNoAdmissions");
    wrap.appendChild(empty);
    updateAttSummary();
    return;
  }

  populateAttClassFilter();
  var visible = getFilteredAttendanceRoster();
  if (!visible.length) {
    var noClass = document.createElement("p");
    noClass.className = "empty-state";
    noClass.textContent = t("admin.attNoClassMatch");
    wrap.appendChild(noClass);
    updateAttSummary();
    return;
  }

  var table = document.createElement("table");
  table.className = "data-table att-table";
  var thead = document.createElement("thead");
  var htr = document.createElement("tr");
  var thCheck = document.createElement("th");
  thCheck.className = "att-check-col";
  thCheck.textContent = t("admin.attPresent");
  htr.appendChild(thCheck);
  htr.appendChild(cell("th", t("dcol.name")));
  htr.appendChild(cell("th", t("admin.attFilterClass")));
  thead.appendChild(htr);
  table.appendChild(thead);

  var tbody = document.createElement("tbody");
  visible.forEach(function (s) {
    var key = rosterAttKey(s);
    var rec = state.attendanceMap[key] || { status: "absent", note: "" };
    var tr = document.createElement("tr");
    tr.setAttribute("data-att-key", key);

    var tdCheck = document.createElement("td");
    tdCheck.className = "att-check-cell";
    tdCheck.setAttribute("data-label", t("admin.attPresent"));
    var cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "att-present-cb";
    cb.checked = rec.status !== "absent";
    cb.setAttribute("aria-label", t("status.present") + ": " + (s.name || ""));
    cb.addEventListener("change", function () {
      state.attendanceMap[key] = state.attendanceMap[key] || { status: "absent", note: "" };
      state.attendanceMap[key].status = cb.checked ? "present" : "absent";
      tr.classList.toggle("absent-row", !cb.checked);
      updateAttSummary();
    });
    tr.classList.toggle("absent-row", !cb.checked);
    tdCheck.appendChild(cb);
    tr.appendChild(tdCheck);

    var tdName = cell("td", s.name || t("dash"));
    tdName.className = "att-name att-name-cell";
    tdName.setAttribute("data-label", t("dcol.name"));
    tr.appendChild(tdName);
    var tdBatch = cell("td", s.batch || t("dash"));
    tdBatch.className = "att-batch-cell";
    tdBatch.setAttribute("data-label", t("admin.attFilterClass"));
    tr.appendChild(tdBatch);

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

  ensureAttendanceRoster(true).then(function () {
    if (!state.attendanceRoster.length) {
      renderAttendanceGrid();
      if (note && state.admissionsError) {
        setNote(note, t("admin.attErrScript"), "err");
      }
      return;
    }

    state.attendanceMap = {};
    state.attendanceRoster.forEach(function (s) {
      state.attendanceMap[rosterAttKey(s)] = { status: "absent", note: "" };
    });

    return sheetAdminRequest("attendance", { subaction: "get", date: date })
      .then(function (payload) {
        (payload.records || []).forEach(function (r) {
          var key = matchRecordToRosterKey(r);
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
  }).catch(function () {
    state.attendanceRoster = [];
    renderAttendanceGrid();
    if (note) setNote(note, t("admin.attErrScript"), "err");
  });
}

function attendanceBitsFromRoster() {
  return state.attendanceRoster.map(function (s) {
    var rec = state.attendanceMap[rosterAttKey(s)] || { status: "absent" };
    return rec.status === "present" ? "1" : "0";
  }).join("");
}

function saveAttendanceToFirestore(date, records) {
  return setDoc(doc(db, "attendanceDaily", date), {
    date: date,
    records: records,
    bits: attendanceBitsFromRoster(),
    updatedAt: serverTimestamp()
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
  if (!state.attendanceRoster.length) {
    if (note) setNote(note, t("admin.attNoAdmissions"), "err");
    return;
  }

  if (saveBtn) saveBtn.disabled = true;
  if (note) setNote(note, "", "");

  tryAttendanceRosterApi().then(function (serverRoster) {
    if (serverRoster && serverRoster.length) {
      var oldMap = state.attendanceMap;
      state.attendanceRoster = serverRoster;
      var newMap = {};
      serverRoster.forEach(function (s) {
        var key = rosterAttKey(s);
        newMap[key] = oldMap[key] || { status: "absent", note: "" };
      });
      state.attendanceMap = newMap;
    }
    if (!state.attendanceRoster.length) {
      if (note) setNote(note, t("admin.attNoAdmissions"), "err");
      return;
    }

    var records = state.attendanceRoster.map(function (s) {
      var key = rosterAttKey(s);
      var rec = state.attendanceMap[key] || { status: "absent", note: "" };
      return {
        name: s.name || "",
        email: rosterSheetEmail(s),
        batch: s.batch || "",
        status: rec.status === "absent" ? "absent" : "present",
        note: rec.note || ""
      };
    });
    var bits = attendanceBitsFromRoster();

    return sheetAdminRequest("attendance", {
      subaction: "savebits",
      date: date,
      bits: bits
    }).then(function () {
      return { sheetOk: true };
    }).catch(function (sheetErr) {
      return { sheetOk: false, sheetErr: sheetErr };
    }).then(function (result) {
      return saveAttendanceToFirestore(date, records).then(function () {
        return Object.assign(result, { backupOk: true });
      }).catch(function (backupErr) {
        return Object.assign(result, { backupOk: false, backupErr: backupErr });
      });
    }).then(function (result) {
      if (result.sheetOk) {
        if (note) setNote(note, t("admin.attSaved"), "ok");
      } else if (result.backupOk) {
        if (note) setNote(note, t("admin.attSavedSheetWarn"), "ok");
      } else {
        var detail = (result.sheetErr && result.sheetErr.message) ||
          (result.backupErr && result.backupErr.message) || "save-failed";
        throw new Error(detail);
      }
      return ensureStudents().then(function () {
        var portalSync = [];
        state.attendanceRoster.forEach(function (s) {
          var portal = portalStudentByEmail(s.email);
          if (!portal) return;
          var key = rosterAttKey(s);
          var rec = state.attendanceMap[key] || { status: "absent", note: "" };
          portalSync.push(setDoc(doc(db, "students", portal.id, "attendance", date), {
            date: date,
            status: rec.status === "absent" ? "absent" : "present",
            note: rec.note || "",
            updatedAt: serverTimestamp()
          }, { merge: true }));
        });
        return Promise.all(portalSync);
      }).then(function () {
        if (note) setNote(note, t("admin.attSavedPortal"), "ok");
      }).catch(function () {
        if (note) setNote(note, t("admin.attSavedPortalWarn"), "ok");
      });
    });
  }).catch(function (err) {
    var detail = err && err.message ? String(err.message) : "unknown";
    if (note) setNote(note, t("admin.attErrSaveDetail").replace("{detail}", detail), "err");
  }).finally(function () {
    if (saveBtn) saveBtn.disabled = false;
  });
}

function initDailyAttendance() {
  var dateInput = el("attDate");
  var saveBtn = el("attSaveBtn");
  var allP = el("attAllPresent");
  var allA = el("attAllAbsent");
  var classFilter = el("attClassFilter");
  if (!dateInput) return;

  state.attendanceDate = dateInput.value || todayIso();

  dateInput.addEventListener("change", function () {
    state.attendanceDate = dateInput.value;
    loadAttendanceForDate(state.attendanceDate);
  });

  if (classFilter) {
    classFilter.addEventListener("change", function () {
      renderAttendanceGrid();
    });
  }

  if (allP) {
    allP.addEventListener("click", function () { setAttPresentAll(true); });
  }

  if (allA) {
    allA.addEventListener("click", function () { setAttPresentAll(false); });
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
    table.className = "data-table details-table";
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
function buildWhatsAppAnnounceText(title, body) {
  var lines = ["*Bhasme Sir Coaching Center*"];
  if (title) lines.push("", "*" + title + "*");
  if (body) lines.push("", body);
  return lines.join("\n").trim();
}

function whatsAppBroadcastUrl(text) {
  return "https://api.whatsapp.com/send?text=" + encodeURIComponent(text);
}

function openWhatsAppBroadcast(title, body, noteEl) {
  if (!String(title || "").trim() && !String(body || "").trim()) {
    if (noteEl) setNote(noteEl, t("admin.waNeedMessage"), "err");
    return;
  }
  var text = buildWhatsAppAnnounceText(title, body);
  window.open(whatsAppBroadcastUrl(text), "_blank", "noopener,noreferrer");
}

function collectStudentPhones() {
  var seen = {};
  var list = [];
  function add(raw) {
    var p = normalizePhone(raw);
    if (!p || seen[p]) return;
    seen[p] = true;
    list.push(p);
  }
  buildAdmissionAccountList(state.admissions || []).forEach(function (a) { add(a.phone); });
  (state.students || []).forEach(function (s) { add(s.phone); });
  return list.sort();
}

function formatPhonesForCopy(phones) {
  return phones.map(function (p) { return "+91" + p; }).join("\n");
}

function updateWaPhonesPanel() {
  var countEl = el("waPhonesCount");
  if (!countEl) return;
  Promise.all([
    state.admissions ? Promise.resolve() : ensureAdmissions(true),
    state.studentsLoaded ? Promise.resolve() : ensureStudents()
  ]).then(function () {
    var phones = collectStudentPhones();
    if (!phones.length) setNote(countEl, t("admin.waPhonesNone"), "");
    else setNote(countEl, t("admin.waPhonesCount").replace("{n}", phones.length), "");
  }).catch(function () {
    setNote(countEl, t("admin.waPhonesNone"), "");
  });
}

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
      var actions = document.createElement("div");
      actions.className = "announce-item-actions";
      var waBtn = document.createElement("button");
      waBtn.type = "button";
      waBtn.className = "btn btn-whatsapp btn-sm";
      waBtn.textContent = t("admin.waShare");
      waBtn.addEventListener("click", function () {
        openWhatsAppBroadcast(a.title || "", a.body || "", null);
      });
      var del = makeDeleteBtn(function () { return deleteDoc(doc(db, "announcements", a.id)); }, renderAnnouncements);
      actions.appendChild(waBtn);
      actions.appendChild(del);
      item.appendChild(h);
      item.appendChild(time);
      item.appendChild(body);
      item.appendChild(actions);
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
      tab.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
      if (name === "attendance") {
        loadAttendanceForDate(state.attendanceDate || todayIso());
      }
      if (name === "accounts" && !state.accountsInit) {
        initAccountsTab();
      } else if (name === "accounts") {
        renderPortalAccounts();
      }
      if (name === "announcements") {
        updateWaPhonesPanel();
      }
      if (name === "fees") {
        if (!state.studentFeesInit) initStudentFeesTab();
        else renderStudentFeesTable();
      }
    });
  });
}

/* ---------------- Student fees (admin only) ---------------- */
function studentFeesDocId(studentKey) {
  return String(studentKey || "").replace(/\//g, "_").slice(0, 200);
}

function planLabel(plan) {
  var p = PAYMENT_PLANS.filter(function (x) { return x.value === plan; })[0];
  if (!p) return plan;
  return lang === "mr" ? p.labelMr : p.labelEn;
}

function loadAllStudentFees() {
  return getDocs(collection(db, "studentFees")).then(function (qs) {
    var map = {};
    qs.forEach(function (d) {
      map[d.id] = normalizeStudentFeesRecord(d.data(), null);
    });
    state.studentFeesMap = map;
    return map;
  });
}

function renderFeesReference() {
  var wrap = el("feesRefWrap");
  if (!wrap) return;
  wrap.innerHTML = "<h3 class=\"accounts-subtitle\">" + t("admin.feesRefTitle") + "</h3>" + defaultRatesReferenceHtml(lang);
}

function getFeesSearchQuery() {
  var input = el("feesSearch");
  return input ? String(input.value || "").trim().toLowerCase() : "";
}

function getFeesClassFilter() {
  var sel = el("feesClassFilter");
  return sel && sel.value ? sel.value : "all";
}

function getFeesStatusFilter() {
  var sel = el("feesStatusFilter");
  return sel && sel.value ? sel.value : "all";
}

function studentFeesRecordFor(student) {
  var key = rosterAttKey(student);
  var docId = studentFeesDocId(key);
  var saved = state.studentFeesMap[docId];
  return {
    key: key,
    docId: docId,
    saved: saved,
    record: saved || normalizeStudentFeesRecord({}, student),
    hasSaved: !!saved
  };
}

function studentMatchesFeesSearch(student, query) {
  if (!query) return true;
  var hay = [
    student.name,
    student.email,
    student.mobile,
    student.batch
  ].join(" ").toLowerCase();
  return hay.indexOf(query) >= 0;
}

function studentMatchesFeesClassFilter(student, filter) {
  if (!filter || filter === "all") return true;
  var info = studentFeesRecordFor(student);
  var batch = normalizeAttClass(student.batch);
  var classKey = info.record.classKey || detectClassKey(student.batch);
  return batch === filter || classKey === filter;
}

function studentMatchesFeesStatusFilter(student, filter) {
  if (!filter || filter === "all") return true;
  var info = studentFeesRecordFor(student);
  if (filter === "recorded") return info.hasSaved;
  if (filter === "pending") return !info.hasSaved;
  if (filter === "balance") return info.hasSaved && info.record.balance > 0;
  return true;
}

function getFilteredFeesRoster(roster) {
  roster = roster || state.attendanceRoster || [];
  var query = getFeesSearchQuery();
  var classFilter = getFeesClassFilter();
  var statusFilter = getFeesStatusFilter();
  return roster.filter(function (student) {
    return studentMatchesFeesSearch(student, query) &&
      studentMatchesFeesClassFilter(student, classFilter) &&
      studentMatchesFeesStatusFilter(student, statusFilter);
  });
}

function populateFeesClassFilter() {
  var sel = el("feesClassFilter");
  if (!sel) return;

  var prev = getFeesClassFilter();
  var classes = {};
  state.attendanceRoster.forEach(function (s) {
    var batch = normalizeAttClass(s.batch);
    if (batch) classes[batch] = true;
    var ck = detectClassKey(s.batch);
    if (ck) classes[ck] = true;
  });
  var list = Object.keys(classes).sort(function (a, b) { return a.localeCompare(b); });

  sel.textContent = "";
  var allOpt = document.createElement("option");
  allOpt.value = "all";
  allOpt.textContent = t("admin.attAllClasses");
  sel.appendChild(allOpt);
  list.forEach(function (c) {
    var opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  });

  if (prev !== "all" && classes[prev]) sel.value = prev;
  else sel.value = "all";
}

function updateFeesFilterMeta(shown, total) {
  var meta = el("feesFilterMeta");
  if (!meta) return;
  if (!total) {
    setNote(meta, "", "");
    return;
  }
  if (shown === total && !getFeesSearchQuery() && getFeesClassFilter() === "all" && getFeesStatusFilter() === "all") {
    setNote(meta, "", "");
    return;
  }
  setNote(meta, t("admin.feesFilterMeta").replace("{n}", shown).replace("{total}", total), "");
}

function buildFeesReportBody(roster) {
  var lines = [
    "Bhasme Sir Coaching Center — Student Fees Report",
    "Generated: " + new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
    ""
  ];

  var query = getFeesSearchQuery();
  var classFilter = getFeesClassFilter();
  var statusFilter = getFeesStatusFilter();
  if (query || classFilter !== "all" || statusFilter !== "all") {
    lines.push("Filters:");
    if (query) lines.push("  Search: " + query);
    if (classFilter !== "all") lines.push("  Class: " + classFilter);
    if (statusFilter !== "all") lines.push("  Status: " + statusFilter);
    lines.push("");
  }

  lines.push(
    "Name | Class | Plan | Course | Paid | Balance | Status | Payment date | Receipt | Email | Mobile"
  );

  var totalCourse = 0;
  var totalPaid = 0;
  var totalBalance = 0;

  roster.forEach(function (student) {
    var info = studentFeesRecordFor(student);
    var r = info.record;
    var classLabel = r.classKey || detectClassKey(student.batch) || normalizeAttClass(student.batch) || "—";
    var plan = info.hasSaved ? planLabel(r.paymentPlan) : "—";
    var course = info.hasSaved ? r.courseFee : 0;
    var paid = info.hasSaved ? r.amountPaid : 0;
    var balance = info.hasSaved ? r.balance : 0;
    var status = info.hasSaved ? t("admin.feesStatusSet") : t("admin.feesStatusPending");

    if (info.hasSaved) {
      totalCourse += course;
      totalPaid += paid;
      totalBalance += balance;
    }

    lines.push([
      student.name || "—",
      classLabel,
      plan,
      info.hasSaved ? formatRupee(course) : "—",
      info.hasSaved ? formatRupee(paid) : "—",
      info.hasSaved ? formatRupee(balance) : "—",
      status,
      r.paymentDate || "—",
      r.receiptNo || "—",
      student.email || "—",
      student.mobile || "—"
    ].join(" | "));
  });

  lines.push("");
  lines.push("Totals (recorded fees only):");
  lines.push("  Course fee: " + formatRupee(totalCourse));
  lines.push("  Amount paid: " + formatRupee(totalPaid));
  lines.push("  Balance due: " + formatRupee(totalBalance));
  lines.push("");
  lines.push("—");
  lines.push("Bhasme Sir Coaching Center");
  return lines.join("\n");
}

function sendFeesReportEmail() {
  var note = el("studentFeesNote");
  var roster = getFilteredFeesRoster();
  if (!roster.length) {
    if (note) setNote(note, t("admin.feesReportEmpty"), "err");
    return;
  }

  var confirmMsg = t("admin.feesReportConfirm").replace("{n}", roster.length);
  if (!window.confirm(confirmMsg)) return;

  var btn = el("feesEmailReportBtn");
  if (btn) btn.disabled = true;
  if (note) setNote(note, t("admin.feesReportSending"), "");

  var subject = t("admin.feesReportSubject").replace("{n}", roster.length);
  var body = buildFeesReportBody(roster);
  var user = auth.currentUser;

  Promise.resolve(user ? user.getIdToken() : Promise.reject(new Error("no-user")))
    .then(function (idToken) {
      var params = new URLSearchParams();
      params.append("action", "broadcast");
      params.append("idToken", idToken);
      params.append("subject", subject);
      params.append("body", body);
      params.append("audience", "registered");
      params.append("recipients", ADMIN_REPORT_EMAIL);
      params.append("lang", lang);
      return fetch(SHEET_ENDPOINT, { method: "POST", body: params, mode: "no-cors", keepalive: true });
    })
    .then(function () {
      if (note) setNote(note, t("admin.feesReportSent"), "ok");
    })
    .catch(function () {
      if (note) setNote(note, t("admin.feesReportErr"), "err");
    })
    .finally(function () {
      if (btn) btn.disabled = false;
    });
}

function bindStudentFeesFilters() {
  if (state.studentFeesFiltersBound) return;
  state.studentFeesFiltersBound = true;

  var search = el("feesSearch");
  var classFilter = el("feesClassFilter");
  var statusFilter = el("feesStatusFilter");
  var reportBtn = el("feesEmailReportBtn");

  function onFilterChange() {
    if (state.studentFeesEditing) state.studentFeesEditing = null;
    renderStudentFeesTable();
  }

  if (search) {
    search.addEventListener("input", onFilterChange);
    search.addEventListener("search", onFilterChange);
  }
  if (classFilter) classFilter.addEventListener("change", onFilterChange);
  if (statusFilter) statusFilter.addEventListener("change", onFilterChange);
  if (reportBtn) reportBtn.addEventListener("click", sendFeesReportEmail);
}

function buildStudentFeesEditor(student, record, onSaved) {
  var editor = document.createElement("div");
  editor.className = "student-fees-editor";

  var classKey = record.classKey || detectClassKey(student.batch) || "10th";
  var plan = record.paymentPlan || "onetime";

  function field(label, input) {
    var wrap = document.createElement("div");
    wrap.className = "field";
    var lab = document.createElement("label");
    lab.textContent = label;
    wrap.appendChild(lab);
    wrap.appendChild(input);
    return wrap;
  }

  var classSel = document.createElement("select");
  ["8th", "9th", "10th"].forEach(function (k) {
    var opt = document.createElement("option");
    opt.value = k;
    opt.textContent = k;
    if (k === classKey) opt.selected = true;
    classSel.appendChild(opt);
  });

  var planSel = document.createElement("select");
  PAYMENT_PLANS.forEach(function (p) {
    var opt = document.createElement("option");
    opt.value = p.value;
    opt.textContent = lang === "mr" ? p.labelMr : p.labelEn;
    if (p.value === plan) opt.selected = true;
    planSel.appendChild(opt);
  });

  var courseIn = document.createElement("input");
  courseIn.type = "number";
  courseIn.min = "0";
  courseIn.step = "100";
  courseIn.value = String(record.courseFee || suggestCourseFee(classKey, plan));

  var regIn = document.createElement("input");
  regIn.type = "number";
  regIn.min = "0";
  regIn.step = "50";
  regIn.value = String(record.registrationFee || DEFAULT_REGISTRATION_FEE);

  var paidIn = document.createElement("input");
  paidIn.type = "number";
  paidIn.min = "0";
  paidIn.step = "100";
  paidIn.value = String(record.amountPaid || 0);

  var balanceOut = document.createElement("input");
  balanceOut.type = "text";
  balanceOut.readOnly = true;
  balanceOut.className = "fees-balance-readonly";

  function refreshBalance() {
    balanceOut.value = formatRupee(computeBalance(courseIn.value, paidIn.value));
  }

  function applySuggest() {
    courseIn.value = String(suggestCourseFee(classSel.value, planSel.value));
    refreshBalance();
  }

  classSel.addEventListener("change", applySuggest);
  planSel.addEventListener("change", applySuggest);
  courseIn.addEventListener("input", refreshBalance);
  paidIn.addEventListener("input", refreshBalance);
  refreshBalance();

  var dateIn = document.createElement("input");
  dateIn.type = "date";
  dateIn.value = record.paymentDate || "";

  var receiptIn = document.createElement("input");
  receiptIn.type = "text";
  receiptIn.value = record.receiptNo || "";

  var noteIn = document.createElement("textarea");
  noteIn.rows = 2;
  noteIn.value = record.note || "";

  var suggestBtn = document.createElement("button");
  suggestBtn.type = "button";
  suggestBtn.className = "btn btn-outline btn-sm";
  suggestBtn.textContent = t("admin.feesApplySuggest");
  suggestBtn.addEventListener("click", applySuggest);

  var grid = document.createElement("div");
  grid.className = "student-fees-form-grid";
  grid.appendChild(field(t("admin.feesColClass"), classSel));
  grid.appendChild(field(t("admin.feesColPlan"), planSel));
  grid.appendChild(field(t("admin.feesColCourse"), courseIn));
  grid.appendChild(field(t("admin.feesReg"), regIn));
  grid.appendChild(field(t("admin.feesAmountPaid"), paidIn));
  grid.appendChild(field(t("admin.feesColBalance"), balanceOut));
  grid.appendChild(field(t("admin.feesPaymentDate"), dateIn));
  grid.appendChild(field(t("admin.feesReceipt"), receiptIn));
  var noteField = field(t("admin.feesNoteField"), noteIn);
  noteField.classList.add("full");
  grid.appendChild(noteField);

  var actions = document.createElement("div");
  actions.className = "actions";
  actions.appendChild(suggestBtn);
  var saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "btn btn-primary btn-sm";
  saveBtn.textContent = t("admin.feesSave");
  var note = document.createElement("p");
  note.className = "admin-note";
  actions.appendChild(saveBtn);

  saveBtn.addEventListener("click", function () {
    var key = rosterAttKey(student);
    var payload = normalizeStudentFeesRecord({
      studentKey: key,
      name: student.name,
      email: student.email,
      mobile: student.mobile,
      classKey: classSel.value,
      paymentPlan: planSel.value,
      courseFee: courseIn.value,
      registrationFee: regIn.value,
      amountPaid: paidIn.value,
      paymentDate: dateIn.value,
      receiptNo: receiptIn.value,
      note: noteIn.value
    }, student);

    saveBtn.disabled = true;
    setDoc(doc(db, "studentFees", studentFeesDocId(key)), Object.assign({}, payload, { updatedAt: serverTimestamp() }))
      .then(function () {
        state.studentFeesMap[studentFeesDocId(key)] = payload;
        setNote(note, t("admin.feesSaved"), "ok");
        if (onSaved) onSaved();
      })
      .catch(function () {
        setNote(note, t("admin.feesErr"), "err");
      })
      .finally(function () {
        saveBtn.disabled = false;
      });
  });

  editor.appendChild(grid);
  editor.appendChild(actions);
  editor.appendChild(note);
  return editor;
}

function renderStudentFeesTable() {
  var wrap = el("studentFeesWrap");
  if (!wrap) return;

  renderFeesReference();
  populateFeesClassFilter();
  bindStudentFeesFilters();

  ensureAttendanceRoster(true).then(function (roster) {
    if (!roster.length) {
      wrap.innerHTML = "<p class=\"empty-state\">" + t("admin.feesNoStudents") + "</p>";
      updateFeesFilterMeta(0, 0);
      return;
    }

    var filtered = getFilteredFeesRoster(roster);
    updateFeesFilterMeta(filtered.length, roster.length);

    if (!filtered.length) {
      wrap.innerHTML = "<p class=\"empty-state\">" + t("admin.feesFilterNone") + "</p>";
      return;
    }

    var table = document.createElement("table");
    table.className = "data-table student-fees-table";
    var thead = document.createElement("thead");
    thead.innerHTML =
      "<tr><th>" + t("admin.feesColName") + "</th>" +
      "<th>" + t("admin.feesColClass") + "</th>" +
      "<th>" + t("admin.feesColPlan") + "</th>" +
      "<th>" + t("admin.feesColCourse") + "</th>" +
      "<th>" + t("admin.feesColPaid") + "</th>" +
      "<th>" + t("admin.feesColBalance") + "</th>" +
      "<th>" + t("admin.feesColStatus") + "</th>" +
      "<th>" + t("admin.feesColAction") + "</th></tr>";
    table.appendChild(thead);

    var tbody = document.createElement("tbody");
    filtered.forEach(function (student) {
      var key = rosterAttKey(student);
      var docId = studentFeesDocId(key);
      var saved = state.studentFeesMap[docId];
      var record = saved || normalizeStudentFeesRecord({}, student);
      var hasSaved = !!saved;

      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td class=\"att-name\">" + (student.name || "—") + "</td>" +
        "<td>" + (record.classKey || detectClassKey(student.batch) || "—") + "</td>" +
        "<td>" + (hasSaved ? planLabel(record.paymentPlan) : "—") + "</td>" +
        "<td>" + (hasSaved ? formatRupee(record.courseFee) : "—") + "</td>" +
        "<td>" + (hasSaved ? formatRupee(record.amountPaid) : "—") + "</td>" +
        "<td>" + (hasSaved ? formatRupee(record.balance) : "—") + "</td>" +
        "<td><span class=\"fees-status " + (hasSaved ? "set" : "pending") + "\">" +
        t(hasSaved ? "admin.feesStatusSet" : "admin.feesStatusPending") + "</span></td>";

      var tdAct = document.createElement("td");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-outline btn-sm";
      btn.textContent = t("admin.feesEdit");
      tdAct.appendChild(btn);
      tr.appendChild(tdAct);

      var editorRow = document.createElement("tr");
      editorRow.className = "student-fees-editor-row hidden";
      var editorCell = document.createElement("td");
      editorCell.colSpan = 8;
      editorRow.appendChild(editorCell);

      btn.addEventListener("click", function () {
        var open = !editorRow.classList.contains("hidden");
        tbody.querySelectorAll(".student-fees-editor-row").forEach(function (r) {
          r.classList.add("hidden");
        });
        if (open) {
          editorRow.classList.add("hidden");
          state.studentFeesEditing = null;
          return;
        }
        editorCell.innerHTML = "";
        editorCell.appendChild(buildStudentFeesEditor(student, record, function () {
          editorRow.classList.add("hidden");
          renderStudentFeesTable();
        }));
        editorRow.classList.remove("hidden");
        state.studentFeesEditing = key;
      });

      tbody.appendChild(tr);
      tbody.appendChild(editorRow);
    });

    table.appendChild(tbody);
    wrap.innerHTML = "";
    wrap.appendChild(table);
  }).catch(function () {
    wrap.innerHTML = "<p class=\"empty-state\">" + t("admin.feesErrLoad") + "</p>";
  });
}

function initStudentFeesTab() {
  if (state.studentFeesInit) return;
  state.studentFeesInit = true;

  var note = el("studentFeesNote");
  if (note) setNote(note, "", "");

  Promise.all([loadAllStudentFees(), ensureAttendanceRoster(false)])
    .then(function () { renderStudentFeesTable(); })
    .catch(function () {
      if (note) setNote(note, t("admin.feesErrLoad"), "err");
      renderStudentFeesTable();
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

  var waBtn = el("annWhatsAppBtn");
  if (waBtn) {
    waBtn.addEventListener("click", function () {
      openWhatsAppBroadcast(form.elements.title.value.trim(), form.elements.body.value.trim(), note);
    });
  }

  var copyBtn = el("waPhonesCopyBtn");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var notePhones = el("waPhonesNote");
      var phones = collectStudentPhones();
      if (!phones.length) {
        if (notePhones) setNote(notePhones, t("admin.waPhonesNone"), "err");
        return;
      }
      var text = formatPhonesForCopy(phones);
      function done() {
        if (notePhones) setNote(notePhones, t("admin.waPhonesCopied").replace("{n}", phones.length), "ok");
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () {
          window.prompt(t("admin.waPhonesCopy"), text);
          done();
        });
      } else {
        window.prompt(t("admin.waPhonesCopy"), text);
        done();
      }
    });
  }

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
var BATCH_START_EMAIL = {
  subject: "Batch starts 10 July 2026 | बैच १० जुलै पासून सुरू",
  body: [
    "Dear Student / प्रिय विद्यार्थी,",
    "",
    "We are pleased to inform you that classes at Bhasme Sir Coaching Center will begin from Thursday, 10th July 2026.",
    "",
    "आपल्या माहितीसाठी — भास्मे सर कोचिंग सेंटरचे वर्ग १० जुलै २०२६ (गुरुवार) पासून सुरू होणार आहेत.",
    "",
    "Please remember:",
    "• Join on time as per your allotted batch",
    "• Bring notebook, pen, and school textbooks",
    "• Student portal login: your admission email · password: 10-digit mobile (without +91)",
    "",
    "कृपया लक्षात ठेवा:",
    "• नेमून दिलेल्या बैच वेळेनुसार वेळेवर या",
    "• वही, पेन आणि शालेय पुस्तके सोबत आणा",
    "• पोर्टल लॉगिन: प्रवेश अर्जातील ईमेल · पासवर्ड: १० अंकी मोबाईल (+91 वगळून)",
    "",
    "For questions, WhatsApp us: +91 70585 05983",
    "",
    "कोणत्याही प्रश्नासाठी WhatsApp: +91 70585 05983",
    "",
    "We look forward to seeing you on 10th July!",
    "",
    "१० जुलै रोजी भेटू अशी आशा!"
  ].join("\n")
};

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

// Which recipient list is selected: "portal" | "sheet" | "both".
function getAudience() {
  var form = el("broadcastForm");
  if (!form || !form.elements || !form.elements.audience) return "portal";
  return form.elements.audience.value || "portal";
}

function broadcastAudienceForServer(audience) {
  if (audience === "portal") return "registered";
  return audience;
}

function updateBroadcastCount() {
  var node = el("broadcastCount");
  if (!node) return;
  var audience = getAudience();
  var recipients = collectRecipients();
  if (audience === "admissions") {
    setNote(node, t("admin.bcCountAdmissions"), "");
    return;
  }
  if (audience === "sheet") {
    setNote(node, t("admin.bcCountSheet"), "");
    return;
  }
  if (audience === "all") {
    setNote(node, t("admin.bcCountAll").replace("{n}", recipients.length), "");
    return;
  }
  if (audience === "both") {
    setNote(node, t("admin.bcCountBoth").replace("{n}", recipients.length), "");
    return;
  }
  // portal students with login
  if (!recipients.length) {
    setNote(node, t("admin.bcNoRecipients"), "");
    return;
  }
  setNote(node, t("admin.bcCount").replace("{n}", recipients.length).replace("{total}", state.students.length), "");
}

function applyBatchStartEmailTemplate() {
  var form = el("broadcastForm");
  if (!form) return;
  form.elements.subject.value = BATCH_START_EMAIL.subject;
  form.elements.body.value = BATCH_START_EMAIL.body;
  var admRadio = form.querySelector('input[name="audience"][value="admissions"]');
  if (admRadio) admRadio.checked = true;
  updateBroadcastCount();
}

function initBroadcastForm() {
  var form = el("broadcastForm");
  var note = el("broadcastNote");
  if (!form) return;

  var templateBtn = el("bcTemplateBatch");
  if (templateBtn) {
    templateBtn.addEventListener("click", applyBatchStartEmailTemplate);
  }

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

    // Only "portal" requires client-collected emails; sheet/admissions/all let the
    // server pull contacts from Google Sheets.
    if (audience === "portal" && !recipients.length) {
      setNote(note, t("admin.bcNoRecipients"), "err");
      return;
    }

    var confirmMsg;
    if (audience === "admissions") confirmMsg = t("admin.bcConfirmAdmissions");
    else if (audience === "sheet") confirmMsg = t("admin.bcConfirmSheet");
    else if (audience === "all") confirmMsg = t("admin.bcConfirmAll").replace("{n}", recipients.length);
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
        params.append("audience", broadcastAudienceForServer(audience));
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
        if (audience === "admissions") okMsg = t("admin.bcQueuedAdmissions");
        else if (audience === "sheet") okMsg = t("admin.bcQueuedSheet");
        else if (audience === "all") okMsg = t("admin.bcQueuedAll");
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

function ensureAdmissions(forceRefresh) {
  if (!forceRefresh && state.admissions) return Promise.resolve(state.admissions);
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
  table.className = "data-table details-table";
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
  var src = state.detailsSource || "admission";
  setDetailsLoading();

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

  ensureAdmissions().then(function (adm) {
    if (state.detailsSource !== "admission") return;
    showDetailsTable(admissionHeaders(), buildAdmissionRows(adm));
  }).catch(function (err) {
    if (state.detailsSource !== "admission") return;
    setDetailsError(err, "admission");
  });
}

function sheetTabDescription(role) {
  if (role === "admissions") return t("admin.sheetsDescAdmissions");
  if (role === "attendance") return t("admin.sheetsDescAttendance");
  if (role === "enquiry") return t("admin.sheetsDescEnquiry");
  return t("dash");
}

function sheetLinkButton(href, label, className) {
  var a = document.createElement("a");
  a.className = className || "btn btn-outline btn-sm";
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = label;
  return a;
}

function ensureSheetLinks(force) {
  if (!force && state.sheetLinks) return Promise.resolve(state.sheetLinks);
  if (!force && state.sheetLinksError) return Promise.reject(new Error(state.sheetLinksError));
  return sheetAdminRequest("sheets", {}).then(function (payload) {
    state.sheetLinks = payload;
    state.sheetLinksError = null;
    return payload;
  }).catch(function (err) {
    state.sheetLinksError = err && err.message ? err.message : "fetch-failed";
    throw err;
  });
}

function renderSheetLinks() {
  var toolbar = el("sheetLinksToolbar");
  var wrap = el("sheetLinksWrap");
  var note = el("sheetLinksNote");
  if (!toolbar || !wrap) return;

  if (state.sheetLinksError) {
    toolbar.textContent = "";
    wrap.textContent = "";
    var err = document.createElement("p");
    err.className = "empty-state";
    err.textContent = t("admin.sheetsErr");
    wrap.appendChild(err);
    if (note) setNote(note, "", "");
    return;
  }

  var data = state.sheetLinks;
  if (!data || !data.tabs) {
    toolbar.innerHTML = "<p class=\"empty-state\">" + t("admin.sheetsLoading") + "</p>";
    wrap.innerHTML = "<p class=\"empty-state\">" + t("admin.sheetsLoading") + "</p>";
    return;
  }

  toolbar.textContent = "";
  var actions = document.createElement("div");
  actions.className = "sheet-links-actions";
  if (data.spreadsheetUrl) {
    actions.appendChild(sheetLinkButton(data.spreadsheetUrl, t("admin.sheetsOpenFull"), "btn btn-primary btn-sm"));
  }
  if (data.xlsxUrl) {
    actions.appendChild(sheetLinkButton(data.xlsxUrl, t("admin.sheetsDownloadXlsx"), "btn btn-outline btn-sm"));
  }
  toolbar.appendChild(actions);
  if (data.spreadsheetName) {
    var title = document.createElement("p");
    title.className = "sheet-links-name";
    title.textContent = data.spreadsheetName;
    toolbar.appendChild(title);
  }

  var headers = [
    t("admin.sheetsColTab"),
    t("admin.sheetsColAbout"),
    t("admin.sheetsColOpen"),
    t("admin.sheetsColDownload")
  ];
  var table = document.createElement("table");
  table.className = "data-table sheet-links-table";
  var thead = document.createElement("thead");
  var htr = document.createElement("tr");
  headers.forEach(function (h) { htr.appendChild(cell("th", h)); });
  thead.appendChild(htr);
  table.appendChild(thead);

  var tbody = document.createElement("tbody");
  data.tabs.forEach(function (tab) {
    var tr = document.createElement("tr");
    var tdName = cell("td", tab.name || t("dash"));
    tdName.setAttribute("data-label", t("admin.sheetsColTab"));
    tr.appendChild(tdName);

    var tdDesc = cell("td", sheetTabDescription(tab.role));
    tdDesc.setAttribute("data-label", t("admin.sheetsColAbout"));
    tr.appendChild(tdDesc);

    var tdOpen = document.createElement("td");
    tdOpen.setAttribute("data-label", t("admin.sheetsColOpen"));
    if (tab.openUrl) tdOpen.appendChild(sheetLinkButton(tab.openUrl, t("admin.sheetsOpenTab"), "btn btn-outline btn-sm"));
    tr.appendChild(tdOpen);

    var tdDl = document.createElement("td");
    tdDl.setAttribute("data-label", t("admin.sheetsColDownload"));
    if (tab.csvUrl) tdDl.appendChild(sheetLinkButton(tab.csvUrl, t("admin.sheetsDownloadCsv"), "btn btn-outline btn-sm"));
    tr.appendChild(tdDl);

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  wrap.textContent = "";
  wrap.appendChild(table);
  if (note) setNote(note, "", "");
}

function initDetailsTab() {
  var sel = el("detailsSource");
  if (!sel) return;
  state.detailsSource = sel.value || "admission";
  state.detailsInit = true;
  sel.addEventListener("change", function () {
    state.detailsSource = sel.value || "admission";
    renderDetails();
  });
  renderDetails();
  ensureSheetLinks(false).then(function () {
    renderSheetLinks();
  }).catch(function () {
    renderSheetLinks();
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
    initDailyAttendance();
    initResultForm();
    initAnnounceForm();
    initBroadcastForm();
    initDetailsTab();
    initStudentFeesTab();
    updateWaPhonesPanel();

    loadStudents().then(function () {
      populateStudentSelects();
      updateBroadcastCount();
      loadAttendanceForDate(state.attendanceDate || todayIso());
      initAccountsTab();
    }).catch(function () { initAccountsTab(); });

    renderAnnouncements();
  }).catch(function () {
    // If the admin check itself fails (e.g., rules/network), treat as not authorized.
    var loading = el("loadingView");
    if (loading) loading.classList.add("hidden");
    var denied = el("deniedView");
    if (denied) denied.classList.remove("hidden");
  });
});
