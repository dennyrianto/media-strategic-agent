import { AppStep, MediaBrief, StepResult, StrategyState } from '../types';

export const STORAGE_KEY = 'media_strategix_session_v1';

export interface SavedSession {
  version: number;
  currentStep: AppStep;
  maxStepReached: number;
  brief: MediaBrief;
  results: Record<number, StepResult>;
  lastSavedAt: number;
}

export const defaultBrief: MediaBrief = {
  brandName: '',
  industry: '',
  product: '',
  targetAudience: '',
  objectives: '',
  budget: '',
  timeline: '',
  additionalNotes: '',
};

/**
 * Safely loads the saved session from localStorage.
 * Returns null if no saved session exists or if data is corrupt.
 */
export const loadSavedSession = (): SavedSession | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    // Validate minimum required fields
    if (!parsed.brief || typeof parsed.brief !== 'object') return null;
    if (!parsed.results || typeof parsed.results !== 'object') return null;

    const currentStep = typeof parsed.currentStep === 'number' && parsed.currentStep >= 1 && parsed.currentStep <= 6
      ? (parsed.currentStep as AppStep)
      : AppStep.BriefIngestion;

    const maxStepReached = typeof parsed.maxStepReached === 'number' && parsed.maxStepReached >= 1 && parsed.maxStepReached <= 6
      ? parsed.maxStepReached
      : Math.max(1, currentStep);

    return {
      version: parsed.version || 1,
      currentStep,
      maxStepReached,
      brief: {
        ...defaultBrief,
        ...parsed.brief,
      },
      results: parsed.results || {},
      lastSavedAt: parsed.lastSavedAt || Date.now(),
    };
  } catch (error) {
    console.warn('Failed to load session from localStorage:', error);
    return null;
  }
};

/**
 * Checks if a valid saved session with user progress exists in localStorage.
 */
export const hasSavedSession = (): boolean => {
  const session = loadSavedSession();
  if (!session) return false;
  // Consider saved progress valid if brandName exists, brief has summary, or any results exist
  const hasBriefContent = Boolean(
    session.brief.brandName?.trim() ||
    session.brief.summary?.trim() ||
    session.brief.targetAudience?.trim() ||
    session.brief.objectives?.trim()
  );
  const hasResults = Object.keys(session.results).length > 0;
  return hasBriefContent || hasResults;
};

/**
 * Saves the current session to localStorage.
 * Handles storage quota exceptions gracefully by stripping non-essential base64 media if needed.
 */
export const saveSession = (data: {
  currentStep: AppStep;
  maxStepReached: number;
  brief: MediaBrief;
  results: Record<number, StepResult>;
}): { success: boolean; lastSavedAt: number } => {
  const lastSavedAt = Date.now();
  const payload: SavedSession = {
    version: 1,
    currentStep: data.currentStep,
    maxStepReached: data.maxStepReached,
    brief: data.brief,
    results: data.results,
    lastSavedAt,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return { success: true, lastSavedAt };
  } catch (error: any) {
    console.warn('Initial localStorage save failed, attempting quota-friendly fallback...', error);
    
    // In case of quota error (e.g. large base64 image data in personas)
    try {
      const sanitizedResults: Record<number, StepResult> = {};
      for (const [key, val] of Object.entries(data.results)) {
        if (!val) continue;
        const stepNum = Number(key);
        // If persona step (AppStep.AudiencePersona = 3), sanitize large persona images if they are base64
        if (stepNum === AppStep.AudiencePersona && Array.isArray(val.structuredData)) {
          const sanitizedPersonas = val.structuredData.map((p: any) => {
            if (p?.imageUrl && p.imageUrl.startsWith('data:image')) {
              // Strip heavy data URI for local storage while preserving the visualDescription
              const { imageUrl, ...rest } = p;
              return rest;
            }
            return p;
          });
          sanitizedResults[stepNum] = {
            ...val,
            structuredData: sanitizedPersonas,
          };
        } else {
          sanitizedResults[stepNum] = val;
        }
      }

      const lightweightPayload: SavedSession = {
        ...payload,
        results: sanitizedResults,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweightPayload));
      return { success: true, lastSavedAt };
    } catch (fallbackError) {
      console.error('Critical localStorage save failure (quota full):', fallbackError);
      return { success: false, lastSavedAt };
    }
  }
};

/**
 * Clears the saved session from localStorage.
 */
export const clearSavedSession = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear session from localStorage:', error);
  }
};
