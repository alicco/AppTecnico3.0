'use client';

import { useState, useEffect, useTransition } from 'react';
import { getPrinters, searchErrors } from '@/app/actions/search';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { Search, Printer, Loader2 } from 'lucide-react';

export default function Home() {
  const [printers, setPrinters] = useState<{ id: string, model_name: string }[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [codeQuery, setCodeQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getPrinters().then(setPrinters);
  }, []);

  const handleSearch = () => {
    if (!selectedModel) return;
    startTransition(async () => {
      const data = await searchErrors(selectedModel, codeQuery);
      setResults(data);
    });
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            TechAssistant Pro
          </h1>
          <p className="text-gray-400">Professional Diagnostics & Spare Parts Lookup</p>
        </div>

        {/* Search Bar */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Model Selector */}
            <div className="md:col-span-4 relative">
              <Printer className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full pl-10 h-11 bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-white appearance-none"
              >
                <option value="">Select Model...</option>
                {printers.map(p => (
                  <option key={p.id} value={p.model_name}>{p.model_name}</option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="md:col-span-6 relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search Error Code (e.g. C-1234)"
                value={codeQuery}
                onChange={(e) => setCodeQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 h-11 bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
              />
            </div>

            {/* Search Button */}
            <div className="md:col-span-2">
              <button
                onClick={handleSearch}
                disabled={isPending || !selectedModel}
                className="w-full h-11 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {isPending ? <Loader2 className="animate-spin h-5 w-5" /> : 'Search'}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {results.length > 0 ? (
            results.map((err) => (
              <ErrorCard key={err.id} error={err} />
            ))
          ) : (
            !isPending && codeQuery && (
              <div className="text-center text-gray-500 py-12">
                <p>No results found for current filter.</p>
              </div>
            )
          )}
        </div>

      </div>
    </main>
  );
}
