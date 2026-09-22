import React, { useState } from 'react';
import { Search, Sparkles, MessageSquareQuote } from 'lucide-react';

interface Citation {
  chunk_id: string;
  expert_name: string;
  country: string;
  timestamp_start: string;
  exact_quote: string;
  source_file: string;
}

interface AskResponse {
  status: 'success' | 'insufficient_evidence' | 'generation_error';
  error_type?: string;
  answer: string;
  citations: Citation[];
}

const MARKETS = [
  { value: 'All', label: 'All Markets' },
  { value: 'France', label: '🇫🇷 France' },
  { value: 'Germany', label: '🇩🇪 Germany' },
  { value: 'United Kingdom', label: '🇬🇧 United Kingdom' }
];

interface AskAcrossInterviewsProps {
  onCitationClick: (chunkId: string) => void;
}

export default function AskAcrossInterviews({ onCitationClick }: AskAcrossInterviewsProps) {
  const [question, setQuestion] = useState('');
  const [marketFilter, setMarketFilter] = useState('All');
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    setError(null);
    setResponse(null);

    const payload: any = { question: question.trim() };
    if (marketFilter !== 'All') {
      payload.filters = { country: marketFilter };
    }

    try {
      const res = await fetch('http://localhost:8000/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to fetch answer');
      const data = await res.json();
      setResponse(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const citationsByMarket = React.useMemo(() => {
    if (!response || !response.citations) return {};
    const grouped: Record<string, Citation[]> = {};
    response.citations.forEach(cite => {
      if (!grouped[cite.country]) grouped[cite.country] = [];
      grouped[cite.country].push(cite);
    });
    return grouped;
  }, [response]);

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col space-y-8">
      
      {/* Query Interface */}
      <div className="glass-panel p-8 rounded-3xl relative overflow-hidden flex-shrink-0 shadow-xl shadow-black/20">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-center space-x-3 mb-8">
            <Sparkles className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-semibold text-white">Ask Research Assistant</h2>
          </div>
          
          <form onSubmit={handleAsk} className="space-y-6 max-w-3xl mx-auto">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              </div>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. What are the main barriers to robotic surgery adoption across the three markets?"
                className="w-full pl-12 pr-4 py-4 bg-[#0f1525] border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all glow-sm"
                disabled={isLoading}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex bg-[#0f1525] p-1.5 rounded-xl border border-white/5 w-full sm:w-auto">
                {MARKETS.map(market => (
                  <button
                    key={market.value}
                    type="button"
                    onClick={() => setMarketFilter(market.value)}
                    className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                      marketFilter === market.value
                        ? 'bg-white/10 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                    disabled={isLoading}
                  >
                    {market.label}
                  </button>
                ))}
              </div>
              
              <button
                type="submit"
                disabled={isLoading || !question.trim()}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white px-8 py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
              >
                {isLoading ? 'Searching...' : 'Ask Assistant'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex-1 min-h-[300px] glass-panel rounded-3xl p-8 flex flex-col items-center justify-center space-y-6">
          <div className="relative">
             <div className="w-16 h-16 rounded-full border-2 border-white/10"></div>
             <div className="w-16 h-16 rounded-full border-2 border-blue-500 border-t-transparent animate-spin absolute top-0 left-0 glow-sm"></div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-white">Synthesizing Answer</h3>
            <p className="text-sm text-slate-400">Scanning transcript database for relevant evidence...</p>
          </div>
          <div className="w-full max-w-md h-2 bg-[#0f1525] rounded-full overflow-hidden border border-white/5">
            <div className="h-full bg-blue-500 rounded-full skeleton-shimmer w-full"></div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-2xl flex items-start space-x-4">
          <div>
            <h3 className="font-semibold text-white mb-1">Research request couldn't be completed</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {response && !isLoading && (
        <div className="flex-1 overflow-y-auto space-y-6 pb-12">
          {response.status === 'generation_error' && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-2xl">
              <h3 className="font-semibold text-white mb-1">AI generation temporarily unavailable.</h3>
              <p className="text-sm">The backend encountered an error or timeout during generation (Error: {response.error_type}). Please try again later.</p>
            </div>
          )}

          {response.status === 'insufficient_evidence' && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-6 rounded-2xl">
              <h3 className="font-semibold text-white mb-2">Insufficient Evidence</h3>
              <p className="text-sm leading-relaxed">{response.answer}</p>
            </div>
          )}

          {response.status === 'success' && (
            <>
              {/* Answer Box */}
              <div className="glass-panel p-8 rounded-3xl relative overflow-hidden shadow-xl shadow-black/20">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-violet-500"></div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center space-x-2">
                  <MessageSquareQuote className="w-4 h-4 text-blue-400" />
                  <span>Research Synthesis</span>
                </h3>
                <div className="prose prose-invert prose-slate max-w-none text-slate-300 leading-relaxed text-[15px]">
                  {response.answer}
                </div>
              </div>

              {/* Citations Box */}
              {response.citations.length > 0 && (
                <div className="glass-panel p-8 rounded-3xl shadow-xl shadow-black/20">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-8">Source Breakdown</h3>
                  
                  <div className="space-y-10">
                    {Object.entries(citationsByMarket).map(([country, cites]) => (
                      <div key={country} className="space-y-5">
                        <div className="flex items-center space-x-3 pb-3 border-b border-white/5">
                          <span className="text-xl">{country === 'France' ? '🇫🇷' : country === 'Germany' ? '🇩🇪' : country === 'United Kingdom' ? '🇬🇧' : ''}</span>
                          <h4 className="font-semibold text-lg text-white">{country}</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {cites.map((cite, idx) => (
                            <div key={idx} className="bg-[#0f1525] p-5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-colors group flex flex-col justify-between">
                              <p className="text-sm text-slate-400 italic mb-4 font-serif leading-relaxed">"{cite.exact_quote}"</p>
                              
                              <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                                <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
                                  <span>{cite.timestamp_start}</span>
                                  <span>•</span>
                                  <span>{cite.expert_name}</span>
                                </div>
                                
                                <button 
                                  onClick={() => onCitationClick(cite.chunk_id)}
                                  title="View Original Source"
                                  className="inline-flex items-center space-x-2 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg transition-colors border border-blue-500/20"
                                >
                                  <Search className="w-3.5 h-3.5" />
                                  <span>Verify Source</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
