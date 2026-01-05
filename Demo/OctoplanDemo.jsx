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
  const { language } = useLanguage();
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
      console.log('Stopping existing demo before starting new one...');
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
    console.log('🛑 [CLIENT] Stopping discussion...');
    
    // Fermer le WebSocket
    if (socketRef.current) {
      try {
        if (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING) {
          socketRef.current.close();
        }
      } catch (e) {
        console.error('Error closing socket:', e);
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
        console.log('Audio node already stopped');
      }
      currentAudioNodeRef.current = null;
    }
    
    // Nettoyer le processor
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch (e) {
        console.log('Processor already disconnected');
      }
      processorRef.current = null;
    }
    
    // Fermer l'audioContext
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(e => console.log('AudioContext close error:', e));
      audioContextRef.current = null;
    }
    
    // Vider la queue audio
    audioQueueRef.current = [];
    isPlayingAudioRef.current = false;
    
    setIsIdle(true);
    isIdleRef.current = true;
    setIsListening(false);
    console.log('✅ [CLIENT] Discussion stopped');
  };

  const startDiscussion = async () => {
    // Si une instance est déjà en cours, arrêter d'abord
    if (!isIdleRef.current) {
      console.log('🔄 [CLIENT] Stopping existing discussion before starting new one...');
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
            console.log('⚠️ [CLIENT] Audio node already stopped');
          }
        }
        // Vider la queue
        audioQueueRef.current = [];
        isPlayingAudioRef.current = false;
        nextPlayTime = 0;
        console.log('🛑 [CLIENT] Audio playback stopped (user interruption)');
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
      console.log('🎬 [CLIENT] Starting audio setup...');

      // 1. Ask politely for mic access
      console.log('🎤 [CLIENT] Requesting microphone access...');
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = mediaStream; // Stocker dans ref
      console.log('✅ [CLIENT] Microphone access granted');
      console.log('📊 [CLIENT] MediaStream tracks:', mediaStream.getTracks().map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        readyState: t.readyState
      })));

      // 2. AudioContext setup
      console.log('🔊 [CLIENT] Creating AudioContext...');
      audioContext = new AudioContext({ sampleRate: 16000 }); // 16kHz pour Bedrock
      audioContextRef.current = audioContext; // Stocker dans ref
      console.log('✅ [CLIENT] AudioContext created, sampleRate:', audioContext.sampleRate);
      const source = audioContext.createMediaStreamSource(mediaStream);

      // 3. Use ScriptProcessorNode to capture PCM 16-bit directly
      // (MediaRecorder génère du WebM, mais Bedrock a besoin de PCM)
      console.log('📹 [CLIENT] Creating ScriptProcessorNode for PCM capture...');
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
              console.log('🎤 [CLIENT] User voice detected (RMS:', rms.toFixed(4), '), interrupting audio');
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
            // Réduire les logs pour éviter le spam
            if (audioChunkCount % 50 === 0) {
              console.log(`📤 [CLIENT] Sent PCM chunk #${audioChunkCount}:`, {
                size: pcmData.byteLength,
                samples: pcmData.length,
                sampleRate: audioContext.sampleRate,
                totalChunks: audioChunkCount,
                totalBytes: totalBytesSent
              });
            }
          } catch (error) {
            console.error('❌ [CLIENT] Error sending PCM chunk:', error);
          }
        }
      };

      // Connecter le processor
      source.connect(processor);
      processor.connect(audioContext.destination);

      console.log('✅ [CLIENT] ScriptProcessorNode created and connected');
      console.log('📊 [CLIENT] Buffer size:', bufferSize, 'samples');

      // 4. WebSocket connection
      // TEST DIRECT EC2: Testez avec ws:// (sans SSL)
      // const wsUrl = "ws://35.158.76.206:3000/demo";
      // PRODUCTION: Utilisez le load balancer avec wss://
      const wsUrl = "wss://flavien-twilio-webhook.octoplan.ai/demo";
      // Pour tester directement l'EC2 avec SSL (si vous avez un certificat)
      // const wsUrl = "wss://35.158.76.206:3000/demo";

      console.log('🔌 [CLIENT] Connecting to WebSocket:', wsUrl);
      socket = new WebSocket(wsUrl);
      socketRef.current = socket; // Stocker dans ref
      
      // Mettre à jour l'état
      setIsIdle(false);
      isIdleRef.current = false;
      setIsListening(true);

      // Log immédiatement après création
      console.log('📊 [CLIENT] WebSocket created, initial readyState:', socket.readyState);
      console.log('📊 [CLIENT] WebSocket URL:', socket.url);
      console.log('📊 [CLIENT] WebSocket state meanings: 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED');

      // Vérifier l'état après un court délai
      setTimeout(() => {
        console.log('📊 [CLIENT] WebSocket state after 500ms:', socket.readyState);
        if (socket.readyState === WebSocket.CONNECTING) {
          console.log('⏳ [CLIENT] Still connecting...');
        } else if (socket.readyState === WebSocket.OPEN) {
          console.log('✅ [CLIENT] Connection opened!');
        } else if (socket.readyState === WebSocket.CLOSED) {
          console.log('❌ [CLIENT] Connection closed before opening');
        }
      }, 500);

      // 🔍 SOLUTION: Handler onmessage AVANT onopen pour détecter les messages de test
      // Certains serveurs envoient un message avant que onopen ne soit appelé
      // Ce handler sera remplacé par le handler principal dans onopen
      let messageHandlerSet = false;
      socket.onmessage = (event) => {
        console.log('📥 [CLIENT] Received message (early handler):', {
          data: typeof event.data === 'string' ? event.data : 'binary',
          size: event.data instanceof Blob ? event.data.size : 'unknown',
          readyState: socket.readyState,
          messageHandlerSet: messageHandlerSet
        });

        if (typeof event.data === 'string' && event.data === 'CONNECTION_ESTABLISHED') {
          console.log('✅ [CLIENT] Server confirmed connection! Handshake completed.');
          console.log('📊 [CLIENT] Current readyState:', socket.readyState);

          // Si onopen n'a pas encore été appelé mais on reçoit un message,
          // la connexion est fonctionnelle, onopen devrait être appelé bientôt
          if (socket.readyState === WebSocket.CONNECTING) {
            console.log('⏳ [CLIENT] Still in CONNECTING state, waiting for onopen...');
          } else if (socket.readyState === WebSocket.OPEN) {
            console.log('✅ [CLIENT] Connection is OPEN! onopen should be called soon.');
          }
        }

        // Si le handler principal n'est pas encore défini, on ne fait rien d'autre
        // Il sera défini dans onopen
        if (!messageHandlerSet) {
          console.log('⏳ [CLIENT] Main message handler not set yet, waiting for onopen...');
        }
      };

      // 🔍 SOLUTION: Timeout pour détecter si onopen n'est jamais appelé
      const connectionTimeout = setTimeout(() => {
        if (socket.readyState !== WebSocket.OPEN) {
          console.error('❌ [CLIENT] Connection timeout! Handshake did not complete.');
          console.error('❌ [CLIENT] Final state:', socket.readyState, {
            0: 'CONNECTING',
            1: 'OPEN',
            2: 'CLOSING',
            3: 'CLOSED'
          }[socket.readyState]);
          console.error('❌ [CLIENT] This indicates a problem with the WebSocket handshake.');
          console.error('❌ [CLIENT] Possible causes: Load balancer timeout, proxy blocking, or server issue.');
        }
      }, 5000); // 5 secondes

      socket.onopen = () => {
        clearTimeout(connectionTimeout);
        messageHandlerSet = true; // Le handler principal va remplacer le handler temporaire
        console.log('✅ [CLIENT] WebSocket connected successfully');
        console.log('📊 [CLIENT] WebSocket readyState:', socket.readyState, '(OPEN = 1)');
        console.log('📊 [CLIENT] WebSocket protocol:', socket.protocol);
        console.log('📊 [CLIENT] WebSocket extensions:', socket.extensions);
        console.log('📊 [CLIENT] WebSocket bufferedAmount:', socket.bufferedAmount);

        // Le serveur configure automatiquement les événements d'initialisation
        // On n'a pas besoin de les envoyer depuis le client
        console.log('⏳ [CLIENT] Waiting for server to configure session...');

        // La capture PCM est déjà active via ScriptProcessorNode
        // Pas besoin de démarrer quoi que ce soit, le processor envoie automatiquement
        console.log('✅ [CLIENT] PCM capture is active via ScriptProcessorNode');
        console.log('🎤 [CLIENT] Audio is being captured and sent as PCM 16-bit');
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
        console.log('🔊 [CLIENT] Playing audio chunk, duration:', audioBuffer.duration.toFixed(2) + 's', 'startTime:', startTime.toFixed(2));

        // Mettre à jour le temps de la prochaine lecture
        nextPlayTime = startTime + audioBuffer.duration;

        // Quand ce chunk est terminé, jouer le suivant
        playNode.onended = () => {
          isPlayingAudioRef.current = false;
          currentAudioNodeRef.current = null; // ✅ Nettoyer la référence
          console.log('✅ [CLIENT] Audio chunk finished, queue length:', audioQueueRef.current.length);
          // Jouer le chunk suivant s'il y en a un
          if (audioQueueRef.current.length > 0) {
            playAudioQueue();
          }
        };
      };

      // When server sends back audio (binary PCM) or test messages
      socket.onmessage = async (event) => {
        console.log('📥 [CLIENT] Received message from server');
        console.log('📊 [CLIENT] Message type:', typeof event.data);
        console.log('📊 [CLIENT] Is Blob:', event.data instanceof Blob);
        console.log('📊 [CLIENT] Is ArrayBuffer:', event.data instanceof ArrayBuffer);

        // Vérifier si c'est un message de test texte
        if (typeof event.data === 'string' || (event.data instanceof Blob && event.data.size < 100)) {
          const text = typeof event.data === 'string' ? event.data : await event.data.text();
          console.log('✅ [CLIENT] Received text message from server:', text);
          if (text === 'CONNECTION_ESTABLISHED' || text === 'test') {
            console.log('✅ [CLIENT] Server connection confirmed! WebSocket is working.');
          }
          return; // Ne pas traiter les messages de test comme de l'audio
        }

        // Le serveur envoie directement du binaire (PCM audio)
        try {
          let arrayBuf;
          if (event.data instanceof Blob) {
            console.log('📊 [CLIENT] Converting Blob to ArrayBuffer, size:', event.data.size);
            arrayBuf = await event.data.arrayBuffer();
            console.log('✅ [CLIENT] Blob converted, ArrayBuffer size:', arrayBuf.byteLength);
          } else if (event.data instanceof ArrayBuffer) {
            arrayBuf = event.data;
            console.log('📊 [CLIENT] Received ArrayBuffer directly, size:', arrayBuf.byteLength);
          } else {
            console.log('⚠️ [CLIENT] Received non-binary message:', typeof event.data);
            console.log('📊 [CLIENT] Message content (first 100 chars):', String(event.data).substring(0, 100));
            return;
          }

          console.log('🎵 [CLIENT] Processing PCM audio data, size:', arrayBuf.byteLength);

          // Le serveur envoie du PCM 16-bit (Int16Array)
          // Il faut créer un AudioBuffer directement depuis le PCM
          // PCM 16-bit = 2 bytes par sample, little-endian
          const pcmData = new Int16Array(arrayBuf);
          const bedrockSampleRate = 16000; // Bedrock génère à 16kHz (configuré côté serveur)
          const numberOfChannels = 1; // Mono

          // ✅ IMPORTANT : Utiliser le sample rate réel de l'AudioContext
          // Si le navigateur ne supporte pas 16000 Hz, l'AudioContext utilisera un autre sample rate
          const actualSampleRate = audioContext.sampleRate;
          console.log('📊 [CLIENT] AudioContext sampleRate:', actualSampleRate, 'Hz');
          console.log('📊 [CLIENT] Bedrock sampleRate:', bedrockSampleRate, 'Hz');

          // Si les sample rates diffèrent, on doit faire une conversion
          // Pour l'instant, utilisons le sample rate de Bedrock (16000 Hz)
          // Le navigateur fera la conversion automatiquement si nécessaire
          const targetSampleRate = bedrockSampleRate;

          console.log('📊 [CLIENT] PCM data:', {
            samples: pcmData.length,
            bedrockSampleRate: bedrockSampleRate,
            audioContextSampleRate: actualSampleRate,
            targetSampleRate: targetSampleRate,
            channels: numberOfChannels,
            duration: (pcmData.length / bedrockSampleRate).toFixed(2) + 's'
          });

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

          console.log('✅ [CLIENT] AudioBuffer created from PCM:', {
            duration: audioBuffer.duration.toFixed(2) + 's',
            sampleRate: audioBuffer.sampleRate,
            numberOfChannels: audioBuffer.numberOfChannels,
            length: audioBuffer.length
          });

          // ✅ Ajouter à la queue et jouer séquentiellement
          audioQueueRef.current.push(audioBuffer);
          playAudioQueue();
        } catch (error) {
          console.error('❌ [CLIENT] Error processing server message:', error);
          console.error('❌ [CLIENT] Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
        }
      };

      socket.onerror = (error) => {
        console.error('❌ [CLIENT] WebSocket error occurred');
        console.error('❌ [CLIENT] Error object:', error);
        console.error('❌ [CLIENT] Error type:', error.type);
        console.error('❌ [CLIENT] Error target:', error.target);
        console.error('❌ [CLIENT] WebSocket readyState on error:', socket.readyState);
        console.error('❌ [CLIENT] WebSocket URL:', socket.url);
        console.error('❌ [CLIENT] Attempted URL:', wsUrl);
        if (error.target && error.target.url) {
          console.error('❌ [CLIENT] Failed to connect to:', error.target.url);
        }
        // Afficher plus de détails si disponibles
        if (error.target && error.target.readyState !== undefined) {
          console.error('❌ [CLIENT] ReadyState:', error.target.readyState, {
            0: 'CONNECTING',
            1: 'OPEN',
            2: 'CLOSING',
            3: 'CLOSED'
          }[error.target.readyState]);
        }
      };

      socket.onclose = (event) => {
        console.log('🔌 [CLIENT] WebSocket closed', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          timestamp: new Date().toISOString()
        });
        console.log('📊 [CLIENT] Final stats:', {
          totalChunksSent: audioChunkCount,
          totalBytesSent: totalBytesSent
        });

        // Nettoyer le processor
        if (processor) {
          processor.disconnect();
          console.log('🔌 [CLIENT] ScriptProcessorNode disconnected');
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
        console.log('🔌 [CLIENT] Audio queue cleared');
      };
    } catch (error) {
      console.error('Audio setup failed:', error);
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
        console.log('Speech recognition result received');
        
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
          console.log('User interrupted bot');
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
          }
          setIsSpeaking(false);
          isSpeakingRef.current = false;
        }
        
        console.log('Final transcript:', finalTranscript);
        console.log('Interim transcript:', interimTranscript);
        
        // Show live transcription
        setTranscript(finalTranscript + interimTranscript);
        
        if (finalTranscript) {
          console.log('Calling handleUserMessage with:', finalTranscript);
          handleUserMessage(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          message.error(t.OctoplanDemo?.microphoneAccessDenied || 'Microphone access denied. Please allow microphone access and try again.');
          stopDemo();
        } else if (event.error === 'aborted') {
          console.log('Recognition aborted, likely due to stop');
        } else {
          console.log('Non-critical recognition error, will auto-restart');
        }
      };

      recognitionRef.current.onend = () => {
        console.log('Recognition ended, isIdleRef:', isIdleRef.current);
        if (!isIdleRef.current) {
          // Restart if we're still supposed to be listening
          try {
            console.log('Restarting recognition...');
            recognitionRef.current?.start();
          } catch (e) {
            console.log('Recognition restart failed:', e);
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
      console.error('Bedrock init failed:', error);
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
    console.log('Getting Bedrock response for:', userMessage);
    
    if (!bedrockRef.current) {
      console.log('Initializing Bedrock...');
      await initializeBedrock();
    }
    
    if (!bedrockRef.current) {
      console.error('Bedrock client not initialized');
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
      console.log('Sending to Bedrock...');
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
      console.log('Bedrock response:', response);
      
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
      console.error('Bedrock error:', error);
      return 'Hello! I\'m your appointment assistant. How can I help you today - would you like to create, move, or cancel an appointment?';
    }
  };

  const handleUserMessage = async (userMessage) => {
    console.log('handleUserMessage called with:', userMessage);
    console.log('isIdleRef.current:', isIdleRef.current);
    console.log('userMessage.trim():', userMessage.trim());
    
    if (!userMessage.trim()) {
      console.log('Empty message, returning');
      return;
    }
    
    if (isIdleRef.current) {
      console.log('Is idle, returning');
      return;
    }
    
    console.log('Processing message:', userMessage);
    
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
    waitMusicRef.current.play().catch(e => console.log('Music play failed:', e));
    
    try {
      const response = await getBedrockResponse(userMessage);
      console.log('Bot response:', response);
      setBotResponse(response);
      
      // Stop wait music
      if (waitMusicRef.current) {
        waitMusicRef.current.pause();
        waitMusicRef.current.currentTime = 0;
      }
      
      await speakText(response);
    } catch (error) {
      console.error('Error:', error);
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
          console.log('Available voices:', voices.map(v => `${v.name} (${v.lang}) - Local: ${v.localService}`));
          
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
        console.log('Using browser TTS voice:', voice.name, '- Lang:', voice.lang, '- Local:', voice.localService);
      } else {
        console.log('No voice selected for browser TTS');
      }
      
      utterance.onend = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        lastBotSpeechEndRef.current = Date.now();
      };
      
      utterance.onerror = (e) => {
        console.error('Speech error:', e);
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
    console.log('Starting listening...');
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
      console.log('Attempting to start recognition...');
      recognitionRef.current.start();
      console.log('Recognition started successfully');
      
      // Play introduction message
      const intro = "Hello! Welcome to Dattivox. I'm your 24/7 virtual secretary. I can help you with appointments, answer questions, and handle your business needs. How can I help you today?";
      setBotResponse(intro);
      await speakText(intro);
    } catch (error) {
      console.error('Error starting recognition:', error);
      message.error(t.OctoplanDemo?.voiceRecognitionFailed || 'Failed to start voice recognition');
      setIsListening(false);
      isIdleRef.current = true;
    }
  };

  const stopDemo = () => {
    console.log('Stopping demo...');
    
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
        console.log('Error stopping recognition:', e);
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
            <h3>AI Voice Demo</h3>
            <div className="demo-content-row">
              <img src="/Passport-guichet.png" alt="Passport Renewal" className="demo-image" />
              <p>You are calling to renew your passport. Ask information about it and book an appointment.</p>
            </div>
          </div>
          
          <div className="demo-controls">
            <Button 
              className="start-demo-btn"
              onClick={startDiscussion}
              size="large"
            >
              <PhoneOutlined /> Start Voice Demo
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="demo-text-overlay">
            <h3>AI Voice Demo</h3>
            <div className="demo-content-row">
              <img src="/Passport-guichet.png" alt="Passport Renewal" className="demo-image" />
              <p>You are calling to renew your passport. Ask information about it and book an appointment.</p>
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
              <StopOutlined /> End Call
            </Button>
          </div>
          
          {transcript && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.5)', borderRadius: '1rem', color: '#4C2E76' }}>
              <strong>You:</strong> {transcript}
            </div>
          )}
          {botResponse && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.5)', borderRadius: '1rem', color: '#4C2E76' }}>
              <strong>Dattivox:</strong> {botResponse}
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default OctoplanDemo;