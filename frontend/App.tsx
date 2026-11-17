
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { StepRenderer } from './components/StepViews';
import { AppStep, StrategyState, MediaBrief, StepResult } from './types';
import { 
  loadSavedSession, 
  saveSession, 
  clearSavedSession, 
  defaultBrief 
} from './services/storageService';
import { CheckCircle2, BookmarkCheck, X, RotateCcw } from 'lucide-react';

const App: React.FC = () => {
  // Load saved session synchronously once on startup
  const initialSavedSession = useMemo(() => loadSavedSession(), []);

  const [state, setState] = useState<StrategyState>(() => {
    if (initialSavedSession) {
      return {
        currentStep: initialSavedSession.currentStep || AppStep.BriefIngestion,
        brief: initialSavedSession.brief || { ...defaultBrief },
        results: initialSavedSession.results || {},
        isGenerating: false
      };
    }
    return {
      currentStep: AppStep.BriefIngestion,
      brief: { ...defaultBrief },
      results: {},
      isGenerating: false
    };
  });

  const [maxStepReached, setMaxStepReached] = useState<number>(() => {
    if (initialSavedSession?.maxStepReached) {
      return Math.max(1, Math.min(6, initialSavedSession.maxStepReached));
    }
    return 1;
  });

  const [lastSavedAt, setLastSavedAt] = useState<number | null>(() => {
    return initialSavedSession?.lastSavedAt || null;
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>(() => {
    return initialSavedSession ? 'saved' : 'idle';
  });

  const [showRestoredBanner, setShowRestoredBanner] = useState<boolean>(() => {
    // Show notification banner only if actual meaningful progress was restored
    if (!initialSavedSession) return false;
    const hasContent = Boolean(
      initialSavedSession.brief?.brandName?.trim() ||
      initialSavedSession.brief?.summary?.trim() ||
      Object.keys(initialSavedSession.results || {}).length > 0 ||
      initialSavedSession.currentStep > 1
    );
    return hasContent;
  });

  const isInitialMount = useRef(true);

  // Auto-save debounced whenever state or progress updates
  useEffect(() => {
    // Avoid re-saving immediately upon initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setSaveStatus('saving');
    const timer = setTimeout(() => {
      const res = saveSession({
        currentStep: state.currentStep,
        maxStepReached,
        brief: state.brief,
        results: state.results,
      });
      setLastSavedAt(res.lastSavedAt);
      setSaveStatus('saved');
    }, 350);

    return () => clearTimeout(timer);
  }, [state.currentStep, state.brief, state.results, maxStepReached]);

  // Ensure synchronous save before tab closes or page reloads
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveSession({
        currentStep: state.currentStep,
        maxStepReached,
        brief: state.brief,
        results: state.results,
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.currentStep, state.brief, state.results, maxStepReached]);

  const updateBrief = (newBrief: MediaBrief) => {
    setState(prev => ({ ...prev, brief: newBrief }));
  };

  const updateResult = (step: AppStep, result: StepResult) => {
    setState(prev => ({
      ...prev,
      results: {
        ...prev.results,
        [step]: result
      }
    }));
  };

  const setStep = (step: AppStep) => {
    setState(prev => ({ ...prev, currentStep: step }));
  };

  const handleNextStep = () => {
    const nextStep = state.currentStep + 1;
    // Stop progression after Media Strategy (Step 6)
    if (nextStep <= AppStep.MediaStrategy) {
      setMaxStepReached(prev => Math.max(prev, nextStep));
      setStep(nextStep as AppStep);
    }
  };

  const handleResetSession = () => {
    clearSavedSession();
    setState({
      currentStep: AppStep.BriefIngestion,
      brief: { ...defaultBrief },
      results: {},
      isGenerating: false,
    });
    setMaxStepReached(1);
    setLastSavedAt(null);
    setSaveStatus('idle');
    setShowRestoredBanner(false);
  };

  const hasSavedData = Boolean(
    state.brief.brandName?.trim() ||
    state.brief.summary?.trim() ||
    Object.keys(state.results).length > 0 ||
    maxStepReached > 1
  );

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-inter selection:bg-blue-100 selection:text-blue-900">
      <Sidebar 
        currentStep={state.currentStep} 
        setStep={setStep} 
        maxStepReached={maxStepReached}
        lastSavedAt={lastSavedAt}
        saveStatus={saveStatus}
        hasSavedData={hasSavedData}
        onResetSession={handleResetSession}
      />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Dynamic Background Elements - Light Theme */}
        <div className="absolute inset-0 pointer-events-none z-0">
           <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[100px]"></div>
           <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-[100px]"></div>
        </div>

        {/* Restored Session Notification Banner */}
        {showRestoredBanner && (
          <div className="z-20 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200/80 px-8 py-2.5 flex items-center justify-between text-xs text-blue-950 transition-all shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="p-1 rounded bg-blue-100/80 text-blue-700">
                <BookmarkCheck size={14} />
              </span>
              <span>
                <strong>Session restored:</strong> Resumed progress for{' '}
                <span className="font-semibold text-blue-800">
                  {state.brief.brandName?.trim() || 'your active brief'}
                </span>{' '}
                at Step {state.currentStep} of 6.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleResetSession}
                className="text-blue-700 hover:text-red-700 font-semibold underline underline-offset-2 flex items-center gap-1 transition-colors"
              >
                <RotateCcw size={11} /> Start Fresh
              </button>
              <button
                type="button"
                onClick={() => setShowRestoredBanner(false)}
                className="p-1 rounded-md text-blue-600 hover:bg-blue-100/60 transition-colors"
                title="Dismiss banner"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden z-10 p-8 md:p-12 max-w-7xl mx-auto w-full">
           <StepRenderer 
             step={state.currentStep} 
             state={state}
             updateBrief={updateBrief}
             updateResult={updateResult}
             nextStep={handleNextStep}
           />
        </div>
      </main>
    </div>
  );
};

export default App;

