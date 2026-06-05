(function () {
  "use strict";

  /* ---------------- Translations ---------------- */
  var I18N = {
    en: {
      "meta.title": "Bhasme Sir Coaching Center | Maths Classes for 8th, 9th & 10th",
      "brand.name": "Bhasme Sir",
      "brand.full": "Bhasme Sir Coaching Center",
      "brand.sub": "Coaching Center",
      "nav.home": "Home",
      "nav.about": "About",
      "nav.courses": "Courses",
      "nav.videos": "Videos",
      "nav.why": "Why Us",
      "nav.admissions": "Admissions",
      "nav.contact": "Contact",
      "nav.login": "Login",
      "nav.demo": "Book Free Demo",

      "promo.headline": '1 Week <span class="promo-free">FREE</span> Demo Classes — Starting Soon!',
      "promo.sub": "Experience Bhasme Sir's teaching before you enroll. Reserve your free seat today!",
      "promo.cta": "Book Free Demo",

      "hero.eyebrow": "Maharashtra State Board (SSC) • Maths Coaching • Admissions Open",
      "hero.h1": 'Build Your Foundation with <span class="accent">Bhasme Sir</span>',
      "hero.lead": 'Build strong concepts, solve faster, and score higher. Personalised, small-batch maths coaching for <strong>Classes 8th, 9th &amp; 10th (SSC)</strong>. New batches start <strong>1 July 2026</strong>.',
      "hero.demo": "Book a Free Demo Class",
      "hero.viewCourses": "View Courses",
      "hero.stat1num": "35",
      "hero.stat1": "Years Experience",
      "hero.stat2num": "8–10",
      "hero.stat2": "Std Maths Batches",
      "hero.stat3num": "SSC",
      "hero.stat3": "Exam Focused",

      "about.eyebrow": "About",
      "about.h2": "Learning Mathematics, the right way",
      "about.caption": "Bhasme Sir<span>Founder &amp; Maths Teacher</span>",
      "about.award": "🏆 Awarded Best Maths Teacher in Town",
      "about.h3": "Meet Bhasme Sir",
      "about.p1": 'A distinguished educator with <strong>35 years of service</strong>, Bhasme Sir is a <strong>retired Principal</strong> and an awarded <strong>Best Maths Teacher</strong>. Under his guidance, generations of students have mastered mathematics and gone on to become doctors, engineers, lawyers, administrative officers and respected professionals.',
      "about.p2": "His approach clears fundamental concepts first, then builds speed and accuracy through structured practice. Every student gets personal attention, expert guidance, regular feedback, and a clear roadmap to score well in school and SSC board exams.",
      "about.pt1": '<span class="tick">✓</span> Retired Principal',
      "about.pt2": '<span class="tick">✓</span> Awarded Best Maths Teacher; 35 years of teaching experience',
      "about.pt3": '<span class="tick">✓</span> Mentored students into doctors, engineers, lawyers &amp; officers',
      "about.pt4": '<span class="tick">✓</span> Concept-first teaching, no rote learning',
      "about.pt5": '<span class="tick">✓</span> Weekly tests and regular doubt-solving',
      "about.pt6": '<span class="tick">✓</span> Strong foundation for school &amp; SSC board exams',

      "courses.eyebrow": "Courses & Batches",
      "courses.h2": "Find the right batch for you",
      "courses.sub": "Choose your class. Each batch covers the full syllabus with tests and revision built in.",
      "courses.board": "All courses follow the Maharashtra State Board (SSC) syllabus.",
      "courses.enquire": "Enquire Now",
      "courses.icon8": "8th",
      "courses.icon9": "9th",
      "courses.icon10": "10th",
      "c8.title": "Class 8th Maths",
      "c8.desc": "Strong foundation in the core concepts that everything ahead is built on, taught the simple, easy way.",
      "c8.li1": "Fundamental concept clarity",
      "c8.li2": "Weekly practice tests",
      "c8.li3": "Builds genuine interest in maths",
      "c9.title": "Class 9th Maths",
      "c9.desc": "Bridges the gap to 10th with deeper concepts, regular practice and competitive-exam skill building.",
      "c9.li1": "In-depth concept building",
      "c9.li2": "Weekly practice tests",
      "c9.li3": "Skills for competitive exams",
      "c10.badge": "SSC Focus",
      "c10.title": "Class 10th Maths (SSC)",
      "c10.desc": "Complete preparation for the SSC board exam with rigorous revision, tests and exam strategy.",
      "c10.li1": "Full SSC syllabus coverage",
      "c10.li2": "Pre-exam & mock test practice",
      "c10.li3": "School + board exam preparation",

      "videos.eyebrow": "Learn Online",
      "videos.heading": "Video Lectures",
      "videos.subtitle": "Watch free maths lessons by Bhasme Sir, anytime.",
      "videos.group8": "Class 8 Maths",
      "videos.group10alg": "Class 10 – Algebra",
      "videos.group10geo": "Class 10 – Geometry",
      "videos.button": "Watch more on YouTube",

      "feat.eyebrow": "Why Choose Us",
      "feat.h2": "Everything you need to score better",
      "f1.t": "Concept Clarity", "f1.d": "Clarifying fundamental mathematical concepts",
      "f2.t": "Simple Teaching", "f2.d": "Teaching in a useful and simple way",
      "f3.t": "Love for Maths", "f3.d": "Creating interest in the subject",
      "f4.t": "Expert Guidance", "f4.d": "Providing guidance from subject experts",
      "f5.t": "Weekly Tests", "f5.d": "Conducting regular weekly practice tests",
      "f6.t": "Competitive Skills", "f6.d": "Developing skills for competitive exams",
      "f7.t": "School Exam Prep", "f7.d": "Pre-preparation for school exams",
      "f8.t": "SSC Exam Prep", "f8.d": "Pre-preparation for the SSC exam",
      "f9.t": "35 Years Experience", "f9.d": "Decades of proven maths teaching expertise.",

      "launch.tag": "Now Enrolling",
      "launch.h2": "Be part of our very first batch",
      "launch.p": 'Bhasme Sir Coaching Center opens its doors on <strong>1 July 2026</strong>. Join the inaugural batch and learn directly from an award-winning, 35-year-experienced teacher — with limited seats for focused, personal attention.',
      "launch.cta": "Reserve Your Seat",
      "promise.eyebrow": "Our Promise",
      "promise.h2": "What every student can expect",
      "pr1.t": "Strong Foundations", "pr1.d": "Every concept explained from the basics in a simple, easy way — no rote learning.",
      "pr2.t": "Personal Attention", "pr2.d": "Small, limited-seat batches so the teacher knows every student and every doubt.",
      "pr3.t": "Regular Practice", "pr3.d": "Weekly tests and consistent practice to prepare thoroughly for school & SSC exams.",

      "contact.eyebrow": "Admissions & Contact",
      "contact.h2": "Book your free demo class",
      "contact.sub": "Fill the form or reach out directly. We'll get back to you within a day.",
      "form.name": "Student / Parent Name",
      "form.phone": "Phone Number",
      "form.email": "Email",
      "form.purposeLabel": "I'm interested in",
      "form.purposeDemo": "Free Demo Class",
      "form.purposeAdmission": "Admission",
      "form.interested": "Interested In",
      "form.opt8": "Class 8th Maths",
      "form.opt9": "Class 9th Maths",
      "form.opt10": "Class 10th Maths (SSC)",
      "form.message": "Message (optional)",
      "form.send": "Send Enquiry",
      "form.success": "✅ Thank you! Your details have been captured — we'll contact you shortly.",
      "contact.visit": "Visit Our Center",
      "ci.address": "Address",
      "ci.addressVal": "Bhasme House, Dhawad Layout, I.U.D.P Road, Katol, Maharashtra 441302",
      "ci.call": "Call / WhatsApp",
      "ci.email": "Email",
      "ci.start": "New Batches Start",
      "ci.startVal": "1 July 2026 — Admissions Open",
      "ci.batches": "Batches",
      "ci.batchesVal": "Class 8th, 9th & 10th Maths (SSC)",
      "ci.qr": "Scan to open &amp; share our website",
      "footer.copy": "Bhasme Sir Coaching Center. All rights reserved."
    },

    mr: {
      "meta.title": "भस्मे सर कोचिंग सेंटर | इयत्ता ८वी, ९वी व १०वी गणित वर्ग",
      "brand.name": "भस्मे सर",
      "brand.full": "भस्मे सर कोचिंग सेंटर",
      "brand.sub": "कोचिंग सेंटर",
      "nav.home": "मुख्यपृष्ठ",
      "nav.about": "आमच्याबद्दल",
      "nav.courses": "अभ्यासक्रम",
      "nav.videos": "व्हिडिओ",
      "nav.why": "का निवडावे",
      "nav.admissions": "प्रवेश",
      "nav.contact": "संपर्क",
      "nav.login": "लॉगिन",
      "nav.demo": "मोफत डेमो बुक करा",

      "promo.headline": '१ आठवडा <span class="promo-free">मोफत</span> डेमो वर्ग — लवकरच सुरू!',
      "promo.sub": "प्रवेश घेण्यापूर्वी भस्मे सरांचे शिकवणे अनुभवा. आजच तुमची मोफत जागा राखून ठेवा!",
      "promo.cta": "मोफत डेमो बुक करा",

      "hero.eyebrow": "महाराष्ट्र राज्य मंडळ (एस.एस.सी.) • गणित कोचिंग • प्रवेश सुरू",
      "hero.h1": '<span class="accent">भस्मे सर</span> यांच्यासोबत गणिताचा पाया भक्कम करा',
      "hero.lead": 'भक्कम संकल्पना, अधिक वेगाने सोडवण्याची क्षमता आणि उत्तम गुण. <strong>इयत्ता ८वी, ९वी व १०वी (SSC)</strong> साठी वैयक्तिक लक्ष देणारे छोटे बॅच. नवीन बॅच <strong>१ जुलै २०२६</strong> पासून सुरू.',
      "hero.demo": "मोफत डेमो वर्ग बुक करा",
      "hero.viewCourses": "अभ्यासक्रम पाहा",
      "hero.stat1num": "३५",
      "hero.stat1": "वर्षांचा अनुभव",
      "hero.stat2num": "८–१०",
      "hero.stat2": "वी गणित बॅच",
      "hero.stat3num": "SSC",
      "hero.stat3": "परीक्षा केंद्रित",

      "about.eyebrow": "आमच्याबद्दल",
      "about.h2": "गणित शिकूया, योग्य पद्धतीने",
      "about.caption": "भस्मे सर<span>संस्थापक व गणित शिक्षक</span>",
      "about.award": "🏆 शहरातील सर्वोत्कृष्ट गणित शिक्षक पुरस्कारप्राप्त",
      "about.h3": "भस्मे सर यांचा परिचय",
      "about.p1": '३५ वर्षांच्या प्रदीर्घ सेवेचा अनुभव असलेले <strong>भस्मे सर</strong> हे <strong>निवृत्त प्राचार्य</strong> असून <strong>सर्वोत्कृष्ट गणित शिक्षक</strong> पुरस्कारप्राप्त आहेत. त्यांच्या मार्गदर्शनाखाली असंख्य विद्यार्थ्यांनी गणितावर प्रभुत्व मिळवून डॉक्टर, अभियंते, वकील, प्रशासकीय अधिकारी व आदरणीय व्यावसायिक म्हणून यश संपादन केले आहे.',
      "about.p2": "त्यांची शिकवण्याची पद्धत प्रथम मूलभूत संकल्पना स्पष्ट करते आणि नंतर सरावातून वेग व अचूकता वाढवते. प्रत्येक विद्यार्थ्याला वैयक्तिक लक्ष, तज्ज्ञ मार्गदर्शन, नियमित अभिप्राय आणि शालेय व SSC बोर्ड परीक्षांमध्ये उत्तम गुण मिळवण्यासाठी स्पष्ट दिशा मिळते.",
      "about.pt1": '<span class="tick">✓</span> निवृत्त प्राचार्य',
      "about.pt2": '<span class="tick">✓</span> सर्वोत्कृष्ट गणित शिक्षक पुरस्कारप्राप्त; ३५ वर्षांचा अनुभव',
      "about.pt3": '<span class="tick">✓</span> विद्यार्थ्यांना डॉक्टर, अभियंते, वकील व अधिकारी म्हणून घडवले',
      "about.pt4": '<span class="tick">✓</span> संकल्पना-आधारित शिक्षण, घोकंपट्टी नाही',
      "about.pt5": '<span class="tick">✓</span> साप्ताहिक चाचण्या व नियमित शंका-समाधान',
      "about.pt6": '<span class="tick">✓</span> शालेय व SSC बोर्ड परीक्षांसाठी भक्कम पाया',

      "courses.eyebrow": "अभ्यासक्रम व बॅच",
      "courses.h2": "तुमच्यासाठी योग्य बॅच निवडा",
      "courses.sub": "तुमची इयत्ता निवडा. प्रत्येक बॅचमध्ये संपूर्ण अभ्यासक्रम, चाचण्या व उजळणी समाविष्ट आहे.",
      "courses.board": "सर्व अभ्यासक्रम महाराष्ट्र राज्य मंडळ (एस.एस.सी.) अभ्यासक्रमानुसार आहेत.",
      "courses.enquire": "चौकशी करा",
      "courses.icon8": "८वी",
      "courses.icon9": "९वी",
      "courses.icon10": "१०वी",
      "c8.title": "इयत्ता ८वी गणित",
      "c8.desc": "पुढील सर्व गोष्टींचा पाया असलेल्या मूलभूत संकल्पनांचा भक्कम पाया, सोप्या व सहज पद्धतीने.",
      "c8.li1": "मूलभूत संकल्पना स्पष्टता",
      "c8.li2": "साप्ताहिक सराव चाचण्या",
      "c8.li3": "गणिताची खरी आवड निर्माण",
      "c9.title": "इयत्ता ९वी गणित",
      "c9.desc": "सखोल संकल्पना, नियमित सराव व स्पर्धा परीक्षा कौशल्यांसह १०वीची तयारी.",
      "c9.li1": "सखोल संकल्पना उभारणी",
      "c9.li2": "साप्ताहिक सराव चाचण्या",
      "c9.li3": "स्पर्धा परीक्षांसाठी कौशल्ये",
      "c10.badge": "SSC केंद्रित",
      "c10.title": "इयत्ता १०वी गणित (SSC)",
      "c10.desc": "कठोर उजळणी, चाचण्या व परीक्षा रणनीतीसह SSC बोर्ड परीक्षेची संपूर्ण तयारी.",
      "c10.li1": "संपूर्ण SSC अभ्यासक्रम",
      "c10.li2": "पूर्वपरीक्षा व सराव चाचण्या",
      "c10.li3": "शालेय + बोर्ड परीक्षेची तयारी",

      "videos.eyebrow": "ऑनलाइन शिका",
      "videos.heading": "व्हिडिओ लेक्चर्स",
      "videos.subtitle": "भस्मे सरांचे मोफत गणित व्हिडिओ धडे, कधीही पाहा.",
      "videos.group8": "इयत्ता ८वी गणित",
      "videos.group10alg": "इयत्ता १०वी – बीजगणित",
      "videos.group10geo": "इयत्ता १०वी – भूमिती",
      "videos.button": "अधिक व्हिडिओ YouTube वर पाहा",

      "feat.eyebrow": "का निवडावे",
      "feat.h2": "उत्तम गुणांसाठी आवश्यक सर्व काही",
      "f1.t": "संकल्पना स्पष्टता", "f1.d": "गणितीय मूलभूत संकल्पना स्पष्ट करणे",
      "f2.t": "सोपे शिक्षण", "f2.d": "उपयुक्त व सोप्या पद्धतीने शिकवणे",
      "f3.t": "गणिताची आवड", "f3.d": "विषयाची आवड निर्माण करणे",
      "f4.t": "तज्ज्ञ मार्गदर्शन", "f4.d": "विषयतज्ञांचे मार्गदर्शन उपलब्ध करणे",
      "f5.t": "साप्ताहिक चाचण्या", "f5.d": "नियमित साप्ताहिक सराव परीक्षा घेणे",
      "f6.t": "स्पर्धा कौशल्ये", "f6.d": "स्पर्धा परीक्षांसाठी कौशल्य विकसित करणे",
      "f7.t": "शालेय परीक्षा तयारी", "f7.d": "शालेय परीक्षेची पूर्व तयारी करून घेणे",
      "f8.t": "SSC परीक्षा तयारी", "f8.d": "SSC परीक्षेची पूर्वतयारी करून घेणे",
      "f9.t": "३५ वर्षांचा अनुभव", "f9.d": "दशकांचा सिद्ध गणित अध्यापन अनुभव.",

      "launch.tag": "प्रवेश सुरू",
      "launch.h2": "आमच्या पहिल्याच बॅचचा भाग व्हा",
      "launch.p": 'भस्मे सर कोचिंग सेंटर <strong>१ जुलै २०२६</strong> रोजी सुरू होत आहे. पुरस्कारप्राप्त, ३५ वर्षांचा अनुभव असलेल्या शिक्षकांकडून थेट शिका — मर्यादित जागा, वैयक्तिक लक्ष.',
      "launch.cta": "तुमची जागा राखून ठेवा",
      "promise.eyebrow": "आमचे वचन",
      "promise.h2": "प्रत्येक विद्यार्थ्याला काय मिळेल",
      "pr1.t": "भक्कम पाया", "pr1.d": "प्रत्येक संकल्पना मुळापासून सोप्या पद्धतीने — घोकंपट्टी नाही.",
      "pr2.t": "वैयक्तिक लक्ष", "pr2.d": "मर्यादित जागांचे छोटे बॅच, त्यामुळे प्रत्येक विद्यार्थ्याकडे व प्रत्येक शंकेकडे लक्ष.",
      "pr3.t": "नियमित सराव", "pr3.d": "शालेय व SSC परीक्षांसाठी साप्ताहिक चाचण्या व सातत्यपूर्ण सराव.",

      "contact.eyebrow": "प्रवेश व संपर्क",
      "contact.h2": "तुमचा मोफत डेमो वर्ग बुक करा",
      "contact.sub": "फॉर्म भरा किंवा थेट संपर्क साधा. आम्ही एका दिवसात तुमच्याशी संपर्क करू.",
      "form.name": "विद्यार्थी / पालक यांचे नाव",
      "form.phone": "फोन नंबर",
      "form.email": "ईमेल",
      "form.purposeLabel": "मला यामध्ये रस आहे",
      "form.purposeDemo": "मोफत डेमो वर्ग",
      "form.purposeAdmission": "प्रवेश",
      "form.interested": "कशामध्ये स्वारस्य आहे",
      "form.opt8": "इयत्ता ८वी गणित",
      "form.opt9": "इयत्ता ९वी गणित",
      "form.opt10": "इयत्ता १०वी गणित (SSC)",
      "form.message": "संदेश (पर्यायी)",
      "form.send": "चौकशी पाठवा",
      "form.success": "✅ धन्यवाद! तुमची माहिती आम्हाला मिळाली आहे — आम्ही लवकरच तुमच्याशी संपर्क करू.",
      "contact.visit": "आमच्या केंद्राला भेट द्या",
      "ci.address": "पत्ता",
      "ci.addressVal": "भस्मे हाऊस, धवड लेआउट, आय.यू.डी.पी. रोड, काटोल, महाराष्ट्र ४४१३०२",
      "ci.call": "कॉल / व्हॉट्सॲप",
      "ci.email": "ईमेल",
      "ci.start": "नवीन बॅच सुरू",
      "ci.startVal": "१ जुलै २०२६ — प्रवेश सुरू",
      "ci.batches": "बॅच",
      "ci.batchesVal": "इयत्ता ८वी, ९वी व १०वी गणित (SSC)",
      "ci.qr": "वेबसाइट उघडण्यासाठी व शेअर करण्यासाठी स्कॅन करा",
      "footer.copy": "भस्मे सर कोचिंग सेंटर. सर्व हक्क राखीव."
    }
  };

  /* ---------------- Language switching ---------------- */
  var STORAGE_KEY = "bcc-lang";
  var langToggle = document.getElementById("langToggle");

  function applyLang(lang) {
    if (!I18N[lang]) lang = "en";
    var dict = I18N[lang];

    document.documentElement.lang = lang;
    document.body.classList.toggle("lang-mr", lang === "mr");

    if (dict["meta.title"]) document.title = dict["meta.title"];

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (Object.prototype.hasOwnProperty.call(dict, key)) {
        el.innerHTML = dict[key];
      }
    });

    if (langToggle) {
      // Button shows the language you can switch TO
      langToggle.textContent = lang === "en" ? "मराठी" : "English";
      langToggle.setAttribute("aria-label", lang === "en" ? "Switch to Marathi" : "Switch to English");
    }

    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  }

  var savedLang = "en";
  try { savedLang = localStorage.getItem(STORAGE_KEY) || "en"; } catch (e) {}
  applyLang(savedLang);

  if (langToggle) {
    langToggle.addEventListener("click", function () {
      var current = document.documentElement.lang === "mr" ? "mr" : "en";
      applyLang(current === "en" ? "mr" : "en");
    });
  }

  /* ---------------- Footer year ---------------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------------- Mobile nav toggle ---------------- */
  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");

  function closeMenu() {
    if (!links || !toggle) return;
    links.classList.remove("open");
    toggle.classList.remove("active");
    toggle.setAttribute("aria-expanded", "false");
  }

  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var isOpen = links.classList.toggle("open");
      toggle.classList.toggle("active", isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
  }

  /* ---------------- Enquiry form ---------------- */
  var form = document.getElementById("enquiryForm");
  var note = document.getElementById("formNote");

  function setNote(message, type) {
    if (!note) return;
    note.textContent = message;
    note.className = "form-note " + (type || "");
  }

  /* Public Apps Script Web App webhook for capturing enquiries to a Google Sheet.
     This is a public endpoint by design (not a secret). The script behind it
     handles emailing the student + admin server-side. */
  var SHEET_ENDPOINT = "https://script.google.com/macros/s/AKfycbxQbeYdQSdP7eP6sEvDV6knfsCAGmaIJhNS3cyHqfYP7eH6coPUErVaLUCl5l-IEMQJlA/exec";

  /* Canonical English course labels (keep the owner's sheet consistent regardless of site language) */
  var COURSE_EN = ["Class 8th Maths", "Class 9th Maths", "Class 10th Maths (SSC)"];

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var isMr = document.documentElement.lang === "mr";
      var dict = I18N[isMr ? "mr" : "en"];
      var name = (form.elements.name && form.elements.name.value || "").trim();
      var phone = (form.elements.phone && form.elements.phone.value || "").trim();

      if (!name || !phone) {
        setNote(isMr ? "कृपया तुमचे नाव व फोन नंबर भरा." : "Please enter your name and phone number.", "err");
        return;
      }

      var email = (form.elements.email && form.elements.email.value || "").trim();
      if (!email) {
        setNote(isMr ? "कृपया तुमचा ईमेल पत्ता भरा." : "Please enter your email address.", "err");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setNote(isMr ? "कृपया वैध ईमेल पत्ता भरा." : "Please enter a valid email address.", "err");
        return;
      }

      var courseSel = form.elements.course;
      var course = "";
      if (courseSel && courseSel.options && courseSel.selectedIndex >= 0) {
        course = (courseSel.options[courseSel.selectedIndex].text || "").trim();
      }

      var purposeVal = (form.elements.purpose && form.elements.purpose.value) || "demo";
      var purposeEn = purposeVal === "admission" ? "Admission" : "Free Demo Class";
      var courseEn = (courseSel && courseSel.selectedIndex >= 0 && COURSE_EN[courseSel.selectedIndex]) || course;

      var message = (form.elements.message && form.elements.message.value || "").trim();

      var btn = form.querySelector("button[type=submit]");
      if (btn) btn.disabled = true;

      // Show the success state, reset the form, and re-enable the button shortly.
      var finish = function () {
        setNote(dict["form.success"], "ok");
        form.reset();
        setTimeout(function () { if (btn) btn.disabled = false; }, 1500);
      };

      /* Fire-and-forget capture to the Google Sheet. We can't read a no-cors
         response, so we show success optimistically once the promise settles
         (whether it resolves or rejects). Wrapped in try/catch for safety. */
      try {
        var params = new URLSearchParams();
        params.append("name", name);
        params.append("phone", phone);
        params.append("email", email);
        params.append("purpose", purposeEn);
        params.append("course", courseEn);
        params.append("message", message);
        params.append("lang", isMr ? "mr" : "en");
        fetch(SHEET_ENDPOINT, { method: "POST", body: params, mode: "no-cors", keepalive: true })
          .then(finish, finish);
      } catch (err) {
        finish();
      }
    });
  }
})();
