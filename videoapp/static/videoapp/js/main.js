 
    



// Initialiser les variables globales
let subscriptionKey = "6wb4SY1xPaK6f9hTQeXH7j1fQuInvtmszas159jZ06Bv07V2hegVJQQJ99AKACYeBjFXJ3w3AAAAACOGnUa0";
let serviceRegion = "eastus";
let speechConfig = SpeechSDK.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);

let audioConfig;
let recognizer;
const currentUsername = "{{ request.user.username }}";

var targetLanguage = 'en';
let token = '';
const APP_ID = "f2891190d713482dbed4c3fd804ec233";
const CHANNEL_NAME = "channel1";

let agoraEngine;
let localAudioTrack;
let localVideoTrack;
let isJoined = false;

let videoGrid = document.getElementById('video-grid');
let microphonebut = document.getElementById("microphonebut");
let microphoneicon = document.getElementById("microphoneicon");

let lastRecognizedText = '';  // Stocker le dernier texte reconnu
var mediaStream = null;
mediaStream =  navigator.mediaDevices.getUserMedia({ audio: true });
// Fonction de reconnaissance vocale
const startRecognition = () => {
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(subscriptionKey, "eastus");
    speechConfig.speechRecognitionLanguage = "fr-FR";

    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

    recognizer.recognizing = (s, e) => {
        document.getElementById('output').innerText = `Recognizing: ${e.result.text}`;
    };

    recognizer.recognized = async (s, e) => {
        if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
            const recognizedText = e.result.text;
            
            // Vérifier si le texte est le même que le dernier texte reconnu
            if (recognizedText !== lastRecognizedText) {
                const translatedText = await translateText(recognizedText);
                voiceSocket.send(JSON.stringify({
                    transcript: translatedText,
                    username: "{{request.user.username}}"
                }));
                document.getElementById('output').innerText = `Recognized: ${translatedText}`;
                
                lastRecognizedText = recognizedText; // Mettre à jour le dernier texte reconnu
                
                // Synthèse vocale
                /*synthesizeSpeech(translatedText)
                    .then(() => console.log("Speech synthesis completed"))
                    .catch(err => console.error("Speech synthesis error", err));*/
            }
        } else if (e.result.reason === SpeechSDK.ResultReason.NoMatch) {
            document.getElementById('output').innerText = "No speech could be recognized.";
        }
    };

    recognizer.startContinuousRecognitionAsync(
        () => {
            console.log("Recognition started.");
        },
        err => {
            console.error(err);
        }
    );
};

const stopRecognition = () => {
    if (recognizer) {
        recognizer.stopContinuousRecognitionAsync(
            () => {
                console.log("Recognition stopped.");
            },
            err => {
                console.error(err);
            }
        );
    }
};

async function translateText(text) {
    const subscriptionKey = '6wb4SY1xPaK6f9hTQeXH7j1fQuInvtmszas159jZ06Bv07V2hegVJQQJ99AKACYeBjFXJ3w3AAAAACOGnUa0';
    const endpoint = 'https://api.cognitive.microsofttranslator.com/';
    const region = 'eastus';

    const path = '/translate?api-version=3.0';
    const url = `${endpoint}${path}&to=${document.getElementById('languageSelect').value}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Ocp-Apim-Subscription-Key': subscriptionKey,
            'Ocp-Apim-Subscription-Region': region,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify([{ 'Text': text }])
    });

    if (response.ok) {
        const data = await response.json();
        const translatedText = data[0].translations[0].text;
        return translatedText;
    } else {
        console.error('Erreur de traduction:', response.statusText);
        return "";
    }
}

async function synthesizeSpeech(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Définir la langue en anglais (en-GB pour l'anglais britannique, en-US pour l'anglais américain)
    utterance.lang = 'en-GB';  // Peut aussi être 'en-US' si vous voulez l'accent américain
    
    // Récupérer les voix disponibles
    const voices = speechSynthesis.getVoices();
    
    // Filtrer et choisir une voix anglaise masculine (vérifier que la langue est anglaise et que le nom contient 'Male')
    const maleEnglishVoice = voices.find(voice => 
        voice.lang.startsWith('en') && voice.name.toLowerCase().includes('male')
    );
    
    // Si une voix anglaise masculine est trouvée, l'utiliser
    if (maleEnglishVoice) {
        utterance.voice = maleEnglishVoice;
    }

    // Lancer la synthèse vocale
    speechSynthesis.speak(utterance);
}


document.addEventListener("DOMContentLoaded", () => {
    microphonebut.addEventListener("click", () => {

       

        if (microphoneicon.classList.contains("fa-microphone")) {
            if (isJoined) {
               
                mediaStream =  navigator.mediaDevices.getUserMedia({ audio: true });
                mediaStream.getTracks().forEach(track => track.stop());
                console.log("Microphone désactivé.");
        }
           
            microphoneicon.classList.remove("fa-microphone");
            microphoneicon.classList.add("fa-microphone-slash");
            
            console.log("Microphone activé.");
            stopRecognition();
            localAudioTrack.setEnabled(false);
        } else {
            if (isJoined) {
                mediaStream =  navigator.mediaDevices.getUserMedia({ audio: true });
                localAudioTrack.setEnabled(true);
                
        }
          
            microphoneicon.classList.remove("fa-microphone-slash");
            microphoneicon.classList.add("fa-microphone");
            //startRecognition();
        }
    });
});

// WebSocket pour la reconnaissance vocale
const voiceSocket = new WebSocket("ws://" + window.location.host + "/ws/voice/");
console.log("Voice WebSocket: ", voiceSocket);

voiceSocket.onmessage = async function (e) {
    const data = JSON.parse(e.data);
    if (data.username !== currentUsername && data.transcript) {
        synthesizeSpeech(data.transcript);
    }
};

    
async function fetchToken() {
        const response = await fetch('/generate_agora_token/');
        const data = await response.json();
        token = data.token;
        
        initializeAgora();
        startRecognition();
    }
    
async function initializeAgora() {
        agoraEngine = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    
        agoraEngine.on('user-published', async (user, mediaType) => {
            await agoraEngine.subscribe(user, mediaType);
            
            if (mediaType === 'video') {
                const remoteVideoTrack = user.videoTrack;
                const remotePlayerContainer = createPlayerContainer(user.uid.toString());
                videoGrid.appendChild(remotePlayerContainer);
                remoteVideoTrack.play(remotePlayerContainer.querySelector('.video-container'));
                //addControlButtons(remotePlayerContainer, false, user);

                
            }
            
            // Initialiser la piste audio distante et commencer la reconnaissance vocale
            if (mediaType === 'audio') {
                console.log('start recognition');
                const remoteAudioTrack = user.audioTrack;
               // remoteAudioTrack.play(); // Auto-play remote audio track
                
                //startSpeechRecognition(remoteAudioTrack); // Start speech recognition
            }
    
           
        });
    
        agoraEngine.on('user-unpublished', user => {
            const remotePlayerContainer = document.getElementById(user.uid.toString());
            if (remotePlayerContainer) {
                remotePlayerContainer.remove();
            }
        });
    
        
        await agoraEngine.join(APP_ID, CHANNEL_NAME, token, null);
    
        localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        localVideoTrack = await AgoraRTC.createCameraVideoTrack();
    
        const localPlayerContainer = createPlayerContainer('local-player');
        videoGrid.appendChild(localPlayerContainer);
    
        localVideoTrack.play(localPlayerContainer.querySelector('.video-container'));
    
        await agoraEngine.publish([localAudioTrack, localVideoTrack]);
    
        //addControlButtons(localPlayerContainer, true);
    
       
       
    }
    
  
function createPlayerContainer(id) {
    const container = document.createElement('div');
    container.id = id;
    container.className = 'player-container';

    const videoContainer = document.createElement('div');
    videoContainer.className = 'video-container';
    container.appendChild(videoContainer);

    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'controls-container';
    container.appendChild(controlsContainer);

    return container;
}

document.getElementById('join-leave-button').onclick = async () => {
        if (isJoined) {
           
            agoraEngine.leave();
            localAudioTrack.stop();
            localAudioTrack.close();
            localAudioTrack = null;

            localVideoTrack.stop();
            localVideoTrack.close();
            localVideoTrack = null;

            //localTracks.videoTrack.stop();
            //localTracks.videoTrack.close();
            
            document.querySelectorAll('.player-container').forEach(container => container.remove());
            document.getElementById('join-leave-button').className = 'btn btn-success';
            stopRecognition()
            isJoined = false;
        } else {
            await fetchToken();
           
            
            document.getElementById('join-leave-button').className = 'btn btn-danger';
            isJoined = true;
        }
    };
    
document.addEventListener("DOMContentLoaded", () => {
          let videobutton = document.getElementById("videobutton");
          let videoicon = document.getElementById("videoicon");
        
          videobutton.addEventListener("click", () => {
            localVideoTrack.setEnabled(!localVideoTrack.enabled);
            if (videoicon.classList.contains("fa-video")) {
                videoicon.classList.remove("fa-video");
                videoicon.classList.add("fa-video-slash");
                
                    } else {
                        videoicon.classList.remove("fa-video-slash");
                        videoicon.classList.add("fa-video");
                        user.videoTrack.setEnabled(!user.videoTrack.enabled);
                    }
          });
      });
           
document.addEventListener("DOMContentLoaded", () => {
    let chatbutton = document.getElementById("chatbutton");
    let chaticon = document.getElementById("chaticon");
    let chatArea = document.getElementById("chatarea");
    let targetDiv = document.getElementById("videodiv"); // Remplace "targetDiv" par l'ID de votre div

    chatbutton.addEventListener("click", () => {
        if (chaticon.classList.contains("fa-comment")) {
            chaticon.classList.remove("fa-comment");
            chaticon.classList.add("fa-comments");
            chatArea.style.display = 'block';
            targetDiv.classList.remove("col-md-12");
            targetDiv.classList.add("col-md-9"); // Ajoute "col-md-9" ou une autre classe si besoin
        } else {
            chaticon.classList.remove("fa-comments");
            chaticon.classList.add("fa-comment");
            chatArea.style.display = 'none';
            targetDiv.classList.remove("col-md-9"); // Retire la classe actuelle
            targetDiv.classList.add("col-md-12"); // Ajoute la classe "col-md-12"
        }
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const screenShareButton = document.getElementById('screenShareButton');
    const screenShareIcon = document.getElementById('screenShareIcon');
    const videoGrid = document.getElementById('video-grid');

    let localScreenTrack = null;
    let screenClient = null;
    let screenContainer = null;
    let mainClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

    // Fonction pour démarrer le partage d'écran
    async function startScreenShare() {
        try {
            // Créer un client Agora distinct pour le partage d'écran
            screenClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

            // Rejoindre le même canal que celui utilisé pour le flux principal
            const response1 = await fetch('/generate_agora_token/');
            const data1 = await response1.json();
            const token1 = data1.token;

            await screenClient.join(APP_ID, CHANNEL_NAME, token1, null);

            // Créer une piste vidéo pour le partage d'écran
            localScreenTrack = await AgoraRTC.createScreenVideoTrack();

            // Créer un conteneur pour l'écran partagé
            screenContainer = createPlayerContainer('screen-share-container');
            screenContainer.classList.add('screen-share-active'); // Ajouter une classe spécifique pour l'écran partagé
            videoGrid.appendChild(screenContainer);

            // Ajouter la piste vidéo au conteneur
            localScreenTrack.play(screenContainer.querySelector('.video-container'));

            // Publiez le flux de partage d'écran
            await screenClient.publish(localScreenTrack);
            console.log("Partage d'écran commencé !");

            // Notifiez les autres utilisateurs que le partage d'écran a commencé
            mainClient.sendMessage({
                text: JSON.stringify({ type: 'screen-share', action: 'start' }),
            });

            // Gestion de l'arrêt automatique du partage si l'utilisateur arrête manuellement
            localScreenTrack.on('track-ended', () => {
                stopScreenShare();
            });
        } catch (error) {
            console.error("Erreur lors du démarrage du partage d'écran :", error);
        }
    }

    // Fonction pour arrêter le partage d'écran
    async function stopScreenShare() {
        if (localScreenTrack) {
            await screenClient.unpublish(localScreenTrack);
            localScreenTrack.close();
            localScreenTrack = null;

            // Supprimer le conteneur de l'écran partagé
            screenContainer.remove();
            screenContainer = null;

            // Quitter le canal pour permettre de redémarrer le partage d'écran plus tard
            await screenClient.leave();
            screenClient = null;

            // Notifiez les autres utilisateurs que le partage d'écran s'est arrêté
            mainClient.sendMessage({
                text: JSON.stringify({ type: 'screen-share', action: 'stop' }),
            });

            console.log("Partage d'écran arrêté !");
        }
    }

    // Gestionnaire de clic pour le bouton de partage d'écran
    screenShareButton.addEventListener('click', () => {
        if (localScreenTrack) {
            stopScreenShare();
        } else {
            startScreenShare();
        }
    });

    // Gestion des messages entrants
    mainClient.on('message', (msg) => {
        const message = JSON.parse(msg.text);

        if (message.type === 'screen-share') {
            if (message.action === 'start') {
                // Ajuster l'interface pour afficher l'écran partagé
                adjustForScreenShare();
            } else if (message.action === 'stop') {
                // Réinitialiser l'interface lorsque le partage d'écran est arrêté
                resetInterface();
            }
        }
    });

    function adjustForScreenShare() {
        // Appliquer les mêmes modifications que celles faites localement pour afficher l'écran partagé
        const screenContainer = document.getElementById('screen-share-container');
        if (screenContainer) {
            screenContainer.classList.add('screen-share-active');
        }
    }

    function resetInterface() {
        // Réinitialiser l'interface lorsque le partage d'écran est arrêté
        const screenContainer = document.getElementById('screen-share-container');
        if (screenContainer) {
            screenContainer.classList.remove('screen-share-active');
        }
    }

    // Fonction pour créer un conteneur pour les vidéos
    function createPlayerContainer(id) {
        const container = document.createElement('div');
        container.id = id;
        container.className = 'player-container';

        const videoContainer = document.createElement('div');
        videoContainer.className = 'video-container';
        container.appendChild(videoContainer);

        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'controls-container';
        container.appendChild(controlsContainer);

        return container;
    }
});


      

           //let recognizer;
    
 
    document.getElementById('languageSelect').addEventListener('change', (event) => {
    targetLanguage = event.target.value;
    console.log(targetLanguage);
    });


         document.addEventListener("DOMContentLoaded", () => {
          const handButton = document.getElementById("handButton");
          const handIcon = document.getElementById("handIcon");
    
          handButton.addEventListener("click", () => {
              if (document.getElementById("handpopup").style.visibility == "hidden") {
                document.getElementById("handpopup").style.visibility = "visible";
                handIcon.classList.remove("fa-hand-sparkles");
                handIcon.classList.add("fa-hand-peace");
                 
              } else {
                document.getElementById("handpopup").style.visibility = "hidden";
                handIcon.classList.remove("fa-hand-peace");
                handIcon.classList.add("fa-hand-sparkles");
              }
          });
      });
    
    
    /*
      document.addEventListener("DOMContentLoaded", () => {
                const screenShareButton = document.getElementById("screenShareButton");
                const screenShareIcon = document.getElementById("screenShareIcon");
    
                screenShareButton.addEventListener("click", () => {
                    if (screenShareIcon.classList.contains("fa-video")) {
                        screenShareIcon.classList.remove("fa-video");
                        screenShareIcon.classList.add("fa-times");
                    } else {
                        screenShareIcon.classList.remove("fa-times");
                        screenShareIcon.classList.add("fa-video");
                    }
                });
            });
    */
    
    
            document.addEventListener("DOMContentLoaded", () => {
          const timeDisplay = document.getElementById("timecounter");
          const startTime = Date.now();
    
          function updateElapsedTime() {
              const currentTime = Date.now();
              const distance = currentTime - startTime;
              const days = Math.floor(distance / (1000 * 60 * 60 * 24));
              const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
              const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
              const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    
      // Display the result in the element with id="demo"
     // document.getElementById("timecounter").innerHTML = days + "d " + hours + "h " + minutes + "m " + seconds + "s ";
     document.getElementById("timecounter").innerHTML =  hours + "h " + minutes + "m " + seconds + "s ";
    
              
          }
    
          setInterval(updateElapsedTime, 1000);
      });
    
    
    


      async function getVoicesForLanguage() {
    const subscriptionKey = "8f33bcec46e842318809a0e94dcdaa04";
    const region = "eastus";
    const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`;

    const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
            'Ocp-Apim-Subscription-Key': subscriptionKey
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const voices = await response.json();
   
   console.log(voices)

   const voiceNames = voices
    .filter(voice => 
        voice.Locale.includes(document.getElementById('languageSelect').value) &&
        voice.Gender === 'Male'
    )
    .map(voice => voice.ShortName);

    
        
    console.log(voiceNames)
    return voiceNames;
}


      



    const chatSocket = new WebSocket("ws://" + window.location.host + "/");
console.log("Host: ", chatSocket);

chatSocket.onopen = function (e) {
    console.log("The connection was setup successfully !");
};

chatSocket.onclose = function (e) {
    console.log("Something unexpected happened !");
};

document.querySelector("#fileselect").onclick = function () {
    document.querySelector("#fileInput").click();
};

document.querySelector("#fileInput").onchange = function (e) {
    const file = e.target.files[0];
    if (file) {
        // Afficher le nom du fichier sélectionné et les options
        document.querySelector("#filePreview").textContent = `${file.name}`;
        document.querySelector("#sendFileButton").style.display = "inline";
        document.querySelector("#removeFileButton").style.display = "inline";
    }
};

document.querySelector("#sendFileButton").onclick = function () {
    const fileInput = document.querySelector("#fileInput");
    const file = fileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const fileData = e.target.result.split(',')[1];  // Get base64 string
            chatSocket.send(JSON.stringify({
                file: fileData,
                file_name: file.name,
                file_type: file.type,
                username: "{{request.user.username}}"
            }));
        };
        reader.readAsDataURL(file);

        // Réinitialiser l'input file et masquer les options
        fileInput.value = "";
        document.querySelector("#filePreview").textContent = "";
        document.querySelector("#sendFileButton").style.display = "none";
        document.querySelector("#removeFileButton").style.display = "none";
    }
};

document.querySelector("#removeFileButton").onclick = function () {
    // Réinitialiser l'input file et masquer les options
    const fileInput = document.querySelector("#fileInput");
    fileInput.value = "";
    document.querySelector("#filePreview").textContent = "Aucun fichier sélectionné.";
    document.querySelector("#sendFileButton").style.display = "none";
    document.querySelector("#removeFileButton").style.display = "none";
};

document.querySelector("#id_message_send_input").onkeyup = function (e) {
    if (e.keyCode == 13) {
        document.querySelector("#id_message_send_button").click();
    }
};

document.querySelector("#id_message_send_button").onclick = function (e) {
    const messageInput = document.querySelector("#id_message_send_input").value;
    if (messageInput.trim() !== "") {
        chatSocket.send(JSON.stringify({ 
            message: messageInput, 
            username: "{{request.user.username}}"
        }));
    }
    document.querySelector("#id_message_send_input").value = "";
};

chatSocket.onmessage = async function (e) {
    const data = JSON.parse(e.data);

    if (data.message) {
        let message_trans = await translateText(data.message);
        let message_add = `<p class="bg-secondary text-light px-1" style="border-radius: 1em;">${data.username} : ${message_trans}</p><br>`;
        document.getElementById("text_chat").insertAdjacentHTML('beforeend', message_add);
    } else if (data.file_url) {
        let file_message = `${data.username}: <a href="${data.file_url}" download="${data.file_name}" class="btn btn-primary" style="margin-top: 5px;">${data.file_name} <i class="fas fa-download"></i></a><br>`;
        document.getElementById("text_chat").insertAdjacentHTML('beforeend', file_message);
    }

    document.getElementById("id_message_send_input").value = "";
};









    
    /* 
 
        document.getElementById('startButton').addEventListener('click', async function () {
         const speechConfig = SpeechSDK.SpeechConfig.fromSubscription("1329f3d781794f40bad4cf92f9a10d34", "eastus");
         speechConfig.speechRecognitionLanguage = "fr-FR";  // Configuration de la langue en français
     
         const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
         recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
     
         recognizer.recognizing œé WXcvb = (s, e) => {
             document.getElementById('output').innerText = `Recognizing: ${e.result.text}`;
         };
     
         recognizer.recognized = async (s, e) => {
             if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                 const translatedText = await  translateText(e.result.text);
                 document.getElementById('output').innerText = `Recognized: ${translatedText}`;
                 await synthesizeSpeech(translatedText)
             } else if (e.result.reason === SpeechSDK.ResultReason.NoMatch) {
                 document.getElementById('output').innerText = "No speech could be recognized.";
             }
         };
     
         recognizer.startContinuousRecognitionAsync(
             () => {
                 document.getElementById('startButton').disabled = true;
                 document.getElementById('stopButton').disabled = false;
             },
             err => {
                 console.error(err);
             }
         );
     });
 
    
     document.getElementById('stopButton').addEventListener('click', function () {
         recognizer.stopContinuousRecognitionAsync(
             () => {
                 document.getElementById('startButton').disabled = false;
                 document.getElementById('stopButton').disabled = true;
             },
             err => {
                 console.error(err);
             }
         );
     });
     
    
     */
 
 
 