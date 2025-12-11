# Octoplan Conversational Demo

## Overview
The Octoplan Demo allows users to interact with a simulated AI assistant using voice commands. This demo is designed to showcase the Octoplan experience without affecting production systems.

## Features
- **Voice Interaction**: Uses browser's Web Speech API for speech recognition and synthesis
- **Animated UI**: Reuses the existing LoadingComponent with enhanced animations
- **Demo Responses**: Predefined responses that simulate real Octoplan functionality
- **Safety**: No external API calls, no data persistence, completely isolated

## Routes
- `/demo` - Full demo page
- `/demo/iframe` - Compact iframe-friendly version

## Usage

### Full Demo Page
Visit `/demo` for the complete demo experience with:
- Large animated Octoplan bars
- Full conversation history
- Apple-inspired design
- Responsive layout

### Iframe Version
Visit `/demo/iframe` for embedding in external sites:
- Compact design (400px max width)
- Simplified conversation display
- Optimized for small spaces
- Same voice functionality

## Browser Compatibility
- **Speech Recognition**: Chrome, Edge, Safari (with webkit prefix)
- **Speech Synthesis**: All modern browsers
- **Fallback**: Graceful degradation for unsupported browsers

## Demo Bot Responses
The demo bot responds to common phrases:
- Greetings: "hello", "hi", "hey"
- Booking: "book", "appointment", "schedule"
- Rescheduling: "reschedule", "change", "move"
- Cancellation: "cancel"
- Hours: "hours", "open", "available"
- Pricing: "price", "cost", "fee"
- Location: "location", "address", "where"

## Environment Variables
- `VITE_DEMO_MODE=true` - Enables demo-specific features (optional)

## Security
- No production API access
- No data persistence
- Hardcoded demo responses
- Isolated from main application logic

## Embedding
For external websites, use the iframe version:
```html
<iframe 
  src="https://yourdomain.com/demo/iframe" 
  width="400" 
  height="400"
  frameborder="0">
</iframe>
```