export type NodeType = "trigger" | "ask" | "decision" | "info" | "transfer";

export type GuichetFlow = {
  meta: {
    id: string;
    name: string;
    version: number;
    language: string;
    updatedAt: string;
  };
  nodes: Array<{
    id: string;
    type: NodeType;
    position: { x: number; y: number };
    data: any;
  }>;
  edges: Array<{
    id: string;
    source: string;
    sourceHandle?: string;
    target: string;
    label?: string;
  }>;
};

export type CompiledFlow = {
  id: string;
  version: number;
  language: string;
  entry: string;
  triggers: Array<{ phrase: string; intent: string; to: string }>;
  states: Record<
    string,
    | { type: "ask"; question: string; variableName: string; next: string }
    | { type: "decision"; prompt: string; branches: Record<string, string> }
    | { type: "info"; say: string; next?: string }
    | { type: "transfer"; toService: string; channel?: string; say: string }
  >;
};

export type ValidationError = {
  nodeId?: string;
  message: string;
  severity: "error" | "warning";
};

export type TriggerNodeData = {
  name?: string;
  phrases?: string[];
  translations?: {
    [lang: string]: {
      name?: string;
      phrases?: string[];
    }
  };
};

export type AskNodeData = {
  question?: string;
  helpText?: string;
  translations?: {
    [lang: string]: {
      question?: string;
      helpText?: string;
    }
  };
};

export type DecisionNodeData = {
  conditionLabel?: string;
  mode?: "yesno" | "multi";
  branches?: string[];
  translations?: {
    [lang: string]: {
      conditionLabel?: string;
      branches?: string[];
    }
  };
};

export type InfoNodeData = {
  flowTitle?: string;
  say?: string;
  alwaysProvide?: string;
  glossary?: string;
  documents?: any[];
  titleLocked?: boolean;
  contactEmail?: string;
  translations?: {
    [lang: string]: {
      say?: string;
      alwaysProvide?: string;
      glossary?: string;
    }
  };
};

export type TransferNodeData = {
  toService?: string;
  phoneOrExtension?: string;
  onlyDuringWorkingHours?: boolean;
  say?: string;
  informBeforeTransfer?: boolean;
  translations?: {
    [lang: string]: {
      toService?: string;
      say?: string;
    }
  };
};
