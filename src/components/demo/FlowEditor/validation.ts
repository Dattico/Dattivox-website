/**
 * Flow Validation and Compilation
 * 
 * Provides validation rules and compilation logic for conversation flows.
 */

import { Node, Edge } from 'reactflow';
import { ValidationError, TriggerNodeData, DecisionNodeData, TransferNodeData } from './types';
import { extractDocumentText } from '../../utils/documentExtractor.js';

export function validateFlow(nodes: Node[], edges: Edge[]): ValidationError[] {
  return [];
}

export async function compileFlowToNaturalLanguage(flow: any, language: string = 'en'): Promise<string> {
  let output = `# CONVERSATION FLOW: ${flow.meta.name}\n\n`;
  
  const getTranslated = (data: any, field: string) => {
    const value = data[field];
    // New format: { en: "hello", fr: "bonjour" }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value[language] ?? value['en'] ?? value['fr'] ?? value['nl'] ?? '';
    }
    // Old format fallback: data.translations?.[language]?.[field]
    if (data.translations?.[language]?.[field]) {
      return data.translations[language][field];
    }
    // Plain string
    return value ?? '';
  };
  
  const triggerNode = flow.nodes.find((n: any) => n.type === 'trigger');
  if (triggerNode) {
    const phrases = getTranslated(triggerNode.data, 'phrases') || [];
    if (phrases.length > 0) {
      output += `## Entry Points\n`;
      phrases.forEach((phrase: string) => {
        output += `- "${phrase}"\n`;
      });
      output += '\n';
    }
  }
  
  if (triggerNode?.data.missionStatement) {
    output += `## Mission\n${triggerNode.data.missionStatement}\n\n`;
  }
  
  if (triggerNode?.data.boundaries) {
    output += `## Boundaries\n${triggerNode.data.boundaries}\n\n`;
  }
  
  output += `## Conversation Steps\n\n`;
  
  let stepNum = 1;
  for (const node of flow.nodes) {
    if (node.type === 'trigger') continue;
    
    const outEdges = flow.edges.filter((e: any) => e.source === node.id);
    
    output += `STEP ${stepNum} [${node.id}]\n`;
    
    if (node.type === 'ask') {
      const question = getTranslated(node.data, 'question');
      const helpText = getTranslated(node.data, 'helpText');
      output += `→ Ask: "${question || ''}"\n`;
      if (node.data.variableName) output += `→ Store answer as: {${node.data.variableName}}\n`;
      if (helpText) output += `→ Examples: "${helpText}"\n`;
      const nextEdge = outEdges[0];
      if (nextEdge) output += `→ Next: STEP ${flow.nodes.findIndex((n: any) => n.id === nextEdge.target && n.type !== 'trigger') + 1}\n`;
      
    } else if (node.type === 'decision') {
      const conditionLabel = getTranslated(node.data, 'conditionLabel');
      const branches = getTranslated(node.data, 'branches') || ['yes', 'no'];
      output += `→ Ask: "${conditionLabel || ''}"\n`;
      output += `→ Branches:\n`;
      
      branches.forEach((branch: string) => {
        const edge = outEdges.find((e: any) => e.sourceHandle === branch);
        if (edge) {
          const targetIdx = flow.nodes.findIndex((n: any) => n.id === edge.target && n.type !== 'trigger');
          output += `  • IF "${branch}" → STEP ${targetIdx + 1}\n`;
        }
      });
      
    } else if (node.type === 'info') {
      const say = getTranslated(node.data, 'say');
      const alwaysProvide = getTranslated(node.data, 'alwaysProvide');
      const glossary = getTranslated(node.data, 'glossary');
      
      output += `→ Say: "${say || ''}"\n`;
      
      if (alwaysProvide) output += `→ Always provide: ${alwaysProvide}\n`;
      if (glossary) output += `→ Glossary: ${glossary}\n`;
      
      if (node.data.documents?.length > 0) {
        console.log('[COMPILE] Info node has documents:', node.data.documents.length);
        output += `→ Provide: `;
        for (let i = 0; i < node.data.documents.length; i++) {
          const doc = node.data.documents[i];
          console.log('[COMPILE] Extracting document:', doc.fileName, 'from', doc.s3Key);
          try {
            const text = await extractDocumentText(doc.s3Key);
            console.log('[COMPILE] Extracted text length:', text.length);
            output += `[${doc.fileName}]\n\n\`\`\`\n${text}\n\`\`\`\n`;
          } catch (error) {
            console.error(`[COMPILE] Failed to extract ${doc.fileName}:`, error);
            output += `[${doc.fileName} - extraction failed]\n`;
          }
        }
      }
      
      const nextEdge = outEdges[0];
      if (nextEdge) {
        const targetIdx = flow.nodes.findIndex((n: any) => n.id === nextEdge.target && n.type !== 'trigger');
        output += `→ Next: STEP ${targetIdx + 1}\n`;
      }
      
    } else if (node.type === 'transfer') {
      const toService = getTranslated(node.data, 'toService');
      const say = getTranslated(node.data, 'say');
      output += `→ **ACTION REQUIRED**: Immediately invoke support({"destination": "${node.data.phoneOrExtension || 'MISSING'}"}). Do NOT say anything before calling the tool.\n`;
      if (say) output += `→ After tool returns: Say "${say}"\n`;
      output += `→ Transfer to: ${toService || ''}\n`;
      if (node.data.onlyDuringWorkingHours !== false) output += `→ Hours: Working hours only\n`;
      output += `→ End conversation\n`;
    }
    
    output += '\n';
    stepNum++;
  }
  
  const compiled = compileFlow(flow);
  output += `---\n## Machine-Readable Format\n\`\`\`json\n${JSON.stringify(compiled, null, 2)}\n\`\`\`\n`;
  
  return output;
}

export function compileFlow(flow: any): any {
  const triggerNode = flow.nodes.find((n: any) => n.type === 'trigger');
  const triggers = triggerNode?.data.rules || [];
  
  const states: any = {};
  flow.nodes.forEach((node: any) => {
    if (node.type === 'trigger') return;
    
    const outEdges = flow.edges.filter((e: any) => e.source === node.id);
    
    if (node.type === 'ask') {
      states[node.id] = {
        type: 'ask',
        question: node.data.question,
        variableName: node.data.variableName,
        next: outEdges[0]?.target || ''
      };
    } else if (node.type === 'decision') {
      const branches: any = {};
      outEdges.forEach((e: any) => {
        if (e.sourceHandle) branches[e.sourceHandle] = e.target;
      });
      states[node.id] = {
        type: 'decision',
        prompt: node.data.conditionLabel,
        branches
      };
    } else if (node.type === 'info') {
      states[node.id] = {
        type: 'info',
        say: node.data.say,
        documents: node.data.documents || [],
        next: outEdges[0]?.target
      };
    } else if (node.type === 'transfer') {
      states[node.id] = {
        type: 'transfer',
        toService: node.data.toService,
        channel: node.data.channel,
        say: node.data.say
      };
    }
  });
  
  return {
    id: flow.meta.id,
    version: flow.meta.version,
    language: flow.meta.language,
    entry: triggers[0]?.to || '',
    triggers,
    states
  };
}

export function generatePromptFile(flow: any): string {
  const compiled = compileFlow(flow);
  const triggerNode = flow.nodes.find((n: any) => n.type === 'trigger');
  const welcomeText = triggerNode?.data.welcome || '';
  
  return `# Flow: ${compiled.id}

**Version:** ${compiled.version}  
**Language:** ${compiled.language}  
**Generated:** ${new Date().toISOString()}

## Compiled Flow

\`\`\`json
${JSON.stringify(compiled, null, 2)}
\`\`\`

---

## IMPORTANT: Introduction

**YOU MUST introduce yourself at the START of the conversation using EXACTLY this wording:**

"${welcomeText}"
`;
}

export async function generateProcedurePromptFile(versionData: any, language: string, translations?: any): Promise<string> {
  const parsed = typeof versionData.formData === 'string' ? JSON.parse(versionData.formData) : versionData.formData;
  const t = translations || { introductionTitle: "IMPORTANT: Introduction", introductionInstruction: "YOU MUST introduce yourself at the START of the conversation using EXACTLY this wording:" };
  
  let content = '';

  if (parsed.mission) content += `## Mission\n${parsed.mission}\n\n`;
  if (parsed.forbiddenActions) content += `## Boundaries\n${parsed.forbiddenActions}\n\n`;
  
  // Hardcoded transfer instructions
  const transferInstructions = {
    en: {
      title: "TRANSFER INSTRUCTIONS",
      rule1: "Before suggesting a transfer, ensure you have checked all available information in your knowledge base.",
      rule2: "If an email address is available for the relevant service, ALWAYS suggest the email as the first contact option before phone transfer."
    },
    fr: {
      title: "INSTRUCTIONS DE TRANSFERT",
      rule1: "Avant de proposer un transfert, assurez-vous d'avoir vérifié toutes les informations disponibles dans votre base de connaissances.",
      rule2: "Si une adresse email est disponible pour le service concerné, proposez TOUJOURS l'email comme première option de contact avant le transfert téléphonique."
    },
    nl: {
      title: "DOORVERWIJSINSTRUCTIES",
      rule1: "Voordat u een overdracht voorstelt, zorg ervoor dat u alle beschikbare informatie in uw kennisbank heeft gecontroleerd.",
      rule2: "Als er een e-mailadres beschikbaar is voor de betreffende dienst, stel dan ALTIJD het e-mailadres voor als eerste contactoptie vóór telefonische overdracht."
    },
    de: {
      title: "WEITERLEITUNGSANWEISUNGEN",
      rule1: "Bevor Sie eine Weiterleitung vorschlagen, stellen Sie sicher, dass Sie alle verfügbaren Informationen in Ihrer Wissensdatenbank überprüft haben.",
      rule2: "Wenn eine E-Mail-Adresse für den betreffenden Dienst verfügbar ist, schlagen Sie IMMER die E-Mail als erste Kontaktoption vor der telefonischen Weiterleitung vor."
    }
  };
  
  const ti = transferInstructions[language as keyof typeof transferInstructions] || transferInstructions.en;
  content += `## ${ti.title}\n${ti.rule1}\n${ti.rule2}\n\n`;
  
  // Master Prompt: Combine all services with trigger phrases
  const flowDataMap = versionData.flowData ? (typeof versionData.flowData === 'string' ? JSON.parse(versionData.flowData) : versionData.flowData) : {};
  const serviceWorkingHours = versionData.serviceWorkingHours ? (typeof versionData.serviceWorkingHours === 'string' ? JSON.parse(versionData.serviceWorkingHours) : versionData.serviceWorkingHours) : {};
  if (Object.keys(flowDataMap).length > 0) {
    content += `## Service Routing\n\n`;
    content += `**When user mentions any of these trigger phrases, route to the corresponding service:**\n\n`;
    
    const { downloadData } = await import('aws-amplify/storage');
    for (const [serviceId, s3Key] of Object.entries(flowDataMap)) {
      try {
        const downloadResult = await downloadData({ path: s3Key as string }).result;
        const blob = await downloadResult.body.blob();
        const text = await blob.text();
        const serviceFlow = JSON.parse(text);
        
        const triggerNodes = serviceFlow.nodes?.filter((n: any) => n.type === 'trigger') || [];
        if (triggerNodes.length > 0) {
          content += `### ${serviceId.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}\n`;
          triggerNodes.forEach((node: any) => {
            // Support both old and new format
            let name, phrases;
            if (node.data.name && typeof node.data.name === 'object') {
              // New format: { en: "X", fr: "Y" }
              name = node.data.name[language] ?? node.data.name['en'] ?? node.data.name['fr'];
            } else {
              // Old format: translations.lang.name or plain string
              name = node.data.translations?.[language]?.name ?? node.data.name;
            }
            
            if (node.data.phrases && typeof node.data.phrases === 'object' && !Array.isArray(node.data.phrases)) {
              // New format: { en: [...], fr: [...] }
              phrases = node.data.phrases[language] ?? node.data.phrases['en'] ?? node.data.phrases['fr'] ?? [];
            } else {
              // Old format: translations.lang.phrases or plain array
              phrases = node.data.translations?.[language]?.phrases ?? node.data.phrases ?? [];
            }
            
            if (phrases.length > 0) {
              content += `**${name || 'Procedure'}:**\n`;
              phrases.forEach((phrase: string) => {
                content += `- "${phrase}"\n`;
              });
            }
          });
          content += '\n';
        }
      } catch (error) {
        console.error(`[MASTER_PROMPT] Failed to load service ${serviceId}:`, error);
      }
    }
  }
  
  if (parsed.workingHours?.length > 0) {
    content += `## Working Hours\n`;
    const grouped: { [key: string]: { main?: any, breaks: any[] } } = {};
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    parsed.workingHours.forEach((wh: any) => {
      if (!grouped[wh.day]) grouped[wh.day] = { breaks: [] };
      if (wh.open === true) grouped[wh.day].main = wh;
      else if (wh.open === false) grouped[wh.day].breaks.push(wh);
    });
    
    const timeGroups: { [key: string]: string[] } = {};
    Object.entries(grouped).forEach(([day, data]) => {
      if (data.main) {
        const breaksKey = data.breaks.map((b: any) => `${b.start}-${b.end}`).sort().join(',');
        const timeKey = `${data.main.start}-${data.main.end}|${breaksKey}`;
        if (!timeGroups[timeKey]) timeGroups[timeKey] = [];
        timeGroups[timeKey].push(day);
      }
    });
    
    Object.entries(timeGroups).forEach(([timeKey, days]) => {
      const [mainTime, breaksStr] = timeKey.split('|');
      const [start, end] = mainTime.split('-');
      
      let dayRange;
      if (days.length === 7) {
        dayRange = 'Daily';
      } else if (days.length === 5 && days.every(d => d !== 'Saturday' && d !== 'Sunday')) {
        dayRange = 'Monday-Friday';
      } else if (days.length === 2 && days.includes('Saturday') && days.includes('Sunday')) {
        dayRange = 'Weekends';
      } else if (days.length > 1) {
        const sortedDays = days.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
        const ranges: string[] = [];
        let rangeStart = 0;
        
        for (let i = 1; i <= sortedDays.length; i++) {
          const isConsecutive = i < sortedDays.length && 
            dayOrder.indexOf(sortedDays[i]) === dayOrder.indexOf(sortedDays[i - 1]) + 1;
          
          if (!isConsecutive) {
            if (i - rangeStart > 2) {
              ranges.push(`${sortedDays[rangeStart]}-${sortedDays[i - 1]}`);
            } else {
              for (let j = rangeStart; j < i; j++) ranges.push(sortedDays[j]);
            }
            rangeStart = i;
          }
        }
        dayRange = ranges.join(', ');
      } else {
        dayRange = days[0];
      }
      
      content += `- **${dayRange}**: ${start} - ${end}`;
      if (breaksStr) {
        content += ` (Breaks: ${breaksStr.split(',').join(', ')})`;
      }
      content += '\n';
    });
    
    const closedDays = dayOrder.filter(day => !grouped[day]?.main);
    if (closedDays.length > 0) {
      content += `- **${closedDays.join(', ')}**: CLOSED\n`;
    }
    
    const ticketTimes = {
      fr: "Préciser pour les horaires que les derniers tickets sont donnés à 11h30 pour le matin et à 14h45 pour l'après-midi",
      nl: "Vermeld voor de openingstijden dat de laatste tickets worden gegeven om 11u30 voor de ochtend en om 14u45 voor de namiddag",
      de: "Geben Sie für die Öffnungszeiten an, dass die letzten Tickets um 11:30 Uhr für den Vormittag und um 14:45 Uhr für den Nachmittag ausgegeben werden",
      en: "Specify for the opening hours that the last tickets are given at 11:30 AM for the morning and at 2:45 PM for the afternoon"
    };
    const ticketNote = ticketTimes[language as keyof typeof ticketTimes] || ticketTimes.en;
    content += `\n**Note:** ${ticketNote}\n`;
    content += '\n';
  }
  if (parsed.closedDates?.length > 0) {
    content += `## Closed Dates\n`;
    const sortedDates = [...parsed.closedDates].sort();
    const groupedByMonth: { [key: string]: Array<{ formatted: string, iso: string }> } = {};
    
    sortedDates.forEach((dateStr: string) => {
      const date = new Date(dateStr);
      const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!groupedByMonth[monthYear]) groupedByMonth[monthYear] = [];
      const formatted = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      groupedByMonth[monthYear].push({ formatted, iso: dateStr });
    });
    
    Object.entries(groupedByMonth).forEach(([monthYear, dates]) => {
      content += `\n**${monthYear}**\n`;
      dates.forEach(({ formatted, iso }) => content += `- ${formatted} (${iso})\n`);
    });
    content += '\n';
  }
  if (parsed.mission) content += `## Mission\n${parsed.mission}\n\n`;
  if (parsed.forbiddenActions) content += `## Boundaries\n${parsed.forbiddenActions}\n\n`;


  // Generate detailed flows for each service
  if (Object.keys(flowDataMap).length > 0) {
    const { downloadData } = await import('aws-amplify/storage');
    for (const [serviceId, s3Key] of Object.entries(flowDataMap)) {
      try {
        console.log(`[GENERATE_PROMPT] Processing service: ${serviceId}, S3 key: ${s3Key}`);
        const downloadResult = await downloadData({ path: s3Key as string }).result;
        const blob = await downloadResult.body.blob();
        const text = await blob.text();
        console.log(`[GENERATE_PROMPT] Downloaded ${serviceId}, text length: ${text.length}`);
        const serviceFlow = JSON.parse(text);
        console.log(`[GENERATE_PROMPT] Parsed ${serviceId}, nodes: ${serviceFlow.nodes?.length || 0}`);
        
        const transferNodes = serviceFlow.nodes?.filter((n: any) => n.type === 'transfer' && n.data?.phoneOrExtension) || [];
        if (transferNodes.length > 0) {
          content += `## ⚠️ CRITICAL RULES - ${serviceId.replace(/-/g, ' ').toUpperCase()}\n\n`;
          content += `### Rule 1: Brevity\n`;
          content += `- Keep ALL responses SHORT - maximum 1-2 sentences\n`;
          content += `- NO lengthy explanations\n`;
          content += `- Get to the point immediately\n\n`;
          content += `### Rule 2: Information Accuracy\n`;
          content += `- ONLY provide information explicitly in this prompt\n`;
          content += `- NEVER invent phone numbers, addresses, hours, or contact details\n`;
          content += `- If not in prompt, say "Je n'ai pas cette information"\n\n`;
          content += `### Rule 3: Transfer Execution\n`;
          content += `**WHEN user requests a service that requires transfer:**\n`;
          content += `1. IMMEDIATELY call support tool - DO NOT speak first\n`;
          content += `2. DO NOT ask permission\n`;
          content += `3. Call tool FIRST, speak AFTER\n\n`;
          content += `**Transfer destinations:**\n`;
          transferNodes.forEach((node: any) => {
            content += `- **${node.data.toService}**: Invoke support({"destination": "${node.data.phoneOrExtension}"}) immediately when user mentions this service\n`;
          });
          content += `\n`;
        }
        
        const flow = { 
          meta: { id: serviceId, name: serviceId, version: versionData.version, language }, 
          nodes: serviceFlow.nodes, 
          edges: serviceFlow.edges || [] 
        };
        
        // Inject service-specific working hours if available
        if (serviceWorkingHours[serviceId]) {
          const serviceHours = serviceWorkingHours[serviceId];
          content += `### Working Hours - ${serviceId.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}\n`;
          
          if (serviceHours.hours && serviceHours.hours.length > 0) {
            const grouped: { [key: string]: { main?: any, breaks: any[] } } = {};
            const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            
            serviceHours.hours.forEach((wh: any) => {
              if (!grouped[wh.day]) grouped[wh.day] = { breaks: [] };
              if (wh.open === true) grouped[wh.day].main = wh;
              else if (wh.open === false) grouped[wh.day].breaks.push(wh);
            });
            
            const timeGroups: { [key: string]: string[] } = {};
            Object.entries(grouped).forEach(([day, data]) => {
              if (data.main) {
                const breaksKey = data.breaks.map((b: any) => `${b.start}-${b.end}`).sort().join(',');
                const timeKey = `${data.main.start}-${data.main.end}|${breaksKey}`;
                if (!timeGroups[timeKey]) timeGroups[timeKey] = [];
                timeGroups[timeKey].push(day);
              }
            });
            
            Object.entries(timeGroups).forEach(([timeKey, days]) => {
              const [mainTime, breaksStr] = timeKey.split('|');
              const [start, end] = mainTime.split('-');
              
              let dayRange;
              if (days.length === 7) {
                dayRange = 'Daily';
              } else if (days.length === 5 && days.every(d => d !== 'Saturday' && d !== 'Sunday')) {
                dayRange = 'Monday-Friday';
              } else if (days.length === 2 && days.includes('Saturday') && days.includes('Sunday')) {
                dayRange = 'Weekends';
              } else if (days.length > 1) {
                const sortedDays = days.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
                const ranges: string[] = [];
                let rangeStart = 0;
                
                for (let i = 1; i <= sortedDays.length; i++) {
                  const isConsecutive = i < sortedDays.length && 
                    dayOrder.indexOf(sortedDays[i]) === dayOrder.indexOf(sortedDays[i - 1]) + 1;
                  
                  if (!isConsecutive) {
                    if (i - rangeStart > 2) {
                      ranges.push(`${sortedDays[rangeStart]}-${sortedDays[i - 1]}`);
                    } else {
                      for (let j = rangeStart; j < i; j++) ranges.push(sortedDays[j]);
                    }
                    rangeStart = i;
                  }
                }
                dayRange = ranges.join(', ');
              } else {
                dayRange = days[0];
              }
              
              content += `- **${dayRange}**: ${start} - ${end}`;
              if (breaksStr) {
                content += ` (Breaks: ${breaksStr.split(',').join(', ')})`;
              }
              content += '\n';
            });
            
            const closedDays = dayOrder.filter(day => !grouped[day]?.main);
            if (closedDays.length > 0) {
              content += `- **${closedDays.join(', ')}**: CLOSED\n`;
            }
          }
          
          if (serviceHours.closedDates && serviceHours.closedDates.length > 0) {
            content += `\n**Closure Days:**\n`;
            const sortedDates = [...serviceHours.closedDates].sort();
            const groupedByMonth: { [key: string]: Array<{ formatted: string, iso: string }> } = {};
            
            sortedDates.forEach((dateStr: string) => {
              const date = new Date(dateStr);
              const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              if (!groupedByMonth[monthYear]) groupedByMonth[monthYear] = [];
              const formatted = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
              groupedByMonth[monthYear].push({ formatted, iso: dateStr });
            });
            
            Object.entries(groupedByMonth).forEach(([monthYear, dates]) => {
              content += `\n*${monthYear}*\n`;
              dates.forEach(({ formatted, iso }) => content += `- ${formatted} (${iso})\n`);
            });
          }
          
          content += '\n';
        }
        
        const naturalLanguageFlow = await compileFlowToNaturalLanguage(flow, language);
        content += naturalLanguageFlow;
      } catch (error) {
        console.error(`[MASTER_PROMPT] Failed to compile service ${serviceId}:`, error);
      }
    }
  } else if (parsed.flowData?.s3Key) {
    const { downloadData } = await import('aws-amplify/storage');
    const downloadResult = await downloadData({ path: parsed.flowData.s3Key }).result;
    const blob = await downloadResult.body.blob();
    const text = await blob.text();
    const flowFromS3 = JSON.parse(text);
    
    // Extract transfer destinations from flow
    const transferNodes = flowFromS3.nodes?.filter((n: any) => n.type === 'transfer' && n.data?.phoneOrExtension) || [];
    if (transferNodes.length > 0) {
      content += `## ⚠️ CRITICAL RULES - READ FIRST\n\n`;
      content += `### Rule 1: Brevity\n`;
      content += `- Keep ALL responses SHORT - maximum 1-2 sentences\n`;
      content += `- NO lengthy explanations\n`;
      content += `- Get to the point immediately\n\n`;
      content += `### Rule 2: Information Accuracy\n`;
      content += `- ONLY provide information explicitly in this prompt\n`;
      content += `- NEVER invent phone numbers, addresses, hours, or contact details\n`;
      content += `- If not in prompt, say "Je n'ai pas cette information"\n\n`;
      content += `### Rule 3: Transfer Execution\n`;
      content += `**WHEN user requests a service that requires transfer:**\n`;
      content += `1. IMMEDIATELY call support tool - DO NOT speak first\n`;
      content += `2. DO NOT ask permission\n`;
      content += `3. Call tool FIRST, speak AFTER\n\n`;
      content += `**Transfer destinations:**\n`;
      transferNodes.forEach((node: any) => {
        content += `- **${node.data.toService}**: Invoke support({"destination": "${node.data.phoneOrExtension}"}) immediately when user mentions this service\n`;
      });
      content += `\n`;
    }
    
    const flow = { 
      meta: { id: 'PROCEDURE_BUILDER', name: 'Procedure Flow', version: versionData.version, language }, 
      nodes: flowFromS3.nodes, 
      edges: flowFromS3.edges || [] 
    };
    const naturalLanguageFlow = await compileFlowToNaturalLanguage(flow, language);
    content += naturalLanguageFlow;
  }

  if (parsed.generatedPrompt) content += `\n## Full Prompt\n\`\`\`\n${parsed.generatedPrompt}\n\`\`\`\n`;

  if (parsed.welcome) {
    content += `\n---\n\n## ${t.introductionTitle}\n\n**${t.introductionInstruction}**\n\n"${parsed.welcome}"\n`;
  }

  return content;
}
