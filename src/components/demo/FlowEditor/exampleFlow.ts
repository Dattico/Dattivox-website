export const exampleFlows = {
  fr: {
    meta: {
      id: 'commune-triage-1',
      name: 'Triage des appels de la commune',
      version: 1,
      language: 'fr',
      updatedAt: new Date().toISOString()
    },
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: {
          language: 'fr',
          missionStatement: 'Vous êtes un assistant virtuel pour la commune. Votre mission est d\'aider les citoyens avec leurs demandes administratives de manière efficace et courtoise.',
          boundaries: 'Vous ne pouvez traiter que les demandes liées aux documents administratifs. Pour toute autre question, orientez poliment vers le service approprié.',
          phrases: [
            'document perdu',
            'carte identité volée',
            'passeport perdu'
          ]
        }
      },
      {
        id: 'ask-1',
        type: 'ask',
        position: { x: 250, y: 200 },
        data: {
          question: 'Quel type de document avez-vous perdu?',
          helpText: 'Carte identité, passeport, permis de conduire'
        }
      },
      {
        id: 'decision-1',
        type: 'decision',
        position: { x: 250, y: 350 },
        data: {
          conditionLabel: 'Le document est-il volé ou perdu?',
          mode: 'multi',
          branches: ['stolen', 'lost']
        }
      },
      {
        id: 'info-1',
        type: 'info',
        position: { x: 100, y: 500 },
        data: {
          say: 'Déposer une plainte à la police',
          bullets: ['Rendez-vous au commissariat le plus proche', 'Apportez une pièce d\'identité valide si disponible', 'Demandez une copie du dépôt de plainte']
        }
      },
      {
        id: 'transfer-1',
        type: 'transfer',
        position: { x: 400, y: 500 },
        data: {
          toService: 'Service Documents',
          channel: 'counter',
          say: 'Je vous transfère au service des documents pour finaliser votre demande.'
        }
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 250, y: 650 },
        data: {
          say: 'Merci de votre appel. Au revoir!'
        }
      }
    ],
    edges: [
      { id: 'e0', source: 'trigger-1', target: 'ask-1', sourceHandle: 'next' },
      { id: 'e1', source: 'ask-1', target: 'decision-1', sourceHandle: 'next' },
      { id: 'e2', source: 'decision-1', target: 'info-1', sourceHandle: 'stolen', label: 'Volé' },
      { id: 'e3', source: 'decision-1', target: 'transfer-1', sourceHandle: 'lost', label: 'Perdu' },
      { id: 'e4', source: 'info-1', target: 'end-1', sourceHandle: 'next' },
      { id: 'e5', source: 'transfer-1', target: 'end-1', sourceHandle: 'next' }
    ]
  },
  en: {
    meta: {
      id: 'commune-triage-1',
      name: 'Commune Call Triage',
      version: 1,
      language: 'en',
      updatedAt: new Date().toISOString()
    },
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: {
          language: 'en',
          missionStatement: 'You are a virtual assistant for the municipality. Your mission is to help citizens with their administrative requests efficiently and courteously.',
          boundaries: 'You can only handle requests related to administrative documents. For any other questions, politely direct to the appropriate service.',
          phrases: [
            'lost document',
            'stolen ID card',
            'lost passport'
          ]
        }
      },
      {
        id: 'ask-1',
        type: 'ask',
        position: { x: 250, y: 200 },
        data: {
          question: 'What type of document did you lose?',
          helpText: 'ID card, passport, driver\'s license'
        }
      },
      {
        id: 'decision-1',
        type: 'decision',
        position: { x: 250, y: 350 },
        data: {
          conditionLabel: 'Was the document stolen or lost?',
          mode: 'multi',
          branches: ['stolen', 'lost']
        }
      },
      {
        id: 'info-1',
        type: 'info',
        position: { x: 100, y: 500 },
        data: {
          say: 'File a police report',
          bullets: ['Visit the nearest police station', 'Bring a valid ID if available', 'Request a copy of the report']
        }
      },
      {
        id: 'transfer-1',
        type: 'transfer',
        position: { x: 400, y: 500 },
        data: {
          toService: 'Document Service',
          channel: 'counter',
          say: 'I\'m transferring you to the document service to finalize your request.'
        }
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 250, y: 650 },
        data: {
          say: 'Thank you for your call. Goodbye!'
        }
      }
    ],
    edges: [
      { id: 'e0', source: 'trigger-1', target: 'ask-1', sourceHandle: 'next' },
      { id: 'e1', source: 'ask-1', target: 'decision-1', sourceHandle: 'next' },
      { id: 'e2', source: 'decision-1', target: 'info-1', sourceHandle: 'stolen', label: 'Stolen' },
      { id: 'e3', source: 'decision-1', target: 'transfer-1', sourceHandle: 'lost', label: 'Lost' },
      { id: 'e4', source: 'info-1', target: 'end-1', sourceHandle: 'next' },
      { id: 'e5', source: 'transfer-1', target: 'end-1', sourceHandle: 'next' }
    ]
  },
  nl: {
    meta: {
      id: 'commune-triage-1',
      name: 'Gemeente Oproep Triage',
      version: 1,
      language: 'nl',
      updatedAt: new Date().toISOString()
    },
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: {
          language: 'nl',
          missionStatement: 'U bent een virtuele assistent voor de gemeente. Uw missie is om burgers efficiënt en hoffelijk te helpen met hun administratieve verzoeken.',
          boundaries: 'U kunt alleen verzoeken behandelen die verband houden met administratieve documenten. Voor andere vragen verwijst u beleefd naar de juiste dienst.',
          phrases: [
            'document verloren',
            'identiteitskaart gestolen',
            'paspoort verloren'
          ]
        }
      },
      {
        id: 'ask-1',
        type: 'ask',
        position: { x: 250, y: 200 },
        data: {
          question: 'Welk type document bent u verloren?',
          helpText: 'Identiteitskaart, paspoort, rijbewijs'
        }
      },
      {
        id: 'decision-1',
        type: 'decision',
        position: { x: 250, y: 350 },
        data: {
          conditionLabel: 'Is het document gestolen of verloren?',
          mode: 'multi',
          branches: ['stolen', 'lost']
        }
      },
      {
        id: 'info-1',
        type: 'info',
        position: { x: 100, y: 500 },
        data: {
          say: 'Aangifte bij de politie doen',
          bullets: ['Ga naar het dichtstbijzijnde politiebureau', 'Neem een geldig identiteitsbewijs mee indien beschikbaar', 'Vraag een kopie van de aangifte']
        }
      },
      {
        id: 'transfer-1',
        type: 'transfer',
        position: { x: 400, y: 500 },
        data: {
          toService: 'Documentendienst',
          channel: 'counter',
          say: 'Ik verbind u door naar de documentendienst om uw aanvraag af te ronden.'
        }
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 250, y: 650 },
        data: {
          say: 'Bedankt voor uw oproep. Tot ziens!'
        }
      }
    ],
    edges: [
      { id: 'e0', source: 'trigger-1', target: 'ask-1', sourceHandle: 'next' },
      { id: 'e1', source: 'ask-1', target: 'decision-1', sourceHandle: 'next' },
      { id: 'e2', source: 'decision-1', target: 'info-1', sourceHandle: 'stolen', label: 'Gestolen' },
      { id: 'e3', source: 'decision-1', target: 'transfer-1', sourceHandle: 'lost', label: 'Verloren' },
      { id: 'e4', source: 'info-1', target: 'end-1', sourceHandle: 'next' },
      { id: 'e5', source: 'transfer-1', target: 'end-1', sourceHandle: 'next' }
    ]
  },
  de: {
    meta: {
      id: 'commune-triage-1',
      name: 'Gemeinde Anruf Triage',
      version: 1,
      language: 'de',
      updatedAt: new Date().toISOString()
    },
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: {
          language: 'de',
          missionStatement: 'Sie sind ein virtueller Assistent für die Gemeinde. Ihre Aufgabe ist es, Bürgern bei ihren Verwaltungsanfragen effizient und höflich zu helfen.',
          boundaries: 'Sie können nur Anfragen zu Verwaltungsdokumenten bearbeiten. Bei anderen Fragen verweisen Sie höflich an den entsprechenden Service.',
          phrases: [
            'Dokument verloren',
            'Personalausweis gestohlen',
            'Reisepass verloren'
          ]
        }
      },
      {
        id: 'ask-1',
        type: 'ask',
        position: { x: 250, y: 200 },
        data: {
          question: 'Welche Art von Dokument haben Sie verloren?',
          helpText: 'Personalausweis, Reisepass, Führerschein'
        }
      },
      {
        id: 'decision-1',
        type: 'decision',
        position: { x: 250, y: 350 },
        data: {
          conditionLabel: 'Wurde das Dokument gestohlen oder verloren?',
          mode: 'multi',
          branches: ['stolen', 'lost']
        }
      },
      {
        id: 'info-1',
        type: 'info',
        position: { x: 100, y: 500 },
        data: {
          say: 'Anzeige bei der Polizei erstatten',
          bullets: ['Besuchen Sie die nächste Polizeistation', 'Bringen Sie einen gültigen Ausweis mit, falls verfügbar', 'Fordern Sie eine Kopie der Anzeige an']
        }
      },
      {
        id: 'transfer-1',
        type: 'transfer',
        position: { x: 400, y: 500 },
        data: {
          toService: 'Dokumentendienst',
          channel: 'counter',
          say: 'Ich verbinde Sie mit dem Dokumentendienst, um Ihren Antrag abzuschließen.'
        }
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 250, y: 650 },
        data: {
          say: 'Vielen Dank für Ihren Anruf. Auf Wiederhören!'
        }
      }
    ],
    edges: [
      { id: 'e0', source: 'trigger-1', target: 'ask-1', sourceHandle: 'next' },
      { id: 'e1', source: 'ask-1', target: 'decision-1', sourceHandle: 'next' },
      { id: 'e2', source: 'decision-1', target: 'info-1', sourceHandle: 'stolen', label: 'Gestohlen' },
      { id: 'e3', source: 'decision-1', target: 'transfer-1', sourceHandle: 'lost', label: 'Verloren' },
      { id: 'e4', source: 'info-1', target: 'end-1', sourceHandle: 'next' },
      { id: 'e5', source: 'transfer-1', target: 'end-1', sourceHandle: 'next' }
    ]
  }
};

export const exampleFlow = exampleFlows.fr;
