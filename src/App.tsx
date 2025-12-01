import React, { useState } from 'react';
import { RepoProvider, useRepo } from './contexts/RepoContext';
import { ExplanationProvider } from './contexts/ExplanationContext';
import FileTree from './components/FileTree';
import ExplanationDisplay from './components/ExplanationDisplay';
import SearchAndAsk from './components/SearchAndAsk';

const AppContent: React.FC = () => {
  const { repo, loading, error, fetchRepo } = useRepo();
  const [repoUrl, setRepoUrl] = useState('');
  const [apiKey, setApiKey] = useState(process.env.REACT_APP_GEMINI_API_KEY || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (repoUrl.trim()) {
      fetchRepo(repoUrl);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-6"></div>
          <p className="text-xl font-semibold text-gray-800 mb-2">Fetching Repository...</p>
          <p className="text-gray-600">Loading repository structure and files</p>
          <div className="mt-4 flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 backdrop-blur-sm bg-opacity-95 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">🔍</div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Codebase Explainer
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="password"
                placeholder={process.env.REACT_APP_GEMINI_API_KEY ? "API key loaded" : "Gemini API Key"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                disabled={!!process.env.REACT_APP_GEMINI_API_KEY}
              />
              {process.env.REACT_APP_GEMINI_API_KEY && (
                <span className="text-xs text-green-600 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                  Active
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {!repo ? (
          // Welcome/URL input screen
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
              <div className="text-center mb-10">
                <div className="text-6xl mb-4">🚀</div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-3">
                  Analyze Any GitHub Repository
                </h2>
                <p className="text-gray-600 text-lg">
                  AI-powered code explanations in seconds
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/username/repository"
                    className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg transition-all shadow-sm hover:border-gray-400"
                    required
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                
                <div className="flex items-center text-sm text-gray-500 space-x-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <p>Public repositories • API key required for AI explanations</p>
                </div>
                
                <button
                  type="submit"
                  disabled={!repoUrl || !apiKey}
                  className={`w-full py-4 px-6 rounded-xl text-white font-semibold text-lg transition-all shadow-lg ${
                    !repoUrl || !apiKey
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transform hover:scale-[1.02]'
                  }`}
                >
                  Analyze Repository
                </button>
              </form>

              {error && (
                <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm">
                  <div className="flex items-start">
                    <span className="text-xl mr-2">⚠️</span>
                    <div>
                      <p className="font-semibold text-red-800 mb-1">Error</p>
                      <p className="text-red-700 text-sm">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Main app view with sidebar and content
          <ExplanationProvider apiKey={apiKey} repoName={`${repo.owner}/${repo.name}`}>
            <div className="flex-1 flex flex-col md:flex-row">
              {/* Sidebar - File Tree */}
              <div className="w-full md:w-80 lg:w-96 flex flex-col border-r border-gray-200 bg-white">
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-gray-50">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white text-lg mr-3 shadow-sm">
                      📦
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base font-semibold text-gray-800 truncate">
                        {repo.owner}/{repo.name}
                      </h2>
                      <p className="text-xs text-gray-500">Repository files</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 overflow-auto p-2 bg-white">
                  <FileTree />
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Search and Ask Section */}
                <SearchAndAsk apiKey={apiKey} />
                
                {/* Explanation Display */}
                <div className="flex-1 overflow-auto bg-white">
                  <ExplanationDisplay apiKey={apiKey} />
                </div>
              </div>
            </div>
          </ExplanationProvider>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs text-gray-500">
            Powered by <span className="font-semibold text-gray-700">Gemini AI</span> • Built with ❤️
          </p>
        </div>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <RepoProvider>
      <AppContent />
    </RepoProvider>
  );
};

export default App;