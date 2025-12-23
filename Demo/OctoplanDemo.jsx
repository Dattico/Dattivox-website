import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Typography, Space, message } from 'antd';
import { PhoneOutlined, AudioOutlined, StopOutlined } from '@ant-design/icons';
import LoadingComponent from '/src/components/LoadingComponent';
import { useLanguage } from '/src/utils/LanguageContext';
import { getTranslation } from '/src/utils/utils';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { fetchAuthSession } from 'aws-amplify/auth';
import './OctoplanDemo.css';

const { Title, Text, Paragraph } = Typography;

const OctoplanDemo = () => {
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



  const startDemo = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setIsIdle(false);
    isIdleRef.current = false;
    conversationHistoryRef.current = [];
    startListening();
  };

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
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    if (waitMusicRef.current) {
      waitMusicRef.current.pause();
      waitMusicRef.current.currentTime = 0;
    }
  };





  return (
    <div className="octoplan-demo">
      <div className="demo-container">
        <Card className="demo-card">
          <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
            <div className="glass-container">
              <div className="demo-ui">
                {isIdle ? (
                  <>
                    <img 
                      src="/Dattivox - logo.svg" 
                      alt="Dattivox" 
                      style={{ height: '80px', marginBottom: '10px', filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.3))' }}
                    />
                    <p className="demo-subtitle">Experience your 24/7 virtual secretary</p>
                    <button className="start-button" onClick={startDemo}>
                      <PhoneOutlined /> Start Voice Demo
                    </button>
                  </>
                ) : (
                  <>
                    <div className="status-indicator">
                      {isProcessing ? 'Processing...' : 'Listening'}
                    </div>
                    
                    <div className="voice-visualizer">
                      {[...Array(12)].map((_, i) => (
                        <div 
                          key={i}
                          className={`voice-bar ${(isListening || isProcessing) ? 'active' : ''}`}
                          style={{
                            height: `${20 + Math.sin((Date.now() / 200) + i) * 15}px`,
                            animationDelay: `${i * 0.1}s`
                          }}
                        />
                      ))}
                    </div>
                    
                    <button className="stop-button" onClick={stopDemo}>
                      <StopOutlined /> End Call
                    </button>
                    
                    {transcript && (
                      <div className="transcript">
                        <strong>You:</strong> {transcript}
                      </div>
                    )}
                    {botResponse && (
                      <div className="bot-response">
                        <strong>Dattivox:</strong> {botResponse}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>




          </Space>
        </Card>
      </div>
    </div>
  );
};

export default OctoplanDemo;