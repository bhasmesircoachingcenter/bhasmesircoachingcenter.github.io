# Admission Google Form → Student Data Sheet

Online admissions use a **Google Form** that saves to the **same Google Spreadsheet** already connected to your website and admin portal.

| Where data goes | What |
|-----------------|------|
| **Admissions** tab | Full form response (every field) |
| **Student Data** tab (row 1 sheet) | Summary row — same columns as website enquiries (`Name`, `Phone`, `Email`, `Purpose` = Admission, `Course`, `Message`, …) |
| **Admin portal** → Student Details → Enquiry / Both | Shows admission rows from the main sheet |
| **Email** | Notification to `bhasmesircoachingcenter@gmail.com` |

Physical print form: `admission-form.pdf` (same fields).

---

## One-time setup (~5 minutes)

### 1. Add the script

1. Open your **Student Data** spreadsheet (the one linked to the website).
2. **Extensions → Apps Script**.
3. Open `admission/apps-script-admission.gs` from this project and **paste it at the bottom** of your Apps Script project.  
   Do **not** delete your existing `doPost`, `doGet`, `handleEnquiry`, broadcast code, etc.

### 2. Create or update the form

**New form (run once):**

1. In Apps Script, select **`createAdmissionGoogleForm`** from the function dropdown.
2. Click **Run** → authorize when prompted.
3. Copy the **form link** from the popup. It is also saved on spreadsheet tab **Settings → B1**.

**Existing form (optional fields still required on live form):**

1. Paste updated `Code.gs` / `apps-script-admission.gs` into Apps Script and Save.
2. Run **`updateAdmissionFormFieldSettings`** once — sets Mother's name, Occupation, Alternate mobile, **Email**, Referral, Special note, batch timing, and payment mode to optional without recreating the form.
3. For **2-column layout** (Google Forms UI only): open the form → **Customize** (palette icon) → **Layout** → **Two columns** if your account shows it. The Apps Script FormApp API does not support this.

To recreate from scratch: run **`resetAdmissionFormUrl`**, then **`createAdmissionGoogleForm`** again (old form link will stop working).

### 3. Expose the link to the website

Inside your existing **`doGet(e)`**, add (use the same JSONP helper as `action=enquiries`):

```javascript
if (action === 'admissionform') {
  var admUrl = PropertiesService.getScriptProperties().getProperty('ADMISSION_FORM_URL') || '';
  return jsonpResponse({ ok: true, url: admUrl }, callback);
}
```

Then **Deploy → Manage deployments → Edit → New version → Deploy**.

The website **Apply Online** button loads this URL automatically after you redeploy.

### 4. Test

1. Submit a test response on the Google Form.
2. Check **Admissions** tab — full row appears.
3. Check main **Student Data** tab — new row with `Purpose` = `Admission`.
4. Open admin portal → **Student Details** → **Enquiry** or **Both** — test row visible.

---

## Manual form link (optional)

If you prefer not to use `doGet`, paste the form URL into `website/script.js`:

```javascript
var ADMISSION_FORM_URL = "https://docs.google.com/forms/d/e/…/viewform";
```

---

## Checklist

- [ ] Pasted `apps-script-admission.gs` into Apps Script
- [ ] Ran `createAdmissionGoogleForm` once **or** `updateAdmissionFormFieldSettings` on existing form
- [ ] Added `admissionform` to `doGet` and redeployed web app
- [ ] Test submission → Admissions tab + Student Data tab + admin table
- [ ] **Apply Online** on website opens the form

---

## Paper forms

For in-person admissions, print `admission-form.pdf`. You can re-type answers into the Google Form or add a row manually on the **Admissions** tab.
