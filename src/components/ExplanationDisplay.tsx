import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useRepo } from '../contexts/RepoContext';
import { useExplanations } from '../contexts/ExplanationContext';
import CodeViewer from './CodeViewer';
import ArchitectureDiagram from './ArchitectureDiagram';

interface ExplanationDisplayProps {
  apiKey: string;
}

const ExplanationDisplay: React.FC<ExplanationDisplayProps> = ({ apiKey }) => {
  const { selectedFile, fileContents } = useRepo();
  const { explanations, generateExplanation, generating, error, architectureDiagram, generateQuestionResponse } = useExplanations();
  const [activeTab, setActiveTab] = useState<'explanation' | 'code' | 'architecture'>('explanation');

  /* New State for Question - Moved to top level */
  const [question, setQuestion] = useState('');

  const handleAsk = () => {
    if (!question.trim() || !selectedFile) return;
    const currentContent = fileContents[selectedFile.path] || '';
    generateQuestionResponse(question, selectedFile.path, currentContent);
    setQuestion('');
  };

  // Helper to get questions for this file - Moved to top level
  // Note: We need to be careful with access to selectedFile if it's null, but filter handles undefined checks safely usually.
  // We can just keep it here or compute it inline. Or use useMemo.
  // For safety against selectedFile being null, let's just make it safe.
  const fileQuestions = Object.entries(explanations).filter(([key]) => key.startsWith(`${selectedFile?.path || ''}_question_`));

  React.useEffect(() => {
    if (selectedFile) {
      const content = fileContents[selectedFile.path];
      if (content && !explanations[selectedFile.path]) {
        generateExplanation(selectedFile, content);
      }
    }
  }, [selectedFile, fileContents, explanations, generateExplanation]);

  // Reset to explanation tab when file changes (not when tab changes!)
  React.useEffect(() => {
    if (selectedFile && activeTab !== 'architecture') {
      setActiveTab('explanation');
    }
  }, [selectedFile]); // Only depend on selectedFile, not activeTab

  if (!selectedFile) {
    return (
      <div className="p-8 h-full flex flex-col items-center justify-center">
        <div className="max-w-md w-full glass-panel p-10 rounded-2xl border border-gray-700/50 text-center relative overflow-hidden group">
          {/* Ambient Background Glow */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-colors duration-500"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl group-hover:bg-purple-500/30 transition-colors duration-500"></div>

          <div className="relative z-10">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl flex items-center justify-center border border-gray-700/50 shadow-inner">
              <span className="text-4xl">👈</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Select a File</h2>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Click on any file in the sidebar to view its explanation, code, or generate diagrams.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800/50 border border-gray-700/50 text-xs text-gray-500 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Ready to analyze
            </div>
          </div>
        </div>
      </div>
    );
  }

  const explanation = explanations[selectedFile.path];
  const content = fileContents[selectedFile.path];

  // Show generating state with file preview for better UX
  if (generating && !explanation) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-8 p-6 glass-panel rounded-2xl border border-gray-700/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>

          <div className="relative flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-2xl border border-blue-500/30">
              {selectedFile.type === 'dir' ? '📁' : '📄'}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-1">{selectedFile.name}</h2>
              <p className="text-sm text-blue-300/80 font-mono bg-blue-900/20 inline-block px-2 py-0.5 rounded border border-blue-500/20">{selectedFile.path}</p>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3 text-blue-300 text-sm font-medium animate-pulse">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              Analyzing File...
            </div>

            <div className="space-y-3">
              <div className="h-2 bg-blue-900/30 rounded-full w-full overflow-hidden">
                <div className="h-full bg-blue-500/50 rounded-full animate-progress origin-left w-full"></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 font-mono">
                <span>Parsing AST...</span>
                <span>Identifying Dependencies...</span>
                <span>Generating Insights...</span>
              </div>
            </div>
          </div>
        </div>

        {/* Skeleton UI */}
        <div className="space-y-6 animate-pulse opacity-50">
          <div className="h-8 bg-gray-800 rounded-lg w-1/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-800 rounded w-full"></div>
            <div className="h-4 bg-gray-800 rounded w-5/6"></div>
            <div className="h-4 bg-gray-800 rounded w-4/6"></div>
          </div>
          <div className="h-32 bg-gray-800 rounded-xl w-full"></div>
        </div>
      </div>
    );
  }

  if (!content && !generating) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400">Loading file content...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-red-500 bg-red-900/10">
          <h3 className="text-xl font-bold text-red-200 mb-2">Generation Failed</h3>
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }




  return (
    <div className="p-6 md:p-8 h-full overflow-hidden flex flex-col max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-3xl font-bold text-white tracking-tight">{selectedFile.name}</h2>
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-800 text-gray-400 border border-gray-700 uppercase">
            {selectedFile.path.split('.').pop()?.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center text-sm text-gray-500 font-mono overflow-hidden">
          <span className="truncate">{selectedFile.path}</span>
        </div>
      </div>

      {/* Ask AI Input - Integrated Here */}
      <div className="mb-8 relative group z-20">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-20 group-focus-within:opacity-50 transition-opacity blur"></div>
        <div className="relative flex shadow-xl">
          <div className="absolute left-4 top-3.5 text-blue-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder={`Ask AI about ${selectedFile.name}...`}
            className="w-full pl-12 pr-24 py-3 bg-[#161b22] border border-gray-700 rounded-xl text-gray-200 placeholder-gray-500 focus:outline-none focus:bg-[#0d1117] transition-all font-sans"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
          />
          <button
            onClick={handleAsk}
            disabled={generating || !question.trim()}
            className={`absolute right-2 top-2 px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all ${generating || !question.trim()
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30'
              }`}
          >
            {generating ? 'Thinking...' : 'Ask'}
          </button>
        </div>
      </div>

      {/* AI Q&A Responses Area - If any exist for this file */}
      {fileQuestions.length > 0 && (
        <div className="mb-8 space-y-4">
          {fileQuestions.map(([key, response]) => (
            <div key={key} className="glass-panel p-5 rounded-xl border border-blue-500/20 bg-blue-900/5 relative overflow-hidden animate-fade-in">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
              <h4 className="text-sm font-semibold text-blue-300 mb-2 flex items-center gap-2">
                <span className="text-lg">🤖</span> AI Answer
              </h4>
              <p className="text-gray-300 text-sm leading-relaxed">{response.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modern Tabs (Pills) */}
      <div className="flex p-1 bg-gray-900/50 backdrop-blur rounded-xl border border-gray-800 w-fit mb-8 shadow-inner">
        {/* ... (rest of tabs code same as before) ... */}
        {selectedFile && selectedFile.type === 'file' && content && (
          <>
            <button
              onClick={() => setActiveTab('explanation')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'explanation'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`}
            >
              AI Explanation
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'code'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`}
            >
              Code View
            </button>
          </>
        )}
        <button
          onClick={() => setActiveTab('architecture')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'architecture'
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
        >
          Architecture
        </button>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-auto pr-2 scrollbar-thin scrollbar-thumb-gray-800">
        {activeTab === 'architecture' ? (
          <div className="glass-panel rounded-2xl border border-gray-700/50 overflow-hidden bg-[#0d1117]">
            <ArchitectureDiagram apiKey={apiKey} />
          </div>
        ) : activeTab === 'explanation' ? (
          explanation ? (
            <div className="prose prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-p:text-gray-300 prose-a:text-blue-400 hover:prose-a:text-blue-300 prose-code:text-blue-300 prose-strong:text-white">
              <ReactMarkdown
                components={{
                  // Custom styled code blocks
                  code: ({ node, className, children, ...props }) => {
                    const isInline = typeof children === 'string' && !children.includes('\n');
                    return isInline ? (
                      <code className="bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded text-sm font-mono border border-blue-500/20" {...props}>
                        {children}
                      </code>
                    ) : (
                      <div className="relative group my-6">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur"></div>
                        <code className="block bg-[#161b22] text-gray-300 p-5 rounded-xl border border-gray-700/50 overflow-x-auto text-sm font-mono shadow-sm relative" {...props}>
                          {children}
                        </code>
                      </div>
                    );
                  },
                  // Styling other elements
                  h1: (props) => <h1 className="text-3xl border-b border-gray-800 pb-2 mb-6" {...props} />,
                  h2: (props) => <h2 className="text-2xl mt-8 mb-4 flex items-center gap-2" {...props} />,
                  ul: (props) => <ul className="space-y-2 my-4" {...props} />,
                  li: (props) => (
                    <li className="flex items-start gap-2" {...props}>
                      <span className="mt-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></span>
                      <div>{props.children}</div>
                    </li>
                  ),
                  blockquote: (props) => (
                    <blockquote className="border-l-4 border-blue-500 bg-blue-500/5 px-4 py-2 rounded-r-lg my-6 not-italic" {...props} />
                  )
                }}
              >
                {explanation.content}
              </ReactMarkdown>

              {/* Separated Code Examples if any */}
              {explanation.codeSnippets && explanation.codeSnippets.length > 0 && (
                <div className="mt-12 pt-8 border-t border-gray-800">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <span>🧩</span> Reference Code
                  </h3>
                  <div className="grid gap-6">
                    {explanation.codeSnippets.map((snippet: string, idx: number) => (
                      <div key={idx} className="group relative">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-700 to-gray-600 rounded-xl opacity-20 blur"></div>
                        <pre className="relative bg-[#161b22] text-gray-300 p-5 rounded-xl border border-gray-700/50 overflow-x-auto text-sm font-mono">
                          <code>{snippet}</code>
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-gray-500">Explanation content unavailable.</p>
            </div>
          )
        ) : (
          content && selectedFile.type === 'file' ? (
            <div className="glass-panel rounded-xl border border-gray-700/50 overflow-hidden shadow-2xl">
              <CodeViewer
                fileName={selectedFile.name}
                filePath={selectedFile.path}
                content={content}
                apiKey={apiKey}
              />
            </div>
          ) : (
            <div className="text-center py-20 text-gray-500">
              <p>No code content available.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default ExplanationDisplay;