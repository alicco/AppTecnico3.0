import { AlertTriangle, CheckCircle, Info, Wrench } from 'lucide-react';

interface ErrorProps {
    error: {
        code: string;
        classification?: string;
        cause?: string;
        measures?: string;
        solution?: string;
        estimated_abnormal_parts?: string;
        correction?: string;
        note?: string;
    };
}

export function ErrorCard({ error }: ErrorProps) {
    return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-4">
                <h2 className="text-3xl font-bold text-white tracking-tight">{error.code}</h2>
                <span className="px-4 py-2 text-lg font-bold text-blue-100 bg-blue-900/50 border border-blue-700 rounded-lg shadow-sm">
                    {error.classification || 'Error'}
                </span>
            </div>

            <div className="space-y-4">
                {error.cause && (
                    <div className="flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Cause</h3>
                            <p className="text-gray-300 leading-relaxed">{error.cause}</p>
                        </div>
                    </div>
                )}

                {error.measures && (
                    <div className="flex gap-3">
                        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Measures</h3>
                            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{error.measures}</p>
                        </div>
                    </div>
                )}

                {error.solution && (
                    <div className="flex gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Solution</h3>
                            <div className="text-gray-300 leading-relaxed">
                                {(() => {
                                    // Check if text looks like a numbered list (contains "1." and "2.")
                                    const hasNumbering = /\d+\./.test(error.solution || '');

                                    if (hasNumbering) {
                                        // Split by lookahead for "number dot space" e.g. " 2. " or start of string "1. "
                                        const steps = (error.solution || '')
                                            .split(/(?=\b\d+\.\s)/)
                                            .map(s => s.trim())
                                            .filter(s => s.length > 0);

                                        return (
                                            <ol className="list-none space-y-3">
                                                {steps.map((step, idx) => {
                                                    // Extract the number to style it separately if desired, 
                                                    // or just render the whole line neatly.
                                                    // Let's highlight the number.
                                                    const match = step.match(/^(\d+\.)\s+(.*)/);
                                                    if (match) {
                                                        return (
                                                            <li key={idx} className="flex gap-2">
                                                                <span className="font-bold text-blue-400 min-w-[1.5rem]">{match[1]}</span>
                                                                <span>{match[2]}</span>
                                                            </li>
                                                        );
                                                    }
                                                    // Fallback for lines that might be headers or notes without numbers
                                                    return <li key={idx} className="pl-8 -indent-6">{step}</li>;
                                                })}
                                            </ol>
                                        );
                                    }

                                    // Fallback for non-numbered text (split by newlines if any)
                                    return (
                                        <ul className="list-disc pl-5 space-y-2">
                                            {(error.solution || '').split('\n').map((line, idx) => {
                                                const trimmed = line.trim();
                                                if (!trimmed) return null;
                                                return <li key={idx}>{trimmed}</li>;
                                            })}
                                        </ul>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}

                {error.correction && (
                    <div className="flex gap-3">
                        {error.correction.toLowerCase().includes('warning') ? (
                            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-1" />
                        ) : (
                            <CheckCircle className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-1" />
                        )}
                        <div className="w-full">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Correction</h3>

                            {error.correction.toLowerCase().includes('warning') ? (
                                <div className="mt-2 text-white font-bold text-center bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 border border-red-500 rounded-2xl p-4 shadow-lg shadow-red-900/20 whitespace-pre-wrap tracking-wide transform hover:scale-[1.01] transition-all duration-200">
                                    ⚠️ {error.correction}
                                </div>
                            ) : (
                                <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                                    {error.correction}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {error.estimated_abnormal_parts && (
                    <div className="flex gap-3">
                        <Wrench className="w-5 h-5 text-purple-500 flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Parts</h3>
                            <p className="text-gray-300 leading-relaxed font-mono text-sm bg-gray-900 p-2 rounded">{error.estimated_abnormal_parts}</p>
                        </div>
                    </div>
                )}

                {error.parts && error.parts.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-gray-700">
                        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                            <Wrench className="w-5 h-5 text-orange-500" />
                            Recommended Spare Parts
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {error.parts.map((part: any, idx: number) => (
                                <div key={idx} className="bg-gray-900 p-3 rounded-lg border border-gray-700 flex gap-3">
                                    {part.image_url && <img src={part.image_url} alt={part.oem_code} className="w-16 h-16 object-cover rounded" />}
                                    <div>
                                        <p className="text-blue-400 font-mono font-bold">{part.oem_code}</p>
                                        <p className="text-sm text-gray-300">{part.description}</p>
                                        <div className="flex gap-1 mt-1">
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className={`h-1.5 w-4 rounded-full ${i < part.ranking ? 'bg-orange-500' : 'bg-gray-700'}`} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
