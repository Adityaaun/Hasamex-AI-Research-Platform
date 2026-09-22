import { useEffect, useState } from 'react'
import { X, Search, FileText, User, MapPin, Clock, ArrowRight } from 'lucide-react'

export interface EvidenceContextTurn {
  speaker: string;
  text: string;
  timestamp: string;
}

export interface EvidenceResponse {
  chunk_id: string;
  transcript_id: string;
  expert_name: string;
  role: string;
  country: string;
  timestamp_start: string;
  source_file: string;
  source_order: number;
  source_turn_ids: string[];
  previous_turn: EvidenceContextTurn | null;
  target_turns: EvidenceContextTurn[];
  next_turn: EvidenceContextTurn | null;
}

interface EvidenceDrawerProps {
  chunkId: string | null;
  onClose: () => void;
}

export default function EvidenceDrawer({ chunkId, onClose }: EvidenceDrawerProps) {
  const [data, setData] = useState<EvidenceResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!chunkId) {
      setData(null)
      return
    }

    setIsLoading(true)
    setError(null)
    
    fetch(`http://localhost:8000/api/evidence/${chunkId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load evidence')
        return res.json()
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false))
  }, [chunkId])

  if (!chunkId) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#070a12]/80 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-[#0f1525] border-l border-white/10 shadow-2xl z-50 transform transition-transform overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-[#111827] border-b border-white/10 px-6 py-5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Search className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white tracking-wide">Evidence Traceability</h2>
              <div className="text-blue-400 text-xs font-medium uppercase tracking-wider mt-0.5 flex items-center space-x-1">
                <span>Verified Source</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-grow overflow-y-auto">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
               <div className="relative">
                 <div className="w-10 h-10 rounded-full border-2 border-white/10"></div>
                 <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin absolute top-0 left-0"></div>
               </div>
               <p className="text-slate-400 text-sm">Retrieving original transcript...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-2xl flex items-start space-x-4">
              <div>
                <h3 className="font-semibold text-white mb-1">Failed to load evidence</h3>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {!isLoading && data && (
            <div className="space-y-8 animate-in fade-in duration-300">
              
              {/* Visual Traceability Chain */}
              <div className="flex items-center justify-between px-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                <span className="text-blue-400">Claim</span>
                <ArrowRight className="w-4 h-4 opacity-30" />
                <span>Expert</span>
                <ArrowRight className="w-4 h-4 opacity-30" />
                <span>Country</span>
                <ArrowRight className="w-4 h-4 opacity-30" />
                <span className="text-emerald-400">Source</span>
              </div>

              {/* Metadata Card */}
              <div className="glass-panel p-6 rounded-2xl border-white/5 shadow-xl shadow-black/20 grid grid-cols-2 gap-y-6 gap-x-4 text-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl"></div>
                
                <div className="flex items-start space-x-3">
                  <User className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <span className="block text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Expert</span>
                    <span className="font-semibold text-white">{data.expert_name}</span>
                    <div className="text-slate-400 text-xs mt-0.5">{data.role}</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <span className="block text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Country</span>
                    <span className="font-semibold text-white">{data.country}</span>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <span className="block text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Timestamp</span>
                    <span className="font-semibold text-white font-mono bg-white/5 px-2 py-0.5 rounded text-xs">{data.timestamp_start}</span>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <FileText className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <span className="block text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Source File</span>
                    <span className="text-emerald-400 font-mono text-xs bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">{data.source_file}</span>
                  </div>
                </div>
              </div>

              {/* Transcript View */}
              <div className="glass-panel rounded-2xl shadow-xl shadow-black/20 overflow-hidden">
                <div className="bg-[#111827] border-b border-white/5 px-5 py-4 flex items-center justify-between">
                  <h3 className="font-semibold text-white text-sm flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span>Immutable Source Record</span>
                  </h3>
                </div>
                
                <div className="p-0">
                  {/* Previous Turn */}
                  {data.previous_turn && (
                    <div className="p-6 border-b border-white/5 bg-[#0f1525] opacity-60">
                      <div className="flex items-baseline space-x-3 mb-3">
                        <span className="text-xs font-mono text-slate-400 bg-white/5 px-2 py-1 rounded border border-white/5">
                          {data.previous_turn.timestamp}
                        </span>
                        <span className="font-semibold text-sm text-slate-400">
                          {data.previous_turn.speaker}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400 pl-[4.5rem] whitespace-pre-wrap leading-relaxed">
                        {data.previous_turn.text}
                      </div>
                    </div>
                  )}

                  {/* Target Evidence */}
                  <div className="p-6 border-l-4 border-l-blue-500 bg-blue-500/5 relative glow-sm">
                    <div className="absolute right-4 top-4 text-[10px] font-bold text-blue-400 uppercase tracking-wider bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded">
                      Extracted Evidence
                    </div>
                    {data.target_turns.map((turn, idx) => (
                      <div key={idx} className={idx > 0 ? "mt-6" : ""}>
                        <div className="flex items-baseline space-x-3 mb-3">
                          <span className="text-xs font-mono text-blue-300 bg-blue-500/20 px-2 py-1 rounded border border-blue-500/30">
                            {turn.timestamp}
                          </span>
                          <span className="font-bold text-sm text-white">
                            {turn.speaker}
                          </span>
                        </div>
                        <div className="text-[15px] text-slate-200 pl-[4.5rem] whitespace-pre-wrap font-medium leading-relaxed">
                          {turn.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Next Turn */}
                  {data.next_turn && (
                    <div className="p-6 border-t border-white/5 bg-[#0f1525] opacity-60">
                      <div className="flex items-baseline space-x-3 mb-3">
                        <span className="text-xs font-mono text-slate-400 bg-white/5 px-2 py-1 rounded border border-white/5">
                          {data.next_turn.timestamp}
                        </span>
                        <span className="font-semibold text-sm text-slate-400">
                          {data.next_turn.speaker}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400 pl-[4.5rem] whitespace-pre-wrap leading-relaxed">
                        {data.next_turn.text}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </>
  )
}
