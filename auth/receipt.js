import { db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function el(id) { return document.getElementById(id); }

function formatRupee(amount) {
  var n = Number(amount);
  if (!isFinite(n)) return "₹0";
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function formatDate(iso) {
  if (!iso) return "—";
  var d = new Date(iso + "T12:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderReceipt(data) {
  var noteHtml = data.note
    ? '<div class="note"><strong>Note / टीप:</strong> ' + esc(data.note) + "</div>"
    : "";
  var discountHtml = data.discounted
    ? '<div class="note">Discount applied / सवलत लागू</div>'
    : "";

  return (
    '<div class="page">' +
    '<div class="head"><h1>Bhasme Sir Coaching Center</h1>' +
    "<p>Math's Coaching by Bhasme Sir</p>" +
    '<span class="badge">Fee Receipt / फी पावती</span></div>' +
    '<div class="body">' +
    '<div class="meta">' +
    '<div><strong>Receipt No / पावती क्र.</strong>' + esc(data.receiptNo) + "</div>" +
    '<div><strong>Date / तारीख</strong>' + esc(formatDate(data.paymentDate)) + "</div>" +
    "</div>" +
    '<div class="student-box"><h2>Student Details / विद्यार्थी माहिती</h2>' +
    '<div class="student-grid">' +
    "<div><strong>Name:</strong> " + esc(data.studentName) + "</div>" +
    "<div><strong>Class:</strong> " + esc(data.classLabel) + "</div>" +
    "<div><strong>Email:</strong> " + esc(data.email) + "</div>" +
    "<div><strong>Mobile:</strong> " + esc(data.mobile) + "</div>" +
    "</div></div>" +
    "<table><thead><tr><th>Description / वर्णन</th><th class=\"amount\">Amount / रक्कम</th></tr></thead><tbody>" +
    "<tr><td>Payment plan / योजना — " + esc(data.paymentPlan) + '</td><td class="amount">—</td></tr>' +
    "<tr><td>Course fee / अभ्यासक्रम शुल्क</td><td class=\"amount\">" + formatRupee(data.courseFee) + "</td></tr>" +
    "<tr><td>Registration fee / नोंदणी शुल्क</td><td class=\"amount\">" + formatRupee(data.registrationFee) + "</td></tr>" +
    "<tr><td>Amount paid / भरलेली रक्कम</td><td class=\"amount\">" + formatRupee(data.amountPaid) + "</td></tr>" +
    '<tr class="total"><td>Balance due / बाकी</td><td class="amount">' + formatRupee(data.balance) + "</td></tr>" +
    "</tbody></table>" +
    discountHtml + noteHtml +
    '<div class="footer"><strong>Thank you for your payment.</strong><br>आपल्या पेमेंटबद्दल धन्यवाद.<br><br>' +
    "Bhasme Sir Coaching Center · +91 70585 05983<br>This is a computer-generated receipt.</div>" +
    '<div class="print-row"><button type="button" class="print-btn" onclick="window.print()">Print / Save as PDF</button></div>' +
    "</div></div>"
  );
}

function getToken() {
  var params = new URLSearchParams(window.location.search);
  return String(params.get("r") || "").trim();
}

var token = getToken();
if (!token) {
  el("loadingView").classList.add("hidden");
  el("errorView").classList.remove("hidden");
} else {
  getDoc(doc(db, "feeReceiptLinks", token))
    .then(function (snap) {
      el("loadingView").classList.add("hidden");
      if (!snap.exists()) {
        el("errorView").classList.remove("hidden");
        return;
      }
      var view = el("receiptView");
      view.innerHTML = renderReceipt(snap.data());
      view.classList.remove("hidden");
      document.title = "Receipt " + (snap.data().receiptNo || "") + " | Bhasme Sir Coaching Center";
    })
    .catch(function () {
      el("loadingView").classList.add("hidden");
      el("errorView").classList.remove("hidden");
    });
}
