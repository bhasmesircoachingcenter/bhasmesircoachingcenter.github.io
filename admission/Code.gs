/**
 * Bhasme Sir Coaching Center — complete Apps Script
 * Replace ALL code in Extensions → Apps Script with this file, then Save.
 *
 * After paste:
 * 1. Deploy → Manage deployments → Edit → New version → Deploy  (REQUIRED for Attendance + Portal Accounts)
 * 2. Run createAdmissionGoogleForm only if you need a new Google Form
 *    — OR run updateAdmissionFormFieldSettings to fix optional/required on an existing form
 *
 * If Extensions → Apps Script fails in the sheet ("unable to open the file"):
 * 1. Go to https://script.google.com → New project
 * 2. Paste this file, set SPREADSHEET_ID below, Save, Deploy as Web App
 */

var HEADERS      = ['Timestamp','Name','Phone','Email','Purpose','Course','Message','Language'];
var ADMIN_EMAIL  = 'bhasmesircoachingcenter@gmail.com';
var CENTER_NAME  = 'Bhasme Sir Coaching Center';
var CENTER_PHONE = '+91 70585 05983';
var PORTAL_LOGIN_URL = 'https://bhasmesircoachingcenter.github.io/login.html';
var PORTAL_AUTH_EMAIL_SUFFIX = '@portal.bhasmesircoaching.in';

/** Student Data spreadsheet — required when editing at script.google.com (not from sheet menu). */
var SPREADSHEET_ID = '1ijqvgYtJI5DCJ8iQ85ECFaIGwIn0AHBBk4WjLEby_TU';

function coachingSpreadsheet_() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

// Public Firebase Web API key (same one already in your website config — safe to expose).
var FIREBASE_API_KEY = 'AIzaSyCtBI44MxfvqycVO7gaNbeitaMAYyYOIs8';
var ADMIN_EMAILS = ['bhasmesircoachingcenter@gmail.com'];

// ---------- Admission Google Form ----------
var ADMISSION_SHEET_NAME = 'Admissions';
var ADMISSION_FORM_TITLE = 'Bhasme Sir Coaching Center — Admission Form';
var ATTENDANCE_SHEET_NAME = 'Attendance';
var ATTENDANCE_HEADERS = ['Date', 'Name', 'Email', 'Batch', 'Status', 'Note', 'Updated'];
var ATTENDANCE_HEADER_LABELS = [
  'Date (दिनांक)',
  'Student Name (विद्यार्थी)',
  'Email',
  'Class / Batch (इयत्ता)',
  'Attendance (हजेरी)',
  'Remark (टिप्पणी)',
  'Last Saved'
];

/** Rows 2…getLastRow(); Apps Script getRange 3rd arg is numRows, not end row. */
function sheetNumDataRows_(sheet) {
  var last = sheet.getLastRow();
  return last >= 2 ? last - 1 : 0;
}

function readSheetData_(sheet, minCols) {
  var numRows = sheetNumDataRows_(sheet);
  if (!numRows) return [];
  var lastCol = Math.max(sheet.getLastColumn(), minCols || 1);
  return sheet.getRange(2, 1, numRows, lastCol).getValues();
}

var ADMISSION_Q = {
  NAME: 'Student Full Name (as per school record)',
  DOB: 'Date of Birth',
  AGE: 'Age',
  GENDER: 'Gender',
  SCHOOL: 'School Name & Address',
  CLASS: 'Class applying for',
  MARKS: 'Last year Maths marks (%)',
  MEDIUM: 'Medium of instruction',
  FATHER: "Father's / Guardian's Name",
  MOTHER: "Mother's Name",
  OCCUPATION: 'Occupation',
  MOBILE: 'Mobile (WhatsApp)',
  ALT_MOBILE: 'Alternate Mobile',
  EMAIL: 'Email',
  ADDRESS: 'Residential Address',
  BATCH: 'Preferred batch timing',
  REFERRAL: 'How did you hear about us?',
  NOTE: 'Any special note (optional)',
  FEE_PLAN: 'Fee payment preference',
  PAY_MODE: 'Preferred payment mode'
};

// ==================== HTTP handlers ====================

/** Safe decode for form-urlencoded POST parts (bad % sequences must not crash doPost). */
function safeDecodeUriComponent_(s) {
  try {
    return decodeURIComponent(String(s || '').replace(/\+/g, ' '));
  } catch (err) {
    return String(s || '').replace(/\+/g, ' ');
  }
}

/** Merge query + POST body fields (Apps Script sometimes omits POST from e.parameter). */
function parseRequestParams_(e) {
  var p = {};
  if (e && e.parameter) {
    Object.keys(e.parameter).forEach(function (k) {
      p[k] = e.parameter[k];
    });
  }
  if (e && e.postData && e.postData.contents) {
    var ctype = String(e.postData.type || '').toLowerCase();
    var raw = String(e.postData.contents);
    var formEncoded = ctype.indexOf('application/x-www-form-urlencoded') >= 0 ||
      (!ctype && raw.indexOf('=') >= 0);
    if (formEncoded) {
      raw.split('&').forEach(function (part) {
        if (!part) return;
        var eq = part.indexOf('=');
        if (eq < 0) return;
        var key = safeDecodeUriComponent_(part.slice(0, eq));
        var val = safeDecodeUriComponent_(part.slice(eq + 1));
        p[key] = val;
      });
    }
  }
  return p;
}

function doPost(e) {
  var p = parseRequestParams_(e);
  var action = String(p.action || '').toLowerCase();
  if (action === 'broadcast') return handleBroadcast(p);
  if (action === 'feereceipt') return handleFeeReceipt(p);
  if (action === 'feereport') return handleFeeReport(p);
  if (action === 'enquiries') return handleEnquiriesRequest(p);
  if (action === 'admissions') return handleAdmissionsRequest(p);
  if (action === 'attendance') return handleAttendanceRequest(p);
  if (action === 'portalaccounts') return handlePortalAccountsRequest(p);
  if (action === 'portalwelcome') return handlePortalWelcome(p);
  if (action === 'sheets') return handleSheetsRequest(p);
  if (p.idToken || p.rowsJson || p.receiptJson) {
    return json({ result: 'error', error: 'unknown action — deploy latest Apps Script' });
  }
  return handleEnquiry(p);
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  var action = String(p.action || '').toLowerCase();
  var callback = p.callback;

  // Public — website "Apply Online" button loads this URL
  if (action === 'admissionform') {
    var admUrl = PropertiesService.getScriptProperties().getProperty('ADMISSION_FORM_URL') || '';
    return jsonp({ ok: true, url: admUrl }, callback);
  }

  // Admin only — admin portal Student Details table (JSONP)
  if (action === 'enquiries') {
    return handleEnquiriesRequest(p);
  }
  if (action === 'admissions') {
    return handleAdmissionsRequest(p);
  }
  if (action === 'attendance') {
    return handleAttendanceRequest(p);
  }
  if (action === 'portalaccounts') {
    return handlePortalAccountsRequest(p);
  }
  if (action === 'portalwelcome') {
    return handlePortalWelcome(p);
  }
  if (action === 'feereceipt') {
    return handleFeeReceipt(p);
  }
  if (action === 'sheets') {
    return handleSheetsRequest(p);
  }

  return jsonp({ result: 'error', error: 'unknown action' }, callback);
}

/** Admin Student Details — used by doGet (JSONP GET) and doPost (JSONP POST, better on mobile). */
function handleEnquiriesRequest(p) {
  var user = verifyFirebaseToken(p.idToken);
  var payload = !isAdminUser(user)
    ? { result: 'error', error: 'unauthorized' }
    : { result: 'success', rows: getSheetRows() };
  var callback = p.callback;
  if (callback) return jsonp(payload, callback);
  return json(payload);
}

/** Admin Student Details — Google Form responses on Admissions tab. */
function handleAdmissionsRequest(p) {
  var user = verifyFirebaseToken(p.idToken);
  var payload = !isAdminUser(user)
    ? { result: 'error', error: 'unauthorized' }
    : { result: 'success', rows: getAdmissionsSheetRows() };
  var callback = p.callback;
  if (callback) return jsonp(payload, callback);
  return json(payload);
}

/** Admin — spreadsheet tab links for Student Details (open / export). */
function handleSheetsRequest(p) {
  var user = verifyFirebaseToken(p.idToken);
  if (!isAdminUser(user)) {
    return respondAdmin({ result: 'error', error: 'unauthorized' }, p);
  }

  var ss = coachingSpreadsheet_();
  var id = ss.getId();
  var base = 'https://docs.google.com/spreadsheets/d/' + id;
  var tabs = [];

  function pushTab(sheet, role) {
    if (!sheet) return;
    var gid = sheet.getSheetId();
    tabs.push({
      name: sheet.getName(),
      role: role,
      openUrl: base + '/edit#gid=' + gid,
      csvUrl: base + '/export?format=csv&gid=' + gid
    });
  }

  pushTab(ss.getSheetByName(ADMISSION_SHEET_NAME), 'admissions');
  pushTab(ss.getSheetByName(ATTENDANCE_SHEET_NAME), 'attendance');
  pushTab(getStudentDataSheet(), 'enquiry');

  return respondAdmin({
    result: 'success',
    spreadsheetName: ss.getName(),
    spreadsheetUrl: base + '/edit',
    xlsxUrl: base + '/export?format=xlsx',
    tabs: tabs
  }, p);
}

/** Main enquiry/admission summary sheet — NOT the Admissions Google Form tab. */
function getStudentDataSheet() {
  var ss = coachingSpreadsheet_();
  var preferred = ['Sheet1', 'Student Data', 'Student Entries', 'Enquiries'];
  var i, sheet;

  for (i = 0; i < preferred.length; i++) {
    sheet = ss.getSheetByName(preferred[i]);
    if (sheet) return sheet;
  }

  var sheets = ss.getSheets();
  for (i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    if (name === ADMISSION_SHEET_NAME || name === 'Settings' || name === ATTENDANCE_SHEET_NAME) continue;
    var lastCol = Math.max(sheets[i].getLastColumn(), 1);
    var headerRow = sheets[i].getRange(1, 1, 1, lastCol).getValues()[0];
    if (headerRow.indexOf('Name') !== -1 &&
        headerRow.indexOf('Phone') !== -1 &&
        headerRow.indexOf('Email') !== -1) {
      return sheets[i];
    }
  }
  return sheets[0];
}

// ==================== Enquiry (website form) ====================

function handleEnquiry(p) {
  var hasEnquiry = !!(
    String(p.name || '').trim() ||
    String(p.phone || '').trim() ||
    String(p.email || '').trim() ||
    String(p.message || '').trim() ||
    String(p.purpose || '').trim() ||
    String(p.course || '').trim()
  );
  if (!hasEnquiry) {
    if (p.idToken || p.rowsJson || p.receiptJson) {
      return json({ result: 'error', error: 'unknown action — deploy latest Apps Script' });
    }
    return json({ result: 'error', error: 'missing enquiry fields' });
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = getStudentDataSheet();
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    HEADERS.forEach(function (f) {
      if (headers.indexOf(f) === -1) {
        sheet.getRange(1, headers.length + 1).setValue(f);
        headers.push(f);
      }
    });
    var map = {
      Timestamp: new Date(),
      Name: p.name || '',
      Phone: p.phone || '',
      Email: p.email || '',
      Purpose: p.purpose || '',
      Course: p.course || '',
      Message: p.message || '',
      Language: p.lang || ''
    };
    sheet.appendRow(headers.map(function (h) { return (h in map) ? map[h] : ''; }));

    try {
      MailApp.sendEmail({
        to: ADMIN_EMAIL,
        subject: 'New enquiry: ' + (p.name || '') + (p.purpose ? ' (' + p.purpose + ')' : ''),
        body: 'New enquiry received:\n\n' +
              'Name: ' + (p.name || '') + '\n' +
              'Phone: ' + (p.phone || '') + '\n' +
              'Email: ' + (p.email || '') + '\n' +
              'Interested in: ' + (p.purpose || '') + '\n' +
              'Course: ' + (p.course || '') + '\n' +
              'Message: ' + (p.message || '') + '\n' +
              'Language: ' + (p.lang || '') + '\n' +
              'Time: ' + new Date()
      });
    } catch (err) {}

    try {
      var email = (p.email || '').trim();
      if (email && email.indexOf('@') > 0) {
        MailApp.sendEmail({
          to: email,
          name: CENTER_NAME,
          subject: 'Thank you for your enquiry – ' + CENTER_NAME,
          body: 'Dear ' + (p.name || 'Student') + ',\n\n' +
                'Thank you for contacting ' + CENTER_NAME + '. We have received your enquiry' +
                (p.purpose ? ' regarding ' + p.purpose : '') + ', and our team will contact you shortly' +
                (p.phone ? ' on ' + p.phone : '') + '.\n\n' +
                '------------------------------\n' +
                'नमस्कार ' + (p.name || '') + ',\n' +
                CENTER_NAME + ' शी संपर्क केल्याबद्दल धन्यवाद. आम्हाला तुमची चौकशी मिळाली आहे. ' +
                'आमची टीम लवकरच तुमच्याशी संपर्क करेल.\n\n' +
                'Regards,\n' + CENTER_NAME + '\n' + CENTER_PHONE
        });
      }
    } catch (err) {}

    return json({ result: 'success' });
  } finally {
    lock.releaseLock();
  }
}

// ==================== Admin broadcast email ====================

function handleBroadcast(p) {
  var user = verifyFirebaseToken(p.idToken);
  if (!isAdminUser(user)) {
    return json({ result: 'error', message: 'unauthorized' });
  }

  var audience = String(p.audience || 'registered').toLowerCase();
  var recipients = [];

  if (audience === 'registered' || audience === 'both' || audience === 'all') {
    (p.recipients || '').split(',').forEach(function (s) {
      s = s.trim();
      if (s && s.indexOf('@') > 0) recipients.push(s);
    });
  }
  if (audience === 'sheet' || audience === 'both' || audience === 'all') {
    recipients = recipients.concat(getSheetEmails());
  }
  if (audience === 'admissions' || audience === 'all') {
    recipients = recipients.concat(getAdmissionsEmails());
  }

  var seen = {};
  recipients = recipients.filter(function (email) {
    var key = String(email).toLowerCase();
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });

  if (!recipients.length) {
    return json({ result: 'error', message: 'no recipients' });
  }

  var subject = p.subject || ('Announcement – ' + CENTER_NAME);
  var body = (p.body || '') + '\n\n—\n' + CENTER_NAME + '\n' + CENTER_PHONE;
  var BATCH = 50;

  for (var i = 0; i < recipients.length; i += BATCH) {
    MailApp.sendEmail({
      to: ADMIN_EMAIL,
      bcc: recipients.slice(i, i + BATCH).join(','),
      name: CENTER_NAME,
      subject: subject,
      body: body
    });
  }
  return json({ result: 'success', sent: recipients.length });
}

/** Admin — email a fee receipt link to a student/parent (CC admin). */
function handleFeeReceipt(p) {
  var user = verifyFirebaseToken(p.idToken);
  if (!isAdminUser(user)) {
    return respondAdmin({ result: 'error', error: 'unauthorized' }, p);
  }

  var to = String(p.to || '').trim();
  if (!to || to.indexOf('@') <= 0) {
    return respondAdmin({ result: 'error', error: 'no-recipient' }, p);
  }

  var link = String(p.link || '').trim();
  var body = String(p.body || '').trim();
  if (!body) {
    body = 'Dear Student,\n\nYour fee receipt is ready:\n' + (link || '(link missing)') + '\n';
  }

  var subject = String(p.subject || '').trim() || ('Fee Receipt | ' + CENTER_NAME);

  try {
    MailApp.sendEmail({
      to: to,
      cc: ADMIN_EMAIL,
      name: CENTER_NAME,
      subject: subject,
      body: body + '\n\n—\n' + CENTER_NAME + '\n' + CENTER_PHONE
    });
  } catch (err) {
    return respondAdmin({ result: 'error', error: 'mail-failed' }, p);
  }
  return respondAdmin({ result: 'success' }, p);
}

function escHtml_(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatRupee_(amount) {
  var n = Number(amount);
  if (!isFinite(n)) n = 0;
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function formatReceiptDate_(iso) {
  var s = String(iso || '').trim();
  if (!s) {
    return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd MMM yyyy');
  }
  try {
    var parts = s.split('-');
    if (parts.length === 3) {
      var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd MMM yyyy');
    }
  } catch (e) {}
  return s;
}

function buildFeeReceiptHtml_(data) {
  var noteHtml = data.note
    ? '<div class="note"><strong>Note / टीप:</strong> ' + escHtml_(data.note) + '</div>'
    : '';
  var discountHtml = data.discounted
    ? '<div class="note discount"><strong>Discount applied / सवलत लागू</strong></div>'
    : '';

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' +
    '*{box-sizing:border-box;margin:0;padding:0}' +
    'body{font-family:Arial,sans-serif;color:#1a2b44;background:#fff;padding:24px}' +
    '.page{max-width:700px;margin:0 auto;border:1px solid #d8dee8;border-radius:12px;overflow:hidden}' +
    '.head{background:linear-gradient(135deg,#1a365d 0%,#234876 100%);color:#fff;padding:24px 28px 20px}' +
    '.head h1{font-size:22px;font-weight:700}' +
    '.head p{margin-top:6px;font-size:13px;opacity:.92}' +
    '.badge{display:inline-block;margin-top:12px;background:#f57c00;color:#fff;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:5px 10px;border-radius:999px}' +
    '.body{padding:24px 28px 28px}' +
    '.meta{display:table;width:100%;margin-bottom:18px;font-size:13px}' +
    '.meta .col{display:table-cell;width:50%;vertical-align:top;padding-right:12px}' +
    '.meta strong{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#5a6578;margin-bottom:4px}' +
    '.student-box{background:#f7f9fc;border:1px solid #e3e8f0;border-radius:10px;padding:14px 16px;margin-bottom:18px}' +
    '.student-box h2{font-size:15px;margin-bottom:8px;color:#1a365d}' +
    '.student-grid{font-size:13px;line-height:1.7}' +
    'table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:13px}' +
    'th,td{border:1px solid #e3e8f0;padding:10px 11px;text-align:left}' +
    'th{background:#f0f4fa;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#4a5568}' +
    'td.amount,th.amount{text-align:right}' +
    'tr.total td{font-weight:700;background:#fff8ef;color:#c05600}' +
    '.note{font-size:12px;color:#4a5568;border-left:4px solid #f57c00;padding:9px 11px;background:#fffaf5;margin-bottom:14px}' +
    '.note.discount{border-left-color:#1a365d;background:#f0f4fa}' +
    '.footer{border-top:1px dashed #d8dee8;padding-top:14px;font-size:12px;color:#5a6578;line-height:1.55}' +
    '.footer strong{color:#1a365d}' +
    '</style></head><body><div class="page">' +
    '<div class="head"><h1>' + escHtml_(CENTER_NAME) + '</h1>' +
    '<p>Math\'s Coaching by Bhasme Sir</p>' +
    '<span class="badge">Fee Receipt / फी पावती</span></div>' +
    '<div class="body">' +
    '<div class="meta"><div class="col"><strong>Receipt No / पावती क्र.</strong>' + escHtml_(data.receiptNo) + '</div>' +
    '<div class="col"><strong>Date / तारीख</strong>' + escHtml_(formatReceiptDate_(data.paymentDate)) + '</div></div>' +
    '<div class="student-box"><h2>Student Details / विद्यार्थी माहिती</h2>' +
    '<div class="student-grid">' +
    '<div><strong>Name:</strong> ' + escHtml_(data.studentName) + '</div>' +
    '<div><strong>Class:</strong> ' + escHtml_(data.classLabel) + '</div>' +
    '<div><strong>Email:</strong> ' + escHtml_(data.email) + '</div>' +
    '<div><strong>Mobile:</strong> ' + escHtml_(data.mobile) + '</div>' +
    '</div></div>' +
    '<table><thead><tr><th>Description / वर्णन</th><th class="amount">Amount / रक्कम</th></tr></thead><tbody>' +
    '<tr><td>Payment plan / योजना — ' + escHtml_(data.paymentPlan) + '</td><td class="amount">—</td></tr>' +
    '<tr><td>Course fee / अभ्यासक्रम शुल्क</td><td class="amount">' + formatRupee_(data.courseFee) + '</td></tr>' +
    '<tr><td>Registration fee / नोंदणी शुल्क</td><td class="amount">' + formatRupee_(data.registrationFee) + '</td></tr>' +
    '<tr><td>Amount paid / भरलेली रक्कम</td><td class="amount">' + formatRupee_(data.amountPaid) + '</td></tr>' +
    '<tr class="total"><td>Balance due / बाकी</td><td class="amount">' + formatRupee_(data.balance) + '</td></tr>' +
    '</tbody></table>' +
    discountHtml + noteHtml +
    '<div class="footer"><strong>Thank you for your payment.</strong><br>आपल्या पेमेंटबद्दल धन्यवाद.<br><br>' +
    escHtml_(CENTER_NAME) + ' · ' + escHtml_(CENTER_PHONE) + '<br>This is a computer-generated receipt.</div>' +
    '</div></div></body></html>';
}

function buildFeeReceiptPdf_(data) {
  var html = buildFeeReceiptHtml_(data);
  var output = HtmlService.createHtmlOutput(html).setWidth(794).setHeight(1123);
  var pdf = output.getAs('application/pdf');
  var safeName = String(data.receiptNo || 'receipt').replace(/[^\w\-]+/g, '_');
  pdf.setName('fee-receipt-' + safeName + '.pdf');
  return pdf;
}

/** Admin — email fee report with Excel (.xlsx) attachment. */
function handleFeeReport(p) {
  var user = verifyFirebaseToken(p.idToken);
  if (!isAdminUser(user)) {
    return json({ result: 'error', message: 'unauthorized' });
  }

  var subject = String(p.subject || '').trim() || ('Student Fees Report – ' + CENTER_NAME);
  var body = String(p.body || '').trim();
  var rowsJson = String(p.rowsJson || '[]');
  var rows;

  try {
    rows = JSON.parse(rowsJson);
  } catch (err) {
    return json({ result: 'error', message: 'invalid rows' });
  }

  rows = normalizeFeeReportRows_(rows);
  if (!rows.length || !rows[0].length) {
    return json({ result: 'error', message: 'no rows' });
  }

  var attachment;
  try {
    attachment = buildFeesExcelBlob_(rows);
  } catch (err) {
    try {
      attachment = buildFeesCsvBlob_(rows);
    } catch (err2) {
      return json({ result: 'error', message: 'excel-failed' });
    }
  }

  try {
    MailApp.sendEmail({
      to: ADMIN_EMAIL,
      name: CENTER_NAME,
      subject: subject,
      body: (body || 'Please find the student fees Excel report attached.') +
        '\n\n—\n' + CENTER_NAME + '\n' + CENTER_PHONE,
      attachments: [attachment]
    });
  } catch (err) {
    return json({ result: 'error', message: 'mail-failed' });
  }
  return json({ result: 'success' });
}

/** Pad ragged rows and coerce null/undefined cells for setValues. */
function normalizeFeeReportRows_(rows) {
  if (!rows || !rows.length) return [];
  var width = 0;
  rows.forEach(function (row) {
    if (row && row.length > width) width = row.length;
  });
  if (!width) return [];
  return rows.map(function (row) {
    var out = [];
    for (var c = 0; c < width; c++) {
      var v = row && row[c];
      out.push(v == null ? '' : v);
    }
    return out;
  });
}

/** Build a temporary spreadsheet and return .xlsx blob (temp file is trashed). */
function buildFeesExcelBlob_(rows) {
  rows = normalizeFeeReportRows_(rows);
  var ss = SpreadsheetApp.create('Fees Export ' + new Date().getTime());
  var fileId = ss.getId();
  try {
    var sheet = ss.getActiveSheet();
    sheet.setName('Student Fees');
    sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    sheet.getRange(1, 1, 1, rows[0].length).setFontWeight('bold').setBackground('#e8eef5');
    sheet.setFrozenRows(1);
    if (rows[0].length <= 20) {
      for (var c = 1; c <= rows[0].length; c++) {
        sheet.autoResizeColumn(c);
      }
    }
    var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var blob = ss.getAs('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    blob.setName('student-fees-report-' + stamp + '.xlsx');
    return blob;
  } finally {
    try {
      DriveApp.getFileById(fileId).setTrashed(true);
    } catch (e) {}
  }
}

/** CSV fallback when temporary-sheet xlsx export fails. */
function buildFeesCsvBlob_(rows) {
  rows = normalizeFeeReportRows_(rows);
  var lines = rows.map(function (row) {
    return row.map(function (cell) {
      var s = String(cell == null ? '' : cell);
      if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }).join(',');
  });
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return Utilities.newBlob(lines.join('\n'), 'text/csv', 'student-fees-report-' + stamp + '.csv');
}

// ==================== Attendance (daily grid) ====================

/** Remove older duplicate rows (same date + student); keep the latest row only. */
function cleanupAttendanceSheetDuplicates() {
  var sheet = getAttendanceSheet();
  var lastCol = Math.max(sheet.getLastColumn(), ATTENDANCE_HEADERS.length);
  var data = readSheetData_(sheet, lastCol);
  if (!data.length) return 0;

  var idx = getAttendanceHeaderMap_(sheet);
  var rowsToDelete = [];
  var latestRow = {};

  for (var r = 0; r < data.length; r++) {
    var row = data[r];
    var rowNum = r + 2;
    var rowDate = idx.Date >= 0 ? formatDateCell(row[idx.Date]) : '';
    var name = idx.Name >= 0 ? String(row[idx.Name] || '') : '';
    var email = idx.Email >= 0 ? String(row[idx.Email] || '') : '';
    var key = rowDate + '|' + attendanceStudentKey_(name, email);
    if (!rowDate || key === rowDate + '|n:') continue;

    if (latestRow[key] !== undefined) rowsToDelete.push(latestRow[key]);
    latestRow[key] = rowNum;
  }

  rowsToDelete.sort(function (a, b) { return b - a; });
  rowsToDelete.forEach(function (rowNum) { sheet.deleteRow(rowNum); });
  return rowsToDelete.length;
}

/** Trim empty rows and re-apply Attendance formatting. */
function repairAttendanceSheet() {
  var sheet = getAttendanceSheet();
  var data = readSheetData_(sheet, ATTENDANCE_HEADERS.length);
  var kept = [];
  for (var r = 0; r < data.length; r++) {
    var row = data[r];
    var hasData = false;
    for (var c = 0; c < row.length; c++) {
      if (String(row[c] || '').trim()) { hasData = true; break; }
    }
    if (hasData) kept.push(row);
  }

  var dataEnd = sheet.getLastRow();
  if (dataEnd >= 2) sheet.deleteRows(2, dataEnd - 1);
  for (var k = 0; k < kept.length; k++) {
    sheet.appendRow(padRowToCols_(kept[k], ATTENDANCE_HEADERS.length));
  }
  formatAttendanceSheet_(sheet);
  SpreadsheetApp.getUi().alert(
    'Attendance sheet repaired',
    'Kept ' + kept.length + ' row(s) with data. Empty rows removed.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/** Run from Apps Script or spreadsheet menu to style the Attendance tab header. */
function beautifyAttendanceSheet() {
  var sheet = getAttendanceSheet();
  var removed = cleanupAttendanceSheetDuplicates();
  formatAttendanceSheet_(sheet);
  SpreadsheetApp.getUi().alert(
    'Attendance sheet updated',
    'Header formatted. Removed ' + removed + ' duplicate row(s). Each date now keeps one row per student.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Bhasme Coaching')
    .addItem('Format Attendance header', 'beautifyAttendanceSheet')
    .addItem('Repair Attendance sheet', 'repairAttendanceSheet')
    .addItem('Remove duplicate attendance rows', 'cleanupAttendanceDuplicatesMenu')
    .addToUi();
}

function cleanupAttendanceDuplicatesMenu() {
  var removed = cleanupAttendanceSheetDuplicates();
  SpreadsheetApp.getUi().alert(
    'Duplicates removed',
    removed
      ? 'Removed ' + removed + ' duplicate row(s). Latest entry kept for each date + student.'
      : 'No duplicate rows found.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function formatAttendanceSheet_(sheet) {
  var numCols = ATTENDANCE_HEADERS.length;
  var headerRange = sheet.getRange(1, 1, 1, numCols);

  // Bilingual labels in row 1 (lookup supports old English headers too).
  headerRange.setValues([ATTENDANCE_HEADER_LABELS]);
  headerRange
    .setFontFamily('Arial')
    .setFontSize(10)
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#1a365d')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);

  sheet.setRowHeight(1, 42);
  sheet.setFrozenRows(1);

  sheet.setColumnWidth(1, 118);
  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 220);
  sheet.setColumnWidth(4, 130);
  sheet.setColumnWidth(5, 130);
  sheet.setColumnWidth(6, 180);
  sheet.setColumnWidth(7, 155);

  var numDataRows = sheetNumDataRows_(sheet);
  if (numDataRows > 0) {
    sheet.getRange(2, 1, numDataRows, 1).setNumberFormat('yyyy-mm-dd');
    sheet.getRange(2, 7, numDataRows, 1).setNumberFormat('dd-mmm-yyyy hh:mm');
    sheet.getRange(2, 1, numDataRows, numCols)
      .setFontFamily('Arial')
      .setFontSize(10)
      .setVerticalAlignment('middle');
    sheet.getRange(2, 5, numDataRows, 1).setHorizontalAlignment('center');
  }

  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['present', 'absent'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 5, 1000, 1).setDataValidation(statusRule);

  var statusRange = sheet.getRange(2, 5, 1000, 1);
  var rules = sheet.getConditionalFormatRules().filter(function (rule) {
    var ranges = rule.getRanges();
    for (var i = 0; i < ranges.length; i++) {
      if (ranges[i].getColumn() === 5 && ranges[i].getRow() >= 2) return false;
    }
    return true;
  });
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('present')
      .setBackground('#e8f7ee')
      .setFontColor('#1a6b38')
      .setBold(true)
      .setRanges([statusRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('absent')
      .setBackground('#fdecec')
      .setFontColor('#9b2c2c')
      .setBold(true)
      .setRanges([statusRange])
      .build()
  );
  sheet.setConditionalFormatRules(rules);
}

function getAttendanceHeaderMap_(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), ATTENDANCE_HEADERS.length);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = {};
  ATTENDANCE_HEADERS.forEach(function (key, i) {
    var label = ATTENDANCE_HEADER_LABELS[i];
    var idx = headers.indexOf(key);
    if (idx === -1) idx = headers.indexOf(label);
    map[key] = idx;
  });
  return map;
}

function getAttendanceSheet() {
  var ss = coachingSpreadsheet_();
  var sheet = ss.getSheetByName(ATTENDANCE_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(ATTENDANCE_SHEET_NAME);
    sheet.getRange(1, 1, 1, ATTENDANCE_HEADERS.length).setValues([ATTENDANCE_HEADER_LABELS]);
    formatAttendanceSheet_(sheet);
    return sheet;
  }
  ensureAttendanceHeaders_(sheet);
  return sheet;
}

function ensureAttendanceHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, ATTENDANCE_HEADERS.length).setValues([ATTENDANCE_HEADER_LABELS]);
    formatAttendanceSheet_(sheet);
    return;
  }
  var headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  var changed = false;
  ATTENDANCE_HEADERS.forEach(function (h, i) {
    var label = ATTENDANCE_HEADER_LABELS[i];
    if (headers.indexOf(h) === -1 && headers.indexOf(label) === -1) {
      sheet.getRange(1, headers.length + 1).setValue(label);
      headers.push(label);
      changed = true;
    }
  });
  if (changed) formatAttendanceSheet_(sheet);
}

function formatDateCell(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  var s = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  var d = new Date(s);
  if (!isNaN(d.getTime())) {
    return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return s;
}

function attendanceStudentKey_(name, email) {
  email = String(email || '').trim().toLowerCase();
  if (email && email.indexOf('@') > 0) return 'e:' + email;
  return 'n:' + String(name || '').trim().toLowerCase();
}

function dedupeAttendanceRecords_(records) {
  var byKey = {};
  (records || []).forEach(function (rec) {
    byKey[attendanceStudentKey_(rec && rec.name, rec && rec.email)] = rec;
  });
  return Object.keys(byKey).map(function (k) { return byKey[k]; });
}

function getAttendanceDateColumn_(sheet) {
  var idx = getAttendanceHeaderMap_(sheet);
  return idx.Date >= 0 ? idx.Date + 1 : 1;
}

function padRowToCols_(row, numCols) {
  var out = (row || []).slice(0, numCols);
  while (out.length < numCols) out.push('');
  return out;
}

/** Append rows one at a time — avoids setValues row-count mismatch errors. */
function appendRows_(sheet, rows, numCols) {
  if (!rows || !rows.length) return 0;
  var cols = numCols || ATTENDANCE_HEADERS.length;
  var startRow = sheet.getLastRow() + 1;
  for (var i = 0; i < rows.length; i++) {
    sheet.appendRow(padRowToCols_(rows[i], cols));
  }
  return startRow;
}

function writeRowsAt_(sheet, startRow, values, numCols) {
  if (!values || !values.length) return;
  var numRows = values.length;
  var cols = numCols || (values[0] ? values[0].length : 1);
  sheet.getRange(startRow, 1, numRows, cols).setValues(values);
}

/** Remove every data row for this date so the next save fully replaces that day. */
function deleteAttendanceRowsForDate_(sheet, dateStr) {
  dateStr = formatDateCell(dateStr);
  if (!dateStr) return 0;
  if (sheetNumDataRows_(sheet) < 1) return 0;

  var lastCol = Math.max(sheet.getLastColumn(), ATTENDANCE_HEADERS.length);
  var dateCol = getAttendanceDateColumn_(sheet) - 1;
  var data = readSheetData_(sheet, lastCol);
  var kept = [];
  var removed = 0;

  for (var r = 0; r < data.length; r++) {
    var rowDate = dateCol >= 0 ? formatDateCell(data[r][dateCol]) : '';
    if (rowDate === dateStr) {
      removed++;
    } else {
      kept.push(data[r]);
    }
  }

  if (!removed) return 0;

  var dataEnd = sheet.getLastRow();
  if (dataEnd >= 2) {
    sheet.deleteRows(2, dataEnd - 1);
  }
  if (kept.length) {
    for (var k = 0; k < kept.length; k++) {
      sheet.appendRow(padRowToCols_(kept[k], ATTENDANCE_HEADERS.length));
    }
  }
  return removed;
}

function getAttendanceForDate(dateStr) {
  dateStr = formatDateCell(dateStr);
  if (!dateStr) return [];

  var sheet = getAttendanceSheet();
  var lastCol = Math.max(sheet.getLastColumn(), ATTENDANCE_HEADERS.length);
  var data = readSheetData_(sheet, lastCol);
  if (!data.length) return [];

  var idx = getAttendanceHeaderMap_(sheet);
  var byKey = {};

  for (var r = 0; r < data.length; r++) {
    var row = data[r];
    var rowDate = idx.Date >= 0 ? formatDateCell(row[idx.Date]) : '';
    if (rowDate !== dateStr) continue;
    var rec = {
      name: idx.Name >= 0 ? String(row[idx.Name] || '') : '',
      email: idx.Email >= 0 ? String(row[idx.Email] || '') : '',
      batch: idx.Batch >= 0 ? String(row[idx.Batch] || '') : '',
      status: idx.Status >= 0 ? String(row[idx.Status] || 'present').toLowerCase() : 'present',
      note: idx.Note >= 0 ? String(row[idx.Note] || '') : ''
    };
    byKey[attendanceStudentKey_(rec.name, rec.email)] = rec;
  }
  return Object.keys(byKey).map(function (k) { return byKey[k]; });
}

/** Search Attendance sheet by name, optional class, and date range. */
function searchAttendanceRecords_(name, batch, dateFrom, dateTo) {
  name = String(name || '').trim().toLowerCase();
  batch = String(batch || '').trim();
  dateFrom = formatDateCell(dateFrom || '');
  dateTo = formatDateCell(dateTo || dateFrom || '');
  if (!dateFrom && !dateTo) {
    dateTo = formatDateCell(new Date());
    dateFrom = dateTo;
  }
  if (!dateFrom) dateFrom = dateTo;
  if (!dateTo) dateTo = dateFrom;
  if (dateFrom > dateTo) {
    var swap = dateFrom;
    dateFrom = dateTo;
    dateTo = swap;
  }

  var sheet = getAttendanceSheet();
  var lastCol = Math.max(sheet.getLastColumn(), ATTENDANCE_HEADERS.length);
  var data = readSheetData_(sheet, lastCol);
  if (!data.length) return [];

  var idx = getAttendanceHeaderMap_(sheet);
  var results = [];

  for (var r = 0; r < data.length; r++) {
    var row = data[r];
    var rowDate = idx.Date >= 0 ? formatDateCell(row[idx.Date]) : '';
    if (!rowDate || rowDate < dateFrom || rowDate > dateTo) continue;

    var rec = {
      date: rowDate,
      name: idx.Name >= 0 ? String(row[idx.Name] || '').trim() : '',
      email: idx.Email >= 0 ? String(row[idx.Email] || '').trim() : '',
      batch: idx.Batch >= 0 ? String(row[idx.Batch] || '').trim() : '',
      status: idx.Status >= 0 ? String(row[idx.Status] || 'present').toLowerCase() : 'present',
      note: idx.Note >= 0 ? String(row[idx.Note] || '').trim() : ''
    };

    if (name && rec.name.toLowerCase().indexOf(name) === -1) continue;
    if (batch && batch !== 'all' && rec.batch !== batch) continue;
    results.push(rec);
  }

  results.sort(function (a, b) {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
  return results;
}

function saveAttendanceForDate(dateStr, records, mode) {
  dateStr = formatDateCell(dateStr);
  if (!dateStr) throw new Error('missing date');
  mode = String(mode || 'replace').toLowerCase();

  records = dedupeAttendanceRecords_(records);

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = getAttendanceSheet();
    if (mode !== 'append') {
      deleteAttendanceRowsForDate_(sheet, dateStr);
    }

    if (!records.length) return;

    var now = new Date();
    var rows = records.map(function (rec) {
      var status = String((rec && rec.status) || 'present').toLowerCase();
      if (status !== 'present' && status !== 'absent') status = 'present';
      return padRowToCols_([
        dateStr,
        (rec && rec.name) || '',
        (rec && rec.email) || '',
        (rec && rec.batch) || '',
        status,
        (rec && rec.note) || '',
        now
      ], ATTENDANCE_HEADERS.length);
    });

    var startRow = appendRows_(sheet, rows, ATTENDANCE_HEADERS.length);
    if (rows.length > 0) {
      sheet.getRange(startRow, 1, rows.length, 1).setNumberFormat('yyyy-mm-dd');
      sheet.getRange(startRow, 7, rows.length, 1).setNumberFormat('dd-mmm-yyyy hh:mm');
    }
  } finally {
    lock.releaseLock();
  }
}

function adminSessionFromRequest_(p) {
  var session = String(p.session || '').trim();
  if (!session) return null;
  var email = CacheService.getScriptCache().get('bcc_adm_' + session);
  if (!email) return null;
  email = String(email).toLowerCase();
  if (ADMIN_EMAILS.indexOf(email) === -1) return null;
  return { email: email };
}

function handleAttendanceRequest(p) {
  var sub = String(p.subaction || 'get').toLowerCase();

  if (sub === 'session') {
    var sessionUser = verifyFirebaseToken(p.idToken);
    if (!isAdminUser(sessionUser)) {
      return respondAdmin({ result: 'error', error: 'unauthorized' }, p);
    }
    var sessionKey = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
    CacheService.getScriptCache().put(
      'bcc_adm_' + sessionKey,
      String(sessionUser.email).toLowerCase(),
      300
    );
    return respondAdmin({ result: 'success', session: sessionKey }, p);
  }

  if (sub === 'savebits') {
    var bitsAdmin = adminSessionFromRequest_(p);
    if (!bitsAdmin) {
      var bitsUser = verifyFirebaseToken(p.idToken);
      if (!isAdminUser(bitsUser)) {
        return respondAdmin({ result: 'error', error: 'unauthorized' }, p);
      }
    }
    var bitsDate = formatDateCell(p.date || '');
    var bits = String(p.bits || '');
    try {
      var saved = saveAttendanceFromBits_(bitsDate, bits);
      return respondAdmin({ result: 'success', saved: saved }, p);
    } catch (bitsErr) {
      return respondAdmin({
        result: 'error',
        error: String(bitsErr && bitsErr.message ? bitsErr.message : bitsErr)
      }, p);
    }
  }

  var user = verifyFirebaseToken(p.idToken);
  if (!isAdminUser(user)) {
    return respondAdmin({ result: 'error', error: 'unauthorized' }, p);
  }

  if (sub === 'roster') {
    return respondAdmin({ result: 'success', roster: getAttendanceRosterRows() }, p);
  }

  if (sub === 'get') {
    var dateStr = formatDateCell(p.date || '');
    return respondAdmin({ result: 'success', records: getAttendanceForDate(dateStr) }, p);
  }

  if (sub === 'search') {
    var searchRows = searchAttendanceRecords_(p.name, p.batch, p.dateFrom, p.dateTo);
    return respondAdmin({ result: 'success', records: searchRows }, p);
  }

  if (sub === 'save') {
    var saveDate = formatDateCell(p.date || '');
    var saveMode = String(p.mode || 'replace').toLowerCase();
    var records = [];
    try {
      records = JSON.parse(p.records || '[]');
      if (!Array.isArray(records)) records = [];
    } catch (err) {
      return respondAdmin({ result: 'error', error: 'bad records' }, p);
    }
    try {
      saveAttendanceForDate(saveDate, records, saveMode);
      return respondAdmin({ result: 'success', saved: records.length }, p);
    } catch (saveErr) {
      return respondAdmin({
        result: 'error',
        error: String(saveErr && saveErr.message ? saveErr.message : saveErr)
      }, p);
    }
  }

  return respondAdmin({ result: 'error', error: 'unknown subaction' }, p);
}

/** Compact save: bits = "1" present / "0" absent per roster student (name order). */
function saveAttendanceFromBits_(dateStr, bits) {
  dateStr = formatDateCell(dateStr);
  if (!dateStr) throw new Error('missing date');

  var roster = getAttendanceRosterRows();
  if (!bits.length) throw new Error('missing bits');
  if (bits.length !== roster.length) {
    throw new Error('roster mismatch (' + roster.length + ' students, ' + bits.length + ' marks)');
  }

  var records = [];
  for (var i = 0; i < roster.length; i++) {
    records.push({
      name: roster[i].name || '',
      email: roster[i].email || '',
      batch: roster[i].batch || '',
      status: bits.charAt(i) === '1' ? 'present' : 'absent',
      note: ''
    });
  }
  saveAttendanceForDate(dateStr, records, 'replace');
  return records.length;
}

function respondAdmin(payload, p) {
  var callback = p && p.callback;
  if (callback) return jsonp(payload, callback);
  return json(payload);
}

// ==================== Portal accounts (Auth via REST API) ====================

/** Match website auth/admin.js normalizePhone(). */
function normalizePhone_(raw) {
  var digits = String(raw || '').replace(/[\s\-()]/g, '');
  digits = digits.replace(/^\+91/, '').replace(/^0+/, '');
  if (/^[6-9]\d{9}$/.test(digits)) return digits;
  return null;
}

function portalAuthEmail_(phone) {
  phone = normalizePhone_(phone);
  if (!phone) return null;
  return phone + PORTAL_AUTH_EMAIL_SUFFIX;
}

function optionalContactEmail_(email) {
  email = String(email || '').trim().toLowerCase();
  if (!email || email.indexOf('@') <= 0) return '';
  if (email.indexOf(PORTAL_AUTH_EMAIL_SUFFIX) >= 0) return '';
  return email;
}

function firebaseAuthRequest_(path, body) {
  var resp = UrlFetchApp.fetch(
    'https://identitytoolkit.googleapis.com/v1/' + path + '?key=' + FIREBASE_API_KEY,
    {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(body),
      muteHttpExceptions: true
    }
  );
  var text = resp.getContentText() || '{}';
  var data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    data = {};
  }
  return { code: resp.getResponseCode(), data: data };
}

function parseFirebaseAuthError_(data) {
  var msg = (data && data.error && data.error.message) ? String(data.error.message) : '';
  if (msg.indexOf('EMAIL_EXISTS') >= 0) return 'already-exists';
  if (msg.indexOf('INVALID_EMAIL') >= 0) return 'invalid-email';
  if (msg.indexOf('WEAK_PASSWORD') >= 0) return 'weak-password';
  if (msg.indexOf('EMAIL_NOT_FOUND') >= 0) return 'auth-failed';
  if (msg.indexOf('INVALID_PASSWORD') >= 0) return 'auth-failed';
  if (msg.indexOf('INVALID_LOGIN_CREDENTIALS') >= 0) return 'auth-failed';
  return 'auth-error';
}

/** Admin portal account create/delete — used by admin.js Portal Accounts tab. */
function handlePortalAccountsRequest(p) {
  var user = verifyFirebaseToken(p.idToken);
  if (!isAdminUser(user)) {
    return respondAdmin({ result: 'error', error: 'unauthorized' }, p);
  }

  var sub = String(p.subaction || '').toLowerCase();

  if (sub === 'create') {
    var name = String(p.name || '').trim();
    var contactEmail = optionalContactEmail_(p.email);
    var phone = normalizePhone_(p.phone);
    var batch = String(p.batch || '').trim();
    var authEmail = portalAuthEmail_(phone);

    if (!phone || !authEmail) {
      return respondAdmin({ result: 'error', error: 'invalid-phone' }, p);
    }
    if (String(p.email || '').trim() && !contactEmail) {
      return respondAdmin({ result: 'error', error: 'invalid-email' }, p);
    }
    if (!name) {
      return respondAdmin({ result: 'error', error: 'missing-name' }, p);
    }

    var signUp = firebaseAuthRequest_('accounts:signUp', {
      email: authEmail,
      password: phone,
      displayName: name,
      returnSecureToken: true
    });

    if (signUp.code !== 200) {
      var errCode = parseFirebaseAuthError_(signUp.data);
      // Auth user may exist without a Firestore profile (e.g. prior partial create).
      if (errCode === 'already-exists') {
        var recover = firebaseAuthRequest_('accounts:signInWithPassword', {
          email: authEmail,
          password: phone,
          returnSecureToken: true
        });
        if (recover.code === 200 && recover.data.localId) {
          var recoveredMail = sendPortalWelcomeEmail_(name, contactEmail, phone, batch);
          return respondAdmin({
            result: 'success',
            uid: recover.data.localId,
            email: contactEmail,
            name: name,
            phone: phone,
            batch: batch,
            recovered: true,
            emailSent: recoveredMail.ok
          }, p);
        }
        return respondAdmin({ result: 'error', error: 'already-exists' }, p);
      }
      return respondAdmin({ result: 'error', error: errCode }, p);
    }

    var localId = signUp.data.localId;
    var welcomeMail = sendPortalWelcomeEmail_(name, contactEmail, phone, batch);
    return respondAdmin({
      result: 'success',
      uid: localId,
      email: contactEmail,
      name: name,
      phone: phone,
      batch: batch,
      emailSent: welcomeMail.ok
    }, p);
  }

  if (sub === 'delete') {
    var delContactEmail = optionalContactEmail_(p.email);
    var delPhone = normalizePhone_(p.phone);
    var delAuthEmail = portalAuthEmail_(delPhone);

    if (!delPhone || !delAuthEmail) {
      return respondAdmin({ result: 'error', error: 'invalid-phone' }, p);
    }

    var signIn = firebaseAuthRequest_('accounts:signInWithPassword', {
      email: delAuthEmail,
      password: delPhone,
      returnSecureToken: true
    });

    if (signIn.code !== 200 && delContactEmail && delContactEmail !== delAuthEmail) {
      signIn = firebaseAuthRequest_('accounts:signInWithPassword', {
        email: delContactEmail,
        password: delPhone,
        returnSecureToken: true
      });
    }

    if (signIn.code !== 200) {
      return respondAdmin({ result: 'error', error: parseFirebaseAuthError_(signIn.data) }, p);
    }

    var uid = signIn.data.localId;
    var idToken = signIn.data.idToken;

    var delResp = firebaseAuthRequest_('accounts:delete', { idToken: idToken });
    if (delResp.code !== 200) {
      return respondAdmin({ result: 'error', error: parseFirebaseAuthError_(delResp.data) }, p);
    }

    return respondAdmin({ result: 'success', uid: uid }, p);
  }

  return respondAdmin({ result: 'error', error: 'unknown subaction' }, p);
}

/** Send portal welcome email — shared by portalwelcome action and portalaccounts create. */
function sendPortalWelcomeEmail_(name, email, phone, batch) {
  name = String(name || '').trim() || 'Student';
  email = optionalContactEmail_(email);
  phone = normalizePhone_(phone);
  batch = String(batch || '').trim();

  if (!email) {
    return { ok: false, error: 'no-recipient', skipped: true };
  }
  if (!phone) {
    return { ok: false, error: 'invalid-phone' };
  }

  var batchLine = batch ? ('Class / Batch: ' + batch + '\n') : '';
  var batchLineMr = batch ? ('इयत्ता / बॅच: ' + batch + '\n') : '';

  var body =
    'Dear ' + name + ',\n\n' +
    'Welcome to ' + CENTER_NAME + '!\n\n' +
    'Your student portal account is ready. You can sign in to view your batch, attendance, test results, and announcements.\n\n' +
    'Login page: ' + PORTAL_LOGIN_URL + '\n' +
    'Mobile (username): ' + phone + '\n' +
    'Password: ' + phone + ' (same 10-digit mobile number)\n' +
    batchLine +
    '\nYou can log in right away. If you need help, contact us at ' + CENTER_PHONE + '.\n\n' +
    '------------------------------\n' +
    'नमस्कार ' + name + ',\n\n' +
    CENTER_NAME + ' मध्ये आपले स्वागत आहे!\n\n' +
    'तुमचे विद्यार्थी पोर्टल खाते तयार झाले आहे. बॅच, हजेरी, चाचणी निकाल आणि घोषणा पाहण्यासाठी लॉगिन करा.\n\n' +
    'लॉगिन पृष्ठ: ' + PORTAL_LOGIN_URL + '\n' +
    'मोबाइल (user id): ' + phone + '\n' +
    'पासवर्ड: ' + phone + ' (तोच १० अंकी मोबाइल)\n' +
    batchLineMr +
    '\nतुम्ही लगेच लॉगिन करू शकता. मदत हवी असल्यास ' + CENTER_PHONE + ' वर संपर्क करा.\n\n' +
    'Regards,\n' + CENTER_NAME + '\n' + CENTER_PHONE;

  try {
    MailApp.sendEmail({
      to: email,
      cc: ADMIN_EMAIL,
      name: CENTER_NAME,
      subject: 'Welcome to ' + CENTER_NAME + ' — Student Portal Login',
      body: body
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: 'mail-failed' };
  }
}

/** Admin — welcome email when a student portal account is created. */
function handlePortalWelcome(p) {
  var user = verifyFirebaseToken(p.idToken);
  if (!isAdminUser(user)) {
    return respondAdmin({ result: 'error', error: 'unauthorized' }, p);
  }

  var mailResult = sendPortalWelcomeEmail_(p.name, p.email, p.phone, p.batch);
  if (!mailResult.ok) {
    if (mailResult.skipped) {
      return respondAdmin({ result: 'success', skipped: true }, p);
    }
    return respondAdmin({ result: 'error', error: mailResult.error || 'mail-failed' }, p);
  }
  return respondAdmin({ result: 'success' }, p);
}

// ==================== Sheet read helpers ====================

/** Match a column by exact header title or fuzzy substring (case-insensitive). */
function findColumnIndex_(headers, exactTitle, fuzzyNeedles) {
  var idx = headers.indexOf(exactTitle);
  if (idx >= 0) return idx;
  var i, j, h;
  for (i = 0; i < headers.length; i++) {
    h = String(headers[i] || '').toLowerCase();
    if (!h) continue;
    for (j = 0; j < fuzzyNeedles.length; j++) {
      if (h.indexOf(String(fuzzyNeedles[j]).toLowerCase()) >= 0) return i;
    }
  }
  return -1;
}

function cellStr_(row, idx) {
  if (idx < 0) return '';
  var val = row[idx];
  if (val instanceof Date) return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return val === null || val === undefined ? '' : String(val).trim();
}

/**
 * Student list for daily attendance — Admissions tab only (Google Form responses).
 */
function getAttendanceRosterRows() {
  var seen = {};
  var list = [];

  function addStudent(name, email, mobile, batch) {
    name = String(name || '').trim();
    if (!name) return;
    email = String(email || '').trim();
    mobile = String(mobile || '').trim();
    batch = String(batch || '').trim();
    var key = email && email.indexOf('@') > 0
      ? email.toLowerCase()
      : ('n:' + name.toLowerCase() + '|' + mobile);
    if (seen[key]) return;
    seen[key] = true;
    list.push({ name: name, email: email, mobile: mobile, batch: batch });
  }

  var admSheet = getAdmissionsSheet();
  if (admSheet && admSheet.getLastRow() >= 2) {
    var lastCol = Math.max(admSheet.getLastColumn(), 1);
    var headers = admSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var nameIdx = findColumnIndex_(headers, ADMISSION_Q.NAME, ['student full name', 'full name', 'name']);
    var emailIdx = findColumnIndex_(headers, ADMISSION_Q.EMAIL, ['email']);
    var mobileIdx = findColumnIndex_(headers, ADMISSION_Q.MOBILE, ['mobile', 'whatsapp', 'phone']);
    var classIdx = findColumnIndex_(headers, ADMISSION_Q.CLASS, ['class applying', 'class']);
    var batchIdx = findColumnIndex_(headers, ADMISSION_Q.BATCH, ['batch', 'timing']);
    var data = readSheetData_(admSheet, lastCol);
    var r;
    for (r = 0; r < data.length; r++) {
      var row = data[r];
      var hasData = false;
      var c;
      for (c = 0; c < row.length; c++) {
        if (String(row[c] || '').trim()) { hasData = true; break; }
      }
      if (!hasData) continue;
      var batch = cellStr_(row, classIdx) || cellStr_(row, batchIdx);
      addStudent(cellStr_(row, nameIdx), cellStr_(row, emailIdx), cellStr_(row, mobileIdx), batch);
    }
  }

  list.sort(function (a, b) { return a.name.localeCompare(b.name); });
  return list;
}

function getSheetRows() {
  var sheet = getStudentDataSheet();
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  if (sheetNumDataRows_(sheet) < 1) return [];

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var data = readSheetData_(sheet, lastCol);
  var rows = [];

  for (var r = 0; r < data.length; r++) {
    var row = data[r];
    var hasData = false;
    for (var c = 0; c < row.length; c++) {
      if (String(row[c] || '').trim()) { hasData = true; break; }
    }
    if (!hasData) continue;

    var obj = {};
    HEADERS.forEach(function (key) {
      var idx = headers.indexOf(key);
      var val = idx >= 0 ? row[idx] : '';
      if (val instanceof Date) {
        obj[key] = val.toISOString();
      } else {
        obj[key] = val === null || val === undefined ? '' : String(val);
      }
    });
    rows.push(obj);
  }
  return rows;
}

function getSheetEmails() {
  var emails = [];
  var seen = {};
  getSheetRows().forEach(function (row) {
    var raw = String(row.Email || '').trim();
    var key = raw.toLowerCase();
    if (raw && raw.indexOf('@') > 0 && !seen[key]) {
      seen[key] = true;
      emails.push(raw);
    }
  });
  return emails;
}

/** Emails from the Admissions tab (admitted students). */
function getAdmissionsEmails() {
  var emails = [];
  var seen = {};
  getAdmissionsSheetRows().forEach(function (row) {
    var raw = String(row.Email || '').trim();
    var key = raw.toLowerCase();
    if (raw && raw.indexOf('@') > 0 && !seen[key]) {
      seen[key] = true;
      emails.push(raw);
    }
  });
  return emails;
}

/** Friendly keys → Google Form question titles (row 1 of Admissions tab). */
var ADMISSION_KEYS = {
  Timestamp: 'Timestamp',
  Name: ADMISSION_Q.NAME,
  DOB: ADMISSION_Q.DOB,
  Age: ADMISSION_Q.AGE,
  Gender: ADMISSION_Q.GENDER,
  School: ADMISSION_Q.SCHOOL,
  Class: ADMISSION_Q.CLASS,
  Marks: ADMISSION_Q.MARKS,
  Medium: ADMISSION_Q.MEDIUM,
  Father: ADMISSION_Q.FATHER,
  Mother: ADMISSION_Q.MOTHER,
  Occupation: ADMISSION_Q.OCCUPATION,
  Mobile: ADMISSION_Q.MOBILE,
  AltMobile: ADMISSION_Q.ALT_MOBILE,
  Email: ADMISSION_Q.EMAIL,
  Address: ADMISSION_Q.ADDRESS,
  Batch: ADMISSION_Q.BATCH,
  Referral: ADMISSION_Q.REFERRAL,
  Note: ADMISSION_Q.NOTE,
  FeePlan: ADMISSION_Q.FEE_PLAN,
  PayMode: ADMISSION_Q.PAY_MODE
};

function getAdmissionsSheet() {
  var ss = coachingSpreadsheet_();
  var preferred = [
    ADMISSION_SHEET_NAME,
    'Admissions',
    'Admission',
    'admission',
    'admissions',
    'Form_Responses',
    'Form Responses',
    'Form responses'
  ];
  var i, sheet, nameLower, p;
  for (i = 0; i < preferred.length; i++) {
    sheet = ss.getSheetByName(preferred[i]);
    if (sheet) return sheet;
  }

  // Case-insensitive tab name match (e.g. user renamed to "admission").
  var sheets = ss.getSheets();
  for (i = 0; i < sheets.length; i++) {
    nameLower = sheets[i].getName().toLowerCase();
    if (nameLower === 'admissions' || nameLower === 'admission' ||
        nameLower === 'form_responses' || nameLower.indexOf('form response') === 0) {
      return sheets[i];
    }
  }

  // Fallback: any tab whose header row looks like the admission Google Form.
  for (i = 0; i < sheets.length; i++) {
    sheet = sheets[i];
    var tabName = sheet.getName();
    if (tabName === 'Settings' || tabName === ATTENDANCE_SHEET_NAME) continue;
    if (tabName === 'Sheet1' || tabName === 'Student Data' || tabName === 'Enquiries') continue;
    if (sheet.getLastRow() < 1) continue;
    var lastCol = Math.max(sheet.getLastColumn(), 1);
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    if (findColumnIndex_(headers, ADMISSION_Q.NAME, ['student full name', 'full name', 'name']) >= 0) {
      return sheet;
    }
  }
  return null;
}

/** Read Google Form responses from the Admissions tab; map columns to friendly keys. */
function getAdmissionsSheetRows() {
  var sheet = getAdmissionsSheet();
  if (!sheet) return [];
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  if (sheetNumDataRows_(sheet) < 1) return [];

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var data = readSheetData_(sheet, lastCol);
  var rows = [];

  for (var r = 0; r < data.length; r++) {
    var row = data[r];
    var hasData = false;
    for (var c = 0; c < row.length; c++) {
      if (String(row[c] || '').trim()) { hasData = true; break; }
    }
    if (!hasData) continue;

    var obj = {};
    for (var key in ADMISSION_KEYS) {
      if (!ADMISSION_KEYS.hasOwnProperty(key)) continue;
      var exact = ADMISSION_KEYS[key];
      var idx = headers.indexOf(exact);
      if (idx < 0 && key === 'Name') {
        idx = findColumnIndex_(headers, exact, ['student full name', 'full name', 'name']);
      } else if (idx < 0 && key === 'Class') {
        idx = findColumnIndex_(headers, exact, ['class applying', 'class']);
      } else if (idx < 0 && key === 'Email') {
        idx = findColumnIndex_(headers, exact, ['email']);
      } else if (idx < 0 && key === 'Mobile') {
        idx = findColumnIndex_(headers, exact, ['mobile', 'whatsapp', 'phone']);
      } else if (idx < 0 && key === 'Batch') {
        idx = findColumnIndex_(headers, exact, ['batch', 'timing']);
      }
      var val = idx >= 0 ? row[idx] : '';
      if (val instanceof Date) {
        obj[key] = val.toISOString();
      } else {
        obj[key] = val === null || val === undefined ? '' : String(val);
      }
    }
    rows.push(obj);
  }
  return rows;
}

// ==================== Admission Google Form (run once) ====================

/**
 * Run this FIRST if Apply Online shows "file does not exist".
 * Reads the live form URL linked to your spreadsheet (Admissions tab).
 */
function syncAdmissionFormUrlFromSpreadsheet() {
  var ss = coachingSpreadsheet_();
  var url = ss.getFormUrl();
  if (!url) {
    Logger.log('No form linked to this spreadsheet. Run resetAdmissionFormUrl then createAdmissionGoogleForm.');
    return '';
  }
  var props = PropertiesService.getScriptProperties();
  props.setProperty('ADMISSION_FORM_URL', url);
  var formId = parseFormIdFromUrl_(url);
  if (formId) props.setProperty('ADMISSION_FORM_ID', formId);
  writeSettingsUrl_(ss, url);
  Logger.log('Updated admission form URL:\n' + url);
  return url;
}

/** Clears saved URL so you can create a fresh form (run before createAdmissionGoogleForm). */
function resetAdmissionFormUrl() {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty('ADMISSION_FORM_URL');
  props.deleteProperty('ADMISSION_FORM_ID');
  Logger.log('Cleared saved admission form URL. Now run createAdmissionGoogleForm.');
}

/** Removed from the Google Form — collect on paper / phone if needed. */
var ADMISSION_REMOVE_FROM_FORM_Q = [
  ADMISSION_Q.MOTHER,
  ADMISSION_Q.OCCUPATION,
  ADMISSION_Q.ALT_MOBILE,
  ADMISSION_Q.REFERRAL,
  ADMISSION_Q.NOTE
];

/** Still on the form but not required on submit. */
var ADMISSION_OPTIONAL_Q = [
  ADMISSION_Q.EMAIL,
  ADMISSION_Q.MARKS,
  ADMISSION_Q.BATCH,
  ADMISSION_Q.PAY_MODE
];

/** Extract Google Form ID from a /forms/d/… URL (not /d/e/ encoded publish links). */
function parseFormIdFromUrl_(url) {
  var m = String(url || '').match(/\/forms\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : '';
}

/** Open the linked admission form (script property or spreadsheet form URL). */
function openAdmissionForm_() {
  var props = PropertiesService.getScriptProperties();
  var formId = props.getProperty('ADMISSION_FORM_ID');
  if (formId) {
    try { return FormApp.openById(formId); } catch (err) {}
  }
  formId = parseFormIdFromUrl_(coachingSpreadsheet_().getFormUrl() || '');
  if (!formId) formId = parseFormIdFromUrl_(props.getProperty('ADMISSION_FORM_URL') || '');
  if (!formId) return null;
  try {
    var form = FormApp.openById(formId);
    props.setProperty('ADMISSION_FORM_ID', formId);
    return form;
  } catch (err) {
    return null;
  }
}

/** Delete form questions whose titles match (one pass per title). */
function deleteFormQuestionsByTitle_(form, titles) {
  var deleted = [];
  var missing = [];
  (titles || []).forEach(function (title) {
    var items = form.getItems();
    var i, found = false;
    for (i = 0; i < items.length; i++) {
      if (items[i].getTitle() !== title) continue;
      form.deleteItem(items[i]);
      deleted.push(title);
      found = true;
      break;
    }
    if (!found) missing.push(title);
  });
  return { deleted: deleted, missing: missing };
}

/** Set required flag on a form question matched by exact title. */
function setFormQuestionRequired_(form, title, required) {
  var items = form.getItems();
  var i, item, type;
  for (i = 0; i < items.length; i++) {
    if (items[i].getTitle() !== title) continue;
    type = items[i].getType();
    if (type === FormApp.ItemType.TEXT) {
      items[i].asTextItem().setRequired(required);
    } else if (type === FormApp.ItemType.PARAGRAPH_TEXT) {
      items[i].asParagraphTextItem().setRequired(required);
    } else if (type === FormApp.ItemType.MULTIPLE_CHOICE) {
      items[i].asMultipleChoiceItem().setRequired(required);
    } else if (type === FormApp.ItemType.DATE) {
      items[i].asDateItem().setRequired(required);
    } else {
      return false;
    }
    return true;
  }
  return false;
}

/**
 * FormApp has no native 2-column layout for arbitrary questions (no grid API).
 * Section headers group related fields on one scrollable page.
 * For side-by-side columns on an EXISTING form: open Google Forms → Customize (palette)
 * → Layout → "Two columns" if your account shows it (manual; not available via Apps Script).
 */
function addAdmissionFormQuestions_(form) {
  form.addSectionHeaderItem()
    .setTitle('1. Student details / विद्यार्थी माहिती')
    .setHelpText('Fields marked * are required.');

  form.addTextItem().setTitle(ADMISSION_Q.NAME).setRequired(true);
  form.addDateItem().setTitle(ADMISSION_Q.DOB).setRequired(true);
  form.addTextItem().setTitle(ADMISSION_Q.AGE).setRequired(true);
  form.addMultipleChoiceItem()
    .setTitle(ADMISSION_Q.GENDER).setChoiceValues(['Male', 'Female']).setRequired(true);
  form.addParagraphTextItem().setTitle(ADMISSION_Q.SCHOOL).setRequired(true);
  form.addMultipleChoiceItem()
    .setTitle(ADMISSION_Q.CLASS)
    .setChoiceValues(['Class 8th Maths', 'Class 9th Maths', 'Class 10th Maths (SSC)'])
    .setRequired(true);
  form.addTextItem().setTitle(ADMISSION_Q.MARKS).setRequired(false);
  form.addMultipleChoiceItem()
    .setTitle(ADMISSION_Q.MEDIUM).setChoiceValues(['Marathi', 'Semi-English']).setRequired(true);

  form.addSectionHeaderItem()
    .setTitle('2. Parent / guardian & contact / पालक व संपर्क')
    .setHelpText('Email and batch timing are optional. Mobile number is required.');

  form.addTextItem().setTitle(ADMISSION_Q.FATHER).setRequired(true);
  form.addTextItem().setTitle(ADMISSION_Q.MOBILE).setRequired(true);
  form.addTextItem().setTitle(ADMISSION_Q.EMAIL).setRequired(false);
  form.addParagraphTextItem().setTitle(ADMISSION_Q.ADDRESS).setRequired(true);
  form.addMultipleChoiceItem()
    .setTitle(ADMISSION_Q.BATCH).setChoiceValues(['Morning', 'Evening']).setRequired(false);

  form.addSectionHeaderItem()
    .setTitle('3. Fee payment / शुल्क भरणा');

  form.addMultipleChoiceItem()
    .setTitle(ADMISSION_Q.FEE_PLAN)
    .setChoiceValues(['Monthly', 'Two installments', 'One-time full payment'])
    .setRequired(true);
  form.addMultipleChoiceItem()
    .setTitle(ADMISSION_Q.PAY_MODE)
    .setChoiceValues(['Cash', 'UPI', 'Bank transfer'])
    .setRequired(false);
}

/**
 * Run on an EXISTING Google Form: removes unused questions, sets optional/required flags.
 * Select this function → Run. Also run after pasting updated Code.gs.
 */
function updateAdmissionFormFieldSettings() {
  var form = openAdmissionForm_();
  if (!form) {
    Logger.log('Could not open admission form. Run syncAdmissionFormUrlFromSpreadsheet, or resetAdmissionFormUrl + createAdmissionGoogleForm.');
    return false;
  }

  var removed = deleteFormQuestionsByTitle_(form, ADMISSION_REMOVE_FROM_FORM_Q);
  if (removed.deleted.length) {
    Logger.log('Removed from form: ' + removed.deleted.join(', '));
  }

  var missing = [];
  ADMISSION_OPTIONAL_Q.forEach(function (title) {
    if (!setFormQuestionRequired_(form, title, false)) missing.push(title);
  });

  var requiredQ = [
    ADMISSION_Q.NAME, ADMISSION_Q.DOB, ADMISSION_Q.AGE, ADMISSION_Q.GENDER,
    ADMISSION_Q.SCHOOL, ADMISSION_Q.CLASS, ADMISSION_Q.MEDIUM, ADMISSION_Q.FATHER,
    ADMISSION_Q.MOBILE, ADMISSION_Q.ADDRESS, ADMISSION_Q.FEE_PLAN
  ];
  requiredQ.forEach(function (title) {
    if (!setFormQuestionRequired_(form, title, true)) missing.push(title + ' (required)');
  });

  if (missing.length) {
    Logger.log('Some questions were not found (check titles match ADMISSION_Q): ' + missing.join(', '));
  }
  Logger.log('Updated field settings on: ' + form.getPublishedUrl());
  Logger.log('2-column layout: open the form in EDIT mode (not preview) → paint icon Customize → Layout → Two columns.');
  Logger.log('If Layout is missing, your Google account may not support it yet — the form stays single column.');
  return true;
}

/** Select this function → click ▶ Run → copy link from Execution log (not a popup) */
function createAdmissionGoogleForm() {
  var ss = coachingSpreadsheet_();
  var props = PropertiesService.getScriptProperties();
  var existingUrl = props.getProperty('ADMISSION_FORM_URL');

  if (existingUrl) {
    var synced = syncAdmissionFormUrlFromSpreadsheet();
    if (synced) return synced;
    Logger.log('Saved URL missing or stale. Run resetAdmissionFormUrl then run this again.');
    return existingUrl;
  }

  Logger.log('Step 1/5: Creating Google Form…');
  var form = FormApp.create(ADMISSION_FORM_TITLE);
  form.setDescription(
    'Maharashtra State Board (SSC) Maths coaching · Class 8th, 9th & 10th · Admissions 2026–27'
  );
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(false);
  form.setConfirmationMessage(
    'Thank you! Your admission form has been received. We will contact you shortly.'
  );

  Logger.log('Step 2/5: Adding questions (section headers; no 2-column FormApp API)…');
  addAdmissionFormQuestions_(form);

  Logger.log('Step 3/5: Linking form to spreadsheet (can take 1–2 minutes)…');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  SpreadsheetApp.flush();
  renameFormResponseSheet_(ss, ADMISSION_SHEET_NAME);

  var publishedUrl = form.getPublishedUrl();
  props.setProperty('ADMISSION_FORM_URL', publishedUrl);
  props.setProperty('ADMISSION_FORM_ID', form.getId());

  Logger.log('Step 4/5: Saving URL to Settings tab…');
  writeSettingsUrl_(ss, publishedUrl);

  Logger.log('Step 5/5: Installing form-submit trigger…');
  installAdmissionFormTrigger_(ss.getId());

  Logger.log('DONE — Admission Google Form created!');
  Logger.log('COPY THIS LINK:\n' + publishedUrl);
  Logger.log('Responses → "' + ADMISSION_SHEET_NAME + '" tab. Summary rows → main Student Data sheet.');
  return publishedUrl;
}

/** Runs automatically when someone submits the Google Form */
function onAdmissionFormSubmit(e) {
  if (!e || !e.namedValues) return;

  var nv = e.namedValues;
  function val(key) {
    var v = nv[key];
    return v && v[0] ? String(v[0]).trim() : '';
  }

  var studentName = val(ADMISSION_Q.NAME);
  var mobile = val(ADMISSION_Q.MOBILE);
  var email = val(ADMISSION_Q.EMAIL);
  var course = val(ADMISSION_Q.CLASS);

  var message = [
    'DOB: ' + val(ADMISSION_Q.DOB),
    'Age: ' + val(ADMISSION_Q.AGE),
    'Gender: ' + val(ADMISSION_Q.GENDER),
    'School: ' + val(ADMISSION_Q.SCHOOL),
    'Father: ' + val(ADMISSION_Q.FATHER),
    'Mother: ' + val(ADMISSION_Q.MOTHER),
    'Occupation: ' + val(ADMISSION_Q.OCCUPATION),
    'Alt mobile: ' + val(ADMISSION_Q.ALT_MOBILE),
    'Address: ' + val(ADMISSION_Q.ADDRESS),
    'Marks%: ' + val(ADMISSION_Q.MARKS),
    'Medium: ' + val(ADMISSION_Q.MEDIUM),
    'Timing: ' + val(ADMISSION_Q.BATCH),
    'Referral: ' + val(ADMISSION_Q.REFERRAL),
    'Note: ' + val(ADMISSION_Q.NOTE),
    'Fee plan: ' + val(ADMISSION_Q.FEE_PLAN),
    'Pay mode: ' + val(ADMISSION_Q.PAY_MODE)
  ].join(' | ');

  var ss = coachingSpreadsheet_();
  var mainSheet = getStudentDataSheet();
  var mainHeaders = mainSheet.getRange(1, 1, 1, Math.max(mainSheet.getLastColumn(), 1)).getValues()[0];

  HEADERS.forEach(function (h) {
    if (mainHeaders.indexOf(h) === -1) {
      mainSheet.getRange(1, mainHeaders.length + 1).setValue(h);
      mainHeaders.push(h);
    }
  });

  var rowMap = {
    Timestamp: new Date(),
    Name: studentName,
    Phone: mobile,
    Email: email,
    Purpose: 'Admission',
    Course: course,
    Message: message,
    Language: 'en'
  };
  mainSheet.appendRow(mainHeaders.map(function (h) {
    return Object.prototype.hasOwnProperty.call(rowMap, h) ? rowMap[h] : '';
  }));

  try {
    MailApp.sendEmail({
      to: ADMIN_EMAIL,
      subject: 'New admission (Google Form): ' + studentName + ' — ' + course,
      body: 'New admission via Google Form.\n\n' +
            'Name: ' + studentName + '\nPhone: ' + mobile + '\nEmail: ' + email +
            '\nClass: ' + course + '\n\nSee "' + ADMISSION_SHEET_NAME + '" tab for full details.\n' +
            'Time: ' + new Date()
    });
  } catch (err) {}
}

function renameFormResponseSheet_(ss, desiredName) {
  var sheets = ss.getSheets();
  var i, name;
  for (i = sheets.length - 1; i >= 0; i--) {
    name = sheets[i].getName();
    if (name.indexOf('Form Responses') === 0 || name.indexOf('Form_Responses') === 0) {
      if (ss.getSheetByName(desiredName) && name !== desiredName) {
        sheets[i].setName(desiredName + ' ' + new Date().getTime());
      } else {
        sheets[i].setName(desiredName);
      }
      return;
    }
  }
}

function writeSettingsUrl_(ss, url) {
  var settings = ss.getSheetByName('Settings');
  if (!settings) settings = ss.insertSheet('Settings');
  settings.getRange('A1').setValue('Admission Google Form URL');
  settings.getRange('B1').setValue(url);
}

function installAdmissionFormTrigger_(spreadsheetId) {
  var triggers = ScriptApp.getProjectTriggers();
  var t;
  for (t = 0; t < triggers.length; t++) {
    if (triggers[t].getHandlerFunction() === 'onAdmissionFormSubmit') {
      ScriptApp.deleteTrigger(triggers[t]);
    }
  }
  ScriptApp.newTrigger('onAdmissionFormSubmit')
    .forSpreadsheet(spreadsheetId)
    .onFormSubmit()
    .create();
}

// ==================== Shared helpers ====================

function verifyFirebaseToken(idToken) {
  if (!idToken) return null;
  try {
    var resp = UrlFetchApp.fetch(
      'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FIREBASE_API_KEY,
      {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ idToken: idToken }),
        muteHttpExceptions: true
      }
    );
    if (resp.getResponseCode() !== 200) return null;
    var data = JSON.parse(resp.getContentText());
    return (data.users && data.users.length) ? data.users[0] : null;
  } catch (err) {
    return null;
  }
}

function isAdminUser(user) {
  return user && user.email &&
    ADMIN_EMAILS.indexOf(String(user.email).toLowerCase()) !== -1;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonp(obj, callback) {
  var text = JSON.stringify(obj);
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + text + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return json(obj);
}
