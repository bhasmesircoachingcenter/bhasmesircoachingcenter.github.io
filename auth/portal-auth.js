// Shared portal login helpers — username = first initial + surname (e.g. jsahare).
// Firebase Email/Password uses a synthetic address: username@portal.bhasmesircoaching.in
// Password = 10-digit mobile number.

export var PORTAL_AUTH_EMAIL_SUFFIX = "@portal.bhasmesircoaching.in";

export function normalizePhone(raw) {
  var digits = String(raw || "").replace(/[\s\-()]/g, "");
  digits = digits.replace(/^\+91/, "").replace(/^0+/, "");
  if (/^[6-9]\d{9}$/.test(digits)) return digits;
  return null;
}

/** e.g. Jayant Roashanji Sahare → jsahare · Dhiraj Bhasme → dbhasme */
export function portalUsernameFromName(fullName) {
  var parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  var first = parts[0].replace(/[^a-zA-Z]/g, "");
  if (!first) return null;
  if (parts.length === 1) {
    return (first.charAt(0) + first.slice(1)).toLowerCase();
  }
  var surname = parts[parts.length - 1].replace(/[^a-zA-Z]/g, "");
  if (!surname) return null;
  var user = first.charAt(0).toLowerCase() + surname.toLowerCase();
  return user.length >= 2 ? user : null;
}

export function normalizePortalUsername(raw) {
  var s = String(raw || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return s.length >= 2 ? s : null;
}

export function portalAuthEmailFromUsername(username) {
  username = normalizePortalUsername(username);
  if (!username) return null;
  return username + PORTAL_AUTH_EMAIL_SUFFIX;
}

/** Legacy accounts — mobile as Firebase email local-part. */
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

export function collectTakenPortalUsernames(students) {
  var taken = {};
  (students || []).forEach(function (s) {
    var u = normalizePortalUsername(s && s.username);
    if (u) taken[u] = true;
  });
  return taken;
}

/** Pick a unique username; suffix with last 2 digits of mobile or a number if needed. */
export function ensureUniquePortalUsername(fullName, takenMap, phone) {
  var base = portalUsernameFromName(fullName);
  if (!base) return null;
  takenMap = takenMap || {};
  if (!takenMap[base]) return base;
  phone = normalizePhone(phone);
  if (phone) {
    var suffixed = base + phone.slice(-2);
    if (!takenMap[suffixed]) return suffixed;
  }
  var n = 2;
  while (takenMap[base + String(n)]) n++;
  return base + String(n);
}

/** Login field: username (jsahare), legacy 10-digit mobile, or admin email. */
export function resolveStudentLoginEmail(input) {
  var value = String(input || "").trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return value;
  if (/^[\d\s+\-()]+$/.test(value)) {
    var phone = normalizePhone(value);
    if (phone) return portalAuthEmail(phone);
  }
  var username = normalizePortalUsername(value);
  if (username) return portalAuthEmailFromUsername(username);
  return null;
}
