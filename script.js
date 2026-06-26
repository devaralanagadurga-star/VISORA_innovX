// === VISORA - script.js ===
const API_KEY = 'AQ.Ab8RN6Iyzkpwe_-samZhLXKw_4tlwUsghDYhqYkmDeV1gLsX4A';

// === DOM Elements ===
const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const coachText = document.getElementById('coach-text');
const startBtn = document.getElementById('startBtn');
const muteBtn = document.getElementById('mute-btn');
const timerEl = document.getElementById('timer');
const stepLabel = document.getElementById('step-label');
const stepFill = document.getElementById('step-fill');
const camOverlay = document.getElementById('cam-overlay');

// === State ===
let isMuted = false;
let sessionSeconds = 0;
let timerInterval = null;
let coachInterval = null;
let frameCount = 0;

// === Start Button Click ===
startBtn.addEventListener('click', async () => {
  try {
    // Request webcam
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    // Hide placeholder overlay
    camOverlay.style.display = 'none';

    // Disable start button
    startBtn.textContent = '✅ Session Running...';
    startBtn.disabled = true;

    // Start session timer
    timerInterval = setInterval(() => {
      sessionSeconds++;
      const h = Math.floor(sessionSeconds / 3600);
      const m = Math.floor((sessionSeconds % 3600) / 60);
      const s = sessionSeconds % 60;
      timerEl.textContent = `Session: ${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }, 1000);

    // Start coaching loop every 3 seconds
    coachInterval = setInterval(runCoachingCycle, 3000);

    // Run first cycle immediately
    runCoachingCycle();

  } catch (err) {
    coachText.innerHTML = '❌ Camera access denied. Please allow camera permissions and try again.';
    console.error('Camera error:', err);
  }
});

// === Mute Button ===
muteBtn.addEventListener('click', () => {
  isMuted = !isMuted;
  muteBtn.textContent = isMuted ? '🔇' : '🔊';
  if (isMuted) window.speechSynthesis.cancel();
});

// === Capture Webcam Frame as Base64 ===
function captureFrame() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
}

// === Send Frame to Gemini API ===
async function getCoachingAdvice(base64Image) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}` ,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image
              }
            },
            {
              text: `You are VISORA, a friendly real-time AI coach watching someone through their webcam.
Look at what this person is doing and give ONE short, clear, helpful instruction.
- Keep it under 2 sentences.
- Be specific to what you see.
- If they look fine, encourage them.
- If there's a mistake, clearly say what to fix.
- Start with an action word like "Try", "Make sure", "Good job", "Adjust", etc.`
            }
          ]
        }]
      })
    }
  );
  const data = await response.json();
  console.log(data);

if (!response.ok) {
    throw new Error(JSON.stringify(data));
}


return data.candidates[0].content.parts[0].text;
}

// === Speak Advice Aloud ===
function speak(text) {
  if (isMuted) return;
  window.speechSynthesis.cancel(); // Stop any previous speech
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

// === Update Step Progress ===
function updateStepProgress() {
  frameCount++;
  const step = Math.min(frameCount, 5);
  const percent = (step / 5) * 100;
  stepLabel.textContent = `Step ${step} of 5`;
  stepFill.style.width = `${percent}%`;
}

// === Main Coaching Cycle ===
async function runCoachingCycle() {
  try {
    coachText.innerHTML = '<em style="color:#7b8eb0;">🔍 Analyzing your work...</em>';

    const frame = captureFrame();
    const advice = await getCoachingAdvice(frame);

    coachText.textContent = advice;
    speak(advice);
    updateStepProgress();

  } catch (err) {
    console.error('Coaching error:', err);
    coachText.innerHTML = '⚠️ Could not get advice. Check your API key or internet connection.';
  }
}
