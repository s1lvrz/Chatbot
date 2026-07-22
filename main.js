// variables
const sideNavWidth = "200px";

// elements
const openMenu = document.querySelector("#open-menu");
const closeMenu = document.querySelector("#close-menu");
const sideNav = document.querySelector("#side-nav");
const body = document.querySelector("body");
const sunIcons = document.querySelectorAll(".sun-outline");
const moonIcons = document.querySelectorAll(".moon-outline");

/* open side nav */
openMenu.addEventListener("click", () => {
  sideNav.style.right = "0";
  body.style.left = `-${sideNavWidth}`;
});

/* close side nav */
closeMenu.addEventListener("click", () => {
  sideNav.style.right = `-${sideNavWidth}`;
  body.style.left = "0";
});

// theme toggler
for (const sun of sunIcons) {
  sun.addEventListener("click", () => { body.classList.remove("dark"); });
}
for (const moon of moonIcons) {
  moon.addEventListener("click", () => { body.classList.add("dark"); });
}

const micBtn = document.getElementById("micBtn");
const micIcon = document.getElementById("micIcon");
const chatLog = document.getElementById("chatLog");
const statusText = document.getElementById("statusText");

// UI translation elements
const langToggleText = document.getElementById("langToggleText");
const langToggleNavText = document.getElementById("langToggleNavText");
const langToggle = document.getElementById("langToggle");
const langToggleNav = document.getElementById("langToggleNav");
const htmlTag = document.getElementById("htmlTag");
const pageTitle = document.getElementById("pageTitle");
const appTitle = document.getElementById("appTitle");
const botWelcome = document.getElementById("botWelcome");
const hintText = document.getElementById("hintText");

// New Chat & Search Elements
const newChatBtnDesktop = document.getElementById("newChatBtnDesktop");
const newChatBtnMobile = document.getElementById("newChatBtnMobile");
const searchHistoryDesktop = document.getElementById("searchHistoryDesktop");
const searchHistoryMobile = document.getElementById("searchHistoryMobile");

// Calendar Elements
const calendarMonthEls = [document.getElementById("calendarMonth"), document.getElementById("calendarMonthDesktop")];
const calendarDatesRowEls = [document.getElementById("calendarDatesRow"), document.getElementById("calendarDatesRowDesktop")];

let voices = [];
const BACKEND_URL = "htdocs/api/chat.php";
const TRANSCRIBE_URL = "htdocs/api/transcribe.php";

let currentLang = "en";
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];

let audioContext = null;
let analyser = null;
let microphone = null;
let silenceReqId = null;

// Initialize Calendar Strip based on current date
function initCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const currentDate = now.getDate();

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthString = `${monthNames[month]} ${year}`;

  calendarMonthEls.forEach(el => {
    if (el) el.textContent = monthString;
  });

  // Build a 7-day strip centered around the current date (e.g. current date +/- 3 days)
  let datesHTML = "";
  for (let i = -3; i <= 3; i++) {
    const d = new Date(year, month, currentDate + i);
    const dayNum = d.getDate();
    const isActive = i === 0 ? "active-date" : "";
    datesHTML += `<span class="${isActive}">${dayNum}</span>`;
  }

  calendarDatesRowEls.forEach(el => {
    if (el) el.innerHTML = datesHTML;
  });
}
initCalendar();

// New Chat Functionality (Clears chat logs)
function handleNewChat() {
  chatLog.innerHTML = "";
  const welcomeDiv = document.createElement("div");
  welcomeDiv.className = "message bot";
  welcomeDiv.innerHTML = `<p id="botWelcome">${langConfigs[currentLang].welcome}</p>`;
  chatLog.appendChild(welcomeDiv);
  if (statusText) statusText.textContent = langConfigs[currentLang].statusIdle;
}

if (newChatBtnDesktop) newChatBtnDesktop.addEventListener("click", handleNewChat);
if (newChatBtnMobile) newChatBtnMobile.addEventListener("click", handleNewChat);

// Search Previous Questions/Answers Filtering Functionality
function handleSearch(query) {
  const filter = query.toLowerCase();
  const messages = chatLog.querySelectorAll(".message");
  messages.forEach(msg => {
    const text = msg.textContent.toLowerCase();
    if (text.includes(filter) || filter === "") {
      msg.style.display = "";
    } else {
      msg.style.display = "none";
    }
  });
}

if (searchHistoryDesktop) {
  searchHistoryDesktop.addEventListener("input", (e) => handleSearch(e.target.value));
}
if (searchHistoryMobile) {
  searchHistoryMobile.addEventListener("input", (e) => handleSearch(e.target.value));
}

const langConfigs = {
  en: {
    code: "en-US",
    toggleText: "AR",
    pageTitle: "Voice Chatbot",
    appTitle: "Voice Assistant",
    statusIdle: "Tap the microphone and start speaking (any language)",
    statusListening: "Listening... Speak now",
    statusTranscribing: "Transcribing...",
    statusError: "Something went wrong. Try again.",
    statusNoSupport: "Your browser does not support microphone recording.",
    statusMicDenied: "Microphone access was denied. Please allow mic permissions.",
    welcome: "Hello! Tap the microphone button and talk to me 🎤",
    hint: "Speak in any language - I'll reply in English",
    serverError: "Error connecting to server. Please try again.",
    promptInstruction: "\n[System Instruction: Always respond in English, regardless of what language the user spoke in.]"
  },
  ar: {
    code: "ar-SA",
    toggleText: "EN",
    pageTitle: "شات بوت صوتي",
    appTitle: "المساعد الصوتي",
    statusIdle: "اضغط على الميكروفون وابدأ الحديث (بأي لغة)",
    statusListening: "جاري الاستماع... تحدّث الآن",
    statusTranscribing: "...جاري تحويل الصوت إلى نص",
    statusError: "حدث خطأ ما. حاول مرة أخرى.",
    statusNoSupport: "متصفحك لا يدعم تسجيل الصوت.",
    statusMicDenied: "تم رفض الوصول إلى الميكروفون. يرجى السماح باستخدام الميكروفون.",
    welcome: "مرحبًا! اضغط على زر الميكروفون وتحدّث معي بصوتك 🎤",
    hint: "تحدث بأي لغة - سأرد عليك بالعربية",
    serverError: "حدث خطأ أثناء الاتصال بالخادم. حاول مجددًا.",
    promptInstruction: "\n[تعليمات النظام: يرجى الرد دائمًا باللغة العربية، بغض النظر عن اللغة التي تحدث بها المستخدم.]"
  }
};

function loadVoices() {
  voices = window.speechSynthesis.getVoices();
}
loadVoices();
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = loadVoices;
}

function getOptimalVoice(langCode) {
  if (!voices.length) loadVoices();
  const preferredKeywords = ["natural", "neural", "online", "google", "siri", "enhanced", "premium"];
  for (const keyword of preferredKeywords) {
    const match = voices.find(v => v.lang.toLowerCase().includes(langCode.toLowerCase()) && v.name.toLowerCase().includes(keyword));
    if (match) return match;
  }
  const langPrefix = langCode.split('-')[0];
  const langMatch = voices.find(v => v.lang.toLowerCase().startsWith(langPrefix));
  if (langMatch) return langMatch;
  return voices[0] || null;
}

function applyLanguage(lang) {
  currentLang = lang;
  const config = langConfigs[currentLang];

  htmlTag.lang = currentLang;
  htmlTag.dir = "ltr"; 

  if (langToggleText) langToggleText.textContent = config.toggleText;
  if (langToggleNavText) langToggleNavText.textContent = config.toggleText;
  if (pageTitle) pageTitle.textContent = config.pageTitle;
  if (appTitle) appTitle.textContent = config.appTitle;
  if (hintText) hintText.textContent = config.hint;
  
  const currentWelcome = document.getElementById("botWelcome");
  if (currentWelcome) currentWelcome.textContent = config.welcome;

  if (!isRecording && statusText) {
    statusText.textContent = config.statusIdle;
  }
}

function toggleLanguage() {
  const newLang = currentLang === "en" ? "ar" : "en";
  applyLanguage(newLang);
}

if (langToggle) langToggle.addEventListener("click", toggleLanguage);
if (langToggleNav) langToggleNav.addEventListener("click", toggleLanguage);

const hasRecordingSupport = !!(navigator.mediaDevices && window.MediaRecorder);

if (!hasRecordingSupport) {
  if (statusText) statusText.textContent = langConfigs[currentLang].statusNoSupport;
  if (micBtn) micBtn.disabled = true;
} else {
  micBtn.addEventListener("click", () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let hasSpoken = false;
    let silenceStart = Date.now();

    function detectSilence() {
      if (!isRecording) return;
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) { sum += dataArray[i]; }
      const average = sum / dataArray.length;

      if (average > 15) { 
        hasSpoken = true;
        silenceStart = Date.now();
      } else { 
        if (hasSpoken && (Date.now() - silenceStart > 1500)) {
          stopRecording();
          return;
        }
        if (!hasSpoken && (Date.now() - silenceStart > 6000)) {
          stopRecording();
          return;
        }
      }
      silenceReqId = requestAnimationFrame(detectSilence);
    }

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) { audioChunks.push(event.data); }
    };

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      if (audioContext && audioContext.state !== 'closed') { audioContext.close(); }
      if (silenceReqId) cancelAnimationFrame(silenceReqId);
      handleRecordingStop();
    };

    mediaRecorder.start();
    isRecording = true;
    micBtn.classList.add("listening");
    micIcon.textContent = "⏹️";
    statusText.textContent = langConfigs[currentLang].statusListening;

    detectSilence();
  } catch (err) {
    isRecording = false;
    statusText.textContent = langConfigs[currentLang].statusMicDenied;
  }
}

function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    isRecording = false;
    micBtn.classList.remove("listening");
    micIcon.textContent = "🎤";
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => { resolve(reader.result.split(',')[1]); };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function handleRecordingStop() {
  if (!audioChunks.length) {
    statusText.textContent = langConfigs[currentLang].statusIdle;
    return;
  }

  statusText.textContent = langConfigs[currentLang].statusTranscribing;
  let mimeType = mediaRecorder.mimeType || "audio/webm";
  mimeType = mimeType.split(";")[0]; 
  const audioBlob = new Blob(audioChunks, { type: mimeType });

  try {
    const audioBase64 = await blobToBase64(audioBlob);
    const res = await fetch(TRANSCRIBE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio: audioBase64, mimeType: mimeType })
    });

    if (!res.ok) {
      statusText.textContent = langConfigs[currentLang].statusError;
      return;
    }

    const data = await res.json();
    const userText = (data.text || "").trim();
    if (!userText) {
      statusText.textContent = langConfigs[currentLang].statusIdle;
      return;
    }

    addMessage("user", userText);
    const dotsHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
    const thinkingEl = addMessage("bot", dotsHTML, { thinking: true, isHTML: true });
    const fullPrompt = userText + langConfigs[currentLang].promptInstruction;

    try {
      const reply = await askGemini(fullPrompt);
      thinkingEl.remove();
      addMessage("bot", reply);
      speak(reply);
    } catch (err) {
      thinkingEl.remove();
      addMessage("bot", langConfigs[currentLang].serverError);
    }
  } catch (err) {
    statusText.textContent = langConfigs[currentLang].serverError;
  } finally {
    if (!isRecording) {
      statusText.textContent = langConfigs[currentLang].statusIdle;
    }
  }
}

async function askGemini(prompt) {
  const res = await fetch(BACKEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });
  const text = await res.text();
  const parsed = JSON.parse(text);
  if (parsed.error) { throw new Error(parsed.error); }
  return parsed.reply;
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  const cleanText = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[\*\_#~\`\[\]\(\)\>\+\-\=\|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  window.speechSynthesis.cancel(); 
  const utterance = new SpeechSynthesisUtterance(cleanText);
  const targetLang = langConfigs[currentLang].code;
  const bestVoice = getOptimalVoice(targetLang);
  if (bestVoice) { utterance.voice = bestVoice; }
  utterance.lang = targetLang;
  utterance.rate = 1.0;
  window.speechSynthesis.speak(utterance);
}

function addMessage(role, text, opts = {}) {
  const el = document.createElement("div");
  el.className = `message ${role}${opts.thinking ? " thinking" : ""}`;
  if (opts.isHTML) {
    el.innerHTML = text;
  } else {
    const p = document.createElement("p");
    p.textContent = text;
    el.appendChild(p);
  }
  chatLog.appendChild(el);
  chatLog.scrollTop = chatLog.scrollHeight;
  return el;
}

applyLanguage(currentLang);