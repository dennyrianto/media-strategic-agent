import { AppStep, MediaBrief, PersonaProfile, Moment, BigIdea, MediaStrategyResult } from '../types';

export const analyzeBrief = async (
  input: { text?: string; fileBase64?: string; mimeType?: string }
): Promise<{ summary: string; structured: Partial<MediaBrief>; suggestions: string[] }> => {
  const response = await fetch('/api/gemini/analyze-brief', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to analyze brief (${response.status})`);
  }

  return response.json();
};

export const generateMarketDashboard = async (rawIntel: string): Promise<any> => {
  const response = await fetch('/api/gemini/market-dashboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawIntel }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate market dashboard (${response.status})`);
  }

  return response.json();
};

export const generatePersonasWithImages = async (
  brief: MediaBrief,
  marketIntelligence: string,
  additionalFiles: { name: string; base64: string; mimeType: string }[] = [],
  refinementQuery?: string
): Promise<{ text: string; personas: PersonaProfile[] }> => {
  const response = await fetch('/api/gemini/personas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brief, marketIntelligence, additionalFiles, refinementQuery }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate personas (${response.status})`);
  }

  return response.json();
};

export const generateMoments = async (
  brief: MediaBrief,
  marketIntelligence: string,
  personaSummary: string
): Promise<{ text: string; moments: Moment[] }> => {
  const response = await fetch('/api/gemini/moments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brief, marketIntelligence, personaSummary }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate moments (${response.status})`);
  }

  return response.json();
};

export const generateBigIdeas = async (
  brief: MediaBrief,
  marketIntelligence: string,
  personas: PersonaProfile[],
  moments: Moment[]
): Promise<{ text: string; ideas: BigIdea[] }> => {
  const response = await fetch('/api/gemini/big-ideas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brief, marketIntelligence, personas, moments }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate big ideas (${response.status})`);
  }

  return response.json();
};

export const generateMediaStrategy = async (
  brief: MediaBrief,
  personas: PersonaProfile[],
  marketIntel: string,
  moments: Moment[] = [],
  bigIdeas: BigIdea[] = []
): Promise<{ text: string; strategy: MediaStrategyResult }> => {
  const response = await fetch('/api/gemini/media-strategy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brief, personas, marketIntel, moments, bigIdeas }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate media strategy (${response.status})`);
  }

  return response.json();
};

export const generateStepContent = async (
  step: AppStep,
  brief: MediaBrief,
  previousResults: Record<number, any>
): Promise<string> => {
  const response = await fetch('/api/gemini/step-content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step, brief, previousResults }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate step content (${response.status})`);
  }

  const data = await response.json();
  return data.text || 'No analysis generated.';
};