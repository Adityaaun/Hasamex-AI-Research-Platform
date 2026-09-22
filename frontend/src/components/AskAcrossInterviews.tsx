import React, { useState } from 'react';

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

  // Group citations by market for display
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
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-800 mb-6">Ask Across Interviews</h2>
        
        <form onSubmit={handleAsk} className="space-y-6">
          <div>
            <label htmlFor="question" className="block text-sm font-medium text-slate-700 mb-2">
              Research Question
            </label>
            <input
              id="question"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What are the biggest barriers to adoption?"
              className="w-full p-4 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {MARKETS.map(market => (
                <button
                  key={market.value}
                  type="button"
                  onClick={() => setMarketFilter(market.value)}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                    marketFilter === market.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
              className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Searching...' : 'Ask'}
            </button>
          </div>
        </form>
      </div>

      {isLoading && (
        <div className="bg-white rounded-xl border border-blue-100 p-12 text-center bg-blue-50/50">
          <div className="animate-pulse flex flex-col items-center space-y-4">
            <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
            <p className="text-blue-700 font-medium">Searching transcripts and synthesizing answer...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {response && !isLoading && (
        <div className="space-y-6">
          {response.status === 'generation_error' && (
            <div className="bg-red-50 text-red-800 p-6 rounded-xl border border-red-200">
              <h3 className="text-lg font-semibold">AI generation temporarily unavailable.</h3>
              <p>The backend encountered an error or timeout during generation (Error: {response.error_type}). Please try again later.</p>
            </div>
          )}

          {response.status === 'insufficient_evidence' && (
            <div className="bg-yellow-50 text-yellow-800 p-6 rounded-xl border border-yellow-200">
              <h3 className="text-lg font-semibold">Insufficient Evidence</h3>
              <p>{response.answer}</p>
            </div>
          )}

          {response.status === 'success' && (
            <>
              {/* Answer Box */}
              <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Answer</h3>
                <div className="prose prose-slate max-w-none text-slate-700">
                  {response.answer}
                </div>
              </div>

              {/* Citations Box */}
              {response.citations.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 border-b pb-2">Sources</h3>
                  
                  <div className="space-y-8">
                    {Object.entries(citationsByMarket).map(([country, cites]) => (
                      <div key={country} className="space-y-4">
                        <h4 className="font-semibold text-lg text-slate-800 flex items-center space-x-2">
                          <span>{country === 'France' ? '🇫🇷' : country === 'Germany' ? '🇩🇪' : country === 'United Kingdom' ? '🇬🇧' : ''}</span>
                          <span>{country}</span>
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {cites.map((cite, idx) => (
                            <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                              <p className="text-sm text-slate-700 italic mb-3">"{cite.exact_quote}"</p>
                              <button 
                                onClick={() => onCitationClick(cite.chunk_id)}
                                className="inline-flex items-center space-x-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                              >
                                <span>[{cite.timestamp_start} · {cite.expert_name}]</span>
                              </button>
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
