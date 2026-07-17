// Shared portal login helpers — mobile is the student user id.
// Firebase Email/Password uses a synthetic address derived from the mobile number.

export var PORTAL_AUTH_EMAIL_SUFFIX = "@portal.bhasmesircoaching.in";

export function normalizePhone(raw) {
  var digits = String(raw || "").replace(/[\s\-()]/g, "");
  digits = digits.replace(/^\+91/, "").replace(/^0+/, "");
  if (/^[6-9]\d{9}$/.test(digits)) return digits;
  return null;
}

export function portalAuthEmail(phone) {
  phone = normalizePhone(phone);
  if (!phone) return null;
  return phone + PORTAL_AUTH_EMAIL_SUFFIX;
}

/** Real contact email only (empty if missing or invalid). Never returns synthetic auth email. */
export function optionalContactEmail(raw) {
  var email = String(raw || "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "";
  if (email.endsWith(PORTAL_AUTH_EMAIL_SUFFIX)) return "";
  return email;
}

/** Login field: 10-digit mobile (new accounts) or legacy admission email. */
export function resolveStudentLoginEmail(input) {
  var value = String(input || "").trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return value;
  return portalAuthEmail(value);
}
