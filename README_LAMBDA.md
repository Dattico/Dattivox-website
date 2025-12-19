# Migration vers Lambda (AWS Amplify)

Le formulaire de contact utilise maintenant AWS Lambda via AWS Amplify, comme Octoplan et Callie.

## Structure créée

```
amplify/
├── function/
│   └── sendContactEmail/
│       ├── handler.ts          # Lambda handler (envoi email via SES)
│       └── resource.ts         # Définition de la fonction
├── data/
│   └── resource.ts             # Schema GraphQL avec mutation sendContactEmail
└── backend.ts                  # Configuration IAM et permissions
```

## Installation

1. Installer les dépendances Amplify backend :
```bash
npm install @aws-amplify/backend @aws-amplify/backend-cli aws-cdk-lib --save-dev
```

2. Installer TypeScript (si pas déjà installé) :
```bash
npm install typescript @types/node --save-dev
```

## Développement

1. Démarrer le sandbox Amplify :
```bash
npm run sandbox
```

Cela va :
- Déployer la Lambda localement
- Générer `amplify_outputs.json`
- Configurer les permissions IAM automatiquement

2. Dans un autre terminal, démarrer le frontend :
```bash
npm run client
```

## Configuration

Les variables d'environnement sont configurées dans `amplify/backend.ts` :
- `REGION`: eu-central-1
- `DATTIVOX_FROM_EMAIL`: info@dattico.com
- `DATTIVOX_REPLY_TO`: info@dattico.com
- `DATTIVOX_CONTACT_EMAIL`: info@dattico.com

Les credentials AWS sont gérés automatiquement via IAM roles (comme Octoplan).

## Avantages

✅ Pas de serveur Express à maintenir  
✅ Credentials automatiques (IAM roles)  
✅ Scaling automatique  
✅ Cohérence avec Octoplan/Callie  
✅ Pay-per-use (gratuit jusqu'à 1M requêtes/mois)

## Migration depuis Express

L'ancien code Express (`server.js` et `api/contact.js`) peut être supprimé une fois que Lambda fonctionne.


