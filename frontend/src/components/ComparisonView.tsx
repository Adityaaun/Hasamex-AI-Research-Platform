import { Search, Hash, SplitSquareHorizontal } from 'lucide-react';

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
      <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-2xl flex items-start space-x-4">
        <div>
          <h3 className="font-semibold text-white mb-1">AI comparison temporarily unavailable.</h3>
          <p className="text-sm">The backend encountered an error or timeout during generation (Error: {data.error_type}). Please try again later.</p>
        </div>
      </div>
    );
  }

  if (data.status === 'insufficient_evidence') {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-6 rounded-2xl flex items-start space-x-4">
        <div>
          <h3 className="font-semibold text-white mb-1">Insufficient Evidence</h3>
          <p className="text-sm">The transcripts do not contain enough information to make a reliable cross-market comparison for this question.</p>
        </div>
      </div>
    );
  }

  const renderCitation = (cite: Citation, idx: number) => (
    <div key={idx} className="bg-black/20 p-4 rounded-xl border border-white/5 hover:border-blue-500/30 transition-colors group mt-3">
      <p className="font-medium text-slate-200 mb-2 text-sm">{cite.claim}</p>
      <div className="border-l-2 border-blue-500/30 pl-3 my-3">
        <p className="italic text-slate-400 text-sm font-serif leading-relaxed">"{cite.quote}"</p>
      </div>
      
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
        <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
          <span>{cite.timestamp_start || '00:00'}</span>
          <span>•</span>
          <span>{cite.expert_name || cite.chunk_id}</span>
        </div>
        <button 
          onClick={() => onCitationClick(cite.chunk_id)}
          title="View Original Source"
          className="inline-flex items-center space-x-2 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1.5 rounded-lg transition-colors border border-blue-500/20"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Source</span>
        </button>
      </div>
    </div>
  );

  const MARKETS = ['France', 'Germany', 'United Kingdom'];

  return (
    <div className="space-y-12">
      
      {/* COMMON THEMES */}
      {data.common_themes && data.common_themes.length > 0 && (
        <section>
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-blue-500/10 rounded-lg"><Hash className="w-5 h-5 text-blue-400" /></div>
            <h3 className="text-xl font-semibold text-white tracking-wide">Common Themes</h3>
          </div>
          
          <div className="space-y-8">
            {data.common_themes.map((theme, i) => (
              <div key={i} className="glass-panel rounded-2xl overflow-hidden shadow-xl shadow-black/20">
                <div className="bg-white/5 p-6 border-b border-white/5">
                  <h4 className="text-lg font-semibold text-white flex items-center">
                    <span className="text-blue-400 mr-3 opacity-50 font-mono text-sm">{(i + 1).toString().padStart(2, '0')}</span>
                    {theme.theme}
                  </h4>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {MARKETS.map(market => {
                      const marketEvidence = theme.evidence[market] || [];
                      if (marketEvidence.length === 0) return null;
                      return (
                        <div key={market} className="bg-[#0f1525] border border-white/5 rounded-xl p-4">
                          <div className="flex items-center space-x-2 mb-4">
                            <span className="text-sm">{market === 'France' ? '🇫🇷' : market === 'Germany' ? '🇩🇪' : '🇬🇧'}</span>
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{market}</div>
                          </div>
                          <div className="space-y-3">
                            {marketEvidence.map((ev, idx) => renderCitation(ev, idx))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* MARKET DIFFERENCES */}
      {data.differences && data.differences.length > 0 && (
        <section>
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-violet-500/10 rounded-lg"><SplitSquareHorizontal className="w-5 h-5 text-violet-400" /></div>
            <h3 className="text-xl font-semibold text-white tracking-wide">Market Differences</h3>
          </div>
          
          <div className="space-y-8">
            {data.differences.map((diff, i) => (
              <div key={i} className="glass-panel border-violet-500/20 rounded-2xl overflow-hidden shadow-xl shadow-black/20 relative">
                {/* Subtle Violet Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"></div>
                
                <div className="bg-white/5 p-6 border-b border-white/5">
                  <h4 className="text-lg font-semibold text-white flex items-center">
                    <span className="text-violet-400 mr-3 opacity-50 font-mono text-sm">{(i + 1).toString().padStart(2, '0')}</span>
                    {diff.theme}
                  </h4>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {MARKETS.map(market => {
                      const marketEvidence = diff.evidence[market] || [];
                      if (marketEvidence.length === 0) return null;
                      return (
                        <div key={market} className="bg-[#0f1525] border border-white/5 rounded-xl p-4">
                          <div className="flex items-center space-x-2 mb-4">
                            <span className="text-sm">{market === 'France' ? '🇫🇷' : market === 'Germany' ? '🇩🇪' : '🇬🇧'}</span>
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{market}</div>
                          </div>
                          <div className="space-y-3">
                            {marketEvidence.map((ev, eIdx) => renderCitation(ev, eIdx))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      
      {(!data.common_themes?.length && !data.differences?.length) && (
        <div className="glass-panel p-8 rounded-2xl flex flex-col items-center justify-center text-slate-500">
          <p className="italic">No significant themes or differences extracted.</p>
        </div>
      )}
    </div>
  );
}
