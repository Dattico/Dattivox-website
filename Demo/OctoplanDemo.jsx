import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Button, Card, Typography, Space, message } from 'antd';
import { PhoneOutlined, AudioOutlined, StopOutlined } from '@ant-design/icons';
import LoadingComponent from '/src/components/LoadingComponent';
import { useLanguage } from '/src/utils/LanguageContext';
import { getTranslation } from '/src/utils/utils';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { fetchAuthSession } from 'aws-amplify/auth';
import './OctoplanDemo.css';

const { Title, Text, Paragraph } = Typography;

const OctoplanDemo = forwardRef((props, ref) => {
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
  const { language: propLanguage } = props;
  const { language: contextLanguage } = useLanguage();
  const language = propLanguage || contextLanguage || 'en';
  const t = getTranslation(language) || {};
  const [isListening, setIsListening] = useState(false);
  const [isIdle, setIsIdle] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [botResponse, setBotResponse] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const recognitionRef = useRef(null);
  const idleTimeoutRef = useRef(null);
  const synthRef = useRef(null);
  const currentAudioRef = useRef(null);
  const lastBotSpeechEndRef = useRef(0);
  const bedrockRef = useRef(null);
  const isIdleRef = useRef(true);
  const isSpeakingRef = useRef(false);
  const waitMusicRef = useRef(null);
  const selectedVoiceRef = useRef(null);
  const restartTimeoutRef = useRef(null);
  
  // Refs pour startDiscussion (WebSocket)
  const socketRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const currentAudioNodeRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingAudioRef = useRef(false);



  const startDemo = () => {
    // Si une instance est déjà en cours, arrêter d'abord
    if (!isIdleRef.current) {
      // Annuler tout redémarrage en attente
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      stopDemo();
      // Attendre un peu pour que l'arrêt soit complet
      restartTimeoutRef.current = setTimeout(() => {
        restartTimeoutRef.current = null;
        startDemoInternal();
      }, 300);
      return;
    }
    startDemoInternal();
  };

  const startDemoInternal = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setIsIdle(false);
    isIdleRef.current = false;
    conversationHistoryRef.current = [];
    startListening();
  };

  // Fonction pour arrêter proprement startDiscussion
  const stopDiscussion = () => {
    // Fermer le WebSocket
    if (socketRef.current) {
      try {
        if (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING) {
          socketRef.current.close();
        }
      } catch (e) {
        // Error closing socket
      }
      socketRef.current = null;
    }
    
    // Arrêter le mediaStream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      mediaStreamRef.current = null;
    }
    
    // Arrêter l'audio en cours
    if (currentAudioNodeRef.current) {
      try {
        currentAudioNodeRef.current.stop();
        currentAudioNodeRef.current.disconnect();
      } catch (e) {
        // Audio node already stopped
      }
      currentAudioNodeRef.current = null;
    }
    
    // Nettoyer le processor
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch (e) {
        // Processor already disconnected
      }
      processorRef.current = null;
    }
    
    // Fermer l'audioContext
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(e => {});
      audioContextRef.current = null;
    }
    
    // Vider la queue audio
    audioQueueRef.current = [];
    isPlayingAudioRef.current = false;
    
    setIsIdle(true);
    isIdleRef.current = true;
    setIsListening(false);
  };

  const startDiscussion = async () => {
    // Si une instance est déjà en cours, arrêter d'abord
    if (!isIdleRef.current) {
      stopDiscussion();
      // Attendre un peu pour que l'arrêt soit complet
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    let socket;
    let mediaStream;
    let processor;
    let audioContext;
    let mediaRecorder;
    let audioChunkCount = 0;
    let totalBytesSent = 0;

    // ✅ Queue audio pour jouer les chunks séquentiellement
    let audioQueue = [];
    let isPlayingAudio = false;
    let nextPlayTime = 0;
    let currentAudioNode = null; // Référence locale au node audio en cours

      // ✅ Fonction pour arrêter la lecture audio (interruption)
      const stopAudioPlayback = () => {
        if (currentAudioNodeRef.current) {
          try {
            currentAudioNodeRef.current.stop();
            currentAudioNodeRef.current.disconnect();
            currentAudioNodeRef.current = null;
          } catch (error) {
            // Le node peut déjà être arrêté, ignorer l'erreur
          }
        }
        // Vider la queue
        audioQueueRef.current = [];
        isPlayingAudioRef.current = false;
        nextPlayTime = 0;
      };

    // ✅ Fonction pour calculer le volume RMS (détection de voix)
    const calculateRMS = (audioData) => {
      let sum = 0;
      for (let i = 0; i < audioData.length; i++) {
        sum += audioData[i] * audioData[i];
      }
      return Math.sqrt(sum / audioData.length);
    };

    try {
      // 1. Ask politely for mic access
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = mediaStream; // Stocker dans ref

      // 2. AudioContext setup
      audioContext = new AudioContext({ sampleRate: 16000 }); // 16kHz pour Bedrock
      audioContextRef.current = audioContext; // Stocker dans ref
      const source = audioContext.createMediaStreamSource(mediaStream);

      // 3. Use ScriptProcessorNode to capture PCM 16-bit directly
      // (MediaRecorder génère du WebM, mais Bedrock a besoin de PCM)
      const bufferSize = 4096; // Taille du buffer
      processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
      processorRef.current = processor; // Stocker dans ref

      processor.onaudioprocess = (e) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          // Récupérer les données audio (Float32Array, valeurs entre -1 et 1)
          const inputData = e.inputBuffer.getChannelData(0);

          // ✅ Détecter si l'utilisateur parle (interruption)
          if (isPlayingAudioRef.current) {
            const rms = calculateRMS(inputData);
            const voiceThreshold = 0.01; // Seuil de détection de voix (ajustable)

            if (rms > voiceThreshold) {
              stopAudioPlayback();
            }
          }

          // Convertir Float32 (-1 à 1) en Int16 PCM (16-bit)
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            // Clamper entre -1 et 1, puis convertir en 16-bit
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          // Envoyer le PCM directement au serveur
          audioChunkCount++;
          totalBytesSent += pcmData.byteLength;

          try {
            socket.send(pcmData.buffer);
          } catch (error) {
            // Error sending PCM chunk
          }
        }
      };

      // Connecter le processor
      source.connect(processor);
      processor.connect(audioContext.destination);

      // 4. WebSocket connection
      // TEST DIRECT EC2: Testez avec ws:// (sans SSL)
      // const wsUrl = "ws://35.158.76.206:3000/demo";
      // PRODUCTION: Utilisez le load balancer avec wss://
      // ✅ Ajouter la langue dans l'URL pour que le serveur puisse utiliser la bonne voix et le bon prompt
      const wsUrl = `wss://twilio-webhook.octoplan.ai/demo?lang=${language}`;
      // Pour tester directement l'EC2 avec SSL (si vous avez un certificat)
      // const wsUrl = `wss://35.158.76.206:3000/demo?lang=${language}`;

      socket = new WebSocket(wsUrl);
      socketRef.current = socket; // Stocker dans ref
      
      // Mettre à jour l'état
      setIsIdle(false);
      isIdleRef.current = false;
      setIsListening(true);

      // 🔍 SOLUTION: Handler onmessage AVANT onopen pour détecter les messages de test
      // Certains serveurs envoient un message avant que onopen ne soit appelé
      // Ce handler sera remplacé par le handler principal dans onopen
      let messageHandlerSet = false;
      socket.onmessage = (event) => {
        if (typeof event.data === 'string' && event.data === 'CONNECTION_ESTABLISHED') {
          // Server confirmed connection
        }

        // Si le handler principal n'est pas encore défini, on ne fait rien d'autre
        // Il sera défini dans onopen
      };

      // 🔍 SOLUTION: Timeout pour détecter si onopen n'est jamais appelé
      const connectionTimeout = setTimeout(() => {
        if (socket.readyState !== WebSocket.OPEN) {
          // Connection timeout
        }
      }, 5000); // 5 secondes

      socket.onopen = () => {
        clearTimeout(connectionTimeout);
        messageHandlerSet = true; // Le handler principal va remplacer le handler temporaire

        // Le serveur configure automatiquement les événements d'initialisation
        // On n'a pas besoin de les envoyer depuis le client

        // La capture PCM est déjà active via ScriptProcessorNode
        // Pas besoin de démarrer quoi que ce soit, le processor envoie automatiquement
      };

      // ✅ Fonction pour jouer la queue audio séquentiellement
      const playAudioQueue = () => {
        // Si on est déjà en train de jouer ou si la queue est vide, ne rien faire
        if (isPlayingAudioRef.current || audioQueueRef.current.length === 0) {
          return;
        }

        isPlayingAudioRef.current = true;
        const audioBuffer = audioQueueRef.current.shift(); // Prendre le premier élément de la queue

        const playNode = audioContext.createBufferSource();
        playNode.buffer = audioBuffer;

        // ✅ Stocker la référence au node audio pour pouvoir l'arrêter
        currentAudioNodeRef.current = playNode;

        // Créer un GainNode pour contrôler le volume
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 1.0; // Volume à 100%

        playNode.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Calculer le temps de début (enchaîner les chunks)
        const currentTime = audioContext.currentTime;
        const startTime = Math.max(currentTime, nextPlayTime);

        playNode.start(startTime);

        // Mettre à jour le temps de la prochaine lecture
        nextPlayTime = startTime + audioBuffer.duration;

        // Quand ce chunk est terminé, jouer le suivant
        playNode.onended = () => {
          isPlayingAudioRef.current = false;
          currentAudioNodeRef.current = null; // ✅ Nettoyer la référence
          // Jouer le chunk suivant s'il y en a un
          if (audioQueueRef.current.length > 0) {
            playAudioQueue();
          }
        };
      };

      // When server sends back audio (binary PCM) or test messages
      socket.onmessage = async (event) => {
        // Vérifier si c'est un message de test texte
        if (typeof event.data === 'string' || (event.data instanceof Blob && event.data.size < 100)) {
          const text = typeof event.data === 'string' ? event.data : await event.data.text();
          if (text === 'CONNECTION_ESTABLISHED' || text === 'test') {
            // Server connection confirmed
          }
          return; // Ne pas traiter les messages de test comme de l'audio
        }

        // Le serveur envoie directement du binaire (PCM audio)
        try {
          let arrayBuf;
          if (event.data instanceof Blob) {
            arrayBuf = await event.data.arrayBuffer();
          } else if (event.data instanceof ArrayBuffer) {
            arrayBuf = event.data;
          } else {
            return;
          }

          // Le serveur envoie du PCM 16-bit (Int16Array)
          // Il faut créer un AudioBuffer directement depuis le PCM
          // PCM 16-bit = 2 bytes par sample, little-endian
          const pcmData = new Int16Array(arrayBuf);
          const bedrockSampleRate = 16000; // Bedrock génère à 16kHz (configuré côté serveur)
          const numberOfChannels = 1; // Mono

          // ✅ IMPORTANT : Utiliser le sample rate réel de l'AudioContext
          // Si le navigateur ne supporte pas 16000 Hz, l'AudioContext utilisera un autre sample rate
          const actualSampleRate = audioContext.sampleRate;

          // Si les sample rates diffèrent, on doit faire une conversion
          // Pour l'instant, utilisons le sample rate de Bedrock (16000 Hz)
          // Le navigateur fera la conversion automatiquement si nécessaire
          const targetSampleRate = bedrockSampleRate;

          // Créer un AudioBuffer depuis le PCM avec le sample rate de Bedrock
          const audioBuffer = audioContext.createBuffer(
            numberOfChannels,
            pcmData.length,
            targetSampleRate
          );

          // Convertir Int16 PCM (-32768 à 32767) en Float32 (-1.0 à 1.0)
          // ✅ CORRECTION : Utiliser 32767.0 pour la division (pas 32768.0)
          // Car la valeur max positive est 32767, pas 32768
          const channelData = audioBuffer.getChannelData(0);
          for (let i = 0; i < pcmData.length; i++) {
            // Clamper la valeur entre -1.0 et 1.0
            channelData[i] = Math.max(-1.0, Math.min(1.0, pcmData[i] / 32767.0));
          }

          // ✅ Ajouter à la queue et jouer séquentiellement
          audioQueueRef.current.push(audioBuffer);
          playAudioQueue();
        } catch (error) {
          // Error processing server message
        }
      };

      socket.onerror = (error) => {
        // WebSocket error occurred
      };

      socket.onclose = (event) => {
        // Nettoyer le processor
        if (processor) {
          processor.disconnect();
        }

        // ✅ Nettoyer la queue audio
        if (currentAudioNodeRef.current) {
          try {
            currentAudioNodeRef.current.stop();
            currentAudioNodeRef.current.disconnect();
          } catch (e) {}
          currentAudioNodeRef.current = null;
        }
        audioQueueRef.current = [];
        isPlayingAudioRef.current = false;
      };
    } catch (error) {
      // Audio setup failed
    }
  }
  // Initialize speech recognition
  useEffect(() => {
    // Load voices for speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        // Interrupt bot if user starts speaking
        if ((interimTranscript || finalTranscript) && isSpeakingRef.current) {
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
          }
          setIsSpeaking(false);
          isSpeakingRef.current = false;
        }
        
        // Show live transcription
        setTranscript(finalTranscript + interimTranscript);
        
        if (finalTranscript) {
          handleUserMessage(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        if (event.error === 'not-allowed') {
          message.error(t.OctoplanDemo?.microphoneAccessDenied || 'Microphone access denied. Please allow microphone access and try again.');
          stopDemo();
        }
      };

      recognitionRef.current.onend = () => {
        if (!isIdleRef.current) {
          // Restart if we're still supposed to be listening
          try {
            recognitionRef.current?.start();
          } catch (e) {
            // Recognition restart failed
          }
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, []);

  const initializeBedrock = async () => {
    try {
      const session = await fetchAuthSession({ forceRefresh: true });
      if (!session.credentials) throw new Error('No credentials');
      
      bedrockRef.current = new BedrockRuntimeClient({
        region: 'eu-central-1',
        credentials: session.credentials
      });
    } catch (error) {
      // Bedrock init failed
    }
  };

  const conversationHistoryRef = useRef([]);

  const createAppointment = (params) => {
    const { duration, date, service, time } = params;
    const appointmentDetails = {
      service,
      date,
      time,
      duration: `${duration} minutes`
    };
    
    // Show Antd notification with corporate colors
    message.success({
      content: (
        <div>
          <div style={{ fontWeight: 'bold', color: '#52c41a', marginBottom: '4px' }}>
            ✓ Appointment Created Successfully!
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            <div><strong>Service:</strong> {service}</div>
            <div><strong>Date:</strong> {date}</div>
            <div><strong>Time:</strong> {time}</div>
            <div><strong>Duration:</strong> {duration} minutes</div>
          </div>
        </div>
      ),
      duration: 5,
      style: {
        marginTop: '20vh',
      }
    });
    
    return appointmentDetails;
  };

  const getBedrockResponse = async (userMessage) => {
    if (!bedrockRef.current) {
      await initializeBedrock();
    }
    
    if (!bedrockRef.current) {
      return 'Hello! I\'m having trouble connecting right now. How can I help you with your appointment today?';
    }
    
    const now = new Date();
    const currentDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const currentTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    
    const instruction = `You are an appointment assistant for ACME. Your job is to help users create, move, or cancel appointments by having a friendly, natural conversation.

**RULE: You must always respond in full, friendly conversational language — never describe actions. Speak directly to the user. You must answer in english only.**

### Current Date and Time
- Today is ${currentDay}, ${currentDate}
- Current time is ${currentTime}
- Use this information to calculate dates when user says "tomorrow", "next week", "Monday", etc.

### Services Available at ACME
- Medical check-up (15 minutes)
- Radio (10 minutes)

### Conversation Flow
- User already heard the introduction, continue the conversation naturally
- Ask what service they need if not mentioned
- Collect: service, date, time
- Maintain a friendly conversation

### Creating appointments
- Collect: service, date (dd/mm/yyyy), time (hh:mm:ss), duration (in minutes based on service)
- When user says relative dates like "tomorrow" or "next Monday", calculate the actual date based on current date
- Once you have all required info, use the CreateAppointment tool with the calculated date`;
    
    const tools = [{
      toolSpec: {
        name: 'CreateAppointment',
        description: 'Create appointment with collected information',
        inputSchema: {
          json: {
            type: 'object',
            properties: {
              duration: { type: 'number', description: 'Duration of the service in minutes (given in instructions)' },
              date: { type: 'string', description: 'Date in dd/mm/yyyy format (must be calculated from current date if user provides relative date)' },
              service: { type: 'string', description: 'Service to book' },
              time: { type: 'string', description: 'Time in hh:mm:ss format (24-hour format)' }
            },
            required: ['duration', 'date', 'service', 'time']
          }
        }
      }
    }];
    
    conversationHistoryRef.current.push({
      role: 'user',
      content: [{ text: userMessage }]
    });
    
    try {
      const command = new ConverseCommand({
        modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
        messages: conversationHistoryRef.current,
        system: [{ text: instruction }],
        toolConfig: { tools },
        inferenceConfig: {
          maxTokens: 1000,
          temperature: 0.7
        }
      });
      
      const response = await bedrockRef.current.send(command);
      
      const assistantMessage = { role: 'assistant', content: response.output.message.content };
      conversationHistoryRef.current.push(assistantMessage);
      
      if (response.stopReason === 'tool_use') {
        const toolUse = response.output.message.content.find((c) => c.toolUse)?.toolUse;
        if (toolUse?.name === 'CreateAppointment') {
          const appointmentDetails = createAppointment(toolUse.input);
          
          conversationHistoryRef.current.push({
            role: 'user',
            content: [{
              toolResult: {
                toolUseId: toolUse.toolUseId,
                content: [{ json: { success: true, appointment: appointmentDetails } }]
              }
            }]
          });
          
          const followUpCommand = new ConverseCommand({
            modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
            messages: conversationHistoryRef.current,
            system: [{ text: instruction }],
            toolConfig: { tools },
            inferenceConfig: { maxTokens: 1000, temperature: 0.7 }
          });
          
          const followUpResponse = await bedrockRef.current.send(followUpCommand);
          conversationHistoryRef.current.push({ role: 'assistant', content: followUpResponse.output.message.content });
          return followUpResponse.output.message.content[0].text;
        }
      }
      
      return response.output.message.content[0].text;
    } catch (error) {
      return 'Hello! I\'m your appointment assistant. How can I help you today - would you like to create, move, or cancel an appointment?';
    }
  };

  const handleUserMessage = async (userMessage) => {
    if (!userMessage.trim()) {
      return;
    }
    
    if (isIdleRef.current) {
      return;
    }
    
    // Stop any current audio
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    
    setIsProcessing(true);
    setBotResponse('Thinking...');
    
    // Play wait music
    if (!waitMusicRef.current) {
      waitMusicRef.current = new Audio('/src/pages/Demo/Final OCTOPUS.wav');
      waitMusicRef.current.loop = true;
      waitMusicRef.current.volume = 0.3;
    }
    waitMusicRef.current.play().catch(e => {});
    
    try {
      const response = await getBedrockResponse(userMessage);
      setBotResponse(response);
      
      // Stop wait music
      if (waitMusicRef.current) {
        waitMusicRef.current.pause();
        waitMusicRef.current.currentTime = 0;
      }
      
      await speakText(response);
    } catch (error) {
      setBotResponse('Sorry, I had trouble processing that.');
      
      // Stop wait music on error
      if (waitMusicRef.current) {
        waitMusicRef.current.pause();
        waitMusicRef.current.currentTime = 0;
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = async (text) => {
    setIsSpeaking(true);
    isSpeakingRef.current = true;
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const getBrowserAndOS = () => {
        const isEdge = /Edg/.test(navigator.userAgent);
        const isChrome = /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);
        const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
        const isMac = /Mac/.test(navigator.platform);
        const isWindows = /Win/.test(navigator.platform);
        return { isEdge, isChrome, isSafari, isMac, isWindows };
      };
      
      const getVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        if (!selectedVoiceRef.current && voices.length > 0) {
          const { isEdge, isChrome, isSafari, isMac, isWindows } = getBrowserAndOS();
          
          if (isEdge) {
            // Edge: Prioritize Microsoft neural voices
            selectedVoiceRef.current = voices.find(v => v.name.includes('Microsoft') && v.lang === 'en-US') ||
              voices.find(v => v.name === 'Microsoft Zira Desktop' || v.name === 'Microsoft David Desktop') ||
              voices.find(v => v.name === 'Samantha') ||
              voices.find(v => v.localService && v.lang === 'en-US') ||
              voices[0];
          } else if (isChrome && isMac) {
            // Chrome macOS: Samantha is the most natural for conversational speech
            selectedVoiceRef.current = voices.find(v => v.name === 'Samantha') ||
              voices.find(v => v.name === 'Karen') ||
              voices.find(v => v.name === 'Aaron') ||
              voices.find(v => v.name.includes('Daniel') && v.lang === 'en-GB') ||
              voices.find(v => v.localService && v.lang === 'en-US') ||
              voices[0];
          } else if (isChrome && isWindows) {
            // Chrome Windows: Prefer local voices
            selectedVoiceRef.current = voices.find(v => v.name.includes('Microsoft') && v.localService) ||
              voices.find(v => v.localService && v.lang === 'en-US') ||
              voices.find(v => v.name === 'Google US English') ||
              voices[0];
          } else if (isSafari) {
            // Safari: Works best with system voices
            selectedVoiceRef.current = voices.find(v => v.name === 'Samantha') ||
              voices.find(v => v.name === 'Alex') ||
              voices.find(v => v.localService && v.lang === 'en-US') ||
              voices[0];
          } else {
            // Fallback for other browsers
            selectedVoiceRef.current = voices.find(v => v.localService && v.lang === 'en-US') ||
              voices.find(v => v.lang === 'en-US') ||
              voices[0];
          }
        }
        return selectedVoiceRef.current;
      };
      
      const utterance = new SpeechSynthesisUtterance(text);
      const { isEdge, isChrome, isSafari, isMac, isWindows } = getBrowserAndOS();
      
      // Research-based optimal settings per browser/OS
      if (isEdge) {
        // Edge: Best with neural voices, can handle higher rates
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.9;
      } else if (isChrome && isMac) {
        // Chrome macOS: Optimal conversational settings
        utterance.rate = 0.85;
        utterance.pitch = 0.95;
        utterance.volume = 0.9;
      } else if (isChrome && isWindows) {
        // Chrome Windows: Moderate settings
        utterance.rate = 0.8;
        utterance.pitch = 0.95;
        utterance.volume = 0.9;
      } else if (isSafari) {
        // Safari: Conservative settings work best
        utterance.rate = 0.8;
        utterance.pitch = 1.0;
        utterance.volume = 0.9;
      } else {
        // Default fallback
        utterance.rate = 0.8;
        utterance.pitch = 0.95;
        utterance.volume = 0.85;
      }
      
      utterance.lang = 'en-US';
      
      const voice = getVoice();
      if (voice) {
        utterance.voice = voice;
      }
      
      utterance.onend = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        lastBotSpeechEndRef.current = Date.now();
      };
      
      utterance.onerror = (e) => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
      };
      
      window.speechSynthesis.speak(utterance);
    } else {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    }
  };

  const startListening = async () => {
    if (!recognitionRef.current) {
      message.error(t.OctoplanDemo?.speechNotSupported || 'Speech recognition not supported in this browser');
      return;
    }

    setIsListening(true);
    setIsIdle(false);
    isIdleRef.current = false;
    setTranscript('');
    
    try {
      // Small delay to ensure previous stop completed
      await new Promise(resolve => setTimeout(resolve, 100));
      recognitionRef.current.start();
      
      // Play introduction message
      const intro = "Hello! Welcome to Dattivox. I'm your 24/7 virtual secretary. I can help you with appointments, answer questions, and handle your business needs. How can I help you today?";
      setBotResponse(intro);
      await speakText(intro);
    } catch (error) {
      message.error(t.OctoplanDemo?.voiceRecognitionFailed || 'Failed to start voice recognition');
      setIsListening(false);
      isIdleRef.current = true;
    }
  };

  const stopDemo = () => {
    // Arrêter aussi startDiscussion si elle est active
    if (socketRef.current || mediaStreamRef.current) {
      stopDiscussion();
    }
    
    setIsIdle(true);
    isIdleRef.current = true;
    setIsListening(false);
    setIsProcessing(false);
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    setTranscript('');
    setBotResponse('');
    lastBotSpeechEndRef.current = 0;
    conversationHistoryRef.current = [];
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Error stopping recognition
      }
    }
    
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
    
    // Annuler tout redémarrage en attente
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    if (waitMusicRef.current) {
      waitMusicRef.current.pause();
      waitMusicRef.current.currentTime = 0;
    }
  };


  // Exposer startDiscussion et stopDiscussion via ref
  useImperativeHandle(ref, () => ({
    startDiscussion: startDiscussion,
    stopDiscussion: stopDiscussion
  }));




  return (
    <div className="demo-active">
      {isIdle ? (
        <>
          <div className="demo-text-overlay">
            <h3>{t.demo?.title || 'AI Voice Demo'}</h3>
            <div className="demo-content-row">
              <img src="/Passport-guichet.png" alt="Passport Renewal" className="demo-image" />
              <p>{t.demo?.description || 'You are calling to renew your passport. Ask information about it and book an appointment.'}</p>
            </div>
          </div>
          
          <div className="demo-controls">
            <Button 
              className="start-demo-btn"
              onClick={startDiscussion}
              size="large"
            >
              <PhoneOutlined /> {t.demo?.startVoiceDemo || 'Start Voice Demo'}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="demo-text-overlay">
            <h3>{t.demo?.title || 'AI Voice Demo'}</h3>
            <div className="demo-content-row">
              <img src="/Passport-guichet.png" alt="Passport Renewal" className="demo-image" />
              <p>{t.demo?.description || 'You are calling to renew your passport. Ask information about it and book an appointment.'}</p>
            </div>
          </div>
          
          <div className="demo-voice-visualization">
            <div 
              className={`voice-wave ${(isListening || isProcessing) ? 'active' : ''}`}
            />
            <div 
              className={`voice-wave voice-wave-2 ${(isListening || isProcessing) ? 'active' : ''}`}
            />
            <div 
              className={`voice-wave voice-wave-3 ${(isListening || isProcessing) ? 'active' : ''}`}
            />
          </div>
          
          <div className="demo-controls">
            <Button 
              className="stop-demo-btn"
              onClick={stopDemo}
              size="large"
            >
              <StopOutlined /> {t.demo?.endCall || 'End Call'}
            </Button>
          </div>
          
          {transcript && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.5)', borderRadius: '1rem', color: '#4C2E76' }}>
              <strong>{t.demo?.you || 'You'}:</strong> {transcript}
            </div>
          )}
          {botResponse && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.5)', borderRadius: '1rem', color: '#4C2E76' }}>
              <strong>{t.demo?.dattivox || 'Dattivox'}:</strong> {botResponse}
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default OctoplanDemo;