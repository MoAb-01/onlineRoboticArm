const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const https = require('https');

const app = express();
const PORT = 3000;

const assemblyAIKey = "4a687589c4b44c5dba72c41b3cbe712f"; // Your actual key

app.use(cors());
app.use(bodyParser.json());

const lemurPrompts = {
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


app.post("/lemur", async (req, res) => {
  const { input_text, language } = req.body;

  if (!input_text) {
    console.error("No input text provided");
    return res.status(400).json({ error: "No input text provided" });
  }

  console.log("Received request:", { input_text, language });

  const prompt = lemurPrompts[language] || lemurPrompts["English"];

  try {
    console.log("Making request to AssemblyAI...");
    
    const postData = JSON.stringify({
      final_model: "anthropic/claude-3-sonnet",
      questions: [{
        question: prompt,
        answer_options: ["open", "close", "peace", "ok", "bad", "unknown"]
      }],
      input_text: input_text,
      max_output_size: 100,
      temperature: 0.1
    });

    const options = {
      hostname: 'api.assemblyai.com',
      path: '/lemur/v3/generate/question-answer',
      method: 'POST',
      headers: {
        'Authorization': assemblyAIKey,
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };

    console.log("Request options:", {
      hostname: options.hostname,
      path: options.path,
      method: options.method,
      headers: {
        ...options.headers,
        'Authorization': '***' // Hide the key in logs
      }
    });

    console.log("Request body:", postData);

    const startRequest = new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              console.error("API Error Response:", data);
              reject(new Error(`API responded with status ${res.statusCode}: ${data}`));
              return;
            }
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', (error) => {
        console.error("Request error:", error);
        reject(error);
      });

      req.write(postData);
      req.end();
    });

    const result = await startRequest;
    console.log("AssemblyAI response:", result);

    if (!result.response || !result.response[0] || !result.response[0].answer) {
      throw new Error("Invalid response format from API");
    }

    return res.json({ result: result.response[0].answer.trim().toLowerCase() });

  } catch (err) {
    console.error("Error calling LeMUR:", err);
    return res.status(500).json({ 
      error: "Server error calling LeMUR",
      details: err.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

