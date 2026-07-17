/**
 * Bhasme Sir Coaching Center — Admission Google Form
 *
 * HOW TO USE (one time):
 * 1. Open your **Student Data** Google Spreadsheet (same sheet used for website enquiries).
 * 2. Extensions → Apps Script.
 * 3. Paste this entire file at the **bottom** of your existing project (keep doPost, doGet, etc.).
 * 4. Run **createAdmissionGoogleForm** once (authorize when asked).
 *    — OR on an existing form, run **updateAdmissionFormFieldSettings** to apply optional/required flags.
 * 5. Copy the form URL from the popup → it is also saved on the **Settings** tab (cell B1).
 * 6. Deploy → Manage deployments → Edit → **New version** → Deploy (so the website can read the link).
 * 7. Add the trigger if the script did not create it: Triggers → onAdmissionFormSubmit → From spreadsheet → On form submit.
 *
 * Requires ADMIN_EMAIL to already be defined in your project (e.g. bhasmesircoachingcenter@gmail.com).
 */

var ADMISSION_SHEET_NAME = 'Admissions';
var ADMISSION_FORM_TITLE = 'Bhasme Sir Coaching Center — Admission Form';

/** Question titles — must match Form items exactly (used by onAdmissionFormSubmit). */
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

var ADMISSION_OPTIONAL_Q = [
  ADMISSION_Q.MOTHER,
  ADMISSION_Q.OCCUPATION,
  ADMISSION_Q.ALT_MOBILE,
  ADMISSION_Q.EMAIL,
  ADMISSION_Q.REFERRAL,
  ADMISSION_Q.NOTE,
  ADMISSION_Q.MARKS,
  ADMISSION_Q.BATCH,
  ADMISSION_Q.PAY_MODE
];

function parseFormIdFromUrl_(url) {
  var m = String(url || '').match(/\/forms\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : '';
}

function openAdmissionForm_() {
  var props = PropertiesService.getScriptProperties();
  var formId = props.getProperty('ADMISSION_FORM_ID');
  if (formId) {
    try { return FormApp.openById(formId); } catch (err) {}
  }
  formId = parseFormIdFromUrl_(SpreadsheetApp.getActiveSpreadsheet().getFormUrl() || '');
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
 * FormApp has no 2-column layout API. Section headers group fields visually.
 * For side-by-side columns: Form editor → Customize → Layout → Two columns (manual).
 */
function addAdmissionFormQuestions_(form) {
  form.addSectionHeaderItem()
    .setTitle('1. Student details / विद्यार्थी माहिती')
    .setHelpText('Fields marked * are required.');

  form.addTextItem().setTitle(ADMISSION_Q.NAME).setRequired(true);
  form.addDateItem().setTitle(ADMISSION_Q.DOB).setRequired(true);
  form.addTextItem().setTitle(ADMISSION_Q.AGE).setRequired(true);
  form.addMultipleChoiceItem()
    .setTitle(ADMISSION_Q.GENDER)
    .setChoiceValues(['Male', 'Female'])
    .setRequired(true);
  form.addParagraphTextItem().setTitle(ADMISSION_Q.SCHOOL).setRequired(true);
  form.addMultipleChoiceItem()
    .setTitle(ADMISSION_Q.CLASS)
    .setChoiceValues(['Class 8th Maths', 'Class 9th Maths', 'Class 10th Maths (SSC)'])
    .setRequired(true);
  form.addTextItem().setTitle(ADMISSION_Q.MARKS).setRequired(false);
  form.addMultipleChoiceItem()
    .setTitle(ADMISSION_Q.MEDIUM)
    .setChoiceValues(['Marathi', 'Semi-English'])
    .setRequired(true);

  form.addSectionHeaderItem()
    .setTitle('2. Parent / guardian & contact / पालक व संपर्क')
    .setHelpText("Mother's name, occupation, and alternate mobile are optional.");

  form.addTextItem().setTitle(ADMISSION_Q.FATHER).setRequired(true);
  form.addTextItem().setTitle(ADMISSION_Q.MOTHER).setRequired(false);
  form.addTextItem().setTitle(ADMISSION_Q.OCCUPATION).setRequired(false);
  form.addTextItem().setTitle(ADMISSION_Q.MOBILE).setRequired(true);
  form.addTextItem().setTitle(ADMISSION_Q.ALT_MOBILE).setRequired(false);
  form.addTextItem().setTitle(ADMISSION_Q.EMAIL).setRequired(false);
  form.addParagraphTextItem().setTitle(ADMISSION_Q.ADDRESS).setRequired(true);

  form.addSectionHeaderItem()
    .setTitle('3. Batch & other / इतर माहिती')
    .setHelpText('Referral and special note are optional.');

  form.addMultipleChoiceItem()
    .setTitle(ADMISSION_Q.BATCH)
    .setChoiceValues(['Morning', 'Evening'])
    .setRequired(false);
  form.addMultipleChoiceItem()
    .setTitle(ADMISSION_Q.REFERRAL)
    .setChoiceValues(['Friend', 'Social media', 'Flyer', 'Website', 'Other'])
    .setRequired(false);
  form.addParagraphTextItem().setTitle(ADMISSION_Q.NOTE).setRequired(false);

  form.addSectionHeaderItem()
    .setTitle('4. Fee payment / शुल्क भरणा');

  form.addMultipleChoiceItem()
    .setTitle(ADMISSION_Q.FEE_PLAN)
    .setChoiceValues(['Monthly', 'Two installments', 'One-time full payment'])
    .setRequired(true);
  form.addMultipleChoiceItem()
    .setTitle(ADMISSION_Q.PAY_MODE)
    .setChoiceValues(['Cash', 'UPI', 'Bank transfer'])
    .setRequired(false);
}

/** Run on an EXISTING form to set optional/required flags without recreating the form. */
function updateAdmissionFormFieldSettings() {
  var form = openAdmissionForm_();
  if (!form) {
    SpreadsheetApp.getUi().alert(
      'Form not found',
      'Could not open the admission form. Ensure ADMISSION_FORM_ID is set or the form is linked to this spreadsheet.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return false;
  }

  ADMISSION_OPTIONAL_Q.forEach(function (title) {
    setFormQuestionRequired_(form, title, false);
  });

  var requiredQ = [
    ADMISSION_Q.NAME, ADMISSION_Q.DOB, ADMISSION_Q.AGE, ADMISSION_Q.GENDER,
    ADMISSION_Q.SCHOOL, ADMISSION_Q.CLASS, ADMISSION_Q.MEDIUM, ADMISSION_Q.FATHER,
    ADMISSION_Q.MOBILE, ADMISSION_Q.ADDRESS, ADMISSION_Q.FEE_PLAN
  ];
  requiredQ.forEach(function (title) {
    setFormQuestionRequired_(form, title, true);
  });

  SpreadsheetApp.getUi().alert(
    'Form updated',
    'Optional fields are no longer required.\n\nFor 2-column layout: open the form → Customize → Layout → Two columns (if available).\n\n' + form.getPublishedUrl(),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return true;
}

/**
 * Run once: creates the Google Form, links responses to this spreadsheet (Admissions tab),
 * stores the public URL, and installs the on-form-submit trigger.
 */
function createAdmissionGoogleForm() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var props = PropertiesService.getScriptProperties();
  var existingUrl = props.getProperty('ADMISSION_FORM_URL');
  if (existingUrl) {
    SpreadsheetApp.getUi().alert(
      'Admission form already exists',
      'Use this link (also on Settings!B1):\n\n' + existingUrl +
        '\n\nTo fix required/optional on the live form, run updateAdmissionFormFieldSettings instead.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return existingUrl;
  }

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

  addAdmissionFormQuestions_(form);

  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  Utilities.sleep(1500);
  renameFormResponseSheet_(ss, ADMISSION_SHEET_NAME);

  var publishedUrl = form.getPublishedUrl();
  var formId = form.getId();
  props.setProperty('ADMISSION_FORM_URL', publishedUrl);
  props.setProperty('ADMISSION_FORM_ID', formId);

  writeSettingsUrl_(ss, publishedUrl);
  installAdmissionFormTrigger_(ss.getId());

  SpreadsheetApp.getUi().alert(
    'Admission Google Form created',
    'Share this link on your website and WhatsApp:\n\n' + publishedUrl +
      '\n\nResponses save to the "' + ADMISSION_SHEET_NAME + '" tab. ' +
      'A summary row is also added to your main Student Data sheet (Purpose = Admission).',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return publishedUrl;
}

/** Append summary row to main Student Data sheet when someone submits the Google Form. */
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

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var mainSheet = ss.getSheets()[0];
  var mainHeaders = mainSheet.getRange(1, 1, 1, Math.max(mainSheet.getLastColumn(), 1)).getValues()[0];
  var required = ['Timestamp', 'Name', 'Phone', 'Email', 'Purpose', 'Course', 'Message', 'Language'];
  required.forEach(function (h) {
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
    if (typeof ADMIN_EMAIL !== 'undefined' && ADMIN_EMAIL) {
      MailApp.sendEmail({
        to: ADMIN_EMAIL,
        subject: 'New admission (Google Form): ' + studentName + ' — ' + course,
        body:
          'A new admission form was submitted via Google Form.\n\n' +
          'Name: ' + studentName + '\nPhone: ' + mobile + '\nEmail: ' + email + '\nClass: ' + course +
          '\n\nFull details: "' + ADMISSION_SHEET_NAME + '" tab + summary on Student Data.\nTime: ' + new Date()
      });
    }
  } catch (err) {}
}

/**
 * Add this block inside your existing doGet(e) (before the final error response):
 *
 *   if (action === 'admissionform') {
 *     var admUrl = PropertiesService.getScriptProperties().getProperty('ADMISSION_FORM_URL') || '';
 *     return jsonpResponse({ ok: true, url: admUrl }, callback);
 *   }
 *
 * Use the same jsonpResponse / callback pattern as your `action=enquiries` handler.
 */
function getAdmissionFormUrl_() {
  return PropertiesService.getScriptProperties().getProperty('ADMISSION_FORM_URL') || '';
}

function renameFormResponseSheet_(ss, desiredName) {
  var sheets = ss.getSheets();
  var i;
  for (i = sheets.length - 1; i >= 0; i--) {
    var name = sheets[i].getName();
    if (name.indexOf('Form Responses') === 0) {
      if (ss.getSheetByName(desiredName) && name !== desiredName) {
        sheets[i].setName(desiredName + ' ' + (new Date().getTime()));
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
