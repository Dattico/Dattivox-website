# Test des APIs Fastify WebSocket

## Problème

- Documentation officielle : `connection.socket.send()` et `connection.socket.on()`
- Code `/media-stream` qui fonctionne : `connection.send()` et `connection.on()`
- Erreur actuelle : `connection.socket.send is not a function`

## Solution : Tester les deux approches

### Approche 1 : Utiliser `connection.send()` (comme dans /media-stream)

```javascript
fastify.get('/demo', { websocket: true }, (connection, req) => {
    console.log('🔌 [SERVER] New WebSocket connection to /demo');
    
    // Tester connection.send() directement
    try {
        console.log('📤 [TEST] Trying connection.send()...');
        connection.send('CONNECTION_ESTABLISHED');
        console.log('✅ [TEST] connection.send() works!');
    } catch (error) {
        console.error('❌ [TEST] connection.send() failed:', error);
    }
    
    // Utiliser connection.on() pour les messages
    connection.on('message', async (message: any) => {
        console.log('📥 [SERVER] Message received via connection.on()');
        // ... traitement
    });
    
    connection.on('close', () => {
        console.log('🔌 [SERVER] Connection closed');
    });
});
```

### Approche 2 : Utiliser `connection.socket.send()` (documentation officielle)

```javascript
fastify.get('/demo', { websocket: true }, (connection, req) => {
    console.log('🔌 [SERVER] New WebSocket connection to /demo');
    
    // Diagnostiquer la structure de connection
    console.log('🔍 [DEBUG] connection keys:', Object.keys(connection));
    console.log('🔍 [DEBUG] connection.socket:', typeof connection.socket);
    console.log('🔍 [DEBUG] connection.socket?.send:', typeof connection.socket?.send);
    console.log('🔍 [DEBUG] connection.send:', typeof connection.send);
    
    // Tester connection.socket.send()
    try {
        console.log('📤 [TEST] Trying connection.socket.send()...');
        if (connection.socket && typeof connection.socket.send === 'function') {
            connection.socket.send('CONNECTION_ESTABLISHED');
            console.log('✅ [TEST] connection.socket.send() works!');
        } else {
            console.error('❌ [TEST] connection.socket.send is not a function');
            console.error('🔍 [DEBUG] connection.socket:', connection.socket);
        }
    } catch (error) {
        console.error('❌ [TEST] connection.socket.send() failed:', error);
    }
    
    // Utiliser connection.socket.on() pour les messages
    if (connection.socket && typeof connection.socket.on === 'function') {
        connection.socket.on('message', async (message: any, isBinary: boolean) => {
            console.log('📥 [SERVER] Message received via connection.socket.on()');
            // ... traitement
        });
    }
});
```

### Approche 3 : Détection automatique (recommandée)

```javascript
fastify.get('/demo', { websocket: true }, (connection, req) => {
    console.log('🔌 [SERVER] New WebSocket connection to /demo');
    
    // Détecter automatiquement quelle API fonctionne
    let sendMethod;
    let onMethod;
    
    if (typeof connection.send === 'function') {
        sendMethod = (data) => connection.send(data);
        onMethod = (event, handler) => connection.on(event, handler);
        console.log('✅ [AUTO] Using connection.send() and connection.on()');
    } else if (connection.socket && typeof connection.socket.send === 'function') {
        sendMethod = (data) => connection.socket.send(data);
        onMethod = (event, handler) => connection.socket.on(event, handler);
        console.log('✅ [AUTO] Using connection.socket.send() and connection.socket.on()');
    } else {
        console.error('❌ [AUTO] No valid send method found!');
        console.error('🔍 [DEBUG] connection:', Object.keys(connection));
        console.error('🔍 [DEBUG] connection.socket:', connection.socket);
        return;
    }
    
    // Envoyer le message de test
    try {
        sendMethod('CONNECTION_ESTABLISHED');
        console.log('✅ [SERVER] CONNECTION_ESTABLISHED sent');
    } catch (error) {
        console.error('❌ [SERVER] Error sending message:', error);
    }
    
    // Enregistrer les handlers
    onMethod('message', async (message: any, isBinary?: boolean) => {
        console.log('📥 [SERVER] Message received');
        // ... traitement
    });
    
    onMethod('close', () => {
        console.log('🔌 [SERVER] Connection closed');
    });
});
```

## Code Complet Recommandé (Approche 3)

```javascript
fastify.get('/demo', { websocket: true }, (connection, req) => {
    console.log('🔌 [SERVER] New WebSocket connection to /demo');
    
    // Détecter automatiquement quelle API fonctionne
    const send = typeof connection.send === 'function' 
        ? connection.send.bind(connection)
        : (connection.socket && typeof connection.socket.send === 'function')
            ? connection.socket.send.bind(connection.socket)
            : null;
    
    const on = typeof connection.on === 'function'
        ? connection.on.bind(connection)
        : (connection.socket && typeof connection.socket.on === 'function')
            ? connection.socket.on.bind(connection.socket)
            : null;
    
    if (!send || !on) {
        console.error('❌ [SERVER] No valid WebSocket API found!');
        console.error('🔍 [DEBUG] connection.send:', typeof connection.send);
        console.error('🔍 [DEBUG] connection.socket?.send:', typeof connection.socket?.send);
        return;
    }
    
    console.log('✅ [SERVER] WebSocket API detected and ready');
    
    const sessionId = randomUUID();
    console.log('🆔 [SERVER] Created session ID:', sessionId);
    
    const session: StreamSession = bedrockClient.createStreamSession(sessionId);
    sessionMap[sessionId] = session;
    
    let messageCount = 0;
    
    // Envoyer le message de test
    try {
        send('CONNECTION_ESTABLISHED');
        console.log('✅ [SERVER] CONNECTION_ESTABLISHED sent');
    } catch (error) {
        console.error('❌ [SERVER] Error sending CONNECTION_ESTABLISHED:', error);
    }
    
    // Handler pour les messages
    on('message', async (message: any, isBinary?: boolean) => {
        messageCount++;
        console.log(`📥 [SERVER] Message #${messageCount} received`);
        
        if (typeof message === 'string') {
            console.log('✅ [SERVER] Text message:', message);
            if (message === 'TEST_MESSAGE_FROM_CLIENT') {
                send('TEST_RESPONSE_FROM_SERVER');
            }
            return;
        }
        
        if (Buffer.isBuffer(message) || isBinary) {
            const buffer = Buffer.isBuffer(message) ? message : Buffer.from(message);
            console.log('🎤 [SERVER] Binary audio chunk, size:', buffer.length);
            try {
                await session.streamAudio(buffer);
                console.log('✅ [SERVER] Audio sent to Bedrock');
            } catch (error) {
                console.error('❌ [SERVER] Error:', error);
            }
        }
    });
    
    on('close', () => {
        console.log('🔌 [SERVER] Client disconnected, messages:', messageCount);
        if (sessionMap[sessionId]) {
            delete sessionMap[sessionId];
        }
    });
    
    on('error', (error: Error) => {
        console.error('❌ [SERVER] WebSocket error:', error);
    });
    
    // Handler pour audioOutput
    session.onEvent('audioOutput', (data: any) => {
        try {
            const buffer = Buffer.from(data['content'], 'base64');
            send(buffer);
            console.log('✅ [SERVER] Audio sent to client');
        } catch (error) {
            console.error('❌ [SERVER] Error sending audio:', error);
        }
    });
    
    // Lancer les opérations asynchrones
    bedrockClient.initiateSession(sessionId).catch(error => {
        console.error('❌ [SERVER] Error initiating Bedrock session:', error);
    });
    
    (async () => {
        try {
            await session.setupPromptStart("matthew");
            await session.setupSystemPrompt(undefined, SYSTEM_PROMPT_EN);
            await session.setupStartAudio();
            console.log('✅ [SERVER] Initial setup complete');
        } catch (error) {
            console.error('❌ [SERVER] Error in setup:', error);
        }
    })();
    
    console.log('✅ [SERVER] Event handlers registered');
});
```

## Conclusion

Utilisez l'**Approche 3** (détection automatique) pour que le code fonctionne quelle que soit la version de `@fastify/websocket` que vous utilisez.

