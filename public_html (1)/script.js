const apiKey = '5956071b40932a8283880aebe7515a8ba1d1aa7c';
const assemblyAIKey = "4a687589c4b44c5dba72c41b3cbe712f";

const selected       = document.querySelector(".selected");
const optionsContainer = document.querySelector(".options-container");
const mic            = document.querySelector(".inputIcon");
const optionsList    = document.querySelectorAll(".option");
const myElement      = document.getElementById('transcript');

let chosenLanguage;
let language_code;
let language_detection = false;

// MediaRecorder settings
let mediaType;
if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
  mediaType = 'audio/webm;codecs=opus';
} else if (MediaRecorder.isTypeSupported('audio/mp4')) {
  mediaType = 'audio/mp4';
} else {
  // fallback
  mediaType = 'audio/webm';
}

let canRecord = false;
let isRecording = false;
let recorder = null;
let RecordedAudioBlobs = [];

// ─── UI: Language Picker ─────────────────────────────
selected.addEventListener("click", () => {
  optionsContainer.classList.toggle("active");
});

optionsList.forEach(option => {
  option.addEventListener("click", () => {
    chosenLanguage = option.querySelector("label").innerText;
    selected.innerText = chosenLanguage;
    mic.classList.remove("transparent");
    optionsContainer.classList.remove("active");
  });
});

// initially hide mic until language chosen
mic.classList.add("transparent");

// ─── Setup getUserMedia & MediaRecorder ───────────────
async function setupAudio() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recorder = new MediaRecorder(stream, { mimeType: mediaType });
    recorder.ondataavailable = e => RecordedAudioBlobs.push(e.data);
    recorder.onstop = handleRecordingStop;
    canRecord = true;
  } catch (err) {
    console.error("Could not get microphone:", err);
  }
}
setupAudio();

// ─── Recording Control ────────────────────────────────
function ToggleMic() {
  if (!canRecord) return;

  // Arabic branch uses Web Speech API
  if (chosenLanguage === "Arabic") {
    startArabicRecognition();
    return;
  }

  // otherwise use MediaRecorder → Deepgram
  isRecording = !isRecording;
  if (isRecording) {
    RecordedAudioBlobs = [];
    mic.classList.add('isRecording');
    recorder.start();
  } else {
    mic.classList.remove('isRecording');
    recorder.stop();
  }
}

// ─── Language-specific Lemur Prompts ─────────────────────────
function makeLemurPrompt(language) {
  const prompts = {
    English: `
You are controlling a prosthetic hand. The user's request is in English.

Allowed commands:
- open
- close
- peace
- ok
- bad

Extract the intent and map it to one of the allowed commands above, returning *only* the single word: open, close, peace, ok, bad, or unknown. Do not output anything else.`,

    Turkish: `
Protez bir eli kontrol ediyorsunuz. Kullanıcının isteği Türkçe.

İzin verilen komutlar:
- open (aç)
- close (kapat)
- peace (barış)
- ok (tamam)
- bad (kötü)

Kullanıcının isteğini analiz edip yukarıdaki komutlardan birine dönüştürün. Sadece tek kelime döndürün: open, close, peace, ok, bad veya unknown. Başka hiçbir şey yazmayın.`,

    French: `
Vous contrôlez une main prothétique. La demande de l'utilisateur est en français.

Commandes autorisées:
- open (ouvrir)
- close (fermer)
- peace (paix)
- ok (d'accord)
- bad (mauvais)

Extrayez l'intention et mappez-la à l'une des commandes autorisées ci-dessus, en renvoyant *uniquement* le mot unique: open, close, peace, ok, bad, ou unknown. Ne renvoyez rien d'autre.`,

    German: `
Sie steuern eine Prothesenhand. Die Anfrage des Benutzers ist auf Deutsch.

Erlaubte Befehle:
- open (öffnen)
- close (schließen)
- peace (Frieden)
- ok (okay)
- bad (schlecht)

Extrahieren Sie die Absicht und ordnen Sie sie einem der erlaubten Befehle zu, indem Sie *nur* das einzelne Wort zurückgeben: open, close, peace, ok, bad oder unknown. Geben Sie nichts anderes aus.`,

    Spanish: `
Estás controlando una mano protésica. La solicitud del usuario está en español.

Comandos permitidos:
- open (abrir)
- close (cerrar)
- peace (paz)
- ok (bien)
- bad (mal)

Extrae la intención y asígnala a uno de los comandos permitidos anteriores, devolviendo *solo* la palabra única: open, close, peace, ok, bad, o unknown. No devuelvas nada más.`
  };

  return prompts[language] || prompts.English; // Fallback to English if language not found
}

async function handleRecordingStop() {
  mic.classList.add("cancelled");

  // 1) figure out the right code for Deepgram
  const map = {
    English: 'en',
    Turkish: 'tr',
    French:  'fr',
    Chinese: 'zh',
    German:  'de',
    Spanish: 'es'
  };
  language_code = map[chosenLanguage] || '';

  // 2) get your transcript
  const blob = new Blob(RecordedAudioBlobs, { type: mediaType });
  const transcript = await transcribeAudio(blob);
  RecordedAudioBlobs = [];

  // 3) hand it over to Lemur with language-specific prompt
  const prompt = makeLemurPrompt(chosenLanguage);
  const command = await getLemurCommand(transcript, prompt);

  // 4) display & send
  myElement.innerText = command;
  await sendBluetooth(command);
}

async function transcribeAudio(blob) {
  try {
    // 1. Upload the audio file
    const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        authorization: assemblyAIKey,
      },
      body: blob
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }

    const { upload_url } = await uploadResponse.json();

    // 2. Submit the transcription request
    const transcriptResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        authorization: assemblyAIKey,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        audio_url: upload_url,
        language_code: language_code
      })
    });

    if (!transcriptResponse.ok) {
      throw new Error(`Transcription request failed: ${transcriptResponse.statusText}`);
    }

    const { id } = await transcriptResponse.json();

    // 3. Poll for the transcription result
    let result;
    do {
      await new Promise(r => setTimeout(r, 1000));
      const pollingResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
        headers: { 
          authorization: assemblyAIKey 
        }
      });

      if (!pollingResponse.ok) {
        throw new Error(`Polling failed: ${pollingResponse.statusText}`);
      }

      result = await pollingResponse.json();
    } while (result.status !== "completed" && result.status !== "error");

    if (result.status === "error") {
      throw new Error(`Transcription failed: ${result.error}`);
    }

    return result.text || "unknown";
  } catch (error) {
    console.error("Transcription error:", error);
    return "unknown";
  }
}

async function getLemurCommand(inputText, prompt) {
  // 1. create task
  let createRes = await fetch('https://api.assemblyai.com/v1/lemur/task', {
    method: 'POST',
    headers: {
      'authorization': assemblyAIKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ input_text: inputText, prompt: prompt }),
  });
  let { id: taskId } = await createRes.json();

  // 2. poll
  let result;
  while (true) {
    await new Promise(r => setTimeout(r, 1000));
    let pollRes = await fetch(`https://api.assemblyai.com/v1/lemur/task/${taskId}/response`, {
      headers: { 'authorization': assemblyAIKey },
    });
    result = await pollRes.json();
    if (result.status === 'completed') break;
    if (result.status === 'error') {
      console.error('Lemur error:', result.error);
      return 'unknown';
    }
  }

  return result.response.trim().toLowerCase();
}

// ─── Bluetooth Sending Helper ─────────────────────────
let characteristic;
async function sendBluetooth(message) {
  if (!characteristic) return console.warn("No Bluetooth connection yet");
  let enc = new TextEncoder();
  await characteristic.writeValue(enc.encode(message));
  console.log(`bluetooth data sent: ${message}`);
}

// ─── Arabic via Web Speech API ────────────────────────
function startArabicRecognition() {
  const recognition = new webkitSpeechRecognition();
  recognition.lang = "ar-JO";
  recognition.onresult = ev => {
    const t = ev.results[0][0].transcript;
    myElement.innerText = t;
    mic.classList.remove('isRecording');
    sendBluetooth(t);
  };
  recognition.start();
}

// ─── Bluetooth Connection (unchanged) ────────────────
async function connect() {
  const options = {
    filters: [{ namePrefix: "BT" }],
    optionalServices: [0xFFE0]
  };
  let device = await navigator.bluetooth.requestDevice(options);
  let server = await device.gatt.connect();
  let service = await server.getPrimaryService(0xFFE0);
  characteristic = await service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb');
  await sendBluetooth("bluetooth connected");
}
