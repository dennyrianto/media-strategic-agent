
export const AppStep = {
  BriefIngestion: 1,
  MarketIntelligence: 2,
  AudiencePersona: 3,
  MomentActivation: 4,
  BigIdea: 5,
  MediaStrategy: 6,
} as const;

export type AppStep = (typeof AppStep)[keyof typeof AppStep];

export interface MediaBrief {
  brandName: string;
  industry: string;
  product: string;
  targetAudience: string;
  objectives: string;
  budget: string;
  timeline: string;
  additionalNotes: string;
  
  // New fields for Step 1 enhancements
  summary?: string;
  isConfirmed?: boolean;
  suggestions?: string[];
}

export interface PersonaProfile {
  id: string;
  name: string;
  role: string;
  age: string;
  quote: string;
  demographics: string[];
  psychographics: string[];
  behaviors: string[];
  mediaHabits: string[];
  painPoints: string[];
  drivers: string[];
  visualDescription: string;
  imageUrl?: string;
  
  // Enhanced fields
  microSegmentation?: string;
  brandAffinity?: string[];
  digitalJourney?: string[];
  offlineJourney?: string[];
}

export interface Moment {
  id: string;
  title: string; // The Occasion/Theme
  month: string; // e.g. "January"
  date: string; // e.g., "Jan 1"
  type: 'Cultural' | 'Seasonal' | 'Industry' | 'Sporting' | 'Trend' | 'Other';
  relevanceScore: number; // 0-100
  description: string;
  activationIdea: string; // Campaign Idea
  
  // New fields for Calendar Visual
  contentFocus?: string;
  brandingIdea?: string;
}

export interface FunnelStage {
  role: 'Awareness' | 'Consideration' | 'Trial' | 'Conversion';
  strategy: string;
  touchpoints: string[];
}

export interface BigIdea {
  title: string;
  tagline: string;
  hook: string;
  rationale: string;
  culturalFit: string;
  acronym: {
    word: string;
    meaning: string;
  };
  funnelStrategy: FunnelStage[];
}

// --- NEW MEDIA STRATEGY INTERFACES ---

export interface ChannelCategoryStrategy {
  category: 'Conventional' | 'Digital' | 'Activation';
  strategy: string; // High-level strategy for this category
  approach: string; // Detailed approach
  explanation: string; // Why this works
  tactics: string[]; // Specific tactics
}

export interface MediaFunnelStage {
  stage: 'Awareness' | 'Consideration' | 'Trial' | 'Conversion';
  objective: string;
  kpi: string;
  channelStrategies: ChannelCategoryStrategy[];
}

export interface ProgrammaticIdea {
  conceptName: string;
  dataTriggers: string; // "Data Strategy" - e.g. Weather API, Location, CRM
  momentConnection: string; // How it links to the moment/big idea
  creativeExecution: string;
  realLifeApplication: string; // Concrete example
}

export interface PersonaMediaStrategy {
  personaName: string;
  overview: string;
  // Integration fields
  matchedBigIdea: string; // The specific Big Idea concept name best suited for this persona
  matchedMoments: string[]; // Specific moments from Step 4 relevant to this persona
  funnelBreakdown: MediaFunnelStage[];
  programmaticIdeas: ProgrammaticIdea[]; // New per-persona field
}

export interface BudgetAllocation {
  channel: string;
  percentage: number;
  rationale: string;
}

export interface MediaChannelTactic {
  channel: string;
  role: string; 
  tacticDescription: string;
  contentThemes: string[];
  formats: string[];
  bestPractices: string;
  // New Targeting Profiling
  targeting: {
    demographics: string;
    affinities: string[];
  };
}

export interface LocalNuance {
  aspect: string; 
  insight: string;
}

// New Interfaces for Gantt Chart
export interface CampaignPhase {
  name: string; // e.g. "Tease", "Launch"
  timing: string; // e.g. "Week 1-2"
  objective: string;
}

export interface ChannelActivity {
  phaseName: string;
  action: string; // specific tactic e.g. "Hero Video 60s"
  intensity: 'High' | 'Medium' | 'Low' | 'None';
}

export interface ChannelFlight {
  channel: string;
  activities: ChannelActivity[];
}

export interface FlightPlan {
  phases: CampaignPhase[];
  channels: ChannelFlight[];
}

// Content Insight: key contents of virality (bottom of step 6)
export interface ViralContentIdea {
  title: string;
  concept: string;
  hook: string;               // what stops the scroll in the first seconds
  viralityDrivers: string[];  // why people will share / engage
  formatAndPlatforms: string;
  howToMake: string[];        // concrete production steps
  targetPersona: string;
  linkedBigIdea?: string;     // big idea or moment it supports
  shareTrigger: string;       // what people are invited to do
}

export interface ContentInsight {
  overview: string;
  viralityPrinciples: string[];
  ideas: ViralContentIdea[];  // always 3 or more
}

export interface MediaStrategyResult {
  personaStrategies: PersonaMediaStrategy[];
  budgetAllocation: BudgetAllocation[];
  tacticalBlueprint: MediaChannelTactic[];
  localNuances: LocalNuance[];
  flightPlan: FlightPlan;
  // Optional: strategies saved before this section existed don't have it.
  contentInsight?: ContentInsight;
}

// Universal structure for step outputs
export interface StepResult {
  rawText: string;
  structuredData?: any; // For charts or specific lists
  timestamp: number;
}

export interface StrategyState {
  currentStep: AppStep;
  brief: MediaBrief;
  results: Record<number, StepResult>;
  isGenerating: boolean;
}

export interface SavedSession {
  version: number;
  currentStep: AppStep;
  maxStepReached: number;
  brief: MediaBrief;
  results: Record<number, StepResult>;
  lastSavedAt: number;
}