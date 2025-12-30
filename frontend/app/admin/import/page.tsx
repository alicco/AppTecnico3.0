'use client';

import { importErrorCodes } from '@/app/actions/import';
import { useState } from 'react';

export default function ImportPage() {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setMessage('');

        const formData = new FormData(event.currentTarget);
        const result = await importErrorCodes(formData);

        setMessage(result.message);
        setLoading(false);
    }

    return (
        <div className="p-8 max-w-md mx-auto bg-gray-900 text-white min-h-screen">
            <h1 className="text-2xl font-bold mb-6">Import Error Codes</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block mb-1">Model Name</label>
                    <input
                        name="model"
                        type="text"
                        required
                        placeholder="e.g. C4080"
                        className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                    />
                </div>
                <div>
                    <label className="block mb-1">File (CSV/XLSX)</label>
                    <input
                        name="file"
                        type="file"
                        accept=".csv, .xlsx"
                        required
                        className="w-full"
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-500 p-2 rounded disabled:opacity-50"
                >
                    {loading ? 'Importing...' : 'Import Data'}
                </button>
            </form>
            {message && <p className="mt-4 p-2 bg-gray-800 rounded">{message}</p>}
        </div>
    );
}
