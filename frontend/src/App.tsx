import { useEffect, useState } from 'react'
import ComparisonView from './components/ComparisonView'
import type { ComparisonData } from './components/ComparisonView'
import AskAcrossInterviews from './components/AskAcrossInterviews'
import EvidenceDrawer from './components/EvidenceDrawer'

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

function App() {
  const [questions, setQuestions] = useState<GuideQuestion[]>([])
  const [selectedQuestion, setSelectedQuestion] = useState<GuideQuestion | null>(null)
  const [answers, setAnswers] = useState<MarketResponse[]>([])
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'markets' | 'comparison'>('markets')
  const [appSection, setAppSection] = useState<'guide' | 'ask'>('ask')
  const [activeChunkId, setActiveChunkId] = useState<string | null>(null)

  useEffect(() => {
    fetch('http://localhost:8000/api/guide/questions')
      .then(res => res.json())
      .then(data => setQuestions(data))
      .catch(err => console.error("Failed to load questions", err))
  }, [])

  const handleSelectQuestion = async (q: GuideQuestion, mode: 'markets' | 'comparison' = viewMode) => {
    setSelectedQuestion(q)
    setAnswers([])
    setComparisonData(null)
    setError(null)
    setIsLoading(true)

    try {
      if (mode === 'markets') {
        const res = await fetch('http://localhost:8000/api/guide/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question_id: q.question_id })
        })
        if (!res.ok) throw new Error('Failed to fetch analysis')
        const data = await res.json()
        setAnswers(data.markets)
      } else {
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

  const handleToggleView = (mode: 'markets' | 'comparison') => {
    setViewMode(mode)
    if (selectedQuestion) {
      handleSelectQuestion(selectedQuestion, mode)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
      <header className="mb-10 max-w-7xl mx-auto">
        <div className="flex items-center space-x-3 mb-1">
          <h1 className="text-3xl font-bold text-slate-800">Hasamex Research Platform</h1>
          <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-full uppercase tracking-wider">Evidence-First</span>
        </div>
        <p className="text-slate-500 mt-1">AI-powered cross-market interview analysis · France · Germany · United Kingdom</p>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Navigation / Sidebar */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-lg p-2 flex flex-col space-y-1 shadow-sm border border-slate-200">
            <button
              onClick={() => setAppSection('guide')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors text-left ${
                appSection === 'guide' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Interview Guide
            </button>
            <button
              onClick={() => setAppSection('ask')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors text-left ${
                appSection === 'ask' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Ask Across Interviews
            </button>
          </div>

          {appSection === 'guide' && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Guide Questions</h2>
              {questions.map(q => (
                <button
                  key={q.question_id}
                  onClick={() => handleSelectQuestion(q)}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-colors border ${
                    selectedQuestion?.question_id === q.question_id
                      ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs text-slate-400 mb-1">{q.topic}</div>
                  {q.short_label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="md:col-span-3">
          {appSection === 'ask' && <AskAcrossInterviews onCitationClick={setActiveChunkId} />}
          
          {appSection === 'guide' && !selectedQuestion && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
              Select an interview question to view the cross-market analysis.
            </div>
          )}
          {appSection === 'guide' && selectedQuestion && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex justify-between items-start">
                <h2 className="text-2xl font-semibold text-slate-800 flex-1 pr-6">{selectedQuestion.question_text}</h2>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => handleToggleView('markets')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      viewMode === 'markets' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Individual Markets
                  </button>
                  <button
                    onClick={() => handleToggleView('comparison')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      viewMode === 'comparison' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Cross-Market Comparison
                  </button>
                </div>
              </div>

              {isLoading && (
                <div className="bg-white rounded-xl border border-blue-100 p-12 text-center bg-blue-50/50">
                  <div className="animate-pulse flex flex-col items-center space-y-4">
                    <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                    <p className="text-blue-700 font-medium">Analyzing France, Germany, and the UK...</p>
                    <p className="text-sm text-blue-500">Retrieving exact evidence and synthesizing insights</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
                  {error}
                </div>
              )}

              {!isLoading && viewMode === 'markets' && answers.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {answers.map(market => (
                    <div key={market.country} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                      {/* Market Header */}
                      <div className="bg-slate-50 p-4 border-b border-slate-200">
                        <h3 className="font-bold text-lg text-slate-800">
                          {market.country === 'France' ? '🇫🇷' : market.country === 'Germany' ? '🇩🇪' : '🇬🇧'} {market.country}
                        </h3>
                        <p className="text-sm text-slate-500">{market.expert}</p>
                      </div>
                      
                      {/* Answer Content */}
                      <div className="p-5 flex-grow">
                        <div className="prose prose-sm text-slate-700">
                          {market.answer}
                        </div>
                      </div>

                      {/* Evidence Section */}
                      <div className="bg-slate-50 p-5 border-t border-slate-100">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                          Supported by {market.evidence_count} transcript passage{market.evidence_count !== 1 ? 's' : ''}
                        </div>
                        
                        <div className="space-y-4">
                          {market.citations.map((cite, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 text-sm">
                              <p className="italic text-slate-600 mb-2">"{cite.exact_quote}"</p>
                              
                              {/* Interactive Citation Badge */}
                              <button 
                                onClick={() => setActiveChunkId(cite.chunk_id)}
                                title="Click to view original transcript"
                                className="inline-flex items-center space-x-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors cursor-pointer"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                <span>[{cite.timestamp_start} · {cite.expert_name}]</span>
                              </button>
                            </div>
                          ))}
                          
                          {market.citations.length === 0 && (
                            <div className="text-sm text-slate-500 italic">No direct evidence extracted.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isLoading && viewMode === 'comparison' && comparisonData && (
                <ComparisonView data={comparisonData} onCitationClick={setActiveChunkId} />
              )}
            </div>
          )}
        </div>
      </div>

      <EvidenceDrawer 
        chunkId={activeChunkId} 
        onClose={() => setActiveChunkId(null)} 
      />
    </div>
  )
}

export default App
