
import React, { useState, useEffect, useRef } from 'react';
import { AppStep, MediaBrief, StrategyState, StepResult, PersonaProfile, Moment, BigIdea, MediaStrategyResult } from '../types';
import { generateStepContent, analyzeBrief, generatePersonasWithImages, generateMoments, generateBigIdeas, generateMediaStrategy, generateMarketDashboard } from '../services/geminiService';

import { 
  Send, 
  Sparkles, 
  Loader2, 
  ArrowRight, 
  Save, 
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Edit3,
  Eye,
  Lightbulb,
  Calendar,
  DollarSign,
  Target,
  Briefcase,
  Users,
  Smartphone,
  Heart,
  TrendingUp,
  BrainCircuit,
  Plus,
  MapPin,
  ThumbsUp,
  Fingerprint,
  AlertTriangle,
  FileSpreadsheet,
  File,
  CalendarDays,
  Activity,
  Zap,
  Star,
  Globe2,
  Filter,
  MessageSquare,
  Palette,
  Megaphone,
  Image as ImageIcon,
  PlayCircle,
  Layout,
  Type,
  Layers,
  Search,
  Hash,
  List,
  BarChart,
  ShieldAlert,
  ArrowUpRight,
  PieChart,
  Target as TargetIcon,
  Flag,
  Clock,
  Quote,
  Zap as ZapIcon,
  Anchor,
  Share2,
  Presentation,
  Cpu,
  Database,
  Radio,
  MousePointer2,
  PartyPopper
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { parse } from 'marked';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';

interface StepViewProps {
  step: AppStep;
  state: StrategyState;
  updateBrief: (brief: MediaBrief) => void;
  updateResult: (step: AppStep, result: StepResult) => void;
  nextStep: () => void;
}

const textToBase64 = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};


const BriefForm: React.FC<{ brief: MediaBrief; updateBrief: (b: MediaBrief) => void; onComplete: () => void }> = ({ brief, updateBrief, onComplete }) => {
  const [mode, setMode] = useState<'upload' | 'review'>(brief.summary || brief.brandName || brief.isConfirmed ? 'review' : 'upload');
  const [reviewMode, setReviewMode] = useState<'read' | 'edit'>('read');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Initializing analysis...");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!brief.summary && !brief.brandName && !brief.isConfirmed) {
      setMode('upload');
    }
  }, [brief.summary, brief.brandName, brief.isConfirmed]);

  useEffect(() => {
    if (!isAnalyzing) return;
    
    const messages = [
      "Reading document content...",
      "Extracting strategic objectives...",
      "Identifying target audience insights...",
      "Parsing budget and timeline constraints...",
      "Formatting strategic briefing document..."
    ];
    
    let i = 0;
    setLoadingMessage(messages[0]);
    
    const interval = setInterval(() => {
      i = (i + 1) % messages.length; 
      if (i < messages.length) {
        setLoadingMessage(messages[i]);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const processFile = async (file: File) => {
    setIsAnalyzing(true);
    setUploadError(null);
    
    try {
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          resolve(res.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const mimeType = file.type || 'application/pdf'; 
      const result = await analyzeBrief({ 
        fileBase64: base64String, 
        mimeType: mimeType 
      });
      
      updateBrief({
        ...brief,
        ...result.structured,
        summary: result.summary,
        suggestions: result.suggestions
      });
      setMode('review');
    } catch (err: any) {
      console.error("Error processing file:", err);
      setUploadError(err?.message || "Failed to analyze document. Please check your document and try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleSummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateBrief({ ...brief, summary: e.target.value });
  };
  
  const handleFieldChange = (field: keyof MediaBrief, value: string) => {
    updateBrief({ ...brief, [field]: value });
  };

  const exportToMd = () => {
    const blob = new Blob([brief.summary || ''], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${brief.brandName || 'Project'}_Brief_Summary.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const exportToDoc = async () => {
    const html = await parse(brief.summary || '');
    
    const preHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Brief Strategy</title>
    <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.5; color: #333; }
        h1 { font-size: 24pt; font-weight: bold; color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 24px; }
        h2 { font-size: 16pt; font-weight: bold; color: #1e40af; margin-top: 24px; margin-bottom: 12px; background-color: #f1f5f9; padding: 5px 10px; }
        h3 { font-size: 14pt; font-weight: bold; color: #475569; margin-top: 18px; margin-bottom: 8px; }
        p { margin-bottom: 12px; font-size: 11pt; }
        ul { margin-bottom: 12px; }
        li { margin-bottom: 6px; }
        strong { color: #0f172a; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; border: 1px solid #cbd5e1; }
        th { background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-weight: bold; color: #1e3a8a; }
        td { border: 1px solid #cbd5e1; padding: 8px; }
    </style>
    </head><body>`;
    
    const postHtml = "</body></html>";
    const htmlContent = preHtml + html + postHtml;

    const blob = new Blob(['\ufeff', htmlContent], {
        type: 'application/msword'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${brief.brandName || 'Project'}_Brief_Summary.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleReUpload = () => {
    setMode('upload');
  };

  const handleConfirm = () => {
    updateBrief({ ...brief, isConfirmed: true });
    onComplete();
  };

  if (mode === 'upload') {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col justify-center">
        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center space-y-8 p-12 bg-white rounded-2xl shadow-xl border border-blue-100 max-w-lg mx-auto w-full">
            <div className="relative">
              <div className="w-24 h-24 border-[6px] border-blue-50 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles size={32} className="text-blue-600 animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-3">
              <h3 className="text-2xl font-bold text-slate-900 animate-pulse">Processing Brief</h3>
              <p className="text-blue-600 font-medium text-sm transition-all duration-500">
                {loadingMessage}
              </p>
              <div className="pt-4 flex items-center justify-center gap-2 text-amber-600 text-xs font-medium bg-amber-50 py-2 px-4 rounded-full">
                <AlertCircle size={14} />
                Please do not close this window
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3 text-center mb-4">
              <h2 className="text-4xl font-kufam font-bold text-slate-900">Brief Ingestion</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">Upload your media brief or campaign documents to initialize the AI strategy engine.</p>
            </div>

            <div className="w-full max-w-2xl mx-auto">
              {uploadError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-sm animate-in fade-in">
                  <AlertCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Unable to process document</p>
                    <p className="text-red-700 text-xs mt-0.5">{uploadError}</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setUploadError(null)}
                    className="text-red-500 hover:text-red-700 text-xs font-bold px-1"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* File Upload Area with Drag & Drop */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 group
                  ${isDragging 
                    ? 'border-blue-600 bg-blue-50 scale-[1.02] shadow-xl' 
                    : 'border-slate-300 bg-white hover:border-blue-500 hover:bg-blue-50/30 hover:shadow-xl hover:-translate-y-1'
                  }
                `}
              >
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all duration-300 shadow-sm
                   ${isDragging ? 'bg-blue-600 text-white scale-110' : 'bg-blue-50 text-blue-600 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white'}
                `}>
                  <Upload size={36} />
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-slate-900">
                    {isDragging ? 'Drop file to analyze' : 'Upload Brief Document'}
                  </h3>
                  <p className="text-slate-500 max-w-sm mx-auto">Drag & drop or click to browse.<br/>Supports PDF, DOCX, TXT.</p>
                  <div className="pt-6">
                    <span className="inline-block px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold tracking-wide shadow-md group-hover:bg-blue-700 transition-colors">
                      Select File
                    </span>
                  </div>
                </div>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".pdf,.txt,.md" 
                  className="hidden" 
                />
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Review Mode
  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-start mb-6">
        <div>
           <h2 className="text-3xl font-kufam font-bold text-slate-900 flex items-center gap-3">
             Brief Interpretation
             {brief.isConfirmed && <CheckCircle2 className="text-emerald-500" size={24} />}
           </h2>
           <p className="text-slate-600 mt-1">Review the AI's structured summary and key constraints. Confirm accuracy before generating strategy.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleReUpload}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-sm font-medium border border-slate-200 shadow-sm transition-all hover:shadow-md"
          >
            <Upload size={16} />
            Re-upload
          </button>
          
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5"
          >
            Confirm & Proceed
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          
          {/* Key Parameters Dashboard - New Suggestion Implementation */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <Briefcase size={14} />
                <span className="text-xs font-bold uppercase">Brand Name</span>
              </div>
              <input 
                value={brief.brandName} 
                onChange={(e) => handleFieldChange('brandName', e.target.value)}
                className="w-full font-bold text-slate-900 outline-none border-b border-transparent focus:border-blue-500 bg-transparent transition-colors text-sm"
                placeholder="Enter Brand..."
              />
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <DollarSign size={14} />
                <span className="text-xs font-bold uppercase">Budget</span>
              </div>
              <input 
                value={brief.budget} 
                onChange={(e) => handleFieldChange('budget', e.target.value)}
                className="w-full font-bold text-slate-900 outline-none border-b border-transparent focus:border-blue-500 bg-transparent transition-colors text-sm"
                placeholder="Enter Budget..."
              />
            </div>
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <Calendar size={14} />
                <span className="text-xs font-bold uppercase">Timeline</span>
              </div>
              <input 
                value={brief.timeline} 
                onChange={(e) => handleFieldChange('timeline', e.target.value)}
                className="w-full font-bold text-slate-900 outline-none border-b border-transparent focus:border-blue-500 bg-transparent transition-colors text-sm"
                placeholder="Enter Timeline..."
              />
            </div>
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <Target size={14} />
                <span className="text-xs font-bold uppercase">Primary Audience</span>
              </div>
              <input 
                value={brief.targetAudience} 
                onChange={(e) => handleFieldChange('targetAudience', e.target.value)}
                className="w-full font-bold text-slate-900 outline-none border-b border-transparent focus:border-blue-500 bg-transparent transition-colors text-sm truncate"
                placeholder="Target Audience..."
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <FileText size={14} /> Strategic Briefing Document
              </span>
              <div className="flex bg-slate-200 rounded-lg p-1">
                <button 
                  onClick={() => setReviewMode('read')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${reviewMode === 'read' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Read
                </button>
                <button 
                  onClick={() => setReviewMode('edit')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${reviewMode === 'edit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Edit
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {reviewMode === 'read' ? (
                <div className="p-10 custom-markdown prose prose-slate max-w-none">
                   <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-slate-900 mb-6 pb-4 border-b-2 border-slate-100" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-lg font-bold text-blue-800 uppercase tracking-wide mb-4 mt-8 pt-4 border-t border-slate-50" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-base font-bold text-slate-700 mb-2 mt-4" {...props} />,
                        p: ({node, ...props}) => <p className="text-slate-600 leading-relaxed mb-4 text-sm" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-2 mb-6 text-slate-700 text-sm marker:text-blue-500" {...props} />,
                        li: ({node, ...props}) => <li className="pl-1" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold text-slate-900" {...props} />,
                      }}
                    >
                      {brief.summary || ''}
                    </ReactMarkdown>
                </div>
              ) : (
                <textarea
                  value={brief.summary}
                  onChange={handleSummaryChange}
                  className="w-full h-full p-8 text-slate-700 font-mono text-sm leading-relaxed resize-none focus:outline-none bg-slate-50"
                />
              )}
            </div>
          </div>
        </div>

        {/* Sidebar for Suggestions */}
        <div className="w-80 flex flex-col gap-4">
           {/* Suggestions Card */}
           <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-amber-700">
                <Lightbulb size={20} className="fill-amber-100" />
                <h3 className="font-bold text-sm">Strategic Suggestions</h3>
              </div>
              <div className="space-y-3">
                {brief.suggestions && brief.suggestions.length > 0 ? (
                  brief.suggestions.map((sugg, idx) => (
                    <div key={idx} className="flex gap-3 items-start p-3 bg-white rounded-lg border border-amber-100 shadow-sm">
                      <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">{idx + 1}</div>
                      <p className="text-xs text-slate-700 leading-relaxed">{sugg}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">No specific suggestions found. Brief appears comprehensive.</p>
                )}
              </div>
           </div>

           {/* Export Action Card */}
           <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mt-auto">
             <h3 className="font-bold text-slate-900 text-sm mb-2">Export Data</h3>
             <p className="text-xs text-slate-500 mb-4">Download the structured data for use in other tools.</p>
             <div className="flex gap-2">
                 <button onClick={exportToMd} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all">
                    <Download size={14} /> .md
                 </button>
                 <button onClick={exportToDoc} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all">
                    <FileText size={14} /> .doc
                 </button>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

// ... [MarketIntelligenceView, AudiencePersonaView, MomentActivationView, BigIdeaView remain unchanged] ...
const MarketIntelligenceView: React.FC<StepViewProps> = ({ step, state, updateResult, nextStep }) => {
  // ... [Existing MarketIntelligenceView implementation] ...
    const [view, setView] = useState<'report' | 'dashboard'>('report');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVisualizing, setIsVisualizing] = useState(false);
  
  const result = state.results[step];
  const dashboardData = result?.structuredData;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const text = await generateStepContent(step, state.brief, state.results);
      updateResult(step, { rawText: text, timestamp: Date.now() });
    } catch (e) { console.error(e); } finally { setIsGenerating(false); }
  };

  const handleVisualize = async () => {
    if (!result?.rawText) return;
    setIsVisualizing(true);
    try {
      const data = await generateMarketDashboard(result.rawText);
      updateResult(step, { ...result, structuredData: data });
      setView('dashboard');
    } catch (e) { console.error(e); } finally { setIsVisualizing(false); }
  };

  const exportToMd = () => {
    if (!result) return;
    const blob = new Blob([result.rawText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.brief.brandName}_Market_Intelligence.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const exportToDoc = async () => {
    if (!result) return;
    const html = await parse(result.rawText);
    const preHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Market Intelligence</title>
    <style>body{font-family:'Arial',sans-serif;line-height:1.5}</style></head><body>`;
    const postHtml = "</body></html>";
    const blob = new Blob(['\ufeff', preHtml + html + postHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.brief.brandName}_Market_Intelligence.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      <div className="mb-6 flex justify-between items-end border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-kufam font-bold text-slate-900 mb-2">Market Intelligence</h2>
          <p className="text-slate-600">Deep-dive category analysis and competitive landscape.</p>
        </div>
        <div className="flex gap-3">
          {result && (
            <button 
              onClick={() => setView(view === 'report' ? 'dashboard' : 'report')}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
            >
              {view === 'report' ? <Layout size={16} /> : <FileText size={16} />}
              {view === 'report' ? 'View Dashboard' : 'View Report'}
            </button>
          )}
          {result && !dashboardData && view === 'report' && (
             <button 
               onClick={handleVisualize} 
               disabled={isVisualizing}
               className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-sm font-bold hover:bg-indigo-100 shadow-sm disabled:opacity-50 transition-all"
             >
               {isVisualizing ? <Loader2 size={16} className="animate-spin" /> : <Activity size={16} />}
               Visualize Dashboard
             </button>
          )}
          {result && !isGenerating && (
             <div className="flex rounded-lg shadow-sm border border-slate-200 overflow-hidden mr-2">
                <button 
                  onClick={exportToMd}
                  className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 text-sm font-medium border-r border-slate-200 transition-all hover:text-blue-600"
                >
                  <Download size={16} />
                  .md
                </button>
                <button 
                  onClick={exportToDoc}
                  className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-blue-600 text-sm font-medium transition-all hover:bg-blue-50"
                >
                  <FileText size={16} />
                  .doc
                </button>
             </div>
          )}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            {result ? 'Refresh Intelligence' : 'Generate Analysis'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {isGenerating || isVisualizing ? (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-xl">
            <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            <p className="text-lg font-bold text-slate-700 animate-pulse">{isVisualizing ? "Building Executive Dashboard..." : "Scanning Market Data..."}</p>
          </div>
        ) : !result ? (
          <div className="h-full flex flex-col items-center justify-center p-8 bg-white border border-dashed rounded-2xl border-slate-300">
             <Globe2 size={64} className="text-slate-200 mb-4" />
             <h3 className="text-xl font-bold text-slate-900">Unlock Market Insights</h3>
             <p className="text-slate-500 max-w-sm text-center mt-2">Use Gemini 3.0 to perform real-time research on your category and competitors.</p>
             <button onClick={handleGenerate} className="mt-6 px-6 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg">Start Analysis</button>
          </div>
        ) : view === 'report' ? (
          <div className="h-full overflow-y-auto bg-white border border-slate-200 rounded-2xl p-10 prose prose-slate max-w-none shadow-sm custom-markdown">
             {/* Use ReactMarkdown with safe parsing */}
            <ReactMarkdown 
               remarkPlugins={[remarkGfm]}
               components={{
                h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-slate-900 mb-6 pb-4 border-b-2 border-slate-100" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-xl font-bold text-indigo-700 mt-8 mb-4 border-l-4 border-indigo-500 pl-3" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-lg font-bold text-slate-800 mt-6 mb-2" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-2 mb-4 marker:text-indigo-500" {...props} />,
                li: ({node, ...props}) => <li className="pl-1 text-slate-700" {...props} />,
                strong: ({node, ...props}) => <strong className="font-bold text-slate-900" {...props} />,
                table: ({node, ...props}) => <div className="overflow-x-auto my-6 border border-slate-200 rounded-lg"><table className="min-w-full divide-y divide-slate-200" {...props} /></div>,
                th: ({node, ...props}) => <th className="px-6 py-3 bg-slate-50 text-left text-xs font-bold text-slate-500 uppercase tracking-wider" {...props} />,
                td: ({node, ...props}) => <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 border-t border-slate-100" {...props} />,
               }}
            >
              {result.rawText}
            </ReactMarkdown>
          </div>
        ) : dashboardData ? (
          <div className="h-full overflow-y-auto space-y-6 pb-10">
            {/* Top Row: Key Insights Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Sentiment Gauge */}
               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5"><Activity size={100} /></div>
                  <div className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest">Market Sentiment</div>
                  <div className="relative w-32 h-32 flex items-center justify-center mb-2">
                     <svg className="w-full h-full transform -rotate-90">
                       <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                       <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={364.4} strokeDashoffset={364.4 - (364.4 * (dashboardData.sentiment || 0)) / 100} className={`transition-all duration-1000 ${dashboardData.sentiment > 50 ? 'text-emerald-500' : 'text-amber-500'}`} />
                     </svg>
                     <span className="absolute text-3xl font-black text-slate-900">{dashboardData.sentiment}%</span>
                  </div>
                  <p className="text-xs font-medium text-slate-500">Consumer Confidence Score</p>
               </div>
               
               {/* 2. Strategic Takeaways */}
               <div className="col-span-2 bg-gradient-to-br from-indigo-900 to-blue-800 p-6 rounded-2xl border border-indigo-700 shadow-sm text-white flex flex-col justify-center relative overflow-hidden">
                   <div className="absolute top-0 right-0 opacity-10"><BrainCircuit size={150} /></div>
                   <div className="flex items-center gap-2 mb-4 relative z-10">
                      <Sparkles className="text-amber-300" size={20} />
                      <h3 className="font-bold uppercase tracking-widest text-xs text-indigo-200">Executive Strategic Insights</h3>
                   </div>
                   <div className="space-y-4 relative z-10">
                      {dashboardData.keyInsights?.map((insight: string, idx: number) => (
                        <div key={idx} className="flex gap-3 items-start">
                           <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold shrink-0">{idx+1}</span>
                           <p className="text-sm font-medium leading-relaxed opacity-95">{insight}</p>
                        </div>
                      )) || <p className="text-white/50 italic">No key insights extracted.</p>}
                   </div>
               </div>
            </div>

            {/* Second Row: Audience & Geo (New) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                   <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4"><Users size={14} /> Key Audience Micro-Segments</div>
                   <div className="flex flex-wrap gap-2">
                      {dashboardData.audienceSegments?.map((seg: string, idx: number) => (
                         <span key={idx} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100">{seg}</span>
                      )) || <p className="text-slate-400 text-xs italic">No specific segments identified.</p>}
                   </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                   <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4"><MapPin size={14} /> Geographic Focus Areas</div>
                   <ul className="space-y-2">
                      {dashboardData.geoFocus?.map((geo: string, idx: number) => (
                         <li key={idx} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> {geo}
                         </li>
                      )) || <p className="text-slate-400 text-xs italic">No specific regions identified.</p>}
                   </ul>
                </div>
            </div>

            {/* Third Row: Trends & Growth */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                     <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Zap size={14} /> Strategic Trends</div>
                     <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg">{dashboardData.growth} Growth</span>
                  </div>
                  <div className="space-y-4">
                     {dashboardData.trends?.map((t: any, idx: number) => (
                        <div key={idx} className="flex gap-3 items-start group">
                           <div className="w-8 h-8 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-bold text-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">{idx+1}</div>
                           <div>
                             <p className="text-sm font-bold text-slate-800">{t.title}</p>
                             <p className="text-xs text-slate-500 leading-tight mt-1">{t.description}</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                   <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4"><Megaphone size={14} /> Recommended Channel Mix</div>
                   <div className="flex-1 flex flex-col justify-center space-y-4">
                      {dashboardData.channelMix?.map((channel: string, idx: number) => (
                         <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="font-bold text-slate-700">{channel}</span>
                            <ArrowUpRight size={16} className="text-slate-400" />
                         </div>
                      ))}
                      {(!dashboardData.channelMix || dashboardData.channelMix.length === 0) && <p className="text-slate-400 text-sm italic">No specific channels extracted.</p>}
                   </div>
               </div>
            </div>

            {/* Bottom Row: Benchmarking & SWOT */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><BarChart size={16} className="text-slate-400" /> Competitive Benchmark Matrix</h3>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                     <thead className="bg-slate-50/50 text-slate-500 font-bold uppercase tracking-wider">
                        <tr>
                           <th className="px-6 py-4">Competitor</th>
                           <th className="px-6 py-4">Est. Share</th>
                           <th className="px-6 py-4">Media Spend</th>
                           <th className="px-6 py-4">Digital Maturity</th>
                           <th className="px-6 py-4">Sentiment</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {dashboardData.benchmarking?.map((comp: any, idx: number) => (
                           <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 font-bold text-slate-900">{comp.name}</td>
                              <td className="px-6 py-4 text-slate-600">{comp.marketShare}</td>
                              <td className="px-6 py-4 text-slate-600">{comp.mediaSpend}</td>
                              <td className="px-6 py-4">
                                 <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${comp.digitalMaturity.includes('High') ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                    {comp.digitalMaturity}
                                 </span>
                              </td>
                              <td className="px-6 py-4 text-slate-600">{comp.sentiment}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>

            <h3 className="font-bold text-slate-800 text-sm px-1">Strategic SWOT Analysis</h3>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-4">
                  <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 h-full">
                     <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-4">
                        <Star size={16} /> Strengths
                     </div>
                     <ul className="space-y-2">
                        {dashboardData.swot?.strengths?.map((s: string, idx: number) => (
                           <li key={idx} className="text-xs text-emerald-900 flex gap-2 items-start">
                              <span className="text-emerald-400 mt-0.5">•</span> {s}
                           </li>
                        ))}
                     </ul>
                  </div>
                  <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 h-full">
                     <div className="flex items-center gap-2 text-blue-700 font-bold text-sm mb-4">
                        <TrendingUp size={16} /> Opportunities
                     </div>
                     <ul className="space-y-2">
                        {dashboardData.swot?.opportunities?.map((s: string, idx: number) => (
                           <li key={idx} className="text-xs text-blue-900 flex gap-2 items-start">
                              <span className="text-blue-400 mt-0.5">•</span> {s}
                           </li>
                        ))}
                     </ul>
                  </div>
               </div>
               <div className="space-y-4">
                  <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 h-full">
                     <div className="flex items-center gap-2 text-amber-700 font-bold text-sm mb-4">
                        <ShieldAlert size={16} /> Weaknesses
                     </div>
                     <ul className="space-y-2">
                        {dashboardData.swot?.weaknesses?.map((s: string, idx: number) => (
                           <li key={idx} className="text-xs text-amber-900 flex gap-2 items-start">
                              <span className="text-amber-400 mt-0.5">•</span> {s}
                           </li>
                        ))}
                     </ul>
                  </div>
                  <div className="bg-red-50 p-6 rounded-2xl border border-red-100 h-full">
                     <div className="flex items-center gap-2 text-red-700 font-bold text-sm mb-4">
                        <Zap size={16} /> Threats
                     </div>
                     <ul className="space-y-2">
                        {dashboardData.swot?.threats?.map((s: string, idx: number) => (
                           <li key={idx} className="text-xs text-red-900 flex gap-2 items-start">
                              <span className="text-red-400 mt-0.5">•</span> {s}
                           </li>
                        ))}
                     </ul>
                  </div>
               </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-white border border-slate-200 rounded-2xl">
             <Activity size={48} className="text-slate-300 mb-4 animate-pulse" />
             <p className="text-slate-500">Visualization data not yet extracted.</p>
             <button onClick={handleVisualize} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold">Generate Dashboard</button>
          </div>
        )}
      </div>

      {result && !isGenerating && (
        <div className="mt-6 flex justify-end">
          <button onClick={nextStep} className="flex items-center gap-2 px-8 py-3.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:shadow-blue-500/30 transition-all">Approve & Next Step <ArrowRight size={20} /></button>
        </div>
      )}
    </div>
  );
};
const AudiencePersonaView: React.FC<StepViewProps> = ({ step, state, updateResult, nextStep }) => {
    // ... [Existing AudiencePersonaView implementation] ...
    const [isGenerating, setIsGenerating] = useState(false);
  const result = state.results[step];
  const personas = result?.structuredData as PersonaProfile[] || [];

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const marketIntel = state.results[AppStep.MarketIntelligence]?.rawText || "";
      const response = await generatePersonasWithImages(state.brief, marketIntel);
      updateResult(step, {
        rawText: response.text,
        structuredData: response.personas,
        timestamp: Date.now()
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPPT = () => {
    if (personas.length === 0) return;
    
    const pres = new PptxGenJS();
    
    // Title Slide
    let slide = pres.addSlide();
    slide.addText('Audience Personas', { x: 1, y: 1, w: 8, h: 1, fontSize: 36, bold: true, color: '363636' });
    slide.addText(`Brand: ${state.brief.brandName}`, { x: 1, y: 2, w: 8, h: 0.5, fontSize: 18, color: '737373' });

    // Persona Slides
    personas.forEach(p => {
        let pSlide = pres.addSlide();
        pSlide.addText(p.name, { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: '363636' });
        pSlide.addText(`${p.role} | ${p.age}`, { x: 0.5, y: 1.0, fontSize: 14, color: '666666' });
        
        // Quote
        pSlide.addText(`"${p.quote}"`, { x: 0.5, y: 1.5, w: 9, h: 0.5, fontSize: 16, italic: true, color: '4A5568' });

        // Details
        pSlide.addText('Psychographics:', { x: 4, y: 2.2, fontSize: 12, bold: true });
        pSlide.addText(p.psychographics?.join('\n') || '', { x: 4, y: 2.5, w: 5.5, fontSize: 10, bullet: true });

        pSlide.addText('Digital Journey:', { x: 4, y: 4.0, fontSize: 12, bold: true });
        pSlide.addText(p.digitalJourney?.join('\n') || '', { x: 4, y: 4.3, w: 5.5, fontSize: 10, bullet: true });
    });

    pres.writeFile({ fileName: `${state.brief.brandName}_Audience_Personas.pptx` });
  };

  const handleExportDoc = async () => {
    if (!result?.rawText) return;
    const html = await parse(result.rawText);
    const preHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Personas</title><style>body{font-family:Arial;}</style></head><body>`;
    const postHtml = "</body></html>";
    const blob = new Blob(['\ufeff', preHtml + html + postHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.brief.brandName}_Personas.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-6 flex justify-between items-end border-b border-slate-200 pb-6">
            <div>
                <h2 className="text-3xl font-kufam font-bold text-slate-900 mb-2">Audience Personas</h2>
                <p className="text-slate-600">AI-generated target audience profiles with visual representations.</p>
            </div>
            <div className="flex gap-2">
                {result && !isGenerating && (
                    <>
                        <button onClick={handleExportPPT} className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 text-orange-600 rounded-lg font-bold hover:bg-orange-100 transition-all border border-orange-200">
                            <Presentation size={18} /> Export Slides
                        </button>
                        <button onClick={handleExportDoc} className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-lg font-bold hover:bg-blue-100 transition-all border border-blue-200">
                            <FileText size={18} /> Export Doc
                        </button>
                    </>
                )}
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50"
                >
                    {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Users size={18} />}
                    {result ? 'Regenerate Personas' : 'Generate Personas'}
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto">
            {isGenerating ? (
                <div className="h-full flex flex-col items-center justify-center">
                    <Loader2 size={48} className="text-indigo-600 animate-spin mb-4" />
                    <p className="text-slate-600 font-medium">Analyzing audience data & generating profiles...</p>
                </div>
            ) : !result ? (
                 <div className="h-full flex flex-col items-center justify-center p-8 bg-white rounded-xl border border-slate-200 border-dashed">
                    <Users size={64} className="text-slate-300 mb-4" />
                    <p className="text-slate-500">Generate detailed personas based on market intelligence.</p>
                    <button onClick={handleGenerate} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold">Generate</button>
                 </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
                    {personas.map((persona, idx) => (
                        <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                            <div className="h-48 bg-slate-100 relative">
                                {persona.imageUrl ? (
                                    <img src={persona.imageUrl} alt={persona.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-200">
                                        <Users size={48} />
                                    </div>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                                    <h3 className="text-white font-bold text-xl">{persona.name}</h3>
                                    <p className="text-white/90 text-sm">{persona.role}, {persona.age}</p>
                                </div>
                            </div>
                            <div className="p-6 flex-1 flex flex-col gap-4">
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                          <MessageSquare size={10} /> Core Motivation
                                        </span>
                                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-tight">{persona.microSegmentation}</span>
                                    </div>
                                    <div className="relative pl-4">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 to-blue-300 rounded-full"></div>
                                        <p className="text-slate-700 italic text-sm leading-relaxed font-medium">
                                          "{persona.quote.replace(/^"|"$/g, '')}"
                                        </p>
                                    </div>
                                </div>
                                
                                <div>
                                    <h4 className="font-bold text-xs uppercase text-slate-400 mb-2">Psychographics</h4>
                                    <ul className="list-disc pl-4 space-y-1">
                                        {persona.psychographics?.slice(0,3).map((p, i) => (
                                            <li key={i} className="text-sm text-slate-700">{p}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-bold text-xs uppercase text-slate-400 mb-2 flex items-center gap-2"><Smartphone size={12}/> Digital & Offline Journey</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                       <div className="bg-slate-50 p-2 rounded text-xs text-slate-600">
                                          <span className="font-bold text-indigo-600 block mb-1">Digital:</span> 
                                          <div className="leading-tight">{persona.digitalJourney?.slice(0,2).join(', ')}...</div>
                                       </div>
                                       <div className="bg-slate-50 p-2 rounded text-xs text-slate-600">
                                          <span className="font-bold text-indigo-600 block mb-1">Offline:</span> 
                                          <div className="leading-tight">{persona.offlineJourney?.slice(0,2).join(', ')}...</div>
                                       </div>
                                    </div>
                                 </div>

                                 <div className="grid grid-cols-2 gap-4">
                                    <div>
                                       <h4 className="font-bold text-xs uppercase text-slate-400 mb-1">Choice Drivers</h4>
                                       <ul className="list-disc pl-3 space-y-1">
                                          {persona.drivers?.slice(0,2).map((d, i) => <li key={i} className="text-[10px] text-slate-700">{d}</li>)}
                                       </ul>
                                    </div>
                                    <div>
                                       <h4 className="font-bold text-xs uppercase text-slate-400 mb-1">Brand Affinity</h4>
                                       <div className="flex flex-wrap gap-1">
                                          {persona.brandAffinity?.slice(0,3).map((b, i) => <span key={i} className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">{b}</span>)}
                                       </div>
                                    </div>
                                 </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
        
        {result && !isGenerating && (
            <div className="mt-6 flex justify-end">
                <button onClick={nextStep} className="flex items-center gap-2 px-8 py-3.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:shadow-blue-500/30 transition-all">Approve & Next Step <ArrowRight size={20} /></button>
            </div>
        )}
    </div>
  );
};
const MomentActivationView: React.FC<StepViewProps> = ({ step, state, updateResult, nextStep }) => {
    // ... [Existing MomentActivationView implementation] ...
    const [isGenerating, setIsGenerating] = useState(false);
  const result = state.results[step];
  const moments = result?.structuredData as Moment[] || [];

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
        const marketIntel = state.results[AppStep.MarketIntelligence]?.rawText || "";
        const personaSummary = state.results[AppStep.AudiencePersona]?.rawText || "";
        const response = await generateMoments(state.brief, marketIntel, personaSummary);
        updateResult(step, {
            rawText: response.text,
            structuredData: response.moments,
            timestamp: Date.now()
        });
    } catch (e) {
        console.error(e);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleExportDoc = async () => {
    if (!result?.rawText) return;
    const html = await parse(result.rawText);
    const preHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Moment Activation</title><style>body{font-family:Arial;}</style></head><body>`;
    const postHtml = "</body></html>";
    const blob = new Blob(['\ufeff', preHtml + html + postHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.brief.brandName}_Moments.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-6 flex justify-between items-end border-b border-slate-200 pb-6">
            <div>
                <h2 className="text-3xl font-kufam font-bold text-slate-900 mb-2">Moment Activation</h2>
                <p className="text-slate-600">Identify key cultural and market moments to leverage.</p>
            </div>
            <div className="flex gap-2">
                {result && !isGenerating && (
                    <button onClick={handleExportDoc} className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-lg font-bold hover:bg-blue-100 transition-all border border-blue-200">
                        <FileText size={18} /> Export Doc
                    </button>
                )}
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50"
                >
                    {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <CalendarDays size={18} />}
                    {result ? 'Refresh Moments' : 'Generate Calendar'}
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-10">
            {isGenerating ? (
                <div className="h-full flex flex-col items-center justify-center">
                    <Loader2 size={48} className="text-indigo-600 animate-spin mb-4" />
                    <p className="text-slate-600 font-medium">Scanning cultural calendar & identifying opportunities...</p>
                </div>
            ) : !result ? (
                 <div className="h-full flex flex-col items-center justify-center p-8 bg-white rounded-xl border border-slate-200 border-dashed">
                    <CalendarDays size={64} className="text-slate-300 mb-4" />
                    <p className="text-slate-500">Create a strategic timeline of activation moments.</p>
                    <button onClick={handleGenerate} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold">Generate</button>
                 </div>
            ) : (
                <div className="space-y-6">
                    {moments.map((moment, idx) => (
                        <div key={idx} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex gap-6 hover:shadow-md transition-shadow">
                            <div className="w-24 shrink-0 flex flex-col items-center justify-center bg-indigo-50 rounded-xl border border-indigo-100 p-2 text-center">
                                <span className="text-xs font-bold text-indigo-400 uppercase">{moment.month}</span>
                                <span className="text-2xl font-black text-indigo-700">{moment.date}</span>
                                <div className="mt-2 w-full h-1 bg-indigo-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-600" style={{width: `${moment.relevanceScore}%`}}></div>
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-xl font-bold text-slate-800">{moment.title}</h3>
                                    <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">{moment.type}</span>
                                </div>
                                <p className="text-slate-600 text-sm mb-4 leading-relaxed">{moment.description}</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Activation Idea</span>
                                        <p className="text-sm font-semibold text-indigo-700">{moment.activationIdea}</p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Content Focus</span>
                                        <p className="text-sm font-medium text-slate-700">{moment.contentFocus}</p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Branding Angle</span>
                                        <p className="text-sm font-medium text-slate-700">{moment.brandingIdea}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {result && !isGenerating && (
            <div className="mt-6 flex justify-end">
                <button onClick={nextStep} className="flex items-center gap-2 px-8 py-3.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:shadow-blue-500/30 transition-all">Approve & Next Step <ArrowRight size={20} /></button>
            </div>
        )}
    </div>
  );
};
const BigIdeaView: React.FC<StepViewProps> = ({ step, state, updateResult, nextStep }) => {
    // ... [Existing BigIdeaView implementation] ...
    const [isGenerating, setIsGenerating] = useState(false);
  const result = state.results[step];
  const ideas = result?.structuredData as BigIdea[] || [];

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
        const marketIntel = state.results[AppStep.MarketIntelligence]?.rawText || "";
        const personas = state.results[AppStep.AudiencePersona]?.structuredData as PersonaProfile[] || [];
        const moments = state.results[AppStep.MomentActivation]?.structuredData as Moment[] || [];
        const response = await generateBigIdeas(state.brief, marketIntel, personas, moments);
        updateResult(step, {
            rawText: response.text,
            structuredData: response.ideas,
            timestamp: Date.now()
        });
    } catch (e) {
        console.error(e);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleExportPPT = () => {
    if (ideas.length === 0) return;
    const pres = new PptxGenJS();
    
    // Title
    let slide = pres.addSlide();
    slide.addText('Big Ideas', { x: 1, y: 1, w: 8, h: 1, fontSize: 36, bold: true, color: '363636' });
    slide.addText(`Brand: ${state.brief.brandName}`, { x: 1, y: 2, w: 8, h: 0.5, fontSize: 18, color: '737373' });

    ideas.forEach((idea, index) => {
        let iSlide = pres.addSlide();
        iSlide.addText(`Concept ${index + 1}: ${idea.title}`, { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: '363636' });
        iSlide.addText(idea.tagline, { x: 0.5, y: 1.0, fontSize: 18, italic: true, color: '4f46e5' });
        
        iSlide.addText('The Hook', { x: 0.5, y: 1.5, fontSize: 14, bold: true });
        iSlide.addText(idea.hook, { x: 0.5, y: 1.8, w: 9, fontSize: 12 });

        iSlide.addText('Strategic Rationale', { x: 0.5, y: 2.5, fontSize: 14, bold: true });
        iSlide.addText(idea.rationale, { x: 0.5, y: 2.8, w: 9, fontSize: 12 });

        iSlide.addText('Funnel Strategy', { x: 0.5, y: 3.5, fontSize: 14, bold: true });
        let yPos = 3.8;
        idea.funnelStrategy.forEach(fs => {
            iSlide.addText(`${fs.role}: ${fs.strategy}`, { x: 0.5, y: yPos, w: 9, fontSize: 10 });
            yPos += 0.3;
        });
    });

    pres.writeFile({ fileName: `${state.brief.brandName}_BigIdeas.pptx` });
  };

  const handleExportDoc = async () => {
    if (!result?.rawText) return;
    const html = await parse(result.rawText);
    const preHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Big Ideas</title><style>body{font-family:Arial;}</style></head><body>`;
    const postHtml = "</body></html>";
    const blob = new Blob(['\ufeff', preHtml + html + postHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.brief.brandName}_BigIdeas.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-6 flex justify-between items-end border-b border-slate-200 pb-6">
            <div>
                <h2 className="text-3xl font-kufam font-bold text-slate-900 mb-2">Big Idea Generation</h2>
                <p className="text-slate-600">Disruptive creative platforms to drive the campaign.</p>
            </div>
            <div className="flex gap-2">
                {result && !isGenerating && (
                    <>
                        <button onClick={handleExportPPT} className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 text-orange-600 rounded-lg font-bold hover:bg-orange-100 transition-all border border-orange-200">
                            <Presentation size={18} /> Export Slides
                        </button>
                        <button onClick={handleExportDoc} className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-lg font-bold hover:bg-blue-100 transition-all border border-blue-200">
                            <FileText size={18} /> Export Doc
                        </button>
                    </>
                )}
                <button onClick={handleGenerate} disabled={isGenerating} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50">
                    {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Lightbulb size={18} />}
                    {result ? 'Regenerate Ideas' : 'Generate Concepts'}
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-10">
            {isGenerating ? (
                <div className="h-full flex flex-col items-center justify-center">
                    <Loader2 size={48} className="text-indigo-600 animate-spin mb-4" />
                    <p className="text-slate-600 font-medium">Brainstorming creative territories...</p>
                </div>
            ) : !result ? (
                 <div className="h-full flex flex-col items-center justify-center p-8 bg-white rounded-xl border border-slate-200 border-dashed">
                    <Lightbulb size={64} className="text-slate-300 mb-4" />
                    <p className="text-slate-500">Develop core creative concepts for the campaign.</p>
                    <button onClick={handleGenerate} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold">Generate</button>
                 </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {ideas.map((idea, idx) => (
                        <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:border-indigo-300 transition-colors">
                            <div className="p-6 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                                <h3 className="text-2xl font-black text-slate-800 mb-2">{idea.title}</h3>
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-600 text-white rounded-full text-xs font-bold shadow-sm">
                                   <Sparkles size={12} /> {idea.tagline}
                                </div>
                            </div>
                            <div className="p-6 flex-1 space-y-6">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">The Hook</h4>
                                    <p className="text-lg font-medium text-slate-800 italic">"{idea.hook}"</p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Acronym Strategy</h4>
                                      <div className="text-xl font-black text-indigo-600">{idea.acronym?.word}</div>
                                      <div className="text-xs text-slate-600">{idea.acronym?.meaning}</div>
                                   </div>
                                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cultural Fit</h4>
                                      <p className="text-xs text-slate-600 leading-relaxed">{idea.culturalFit}</p>
                                   </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Funnel Strategy & Touchpoints</h4>
                                    <div className="space-y-4">
                                        {idea.funnelStrategy?.map((stage, i) => (
                                            <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                <div className="flex items-center gap-2 mb-2">
                                                     <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${
                                                        stage.role === 'Awareness' ? 'bg-blue-100 text-blue-700' :
                                                        stage.role === 'Consideration' ? 'bg-purple-100 text-purple-700' :
                                                        stage.role === 'Trial' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-emerald-100 text-emerald-700'
                                                    }`}>
                                                        {stage.role}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-700 mb-2 font-medium leading-relaxed">{stage.strategy}</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {stage.touchpoints?.map((tp, tIdx) => (
                                                        <span key={tIdx} className="text-[9px] bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded shadow-sm">
                                                            {tp}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {result && !isGenerating && (
            <div className="mt-6 flex justify-end">
                <button onClick={nextStep} className="flex items-center gap-2 px-8 py-3.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:shadow-blue-500/30 transition-all">Approve & Next Step <ArrowRight size={20} /></button>
            </div>
        )}
    </div>
  );
};

const MediaStrategyView: React.FC<StepViewProps> = ({ step, state, updateResult, nextStep }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const result = state.results[step];
  const strategy = result?.structuredData as MediaStrategyResult;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
        const marketIntel = state.results[AppStep.MarketIntelligence]?.rawText || "";
        const personas = state.results[AppStep.AudiencePersona]?.structuredData as PersonaProfile[] || [];
        const moments = state.results[AppStep.MomentActivation]?.structuredData as Moment[] || [];
        const bigIdeas = state.results[AppStep.BigIdea]?.structuredData as BigIdea[] || [];
        
        const response = await generateMediaStrategy(state.brief, personas, marketIntel, moments, bigIdeas);
        updateResult(step, {
            rawText: response.text,
            structuredData: response.strategy,
            timestamp: Date.now()
        });
    } catch (e) {
        console.error(e);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleExportPPT = () => {
    if (!strategy) return;
    const pres = new PptxGenJS();
    
    // Theme Colors
    const COLOR_PRIMARY = '1e3a8a'; // Blue 900
    const COLOR_ACCENT = '4f46e5'; // Indigo 600
    const COLOR_BG_LIGHT = 'f3f4f6'; // Gray 100

    // Master Slide Definition
    pres.defineSlideMaster({
      title: 'MASTER_SLIDE',
      background: { color: 'FFFFFF' },
      objects: [
        { rect: { x: 0, y: 0, w: '100%', h: 0.6, fill: { color: COLOR_PRIMARY } } },
        { text: { text: 'Media Strategix Suite', options: { x: 0.5, y: 0.1, fontFace: 'Arial', fontSize: 18, color: 'FFFFFF', bold: true } } },
        { text: { text: `Client: ${state.brief.brandName}`, options: { x: 0.5, y: 5.3, fontSize: 10, color: '888888' } } }
      ]
    });

    // 1. Title Slide
    let slide = pres.addSlide({ masterName: 'MASTER_SLIDE' });
    slide.addText('Media Strategy & Approach', { x: 0.5, y: 2.0, w: 9, h: 1, fontSize: 44, bold: true, color: COLOR_PRIMARY, align: 'center' });
    slide.addText('Strategic Planning & Execution Document', { x: 0.5, y: 3.0, w: 9, h: 0.5, fontSize: 18, color: '666666', align: 'center' });

    // 2. Persona Strategy Slides (Loop)
    strategy.personaStrategies.forEach(ps => {
        let pSlide = pres.addSlide({ masterName: 'MASTER_SLIDE' });
        
        // Header
        pSlide.addText(`Strategy: ${ps.personaName}`, { x: 0.5, y: 0.8, fontSize: 24, bold: true, color: COLOR_PRIMARY });
        pSlide.addText(ps.overview, { x: 0.5, y: 1.3, w: 9, fontSize: 12, italic: true });

        // Left Col: Funnel
        pSlide.addText('Funnel Architecture', { x: 0.5, y: 2.0, fontSize: 14, bold: true, color: COLOR_ACCENT });
        let yPos = 2.4;
        
        // Simplified listing for PPT due to space
        ps.funnelBreakdown.forEach(fb => {
             // Only fitting 4 stages vertically
             if (yPos > 5) return; 

             pSlide.addShape(pres.ShapeType.rect, { x: 0.5, y: yPos, w: 4.5, h: 0.7, fill: { color: COLOR_BG_LIGHT }, line: { color: 'd1d5db' } });
             pSlide.addText(`${fb.stage}: ${fb.objective}`, { x: 0.6, y: yPos + 0.1, fontSize: 10, bold: true, color: COLOR_PRIMARY });
             
             // List top tactic from each category
             const topTactics = fb.channelStrategies.map(cs => `${cs.category}: ${cs.tactics[0]}`).join(' | ');
             pSlide.addText(topTactics, { x: 0.6, y: yPos + 0.4, fontSize: 8, color: '4b5563' });
             
             yPos += 0.8;
        });

        // Right Col: Programmatic
        if (ps.programmaticIdeas && ps.programmaticIdeas.length > 0) {
            pSlide.addText('Programmatic Innovation', { x: 5.2, y: 2.0, fontSize: 14, bold: true, color: COLOR_ACCENT });
            let pYPos = 2.4;
            ps.programmaticIdeas.forEach(prog => {
                pSlide.addShape(pres.ShapeType.roundRect, { x: 5.2, y: pYPos, w: 4.5, h: 1.0, fill: { color: 'eef2ff' }, line: { color: COLOR_ACCENT, width: 1 } });
                pSlide.addText(prog.conceptName, { x: 5.3, y: pYPos + 0.1, fontSize: 11, bold: true, color: COLOR_ACCENT });
                pSlide.addText(`Trigger: ${prog.dataTriggers}`, { x: 5.3, y: pYPos + 0.35, fontSize: 9, bold: true });
                pSlide.addText(`Execution: ${prog.realLifeApplication}`, { x: 5.3, y: pYPos + 0.55, w: 4.2, fontSize: 9 });
                pYPos += 1.2;
            });
        }
    });

    // 3. Media Targeting Matrix (Table)
    let tSlide = pres.addSlide({ masterName: 'MASTER_SLIDE' });
    tSlide.addText('Media Targeting Matrix', { x: 0.5, y: 0.8, fontSize: 24, bold: true, color: COLOR_PRIMARY });
    
    const targetRows: any[] = [];
    targetRows.push([
        { text: 'Touchpoint', options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
        { text: 'Demographic Profile', options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } },
        { text: 'Affinity & Context', options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } }
    ]);
    
    strategy.tacticalBlueprint?.forEach(tac => {
        targetRows.push([
            { text: tac.channel, options: { bold: true, fill: COLOR_BG_LIGHT } },
            { text: tac.targeting?.demographics || '-', options: { fontSize: 10 } },
            { text: tac.targeting?.affinities?.join(', ') || '-', options: { fontSize: 10 } }
        ]);
    });
    tSlide.addTable(targetRows, { x: 0.5, y: 1.5, w: 9, border: { color: 'cbd5e1' } });

    // 4. Tactical Blueprint (Detailed)
    let tbSlide = pres.addSlide({ masterName: 'MASTER_SLIDE' });
    tbSlide.addText('Tactical Blueprint', { x: 0.5, y: 0.8, fontSize: 24, bold: true, color: COLOR_PRIMARY });
    
    let colX = 0.5;
    let colY = 1.5;
    let count = 0;
    
    strategy.tacticalBlueprint?.forEach((tac, index) => {
        // Simple 2-column layout logic
        if (index > 0 && index % 3 === 0) {
             colX += 4.6;
             colY = 1.5;
        }
        if (index === 6) { // New slide if too many
             tbSlide = pres.addSlide({ masterName: 'MASTER_SLIDE' });
             tbSlide.addText('Tactical Blueprint (Cont.)', { x: 0.5, y: 0.8, fontSize: 24, bold: true, color: COLOR_PRIMARY });
             colX = 0.5;
             colY = 1.5;
        }

        tbSlide.addShape(pres.ShapeType.rect, { x: colX, y: colY, w: 4.4, h: 1.4, fill: { color: 'FFFFFF' }, line: { color: '94a3b8' } });
        tbSlide.addText(tac.channel, { x: colX + 0.1, y: colY + 0.1, fontSize: 12, bold: true, color: COLOR_ACCENT });
        tbSlide.addText(`Role: ${tac.role}`, { x: colX + 0.1, y: colY + 0.4, fontSize: 10, italic: true });
        tbSlide.addText(`Formats: ${tac.formats.slice(0,3).join(', ')}`, { x: colX + 0.1, y: colY + 0.7, fontSize: 9 });
        tbSlide.addText(`Best Practice: ${tac.bestPractices.substring(0, 80)}...`, { x: colX + 0.1, y: colY + 1.0, fontSize: 9, color: '666666' });
        
        colY += 1.6;
    });

    // 5. Flight Plan (Gantt Table)
    if (strategy.flightPlan) {
        let fSlide = pres.addSlide({ masterName: 'MASTER_SLIDE' });
        fSlide.addText('Campaign Flight Plan', { x: 0.5, y: 0.8, fontSize: 24, bold: true, color: COLOR_PRIMARY });
        
        const flightRows: any[] = [];
        // Header
        const headerRow: any[] = [
            { text: 'Channel', options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF' } }
        ];
        strategy.flightPlan.phases.forEach(p => {
            headerRow.push({ text: `${p.name}\n${p.timing}`, options: { bold: true, fill: COLOR_PRIMARY, color: 'FFFFFF', fontSize: 10 } });
        });
        flightRows.push(headerRow);

        // Data
        strategy.flightPlan.channels.forEach(ch => {
            const row: any[] = [{ text: ch.channel, options: { bold: true, fill: COLOR_BG_LIGHT } }];
            strategy.flightPlan.phases.forEach(ph => {
                const act = ch.activities.find(a => a.phaseName === ph.name);
                if (act) {
                    let cellColor = 'FFFFFF';
                    if (act.intensity === 'High') cellColor = 'd1fae5'; // Green
                    if (act.intensity === 'Medium') cellColor = 'dbeafe'; // Blue
                    row.push({ text: act.action, options: { fontSize: 9, fill: cellColor } });
                } else {
                    row.push({ text: '-', options: { fontSize: 9, align: 'center' } });
                }
            });
            flightRows.push(row);
        });
        fSlide.addTable(flightRows, { x: 0.5, y: 1.5, w: 9, border: { color: 'cbd5e1' } });
    }

    pres.writeFile({ fileName: `${state.brief.brandName}_MediaStrategy_Pro.pptx` });
  };

  const handleExportDoc = async () => {
    if (!result?.rawText) return;
    const html = await parse(result.rawText);
    const preHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Media Strategy</title><style>body{font-family:Arial;}</style></head><body>`;
    const postHtml = "</body></html>";
    const blob = new Blob(['\ufeff', preHtml + html + postHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.brief.brandName}_MediaStrategy.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-6 flex justify-between items-end border-b border-slate-200 pb-6">
            <div>
                <h2 className="text-3xl font-kufam font-bold text-slate-900 mb-2">Media Strategy & Approach</h2>
                <p className="text-slate-600">Holistic channel planning and tactical blueprints tailored per persona.</p>
            </div>
            <div className="flex gap-2">
                {result && !isGenerating && (
                    <>
                        <button onClick={handleExportPPT} className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 text-orange-600 rounded-lg font-bold hover:bg-orange-100 transition-all border border-orange-200">
                            <Presentation size={18} /> Export Slides (Pro)
                        </button>
                        <button onClick={handleExportDoc} className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-lg font-bold hover:bg-blue-100 transition-all border border-blue-200">
                            <FileText size={18} /> Export Doc
                        </button>
                    </>
                )}
                <button onClick={handleGenerate} disabled={isGenerating} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50">
                    {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Layers size={18} />}
                    {result ? 'Regenerate Strategy' : 'Generate Strategy'}
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-10">
            {isGenerating ? (
                <div className="h-full flex flex-col items-center justify-center">
                    <Loader2 size={48} className="text-indigo-600 animate-spin mb-4" />
                    <p className="text-slate-600 font-medium">Developing persona-specific funnel architectures and flight plans...</p>
                </div>
            ) : !result ? (
                 <div className="h-full flex flex-col items-center justify-center p-8 bg-white rounded-xl border border-slate-200 border-dashed">
                    <Layers size={64} className="text-slate-300 mb-4" />
                    <p className="text-slate-500">Develop a comprehensive media mix and tactical plan.</p>
                    <button onClick={handleGenerate} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold">Generate</button>
                 </div>
            ) : (
                <div className="space-y-12">
                    {/* Visual Gantt Chart / Flight Plan */}
                    {strategy.flightPlan && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                    <Calendar size={16} /> Campaign Flighting & Phasing
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 min-w-[150px]">Channel / Phase</th>
                                            {strategy.flightPlan.phases.map((phase, idx) => (
                                                <th key={idx} className="px-4 py-3 min-w-[180px] border-l border-slate-200">
                                                    <div className="text-indigo-700 uppercase tracking-wider text-xs">{phase.name}</div>
                                                    <div className="text-[10px] font-normal text-slate-400 mt-1">{phase.timing}</div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {strategy.flightPlan.channels.map((ch, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-4 font-bold text-slate-800 border-r border-slate-100">{ch.channel}</td>
                                                {strategy.flightPlan.phases.map((phase, pIdx) => {
                                                    const activity = ch.activities.find(a => a.phaseName === phase.name);
                                                    return (
                                                        <td key={pIdx} className="px-4 py-4 border-l border-slate-100 align-top">
                                                            {activity ? (
                                                                <div className={`p-2 rounded-lg border text-xs ${
                                                                    activity.intensity === 'High' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 
                                                                    activity.intensity === 'Medium' ? 'bg-blue-50 border-blue-100 text-blue-800' :
                                                                    activity.intensity === 'Low' ? 'bg-slate-100 border-slate-200 text-slate-600' :
                                                                    'opacity-50'
                                                                }`}>
                                                                    <div className="font-bold mb-1 flex items-center gap-1">
                                                                        {activity.intensity !== 'None' && <span className={`w-2 h-2 rounded-full ${
                                                                            activity.intensity === 'High' ? 'bg-emerald-500' :
                                                                            activity.intensity === 'Medium' ? 'bg-blue-500' : 'bg-slate-400'
                                                                        }`}></span>}
                                                                        {activity.intensity} Priority
                                                                    </div>
                                                                    <div className="leading-tight">{activity.action}</div>
                                                                </div>
                                                            ) : (
                                                                <div className="h-full flex items-center justify-center text-slate-200">-</div>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Persona Specific Strategies with Dividers */}
                    <div className="space-y-12">
                        {strategy.personaStrategies?.map((ps, idx) => (
                            <div key={idx} className="relative">
                                {/* Divider with number */}
                                <div className="absolute -left-3 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-slate-200 rounded-full"></div>
                                
                                <div className="pl-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-lg">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{ps.personaName}</h3>
                                            <p className="text-slate-500 text-sm font-medium">Strategy & Activation Plan</p>
                                        </div>
                                    </div>

                                    {/* Strategy Overview & Connections */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                            <h4 className="font-bold text-slate-900 mb-2 text-sm flex items-center gap-2"><Target size={16}/> Strategic Approach</h4>
                                            <p className="text-slate-600 text-sm leading-relaxed">{ps.overview}</p>
                                        </div>
                                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                                            <div>
                                                <h4 className="font-bold text-indigo-700 text-xs uppercase tracking-wider mb-2 flex items-center gap-2"><Lightbulb size={14}/> Leveraging Big Idea</h4>
                                                <div className="bg-white px-3 py-2 rounded-lg border border-indigo-100 shadow-sm text-sm font-medium text-slate-800">
                                                    {ps.matchedBigIdea}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-indigo-700 text-xs uppercase tracking-wider mb-2 flex items-center gap-2"><CalendarDays size={14}/> Key Moments</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {ps.matchedMoments?.map((m, i) => (
                                                        <span key={i} className="px-2 py-1 bg-white border border-indigo-100 rounded text-xs font-medium text-slate-600">{m}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Funnel Visualization with new Detailed Categorization */}
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
                                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                                            <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide flex items-center gap-2">
                                                <Filter size={16} /> Communication Funnel Architecture
                                            </h4>
                                        </div>
                                        <div className="divide-y divide-slate-100">
                                            {ps.funnelBreakdown?.map((stage, sIdx) => (
                                                <div key={sIdx} className="p-6">
                                                    {/* Stage Header */}
                                                    <div className="flex items-center gap-4 mb-4">
                                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase w-24 text-center ${
                                                            stage.stage === 'Awareness' ? 'bg-blue-100 text-blue-700' :
                                                            stage.stage === 'Consideration' ? 'bg-purple-100 text-purple-700' :
                                                            stage.stage === 'Trial' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-emerald-100 text-emerald-700'
                                                        }`}>
                                                            {stage.stage}
                                                        </span>
                                                        <div className="flex-1 border-l-2 border-slate-100 pl-4">
                                                            <div className="text-sm font-bold text-slate-800">{stage.objective}</div>
                                                            <div className="text-xs text-slate-500">KPI: <span className="font-medium text-indigo-600">{stage.kpi}</span></div>
                                                        </div>
                                                    </div>

                                                    {/* Category Grid */}
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        {stage.channelStrategies?.map((strat, cIdx) => (
                                                            <div key={cIdx} className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:bg-slate-100 transition-colors">
                                                                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200/60">
                                                                    {strat.category === 'Conventional' ? <Radio size={14} className="text-slate-500"/> : 
                                                                     strat.category === 'Digital' ? <MousePointer2 size={14} className="text-blue-500"/> : 
                                                                     <PartyPopper size={14} className="text-amber-500"/>}
                                                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">{strat.category}</span>
                                                                </div>
                                                                
                                                                <div className="space-y-3">
                                                                    <div>
                                                                        <div className="text-[10px] font-bold text-slate-400 uppercase">Strategy</div>
                                                                        <p className="text-xs text-slate-800 font-medium leading-tight">{strat.strategy}</p>
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-[10px] font-bold text-slate-400 uppercase">Approach</div>
                                                                        <p className="text-xs text-slate-600 leading-tight">{strat.approach}</p>
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-[10px] font-bold text-slate-400 uppercase">Rationale</div>
                                                                        <p className="text-xs text-slate-500 italic leading-tight">{strat.explanation}</p>
                                                                    </div>
                                                                    
                                                                    <div className="pt-2 mt-2 border-t border-slate-200/60">
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {strat.tactics?.map((t, tIdx) => (
                                                                                <span key={tIdx} className="px-1.5 py-0.5 bg-white border border-slate-200 text-slate-600 text-[10px] rounded shadow-sm">{t}</span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Persona Programmatic Section */}
                                    {ps.programmaticIdeas && ps.programmaticIdeas.length > 0 && (
                                        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 shadow-md text-white">
                                            <div className="flex items-center gap-3 mb-4">
                                                <Cpu size={20} className="text-violet-200" />
                                                <h3 className="font-bold text-sm uppercase tracking-wide">Programmatic Innovation for {ps.personaName}</h3>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {ps.programmaticIdeas.map((prog, pIdx) => (
                                                    <div key={pIdx} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all">
                                                        <h4 className="font-bold text-sm text-white mb-2">{prog.conceptName}</h4>
                                                        <div className="space-y-2">
                                                            <div className="bg-black/20 p-2 rounded-lg">
                                                                <span className="text-[9px] uppercase font-bold text-violet-200 tracking-wider block mb-0.5"><Database size={10} className="inline mr-1"/>Data Triggers</span>
                                                                <p className="text-xs font-medium">{prog.dataTriggers}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-[9px] uppercase font-bold text-violet-200 tracking-wider">Market Execution</span>
                                                                <p className="text-xs text-white/90 leading-tight mt-0.5">{prog.realLifeApplication}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Shared Resources: Budget & Blueprint */}
                    <div className="pt-8 border-t border-slate-200">
                        <h2 className="text-2xl font-kufam font-bold text-slate-900 mb-6">Strategic Foundations</h2>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2"><PieChart size={20} /> Budget Allocation</h3>
                                <div className="space-y-4">
                                    {strategy.budgetAllocation?.map((alloc, idx) => (
                                        <div key={idx} className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-bold text-slate-700">{alloc.channel}</span>
                                                <span className="font-bold text-indigo-600">{alloc.percentage}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                <div className="bg-indigo-600 h-full rounded-full" style={{width: `${alloc.percentage}%`}}></div>
                                            </div>
                                            <p className="text-xs text-slate-500">{alloc.rationale}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* SEPARATED Tactical Blueprint Card */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                                 <div className="p-6 border-b border-slate-100 bg-slate-50">
                                     <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><TargetIcon size={20} /> Tactical Blueprint</h3>
                                 </div>
                                 <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                                     {strategy.tacticalBlueprint?.map((tac, idx) => (
                                         <div key={idx} className="p-5 hover:bg-white transition-colors">
                                             <div className="flex justify-between items-start mb-2">
                                                 <h4 className="font-bold text-slate-800 text-sm">{tac.channel}</h4>
                                                 <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full">{tac.role}</span>
                                             </div>
                                             <p className="text-xs text-slate-600 mb-2">{tac.tacticDescription}</p>
                                             <div className="text-[10px] text-slate-500">
                                                 <span className="font-bold text-indigo-600">Best Practice: </span> {tac.bestPractices}
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                            </div>
                        </div>

                        {/* SEPARATED Detailed Media Targeting Card */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                             <div className="p-6 border-b border-slate-100 bg-slate-50">
                                 <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Users size={20} /> Media Targeting Matrix</h3>
                             </div>
                             
                             <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-xs">
                                        <tr>
                                            <th className="px-6 py-4 border-r border-slate-100">Touchpoint</th>
                                            <th className="px-6 py-4 border-r border-slate-100 w-1/3">Demographic Profile</th>
                                            <th className="px-6 py-4">Affinity & Contextual Signals</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {strategy.tacticalBlueprint?.map((tac, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50">
                                                <td className="px-6 py-4 font-bold text-slate-800 border-r border-slate-100">{tac.channel}</td>
                                                <td className="px-6 py-4 text-slate-600 border-r border-slate-100">
                                                    <div className="font-medium text-indigo-900 bg-indigo-50 inline-block px-2 py-1 rounded text-xs mb-1">Target Audience</div>
                                                    <div className="leading-tight">{tac.targeting?.demographics}</div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">
                                                    <div className="flex flex-wrap gap-2">
                                                        {tac.targeting?.affinities?.map((aff, i) => (
                                                            <span key={i} className="px-2 py-1 bg-white text-slate-600 rounded border border-slate-200 text-xs font-medium shadow-sm">{aff}</span>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                             </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export const StepRenderer: React.FC<StepViewProps> = (props) => {
  const { step, state, updateBrief, nextStep } = props;
  switch (step) {
    case AppStep.BriefIngestion:
      return <BriefForm brief={state.brief} updateBrief={updateBrief} onComplete={nextStep} />;
    case AppStep.MarketIntelligence:
      return <MarketIntelligenceView {...props} />;
    case AppStep.AudiencePersona:
      return <AudiencePersonaView {...props} />;
    case AppStep.MomentActivation:
      return <MomentActivationView {...props} />;
    case AppStep.BigIdea:
      return <BigIdeaView {...props} />;
    case AppStep.MediaStrategy:
      return <MediaStrategyView {...props} />;
    default:
      return null;
  }
};