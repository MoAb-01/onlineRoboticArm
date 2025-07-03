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
It is the same commands in answer_options.

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
  const { transcriptiontext, language } = req.body;

  if (!transcriptiontext) {
    console.error("No input text provided");
    return res.status(400).json({ error: "No input text provided" });
  }

  console.log("Received request:", { transcriptiontext, language });

  const prompt = lemurPrompts[language] || lemurPrompts["English"];

  try {
    console.log("Making request to AssemblyAI...");
    
    const postData = {
      final_model: "anthropic/claude-3-7-sonnet-20250219",
      questions: [{
        question: "What should the prosthetic hand do? Return either open, close, peace, ok, or bad based on the given commands or sentences. Only return the most similar command word from the list. Return to the corrosponding translation of it based on the language",
        answer_format: "one word",
        answer_options: [
          "open",
          "close",
          "peace",
          "ok",
          "bad",
          "aç",
          "kapat",
          "barış",
          "tamam",
          "kötü",
          "ouvrir",
          "paix",
          "d'accord",
          "mauvais",
          "öffnen",
          "schließen",
          "Frieden",
          "okay",
          "schlecht",
          "abrir",
          "cerrar",
          "paz",
          "bien",
          "mal"
        ]
      }],
      context: "this is a voice command given to a prosthetic hand either do most similar answer option ",
      max_output_size: 3000,
      temperature: 0,
      input_text: transcriptiontext
    };

    console.log("Request body:", postData);

    const response = await fetch("https://api.assemblyai.com/lemur/v3/generate/question-answer", {
      method: "POST",
      headers: {
        'Authorization': assemblyAIKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postData)
    });

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const result = await response.json();
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
