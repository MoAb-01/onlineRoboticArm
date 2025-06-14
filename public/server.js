const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");

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

  const prompt = lemurPrompts[language] || lemurPrompts["English"]; // fallback to English if unknown

  try {
    const start = await fetch("https://api.assemblyai.com/lemur/v3/generate/task", {
      method: "POST",
      headers: {
        authorization: assemblyAIKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        final_model: "anthropic/claude-3-7-sonnet-20250219",
        prompt: prompt,
        input_text: input_text
      }),
    });

    const { id } = await start.json();

    let result;
    do {
      await new Promise(r => setTimeout(r, 500));
      const poll = await fetch(
        `https://api.assemblyai.com/lemur/v3/generate/task/${id}/response`,
        { headers: { authorization: assemblyAIKey } }
      );
      result = await poll.json();
    } while (result.status !== "completed" && result.status !== "error");

    if (result.status === "error") {
      console.error("LeMUR error:", result);
      return res.status(500).json({ error: result.error });
    }

    return res.json({ result: result.response });

  } catch (err) {
    console.error("Error calling LeMUR:", err);
    return res.status(500).json({ error: "Server error calling LeMUR" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

