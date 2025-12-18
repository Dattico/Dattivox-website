# Guide de Diagnostic WebSocket

## Problème Identifié

La connexion WebSocket se ferme côté client (code 1006) avant que `onopen` ne soit appelé, empêchant l'envoi d'audio à Bedrock.

## Diagnostic

### Côté Serveur ✅
- La connexion WebSocket s'établit correctement (`readyState: 'open'`)
- Les handlers sont enregistrés
- Le serveur est prêt à recevoir des messages

### Côté Client ❌
- La connexion reste en état `CONNECTING` (0)
- Se ferme avec le code 1006 (fermeture anormale)
- `onopen` n'est jamais appelé
- Le MediaRecorder ne démarre jamais
- Aucun message n'est envoyé

## Solutions à Tester

### 1. Tester Directement l'EC2 (Contourner le Load Balancer)

**Étape 1 :** Trouvez l'IP publique de votre EC2
```bash
# Sur l'EC2
curl http://169.254.169.254/latest/meta-data/public-ipv4
```

**Étape 2 :** Modifiez temporairement le code client

Dans `Demo/OctoplanDemo.jsx`, ligne ~85, modifiez :

```javascript
// TEST DIRECT EC2
const wsUrl = "wss://VOTRE_IP_EC2:3000/demo";
// OU si vous avez un certificat SSL sur l'EC2
const wsUrl = "wss://VOTRE_IP_EC2/demo";

// PRODUCTION (à remettre après les tests)
// const wsUrl = "wss://flavien-twilio-webhook.octoplan.ai/demo";
```

**Étape 3 :** Testez

Si ça fonctionne directement avec l'IP, le problème vient du load balancer/proxy.

### 2. Configuration du Load Balancer (AWS ALB/NLB)

#### Vérifications Essentielles

1. **Support des WebSockets**
   - Vérifiez que le load balancer supporte les WebSockets
   - Pour AWS ALB : activé par défaut
   - Pour AWS NLB : supporte les WebSockets

2. **Timeout d'inactivité**
   - Augmentez le timeout à au moins 60 secondes (par défaut souvent 60s)
   - Configuration : Target Group → Attributes → Deregistration delay

3. **Sticky Sessions (si nécessaire)**
   - Activez les sticky sessions si vous avez plusieurs instances
   - Configuration : Target Group → Attributes → Stickiness

4. **Health Checks**
   - Vérifiez que les health checks ne ferment pas les connexions WebSocket
   - Le endpoint `/health` doit retourner rapidement

5. **Headers WebSocket**
   - Vérifiez que les headers `Upgrade: websocket` et `Connection: Upgrade` sont transmis
   - Le load balancer doit les transmettre au backend

#### Configuration Recommandée pour AWS ALB

```json
{
  "IdleTimeout": 60,
  "ConnectionSettings": {
    "IdleTimeout": 60
  },
  "Attributes": [
    {
      "Key": "stickiness.enabled",
      "Value": "true"
    },
    {
      "Key": "stickiness.type",
      "Value": "lb_cookie"
    },
    {
      "Key": "stickiness.lb_cookie.duration_seconds",
      "Value": "86400"
    }
  ]
}
```

### 3. Vérifier les Logs du Load Balancer

Consultez les logs CloudWatch du load balancer pour voir :
- Si les connexions WebSocket sont rejetées
- Les codes de réponse HTTP
- Les timeouts

### 4. Test avec curl/wscat

Testez directement la connexion WebSocket :

```bash
# Installer wscat
npm install -g wscat

# Tester directement l'EC2
wscat -c wss://VOTRE_IP_EC2:3000/demo

# Tester via le load balancer
wscat -c wss://flavien-twilio-webhook.octoplan.ai/demo
```

### 5. Vérifier le Certificat SSL

Si vous utilisez `wss://`, vérifiez que :
- Le certificat SSL est valide
- Le certificat couvre le domaine (ou l'IP)
- Le certificat n'est pas expiré

## Code Serveur Amélioré

Le serveur envoie maintenant un message de test au client. Si vous voyez ce message dans les logs client, la connexion fonctionne.

## Prochaines Étapes

1. **Testez directement l'EC2** pour confirmer que le problème vient du load balancer
2. **Si ça fonctionne directement** : configurez le load balancer correctement
3. **Si ça ne fonctionne pas même directement** : vérifiez les règles de sécurité (Security Groups, Firewall)

## Logs à Surveiller

### Côté Serveur
- `🔌 [SERVER] New WebSocket connection to /demo`
- `📤 [SERVER] Sending test message to client...`
- `📥 [SERVER] Message #X received` (devrait apparaître quand le client envoie de l'audio)

### Côté Client
- `✅ [CLIENT] WebSocket connected successfully` (doit apparaître)
- `✅ [CLIENT] Received test message from server: test` (confirme que la connexion fonctionne)
- `📤 [CLIENT] Sent audio chunk #X` (doit apparaître après onopen)

