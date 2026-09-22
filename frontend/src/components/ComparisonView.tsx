import React from 'react';

interface Citation {
  chunk_id: string;
  market: string;
  claim: string;
  quote: string;
  timestamp_start?: string;
  expert_name?: string;
}

interface EvidenceDict {
  [market: string]: Citation[];
}

interface CommonTheme {
  theme: string;
  evidence: EvidenceDict;
}

interface MarketDifference {
  theme: string;
  evidence: EvidenceDict;
}

export interface ComparisonData {
  question_id: string;
  question: string;
  status: 'success' | 'insufficient_evidence' | 'generation_error';
  error_type?: string;
  common_themes: CommonTheme[];
  differences: MarketDifference[];
}

interface ComparisonViewProps {
  data: ComparisonData;
  onCitationClick: (chunkId: string) => void;
}

export default function ComparisonView({ data, onCitationClick }: ComparisonViewProps) {
  if (data.status === 'generation_error') {
    return (
      <div className="bg-red-50 text-red-800 p-6 rounded-xl border border-red-200">
        <h3 className="text-lg font-semibold">AI comparison temporarily unavailable.</h3>
        <p>The backend encountered an error or timeout during generation (Error: {data.error_type}). Please try again later.</p>
      </div>
    );
  }

  if (data.status === 'insufficient_evidence') {
    return (
      <div className="bg-yellow-50 text-yellow-800 p-6 rounded-xl border border-yellow-200">
        <h3 className="text-lg font-semibold">Insufficient Evidence</h3>
        <p>The transcripts do not contain enough information to make a reliable cross-market comparison for this question.</p>
      </div>
    );
  }

  const renderCitation = (cite: Citation, idx: number) => (
    <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm mt-2">
      <p className="font-semibold text-slate-800 mb-1">{cite.claim}</p>
      <p className="italic text-slate-600 mb-2">"{cite.quote}"</p>
      <button 
        onClick={() => onCitationClick(cite.chunk_id)}
        className="inline-flex items-center space-x-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
      >
        <span>[{cite.market} · {cite.expert_name || cite.chunk_id}]</span>
      </button>
    </div>
  );

  const MARKETS = ['France', 'Germany', 'United Kingdom'];

  return (
    <div className="space-y-10">
      
      {/* COMMON THEMES */}
      {data.common_themes && data.common_themes.length > 0 && (
        <section>
          <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Common Themes</h3>
          <div className="space-y-6">
            {data.common_themes.map((theme, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h4 className="text-lg font-semibold text-blue-800 mb-4">{theme.theme}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {MARKETS.map(market => {
                    const marketEvidence = theme.evidence[market] || [];
                    if (marketEvidence.length === 0) return null;
                    return (
                      <div key={market} className="bg-white border border-slate-100 rounded p-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{market}</div>
                        {marketEvidence.map((ev, idx) => renderCitation(ev, idx))}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* MARKET DIFFERENCES */}
      {data.differences && data.differences.length > 0 && (
        <section>
          <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Market Differences</h3>
          <div className="space-y-6">
            {data.differences.map((diff, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h4 className="text-lg font-semibold text-purple-800 mb-4">{diff.theme}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {MARKETS.map(market => {
                    const marketEvidence = diff.evidence[market] || [];
                    if (marketEvidence.length === 0) return null;
                    return (
                      <div key={market} className="bg-slate-50 border border-slate-100 rounded p-4">
                        <div className="text-sm font-bold text-slate-800 mb-3">{market}</div>
                        {marketEvidence.map((ev, eIdx) => renderCitation(ev, eIdx))}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      
      {(!data.common_themes?.length && !data.differences?.length) && (
        <p className="text-slate-500 italic">No significant themes or differences extracted.</p>
      )}
    </div>
  );
}
