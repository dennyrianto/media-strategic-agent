
import React, { useState } from 'react';
import { AppStep } from '../types';
import { 
  ClipboardList, 
  Globe2, 
  Users, 
  CalendarDays, 
  Lightbulb, 
  Layers,
  CheckCircle2,
  Loader2,
  RotateCcw,
  AlertTriangle,
  Check,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  currentStep: AppStep;
  setStep: (step: AppStep) => void;
  maxStepReached: number;
  lastSavedAt?: number | null;
  saveStatus?: 'idle' | 'saving' | 'saved';
  hasSavedData?: boolean;
  onResetSession?: () => void;
}

const steps = [
  { id: AppStep.BriefIngestion, label: 'Brief Ingestion', icon: ClipboardList },
  { id: AppStep.MarketIntelligence, label: 'Market Intelligence', icon: Globe2 },
  { id: AppStep.AudiencePersona, label: 'Audience Personas', icon: Users },
  { id: AppStep.MomentActivation, label: 'Moment Activation', icon: CalendarDays },
  { id: AppStep.BigIdea, label: 'Big Idea Generation', icon: Lightbulb },
  { id: AppStep.MediaStrategy, label: 'Media Strategy & Approach', icon: Layers },
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentStep, 
  setStep, 
  maxStepReached,
  lastSavedAt,
  saveStatus = 'idle',
  hasSavedData = false,
  onResetSession
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const formatLastSaved = (timestamp?: number | null) => {
    if (!timestamp) return 'Auto-saved locally';
    const secondsAgo = Math.floor((Date.now() - timestamp) / 1000);
    if (secondsAgo < 5) return 'Saved just now';
    if (secondsAgo < 60) return `Saved ${secondsAgo}s ago`;
    const date = new Date(timestamp);
    return `Saved at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="w-72 h-full bg-white border-r border-slate-200/80 flex flex-col z-20">
      <div className="px-6 pt-7 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-md shadow-indigo-500/30">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-slate-900 leading-none">Media Strategix</h1>
            <p className="text-[10px] text-slate-400 mt-1.5 uppercase tracking-[0.18em] font-semibold">Strategy Suite</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <p className="px-3 mb-3 text-[10px] uppercase tracking-[0.18em] font-bold text-slate-400">Workflow</p>
        <div className="relative">
          {/* vertical connector */}
          <div className="absolute left-[27px] top-6 bottom-6 w-px bg-slate-200" aria-hidden="true"></div>
          <div className="space-y-1 relative">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = maxStepReached >= step.id;
              const isLocked = !isCompleted && step.id !== AppStep.BriefIngestion && step.id > maxStepReached + 1;
              const isDone = isCompleted && !isActive && step.id < maxStepReached;

              return (
                <button
                  key={step.id}
                  onClick={() => !isLocked && setStep(step.id)}
                  disabled={isLocked}
                  className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-colors duration-200 text-left group
                    ${isActive
                      ? 'bg-indigo-50 text-indigo-800'
                      : isLocked
                        ? 'text-slate-300 cursor-not-allowed'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }
                  `}
                >
                  <span
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-white transition-colors
                      ${isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                        : isDone
                          ? 'bg-emerald-500 text-white'
                          : isLocked
                            ? 'bg-slate-100 text-slate-300'
                            : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                      }`}
                  >
                    {isDone ? <Check size={15} strokeWidth={3} /> : isActive ? <Icon size={15} /> : step.id}
                  </span>
                  <span className={`text-[13px] leading-snug ${isActive ? 'font-bold' : 'font-semibold'}`}>
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Auto-Save Status & Session Persistence Controls */}
      <div className="p-4 border-t border-slate-200/80 bg-slate-50/60 space-y-3">
        {/* Persistence Status Pill */}
        <div className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-xs">
            {saveStatus === 'saving' ? (
              <>
                <Loader2 size={13} className="text-blue-600 animate-spin shrink-0" />
                <span className="text-blue-700 font-medium text-[11px]">Saving changes...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                <span className="text-slate-600 text-[11px] font-medium">{formatLastSaved(lastSavedAt)}</span>
              </>
            )}
          </div>
          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
            Local
          </span>
        </div>

        {/* Start New / Reset Session Button */}
        {hasSavedData && onResetSession && (
          <div>
            {!showResetConfirm ? (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-slate-600 hover:text-red-600 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg font-medium transition-colors"
              >
                <RotateCcw size={13} />
                <span>Start New Campaign</span>
              </button>
            ) : (
              <div className="p-2.5 bg-red-50/90 border border-red-200 rounded-lg space-y-2">
                <div className="flex items-start gap-1.5 text-red-800 text-[11px] leading-tight">
                  <AlertTriangle size={13} className="shrink-0 text-red-600 mt-0.5" />
                  <span>Clear saved progress and start a fresh brief?</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onResetSession();
                      setShowResetConfirm(false);
                    }}
                    className="flex-1 py-1 px-2 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold transition-colors"
                  >
                    Yes, Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-1 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-[11px] font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* System Active Badge */}
        <div className="flex items-center gap-3 px-2 pt-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-indigo-700">AI</span>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700">Gemini 3.6 Active</p>
            <p className="text-[10px] text-slate-500">Session automatically synced</p>
          </div>
        </div>
      </div>
    </div>
  );
};

