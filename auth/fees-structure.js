// Admin-only fee defaults and helpers (not shown to students).

export var DEFAULT_REGISTRATION_FEE = 500;

export var PAYMENT_PLANS = [
  { value: "onetime", labelEn: "One-time full payment", labelMr: "एकवेळ पूर्ण भरणा" },
  { value: "installment", labelEn: "Monthly / Quarterly", labelMr: "मासिक / त्रैमासिक" },
  { value: "two-installments", labelEn: "Two installments", labelMr: "दोन हप्त्यात" }
];

var CLASS_RATES = {
  "8th": { onetime: 3000, installment: 3500 },
  "9th": { onetime: 3500, installment: 4000 },
  "10th": { onetime: 4000, installment: 4500 }
};

export function formatRupee(amount) {
  var n = Number(amount);
  if (!isFinite(n)) return "₹0";
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

/** Map admission class/batch text → 8th | 9th | 10th */
export function detectClassKey(batchOrClass) {
  var s = String(batchOrClass || "").toLowerCase();
  if (/\b10|ssc|दहावी|१०/.test(s)) return "10th";
  if (/\b9|नववी|९/.test(s)) return "9th";
  if (/\b8|आठवी|८/.test(s)) return "8th";
  return "";
}

export function suggestCourseFee(classKey, paymentPlan) {
  var rates = CLASS_RATES[classKey];
  if (!rates) return 0;
  if (paymentPlan === "installment") return rates.installment;
  return rates.onetime;
}

export function defaultRatesReferenceHtml(lang) {
  var mr = lang === "mr";
  var rows = [
    ["8th", 3000, 3500],
    ["9th", 3500, 4000],
    ["10th", 4000, 4500]
  ];
  var head = mr
    ? "<p><strong>संदर्भ (८ महिने):</strong> नोंदणी ₹५०० अंतिम शुल्कात समायोजित.</p>"
    : "<p><strong>Reference (8 months):</strong> Registration ₹500 adjusted in final fee.</p>";
  var tbl =
    "<table class='data-table fees-ref-table'><thead><tr>" +
    "<th>" + (mr ? "इयत्ता" : "Class") + "</th>" +
    "<th>" + (mr ? "एकवेळ" : "One-time") + "</th>" +
    "<th>" + (mr ? "मासिक/त्रैमासिक" : "Monthly/Quarterly") + "</th>" +
    "</tr></thead><tbody>";
  rows.forEach(function (r) {
    tbl += "<tr><td>" + r[0] + "</td><td>" + formatRupee(r[1]) + "</td><td>" + formatRupee(r[2]) + "</td></tr>";
  });
  return head + tbl + "</tbody></table>";
}

export function computeBalance(courseFee, amountPaid) {
  var fee = Number(courseFee) || 0;
  var paid = Number(amountPaid) || 0;
  return Math.max(0, fee - paid);
}

export function normalizeStudentFeesRecord(raw, student) {
  var classKey = detectClassKey((raw && raw.classKey) || (student && student.batch) || "");
  var plan = String((raw && raw.paymentPlan) || "onetime");
  if (PAYMENT_PLANS.every(function (p) { return p.value !== plan; })) plan = "onetime";

  var courseFee = Number(raw && raw.courseFee);
  if (!isFinite(courseFee) || courseFee < 0) {
    courseFee = suggestCourseFee(classKey, plan);
  }

  var registrationFee = Number(raw && raw.registrationFee);
  if (!isFinite(registrationFee) || registrationFee < 0) {
    registrationFee = DEFAULT_REGISTRATION_FEE;
  }

  var amountPaid = Number(raw && raw.amountPaid);
  if (!isFinite(amountPaid) || amountPaid < 0) amountPaid = 0;

  var discounted = !!(raw && raw.discounted);
  var balance;
  if (discounted && raw && raw.balance !== undefined && raw.balance !== null && raw.balance !== "") {
    balance = Number(raw.balance);
    if (!isFinite(balance) || balance < 0) balance = 0;
    balance = Math.round(balance);
  } else {
    balance = computeBalance(courseFee, amountPaid);
  }

  return {
    studentKey: (raw && raw.studentKey) || "",
    name: String((raw && raw.name) || (student && student.name) || "").trim(),
    email: String((raw && raw.email) || (student && student.email) || "").trim(),
    mobile: String((raw && raw.mobile) || (student && student.mobile) || "").trim(),
    classKey: classKey,
    paymentPlan: plan,
    courseFee: Math.round(courseFee),
    registrationFee: Math.round(registrationFee),
    amountPaid: Math.round(amountPaid),
    discounted: discounted,
    balance: balance,
    paymentDate: String((raw && raw.paymentDate) || "").trim(),
    receiptNo: String((raw && raw.receiptNo) || "").trim(),
    note: String((raw && raw.note) || "").trim()
  };
}
