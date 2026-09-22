import { useEffect, useState } from 'react'
import ComparisonView from './components/ComparisonView'
import type { ComparisonData } from './components/ComparisonView'
import AskAcrossInterviews from './components/AskAcrossInterviews'
import EvidenceDrawer from './components/EvidenceDrawer'
import { Microscope, Search, FileText, Database, Globe, Zap, LayoutDashboard, ChevronRight } from 'lucide-react'

interface Citation {
  chunk_id: string;
  expert_name: string;
  country: string;
  timestamp_start: string;
  exact_quote: string;
  source_file: string;
}

interface MarketResponse {
  country: string;
  expert: string;
  answer: string;
  evidence_count: number;
  citations: Citation[];
}

interface GuideQuestion {
  question_id: string;
  ordering: number;
  question_text: string;
  short_label: string;
  topic: string;
}

type AppSection = 'dashboard' | 'guide' | 'comparison' | 'ask'

function App() {
  const [questions, setQuestions] = useState<GuideQuestion[]>([])
  const [selectedQuestion, setSelectedQuestion] = useState<GuideQuestion | null>(null)
  const [answers, setAnswers] = useState<MarketResponse[]>([])
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appSection, setAppSection] = useState<AppSection>('dashboard')
  const [activeChunkId, setActiveChunkId] = useState<string | null>(null)

  useEffect(() => {
    fetch('http://localhost:8000/api/guide/questions')
      .then(res => res.json())
      .then(data => setQuestions(data))
      .catch(err => console.error("Failed to load questions", err))
  }, [])

  const handleSelectQuestion = async (q: GuideQuestion, section: AppSection = appSection) => {
    setSelectedQuestion(q)
    setAnswers([])
    setComparisonData(null)
    setError(null)
    setIsLoading(true)
    
    // Automatically switch to guide or comparison if a question is clicked from dashboard
    if (section === 'dashboard' || section === 'ask') {
      setAppSection('guide')
      section = 'guide'
    }

    try {
      if (section === 'guide') {
        const res = await fetch('http://localhost:8000/api/guide/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question_id: q.question_id })
        })
        if (!res.ok) throw new Error('Failed to fetch analysis')
        const data = await res.json()
        setAnswers(data.markets)
      } else if (section === 'comparison') {
        const res = await fetch('http://localhost:8000/api/comparison', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question_id: q.question_id, markets: ['France', 'Germany', 'United Kingdom'] })
        })
        if (!res.ok) throw new Error('Failed to fetch comparison')
        const data = await res.json()
        setComparisonData(data)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSectionChange = (section: AppSection) => {
    setAppSection(section)
    if (selectedQuestion && (section === 'guide' || section === 'comparison')) {
      handleSelectQuestion(selectedQuestion, section)
    }
  }

  const getSectionTitle = () => {
    switch (appSection) {
      case 'dashboard': return 'Research Overview'
      case 'guide': return 'Research Guide'
      case 'comparison': return 'Cross-Market Comparison'
      case 'ask': return 'Ask Across Interviews'
      default: return 'Research Platform'
    }
  }
  
  const getSectionSubtitle = () => {
    switch (appSection) {
      case 'dashboard': return 'Corpus analytics and research status'
      case 'guide': return 'Evidence-backed analysis across expert interviews'
      case 'comparison': return 'Synthesized themes and differences between markets'
      case 'ask': return 'Ad-hoc semantic research assistant'
      default: return ''
    }
  }

  return (
    <div className="flex h-screen bg-[#070a12] text-slate-200 font-sans overflow-hidden selection:bg-blue-500/30">
      {/* GLOBAL LEFT SIDEBAR */}
      <div className="w-64 glass-panel border-y-0 border-l-0 flex flex-col justify-between z-20 flex-shrink-0">
        
        {/* Logo / Branding */}
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center glow-sm shadow-blue-500/20">
              <Microscope className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Hasamex</h1>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-blue-400 font-semibold">Research Intelligence</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1.5 mt-4">
          <button
            onClick={() => handleSectionChange('dashboard')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              appSection === 'dashboard' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => handleSectionChange('guide')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              appSection === 'guide' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Research Guide</span>
          </button>
          <button
            onClick={() => handleSectionChange('comparison')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              appSection === 'comparison' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Market Comparison</span>
          </button>
          <button
            onClick={() => handleSectionChange('ask')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              appSection === 'ask' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Ask Assistant</span>
          </button>
        </nav>

        {/* Status Section */}
        <div className="p-6">
          <div className="bg-[#0f1525] rounded-xl border border-white/5 p-4 space-y-3 shadow-inner">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center"><Database className="w-3 h-3 mr-1.5" /> Corpus</span>
              <span className="text-slate-300 font-medium">3 Interviews</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center"><Globe className="w-3 h-3 mr-1.5" /> Markets</span>
              <span className="text-slate-300 font-medium">FR, DE, UK</span>
            </div>
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
              <span className="text-slate-500">Mode</span>
              <span className="text-emerald-400 font-medium flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                Evidence-first
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Top Header */}
        <header className="sticky top-0 z-10 glass-panel border-t-0 border-x-0 px-8 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white tracking-wide">{getSectionTitle()}</h2>
            <p className="text-sm text-slate-400 mt-0.5">{getSectionSubtitle()}</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Evidence-First</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto h-full">
            
            {/* DASHBOARD VIEW */}
            {appSection === 'dashboard' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Premium Metric Cards */}
                  <div className="glass-panel p-6 rounded-2xl hover:bg-white/5 transition-colors group cursor-default">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <FileText className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">3</div>
                    <div className="text-sm text-slate-400 font-medium">Expert Interviews</div>
                  </div>
                  <div className="glass-panel p-6 rounded-2xl hover:bg-white/5 transition-colors group cursor-default">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Globe className="w-5 h-5 text-violet-400" />
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">3</div>
                    <div className="text-sm text-slate-400 font-medium">Markets Analyzed</div>
                  </div>
                  <div className="glass-panel p-6 rounded-2xl hover:bg-white/5 transition-colors group cursor-default">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Database className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">6</div>
                    <div className="text-sm text-slate-400 font-medium">Research Questions</div>
                  </div>
                  <div className="glass-panel p-6 rounded-2xl border-blue-500/30 glow-sm group cursor-default relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                      <Zap className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-1 mt-3">Active</div>
                    <div className="text-sm text-slate-300 font-medium">Evidence-First Mode</div>
                  </div>
                </div>

                <div className="mt-12">
                  <h3 className="text-lg font-semibold text-white mb-6">Select a Research Question</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {questions.map(q => (
                      <button
                        key={q.question_id}
                        onClick={() => handleSelectQuestion(q, 'guide')}
                        className="glass-panel p-5 rounded-xl text-left hover:bg-white/5 hover:border-blue-500/30 transition-all group flex items-start justify-between"
                      >
                        <div>
                          <div className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-2">{q.topic}</div>
                          <div className="text-slate-200 font-medium leading-relaxed group-hover:text-white transition-colors">{q.question_text}</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition-colors mt-1" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ASK ACROSS INTERVIEWS */}
            {appSection === 'ask' && (
              <div className="h-full animate-in fade-in duration-500">
                <AskAcrossInterviews onCitationClick={setActiveChunkId} />
              </div>
            )}

            {/* GUIDE & COMPARISON VIEW (Layout with left question nav) */}
            {(appSection === 'guide' || appSection === 'comparison') && (
              <div className="flex h-full gap-8 animate-in fade-in duration-500">
                
                {/* Secondary Sidebar: Question Navigator */}
                <div className="w-72 flex-shrink-0 flex flex-col space-y-2">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 pl-2">Questions</div>
                  {questions.map((q, idx) => {
                    const isSelected = selectedQuestion?.question_id === q.question_id;
                    const numString = (idx + 1).toString().padStart(2, '0');
                    return (
                      <button
                        key={q.question_id}
                        onClick={() => handleSelectQuestion(q, appSection)}
                        className={`w-full text-left p-4 rounded-xl transition-all duration-300 relative overflow-hidden group ${
                          isSelected
                            ? 'bg-blue-900/20 border border-blue-500/50 glow-sm'
                            : 'bg-[#0f1525] border border-white/5 hover:bg-white/5'
                        }`}
                      >
                        {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>}
                        <div className="flex items-start space-x-3">
                          <span className={`text-sm font-bold font-mono pt-0.5 ${isSelected ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-400'}`}>
                            {numString}
                          </span>
                          <div>
                            <div className={`text-sm font-medium leading-snug ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                              {q.short_label}
                            </div>
                            <div className="text-xs text-slate-500 mt-1 line-clamp-2">{q.question_text}</div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Main Answer Panel */}
                <div className="flex-1 min-w-0">
                  {!selectedQuestion ? (
                    <div className="glass-panel h-full rounded-2xl flex flex-col items-center justify-center text-slate-500">
                      <FileText className="w-12 h-12 mb-4 opacity-20" />
                      <p>Select a question from the navigator to view insights.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      
                      {/* Question Header Card */}
                      <div className="glass-panel p-8 rounded-2xl border-t-4 border-t-blue-500 shadow-xl shadow-black/20">
                        <div className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-3">{selectedQuestion.topic}</div>
                        <h2 className="text-2xl font-semibold text-white leading-relaxed">{selectedQuestion.question_text}</h2>
                      </div>

                      {/* Loading State */}
                      {isLoading && (
                        <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center space-y-6">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full border-2 border-slate-700"></div>
                            <div className="w-12 h-12 rounded-full border-2 border-blue-500 border-t-transparent animate-spin absolute top-0 left-0 glow-sm"></div>
                          </div>
                          <div className="text-center">
                            <p className="text-blue-400 font-medium mb-2">Analyzing interview evidence</p>
                            <div className="flex items-center justify-center space-x-1">
                              <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                              <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                              <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Error State */}
                      {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-2xl flex items-start space-x-4">
                          <div className="p-2 bg-red-500/20 rounded-lg"><Zap className="w-5 h-5 text-red-400" /></div>
                          <div>
                            <h3 className="font-semibold text-white mb-1">Research request couldn't be completed</h3>
                            <p className="text-sm">{error}</p>
                          </div>
                        </div>
                      )}

                      {/* Markets View */}
                      {!isLoading && appSection === 'guide' && answers.length > 0 && (
                        <div className="space-y-6">
                          {answers.map(market => (
                            <div key={market.country} className="glass-panel rounded-2xl overflow-hidden flex flex-col shadow-xl shadow-black/20">
                              
                              <div className="bg-white/5 p-6 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-lg shadow-inner border border-white/10">
                                    {market.country === 'France' ? '🇫🇷' : market.country === 'Germany' ? '🇩🇪' : '🇬🇧'}
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-lg text-white">{market.country}</h3>
                                    <p className="text-sm text-slate-400 font-medium">{market.expert}</p>
                                  </div>
                                </div>
                                <div className="bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-400">
                                  {market.evidence_count} Evidence Source{market.evidence_count !== 1 ? 's' : ''}
                                </div>
                              </div>
                              
                              <div className="p-6">
                                <div className="prose prose-invert prose-slate max-w-none text-slate-300 leading-relaxed text-[15px]">
                                  {market.answer}
                                </div>
                              </div>

                              <div className="bg-black/20 p-6 border-t border-white/5">
                                <div className="space-y-3">
                                  {market.citations.map((cite, idx) => (
                                    <div key={idx} className="bg-[#0f1525] p-4 rounded-xl border border-white/5 hover:border-blue-500/30 transition-colors group">
                                      <p className="text-slate-400 italic mb-3 text-sm leading-relaxed font-serif">"{cite.exact_quote}"</p>
                                      
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
                                          <span className="bg-white/5 px-2 py-1 rounded text-slate-300">{cite.source_file}</span>
                                          <span>•</span>
                                          <span>{cite.timestamp_start}</span>
                                        </div>
                                        
                                        <button 
                                          onClick={() => setActiveChunkId(cite.chunk_id)}
                                          title="View Original Source"
                                          className="inline-flex items-center space-x-2 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg transition-colors border border-blue-500/20"
                                        >
                                          <Search className="w-3.5 h-3.5" />
                                          <span>Verify Source</span>
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                  
                                  {market.citations.length === 0 && (
                                    <div className="text-sm text-slate-500 italic p-4 text-center">No direct evidence extracted for this market.</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Comparison View */}
                      {!isLoading && appSection === 'comparison' && comparisonData && (
                        <ComparisonView data={comparisonData} onCitationClick={setActiveChunkId} />
                      )}

                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        </main>
      </div>

      <EvidenceDrawer 
        chunkId={activeChunkId} 
        onClose={() => setActiveChunkId(null)} 
      />
    </div>
  )
}

export default App
