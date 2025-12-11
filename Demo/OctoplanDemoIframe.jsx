import React, { useState, useEffect, useRef } from 'react';
import { Button, Typography, Space, message } from 'antd';
import { PhoneOutlined, AudioOutlined, StopOutlined } from '@ant-design/icons';
import LoadingComponent from '../../components/LoadingComponent';
import { useLanguage } from '../../utils/LanguageContext';
import { getTranslation } from '../../utils/utils';
import './OctoplanDemoIframe.css';

const { Title, Text } = Typography;

const OctoplanDemoIframe = () => {
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
  const { language } = useLanguage();
  const t = getTranslation(language) || {};
  const [isListening, setIsListening] = useState(false);
  const [isIdle, setIsIdle] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const recognitionRef = useRef(null);
  const idleTimeoutRef = useRef(null);

  // Simplified demo responses for iframe
  const getDemoResponse = (userMessage) => {
    const message = userMessage.toLowerCase();
    
    if (message.includes('hello') || message.includes('hi')) {
      return "Hello! I'm Octoplan. I can help you book appointments instantly. What service do you need?";
    }
    
    if (message.includes('book') || message.includes('appointment')) {
      return "Perfect! I can book that for you right away. In the full version, I'd check availability and confirm your appointment.";
    }
    
    if (message.includes('reschedule') || message.includes('change')) {
      return "I can help reschedule your appointment. What new time works better for you?";
    }
    
    return "I'm here to help with appointments 24/7. Try saying 'book an appointment' or 'hello' to see how I work!";
  };

  // Auto-start greeting
  useEffect(() => {
    const timer = setTimeout(() => {
      speakText("Hi! I'm Octoplan. Just start talking to book an appointment or ask questions!");
      setIsIdle(false);
      startListening();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const finalTranscript = event.results[0][0].transcript;
        setTranscript(finalTranscript);
        handleUserMessage(finalTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        stopListening();
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, []);

  const handleUserMessage = async (userMessage) => {
    if (!userMessage.trim()) return;

    setIsProcessing(true);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const response = getDemoResponse(userMessage);
    setLastResponse(response);
    
    // Speak the response
    speakText(response);
    setIsProcessing(false);
    resetIdleTimer();
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85;
      utterance.pitch = 0.9;
      utterance.volume = 1;
      
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Samantha') ||
        voice.name.includes('Karen') ||
        voice.name.includes('Daniel') ||
        (voice.lang === 'en-US' && voice.name.includes('Google')) ||
        (voice.lang === 'en-GB' && voice.name.includes('Google')) ||
        voice.name.includes('Microsoft Zira')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      message.error(t.OctoplanDemo?.speechNotSupported || 'Speech recognition not supported');
      return;
    }

    setIsListening(true);
    setIsIdle(false);
    setTranscript('');
    setLastResponse('');
    
    try {
      recognitionRef.current.start();
      resetIdleTimer();
    } catch (error) {
      console.error('Error starting recognition:', error);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
  };

  const resetIdleTimer = () => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
    
    idleTimeoutRef.current = setTimeout(() => {
      setIsIdle(true);
      stopListening();
    }, 15000);
  };

  const handleCallOctoplan = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="octoplan-demo-iframe">
      <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
        {/* Compact Header */}
        <div className="iframe-header">
          <Title level={3} className="iframe-title">
            {t.OctoplanDemo?.talkToOctoplan || 'Talk to Octoplan'}
          </Title>
          <Text className="iframe-subtitle">
            {t.OctoplanDemo?.aiAssistantDemo || 'AI assistant demo - click to try voice interaction'}
          </Text>
        </div>

        {/* Animated Bars */}
        <div className="iframe-animation">
          <div className={`iframe-bars ${isListening ? 'active' : 'idle'} ${isProcessing ? 'processing' : ''}`}>
            <LoadingComponent size={80} spinning={true} />
          </div>
        </div>

        {/* Call Button */}
        <div className="iframe-controls">
          {isIdle ? (
            <Button
              type="primary"
              size="large"
              icon={<PhoneOutlined />}
              onClick={handleCallOctoplan}
              className="iframe-call-button"
            >
              {t.OctoplanDemo?.tryVoiceDemo || 'Try Voice Demo'}
            </Button>
          ) : (
            <Button
              type="primary"
              size="large"
              icon={isListening ? <StopOutlined /> : <AudioOutlined />}
              onClick={handleCallOctoplan}
              className={`iframe-voice-button ${isListening ? 'listening' : ''}`}
              loading={isProcessing}
            >
              {isProcessing ? (t.OctoplanDemo?.processing || 'Processing...') : isListening ? (t.OctoplanDemo?.listening || 'Listening...') : (t.OctoplanDemo?.tryAgain || 'Try Again')}
            </Button>
          )}
        </div>

        {/* Response Display */}
        {(transcript || lastResponse) && (
          <div className="iframe-conversation">
            {transcript && (
              <div className="iframe-message user">
                <Text strong>{t.OctoplanDemo?.you || 'You:'}:</Text> <Text>"{transcript}"</Text>
              </div>
            )}
            {lastResponse && (
              <div className="iframe-message bot">
                <Text strong>{t.OctoplanDemo?.octoplan || 'Octoplan:'}:</Text> <Text>{lastResponse}</Text>
              </div>
            )}
          </div>
        )}

        {/* Demo Notice */}
        <Text type="secondary" style={{ fontSize: '11px' }}>
          {isDemoMode ? 'Demo Mode' : (t.OctoplanDemo?.demoMode || 'Demo mode - no real bookings')}
        </Text>
      </Space>
    </div>
  );
};

export default OctoplanDemoIframe;