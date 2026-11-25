import React from 'react';
import { ContentInsight } from '../types';
import { TrendingUp, Lightbulb, Zap, Share2, Users, PlayCircle, Sparkles } from 'lucide-react';

/**
 * "Content Insight" - key contents of virality.
 * Shown at the very bottom of step 6 (Media Strategy & Approach), below "Strategic Foundations".
 * Self-contained so it can be restyled or moved without touching StepViews.tsx.
 */
export const ContentInsightSection: React.FC<{ insight?: ContentInsight }> = ({ insight }) => {
  const ideas = insight?.ideas ?? [];
  const principles = insight?.viralityPrinciples ?? [];

  return (
    <div className="pt-8 mt-8 border-t border-slate-200" data-testid="content-insight">
      <h2 className="text-2xl font-kufam font-bold text-slate-900 mb-1">Content Insight</h2>
      <p className="text-slate-600 mb-6">
        Key contents of virality: how to create content that spreads, based on this brief and media strategy.
      </p>

      {!insight ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
          This strategy was generated before Content Insight was added. Click <b>Regenerate Strategy</b> to create it.
        </div>
      ) : (
        <>
          {/* Overview + principles */}
          <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 shadow-sm p-6 mb-8">
            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <TrendingUp size={20} className="text-indigo-600" /> Key Contents of Virality
            </h3>
            <p className="text-slate-700 leading-relaxed mb-5">{insight.overview}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {principles.map((principle, idx) => (
                <div key={idx} className="flex gap-3 bg-white rounded-xl border border-indigo-100 p-4">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <p className="text-sm text-slate-700">{principle}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Viral content ideas */}
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Sparkles size={20} className="text-indigo-600" /> Viral Content Ideas
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full">{ideas.length}</span>
          </h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {ideas.map((idea, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-start gap-3">
                  <span className="shrink-0 w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-900 leading-tight">{idea.title}</h4>
                    <p className="text-sm text-slate-600 mt-1">{idea.concept}</p>
                  </div>
                </div>

                <div className="p-5 space-y-4 flex-1">
                  <div className="flex gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <Zap size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-slate-800">
                      <span className="font-bold text-emerald-700">Hook: </span>{idea.hook}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Why it can go viral</div>
                    <div className="flex flex-wrap gap-2">
                      {(idea.viralityDrivers ?? []).map((driver, i) => (
                        <span key={i} className="px-2 py-1 bg-sky-50 text-sky-700 border border-sky-100 rounded text-xs font-medium">
                          {driver}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 text-sm text-slate-700">
                    <PlayCircle size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                    <div><span className="font-bold text-slate-900">Format & platforms: </span>{idea.formatAndPlatforms}</div>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">How to make it</div>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-slate-700">
                      {(idea.howToMake ?? []).map((step, i) => <li key={i}>{step}</li>)}
                    </ol>
                  </div>
                </div>

                <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="flex gap-2">
                    <Share2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div><span className="font-bold text-slate-800">Share trigger: </span>{idea.shareTrigger}</div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1"><Users size={14} className="text-indigo-600" /> {idea.targetPersona}</span>
                    {idea.linkedBigIdea && (
                      <span className="flex items-center gap-1"><Lightbulb size={14} className="text-amber-600" /> {idea.linkedBigIdea}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
