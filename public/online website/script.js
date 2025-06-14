const apiKey = '5956071b40932a8283880aebe7515a8ba1d1aa7c';
// declare the constnat elements
const selected = document.querySelector(".selected");
const optionsContainer = document.querySelector(".options-container");
const mic = document.querySelector(".inputIcon");
const optionsList = document.querySelectorAll(".option");
const logo = document.querySelector(".logo");
const text = document.getElementById("text");
const playback = document.querySelector(".playback");
const bluetoothBtn = document.querySelector(".blubtn");
const myElement = document.getElementById('transcript');

// define a variable to contain the chosen language
var chosenLanguage;

// deny the voice input if the language is unspecified
if (chosenLanguage === undefined) {
  mic.classList.add("transparent");
}
else {
  mic.classList.remove("transparent");
}

selected.addEventListener("click", () => {
  optionsContainer.classList.toggle("active");

});


optionsList.forEach(option => {
  option.addEventListener("click", () => {
    selected.innerHTML = option.querySelector("label").innerHTML;

    chosenLanguage = option.querySelector("label").innerHTML;

    // adjust the variable of the language
    mic.classList.remove("transparent");
    optionsContainer.classList.remove("active");
  });
});






var language_code;
var language_model;
var language_detection = false;


////// voice recording //////

let canRecord = true;
let isRecording = false;
let recorder = null;
let RecordedAudioBlobs = [];


function setupAudio() {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({
      audio: true
    }).then(SetupStream)
      .catch(err => {
        console.error(err);
      });

  }
}
setupAudio();

function SetupStream(stream) {


  recorder = new MediaRecorder(stream);
  recorder.ondataavailable = e => {
    RecordedAudioBlobs.push(e.data);
  }
  recorder.onstop = async e => {
    mic.classList.add("cancelled");
    if (chosenLanguage == "English") {
      language_code = 'en';
      language_model = 'best';
      language_detection = false;
    }
    else if (chosenLanguage == "Turkish") {
      language_code = 'tr';
      language_model = 'best';
      language_detection = false;
    }
    else if (chosenLanguage == "French") {
      language_code = 'fr';
      language_model = 'best';
      language_detection = false;
    }
    else if (chosenLanguage == "Chinese") {
      language_code = 'zh';
      language_model = 'best';
      language_detection = false;
    }
    else if (chosenLanguage == "German") {
      language_code = 'de';
      language_model = 'best';
      language_detection = false;
    }
    else if (chosenLanguage == "Spanish") {
      language_code = 'es';
      language_model = 'best';
      language_detection = false;
    }
    else if (chosenLanguage == "Detect Language") {
      language_code = undefined;
      language_model = undefined;
      language_detection = true;
    }

    const blob = new Blob(RecordedAudioBlobs, { type: 'audio/mp3' });
    const transcriptionText = await transcribeAudio(blob);
    RecordedAudioBlobs = [];

    console.log(`original text: ${transcriptionText}`);

    const lemurCommand = await getLemurCommand(transcriptionText);
    console.log(`Lemur Command: ${lemurCommand}`);

    myElement.innerText = lemurCommand;

    var enc = new TextEncoder();
    await characteristic.writeValue(enc.encode(lemurCommand));
    console.log(`bluetooth data sent: ${lemurCommand}`);
  }
  canRecord = true;
  isRecording = !canRecord;
}


function ToggleMic() {
  if (chosenLanguage == "Arabic") {

    if (!canRecord) {
      return;
    }
    else {
      arabic();
      mic.classList.add('isRecording');
    }
  }
  else {
    if (!canRecord) return;

    isRecording = !isRecording;

    if (isRecording) {
      mic.classList.add('isRecording');
      recorder.start();
    }
    else {
      mic.classList.remove('isRecording');
      recorder.stop();
    }
  }
}




async function transcribeAudio(file) {
  const response = await fetch(`https://api.deepgram.com/v1/listen?language=${language_code}&model=nova-2`, {
    method: 'POST',
    headers: {
      Accept: "application/json",
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'audio/wav',
    },
    body: file, // Send the actual audio file blob here
  });

  const res = await response.json();

  console.log("Deepgram full response:", res);
  const transcript = res.results.channels[0].alternatives[0].transcript;

  mic.classList.remove('cancelled');
  return transcript;
}





// bluetoothBtn.addEventListener('click', function() {

//   // / Request Bluetooth device
//   navigator.bluetooth
//     .requestDevice(options)
//     .then((device) => {
//       console.log(`connected to device: ${device}`);
//       // Connect to GATT server
//       bluetoothBtn.innerHTML = "Disconnect"
//       return device.gatt.connect();
//     })
//     .then((server) => {
//       // Get Battery Service
//       console.log("Connected to server:", server);

//       return server.getPrimaryService(0x1101);
//     })
//     .then((service) => {
//       console.log("Connected to service:", service);
//       // Get Battery Level Characteristic
//       // return service.getCharacteristic("battery_level");
//       return service.getCharacteristics();
//     })
//     .then((characteristics) => {
//       const bCharacteristic = characteristics[0];
//       console.log("Connected to characteristic:", bCharacteristic);

//       if (!("TextEncoder" in window)) {
//         console.log("Sorry, this browser does not support TextEncoder...");
//       }
//       var enc = new TextEncoder(); // always utf-8
//       return bCharacteristic.writeValue(enc.encode(message));

//       // Writing 1 is the signal to reset energy expended.
//       // const resetEnergyExpended = Uint8Array.of(1);
//       // return characteristic.writeValue(resetEnergyExpended);

//       // Read Battery Level
//       // return characteristic.readValue();
//     })
//     .then((e) => {
//       console.log("Energy expended has been reset.", e);
//     })
//     // .then((value) => {
//     //   console.log("Battery level is " + value.getUint8(0) + "%");
//     // })
//     .catch((error) => {
//       console.error("Error:", error);
//     })});

// let characteristic = '0000ffe1-0000-1000-8000-00805f9b34fb';

async function contentChanged() {
  // this function will run each time the content of the DIV changes
  var enc = new TextEncoder();
  var delta = handleCommands(myElement.innerText);
  await characteristic.writeValue(enc.encode(delta));
  console.log(`bluetooth data sent: ${handleCommands(myElement.innerText)}`);
}

/////// Bluetooth connection /////////

let characteristic;
let options = {
  //  acceptAllDevices: true,
  // filters: [{
  //   services: [0x1234, 0x12345678, '99999999-0000-1000-8000-00805f9b34fb, 00001101-0000-1000-8000-00805F9B34FB']
  // }],

  filters: [

    // { name: "ExampleName" },
    { namePrefix: "BT" },

    //   // name: "Galaxy A15",

  ],
  // { services: ["heart_rate"] },

  optionalServices: [0xFFE0, 0x180f, 0x1101, '00001101-0000-1000-8000-00805f9b34fb', 0x09A3, '0000ffe1-0000-1000-8000-00805f9b34fb'],
  // optionalServices: ["battery_service"],
}
async function connect() {
  await navigator.bluetooth.requestDevice(options).then(e => {
    console.log(`device: ${e.name}`);


    return e.gatt.connect();
  }).then(server => {
    return server.getPrimaryService(0xFFE0);
  }).then(async service => {
    characteristic = await service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb');
    return service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb');
  }).then(characteristic => {
    var enc = new TextEncoder();
    characteristic.writeValue(enc.encode("bluetooth connected"));
  })
}



/////           Arabic speech recognition           //////

function arabic() {
  let transcription;
  var recognition = new webkitSpeechRecognition();
  recognition.lang = "ar-JO";

  recognition.onresult = function (event) {
    console.log(event);
    transcription = event.results[0][0].transcript;
    myElement.innerText = transcription;
    mic.classList.remove('isRecording');
    contentChanged();
  }

  recognition.start();
}


// assembly ai code api
//__23__23__23__23_23


const assemblyAIKey = "4a687589c4b44c5dba72c41b3cbe712f";
const lemurPrompt =
  `
You are controlling a multilingual prosthetic hand.

Allowed commands:
- open
- close
- peace
- ok
- bad

If the command has a similar meaning to any of the allowed commands, or is a typo or synonym, map it to the correct allowed command.

If the command cannot be mapped to any allowed command, respond with: unknown.

Your response must ONLY contain one of the following: open, close, peace, ok, bad, unknown.

DO NOT provide any explanation or extra text.
`;



async function getLemurCommand(transcriptionText) {
  try {
    const response = await fetch("http://localhost:3000/lemur", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }, // ← comma here
      body: JSON.stringify({   // ← body at same level as headers
        input_text: transcriptionText,
        language: chosenLanguage,
      }),
    });

    const data = await response.json();

    if (data && data.result) {
      console.log("Lemur command:", data.result);
      return data.result.trim().toLowerCase();
    } else {
      console.error("Invalid response from /lemur endpoint:", data);
      return "unknown";
    }

  } catch (error) {
    console.error("Error with proxy server:", error);
    return "caught an unexpected error";
  }
}
