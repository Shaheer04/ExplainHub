import React, { useState } from 'react';
import { RepoProvider, useRepo } from './contexts/RepoContext';
import { ExplanationProvider } from './contexts/ExplanationContext';
import FileTree from './components/FileTree';
import ExplanationDisplay from './components/ExplanationDisplay';
import SearchAndAsk from './components/SearchAndAsk';

const AppContent: React.FC = () => {
  const { repo, loading, error, fetchRepo } = useRepo();
  const [repoUrl, setRepoUrl] = useState('');
  const [apiKey, setApiKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (repoUrl.trim()) {
      fetchRepo(repoUrl);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-github-dark-bg flex items-center justify-center">
        <div className="text-center bg-github-dark-bg-secondary p-8 rounded-lg shadow-lg max-w-md border border-github-dark-border">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-github-dark-accent mb-6"></div>
          <p className="text-xl font-semibold text-github-dark-text mb-2">git clone in progress...</p>
          <p className="text-github-dark-text-secondary">Fetching repository contents from the mothership</p>
          <div className="mt-4 flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-github-dark-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-github-dark-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-github-dark-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <p className="text-xs text-github-dark-text-secondary mt-4 font-mono">// TODO: Make this faster</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-github-dark-bg flex flex-col">
      {/* Header */}
      <header className="bg-github-dark-bg-secondary border-b border-github-dark-border backdrop-blur-sm bg-opacity-95 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">{ }</div>
              <h1 className="text-xl font-bold text-github-dark-accent">
                Codebase Explainer
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              {!apiKey ? (
                <div className="flex items-center bg-yellow-900 bg-opacity-30 px-3 py-1.5 rounded-lg border border-yellow-600 border-opacity-50">
                  <svg className="w-4 h-4 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs text-yellow-200">API Key Required</span>
                </div>
              ) : (
                <span className="text-xs text-green-400 flex items-center bg-green-900 bg-opacity-30 px-3 py-1.5 rounded-lg border border-green-600 border-opacity-50">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                  API Connected
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
                <div className="text-6xl mb-4">{ }</div>
                <h2 className="text-3xl font-bold text-github-dark-text mb-3">
                  Analyze Any GitHub Repository
                </h2>
                <p className="text-github-dark-text-secondary text-lg">
                  Intelligent code explanations, powered by Gemini
                </p>
                <p className="text-github-dark-text-secondary text-sm mt-2 font-mono">
                  // Because reading READMEs is so 2010
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Gemini API Key Input */}
                <div className="bg-github-dark-bg-secondary rounded-xl p-4 border-2 border-github-dark-border">
                  <label className="block text-sm font-medium text-github-dark-text mb-2">
                    🔑 Gemini API Key
                  </label>
                  <input
                    type="password"
                    placeholder="Paste your Gemini API key here"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-4 py-3 bg-github-dark-bg-tertiary border border-github-dark-border rounded-lg text-github-dark-text placeholder-github-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-github-dark-accent focus:border-transparent transition-all"
                    required
                  />
                  <p className="mt-2 text-xs text-github-dark-text-secondary">
                    🤝 I promise not to steal it (too lazy to run our own queries). Get your free key from{' '}
                    <a 
                      href="https://aistudio.google.com/app/apikey" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-github-dark-accent hover:underline"
                    >
                      Google AI Studio
                    </a>
                  </p>
                </div>
                
                {/* Repository URL Input */}
                <div className="relative">
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/username/repository"
                    className="w-full px-5 py-4 bg-github-dark-bg-secondary border-2 border-github-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-github-dark-accent focus:border-transparent text-lg text-github-dark-text placeholder-github-dark-text-secondary transition-all shadow-sm hover:border-github-dark-accent"
                    required
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-github-dark-text-secondary">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                
                <div className="flex items-center text-sm text-github-dark-text-secondary space-x-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <p>Analyzes public GitHub repositories</p>
                </div>
                
                <button
                  type="submit"
                  disabled={!repoUrl || !apiKey}
                  className={`w-full py-4 px-6 rounded-xl text-white font-semibold text-lg transition-all shadow-lg ${
                    !repoUrl || !apiKey
                      ? 'bg-github-dark-bg-tertiary cursor-not-allowed'
                      : 'bg-github-dark-accent hover:bg-github-dark-accent-hover transform hover:scale-[1.02]'
                  }`}
                >
                  {!apiKey ? 'Enter Gemini API Key to Continue' : 'Analyze Repository'}
                </button>
              </form>

              {error && (
                <div className="mt-6 p-4 bg-red-900 bg-opacity-50 border-l-4 border-red-500 rounded-lg shadow-sm">
                  <div className="flex items-start">
                    <span className="text-xl mr-2">⚠️</span>
                    <div>
                      <p className="font-semibold text-red-200 mb-1">Error</p>
                      <p className="text-red-300 text-sm">{error}</p>
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
              <div className="w-full md:w-80 lg:w-96 flex flex-col border-r border-gray-700 bg-gray-800">
                <div className="p-4 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-750">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white text-lg mr-3 shadow-sm">
                      📦
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base font-semibold text-gray-200 truncate">
                        {repo.owner}/{repo.name}
                      </h2>
                      <p className="text-xs text-gray-400">Repository files</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 overflow-auto p-2 bg-gray-800" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                  <FileTree />
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Search and Ask Section */}
                <SearchAndAsk apiKey={apiKey} />
                
                {/* Explanation Display */}
                <div className="flex-1 overflow-auto bg-gray-900">
                  <ExplanationDisplay apiKey={apiKey} />
                </div>
              </div>
            </div>
          </ExplanationProvider>
        )}
      </main>

      <footer className="bg-github-dark-bg-secondary border-t border-github-dark-border py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs text-github-dark-text-secondary">
            Powered by <span className="font-semibold text-github-dark-text">Shaheer</span> • Built with ❤️
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