import { useEffect, useState } from 'react'

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
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 transform transition-transform overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="bg-slate-800 text-white px-6 py-5 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-semibold flex items-center space-x-2">
              <span>Transcript Evidence</span>
            </h2>
            <div className="text-slate-400 text-sm mt-1">
              Source of Truth
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-2"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-grow bg-slate-50">
          {isLoading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {!isLoading && data && (
            <div className="space-y-6">
              
              {/* Metadata Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Expert</span>
                  <span className="font-semibold text-slate-800">{data.expert_name}</span>
                </div>
                <div>
                  <span className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Role</span>
                  <span className="text-slate-700">{data.role}</span>
                </div>
                <div>
                  <span className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Country</span>
                  <span className="text-slate-700">{data.country}</span>
                </div>
                <div>
                  <span className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Source File</span>
                  <span className="text-slate-700 font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">{data.source_file}</span>
                </div>
              </div>

              {/* Transcript View */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-700 text-sm flex items-center space-x-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Original Transcript</span>
                  </h3>
                </div>
                
                <div className="p-0">
                  {/* Previous Turn */}
                  {data.previous_turn && (
                    <div className="p-5 border-b border-slate-100 bg-slate-50 opacity-70">
                      <div className="flex items-baseline space-x-3 mb-2">
                        <span className="text-xs font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {data.previous_turn.timestamp}
                        </span>
                        <span className="font-medium text-sm text-slate-600">
                          {data.previous_turn.speaker}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600 pl-11 whitespace-pre-wrap">
                        {data.previous_turn.text}
                      </div>
                    </div>
                  )}

                  {/* Target Evidence */}
                  <div className="p-5 border-l-4 border-blue-500 bg-blue-50/50 relative">
                    <div className="absolute right-4 top-4 text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-100 px-2 py-1 rounded">
                      Target Evidence
                    </div>
                    {data.target_turns.map((turn, idx) => (
                      <div key={idx} className={idx > 0 ? "mt-4" : ""}>
                        <div className="flex items-baseline space-x-3 mb-2">
                          <span className="text-xs font-mono text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200">
                            {turn.timestamp}
                          </span>
                          <span className="font-bold text-sm text-slate-900">
                            {turn.speaker}
                          </span>
                        </div>
                        <div className="text-sm text-slate-800 pl-11 whitespace-pre-wrap font-medium">
                          {turn.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Next Turn */}
                  {data.next_turn && (
                    <div className="p-5 border-t border-slate-100 bg-slate-50 opacity-70">
                      <div className="flex items-baseline space-x-3 mb-2">
                        <span className="text-xs font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {data.next_turn.timestamp}
                        </span>
                        <span className="font-medium text-sm text-slate-600">
                          {data.next_turn.speaker}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600 pl-11 whitespace-pre-wrap">
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
