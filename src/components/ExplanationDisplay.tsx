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
  const { explanations, generateExplanation, generating, error, architectureDiagram } = useExplanations();
  const [activeTab, setActiveTab] = useState<'explanation' | 'code' | 'architecture'>('explanation');
  
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
      <div className="p-6 overflow-auto h-full max-w-7xl mx-auto">
        {architectureDiagram ? (
          <div className="space-y-6">
            <div className="mb-6 pb-4 border-b border-github-dark-border">
              <h2 className="text-2xl font-bold text-github-dark-text flex items-center gap-2">
                <span>🏗️</span>
                Repository Architecture
              </h2>
              <p className="text-sm text-github-dark-text-secondary mt-2">Visualizing the structure and relationships of your codebase</p>
            </div>
            <ArchitectureDiagram apiKey={apiKey} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="bg-github-dark-bg-secondary p-8 rounded-2xl shadow-lg border border-github-dark-border">
              <div className="text-7xl mb-4">←</div>
              <p className="text-2xl font-bold text-github-dark-text mb-2">No File Selected</p>
              <p className="text-github-dark-text-secondary">Select a file from the tree to view its explanation</p>
              <p className="text-github-dark-text-secondary text-sm mt-2 font-mono">// Start by clicking on the left</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  const explanation = explanations[selectedFile.path];
  const content = fileContents[selectedFile.path];
  
  // Show generating state with file preview for better UX
  if (generating && !explanation) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6 pb-4 border-b border-github-dark-border">
          <div className="flex items-center mb-2">
            <span className="text-2xl mr-2">{selectedFile.type === 'dir' ? '📁' : '📄'}</span>
            <h2 className="text-2xl font-bold text-github-dark-text">{selectedFile.name}</h2>
          </div>
          <p className="text-sm text-github-dark-text-secondary font-mono">{selectedFile.path}</p>
        </div>
        
        {/* Show file info while generating */}
        {content && (
          <div className="mb-6 p-5 bg-gradient-to-r from-blue-900 to-indigo-900 bg-opacity-50 border-l-4 border-blue-500 rounded-lg shadow-sm">
            <div className="flex items-center mb-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400 mr-3"></div>
              <span className="text-blue-300 font-semibold text-lg">Analyzing file...</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center text-blue-300">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                </svg>
                <span className="font-medium">{content.length.toLocaleString()} characters</span>
              </div>
              <div className="flex items-center text-blue-300">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                </svg>
                <span className="font-medium">{content.split('\n').length} lines</span>
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-blue-400 bg-github-dark-bg bg-opacity-50 px-3 py-2 rounded">
              <span className="mr-2 font-mono">⟳</span>
              Processing with Gemini 2.0 Flash
            </div>
          </div>
        )}
        
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-github-dark-bg-secondary rounded w-3/4"></div>
          <div className="h-4 bg-github-dark-bg-secondary rounded w-full"></div>
          <div className="h-4 bg-github-dark-bg-secondary rounded w-5/6"></div>
          <div className="h-4 bg-github-dark-bg-secondary rounded w-4/6"></div>
          <div className="h-5 bg-github-dark-bg-secondary rounded w-2/3 mt-6"></div>
          <div className="h-4 bg-github-dark-bg-secondary rounded w-full"></div>
          <div className="h-4 bg-github-dark-bg-secondary rounded w-4/5"></div>
        </div>
      </div>
    );
  }

  if (!content && !generating) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-github-dark-text">{selectedFile.name}</h2>
          <p className="text-sm text-github-dark-text-secondary">{selectedFile.path}</p>
        </div>
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
          <span className="text-github-dark-text font-medium">Loading file content...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-github-dark-text">{selectedFile.name}</h2>
          <p className="text-sm text-github-dark-text-secondary">{selectedFile.path}</p>
        </div>
        <div className="bg-red-900 bg-opacity-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex items-start">
            <span className="text-2xl mr-3">⚠</span>
            <div>
              <h3 className="text-red-200 font-semibold mb-1">Generation Failed</h3>
              <p className="text-red-300">{error}</p>
              <p className="text-red-400 text-sm mt-2 font-mono">// Check console for details</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 overflow-auto h-full max-w-7xl mx-auto">
      <div className="mb-6 pb-4 border-b border-github-dark-border">
        <div className="flex items-center mb-2">
          <span className="text-2xl mr-2">{selectedFile.type === 'dir' ? '📁' : '📄'}</span>
          <h2 className="text-2xl font-bold text-github-dark-text">{selectedFile.name}</h2>
        </div>
        <p className="text-sm text-github-dark-text-secondary font-mono">{selectedFile.path}</p>
      </div>

      {/* Tabs - Show for both files and at repository level */}
      <div className="flex border-b border-github-dark-border mb-6">
        {selectedFile && selectedFile.type === 'file' && content && (
          <>
            <button
              onClick={() => setActiveTab('explanation')}
              className={`px-6 py-3 font-medium transition-colors relative ${
                activeTab === 'explanation'
                  ? 'text-github-dark-accent border-b-2 border-github-dark-accent'
                  : 'text-github-dark-text-secondary hover:text-github-dark-text'
              }`}
            >
              AI Explanation
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-6 py-3 font-medium transition-colors relative ${
                activeTab === 'code'
                  ? 'text-github-dark-accent border-b-2 border-github-dark-accent'
                  : 'text-github-dark-text-secondary hover:text-github-dark-text'
              }`}
            >
              Code View
            </button>
          </>
        )}
        <button
          onClick={() => setActiveTab('architecture')}
          className={`px-6 py-3 font-medium transition-colors relative ${
            activeTab === 'architecture'
              ? 'text-github-dark-accent border-b-2 border-github-dark-accent'
              : 'text-github-dark-text-secondary hover:text-github-dark-text'
          }`}
        >
          Architecture
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'architecture' ? (
        <ArchitectureDiagram apiKey={apiKey} />
      ) : activeTab === 'explanation' ? (
        explanation ? (
          <div className="prose max-w-none">
            <ReactMarkdown
          components={{
            // Style for paragraphs
            p: (props) => <p className="mb-3 text-github-dark-text" {...props} />,
            // Style for headings
            h1: (props) => <h1 className="text-2xl font-bold mt-6 mb-4 text-github-dark-text" {...props} />,
            h2: (props) => <h2 className="text-xl font-bold mt-5 mb-3 text-github-dark-text" {...props} />,
            h3: (props) => <h3 className="text-lg font-semibold mt-4 mb-2 text-github-dark-text" {...props} />,
            // Style for lists
            ul: (props) => <ul className="list-disc list-inside ml-4 mb-3" {...props} />,
            ol: (props) => <ol className="list-decimal list-inside ml-4 mb-3" {...props} />,
            li: (props) => <li className="mb-1 text-github-dark-text" {...props} />,
            // Style for code blocks
            code: ({node, className, children, ...props}) => {
              const isInline = typeof children === 'string' && !children.includes('\n');
              return isInline ? (
                <code className="bg-github-dark-bg-secondary text-github-dark-text px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                  {children}
                </code>
              ) : (
                <code className="block bg-github-dark-bg-tertiary text-github-dark-text p-4 rounded-md overflow-x-auto text-sm" {...props}>
                  {children}
                </code>
              );
            },
            // Style for pre blocks
            pre: (props) => (
              <pre className="bg-github-dark-bg-tertiary text-github-dark-text p-4 rounded-md overflow-x-auto text-sm mb-4" {...props} />
            ),
            // Style for emphasis
            em: (props) => <em className="italic text-github-dark-text" {...props} />,
            strong: (props) => <strong className="font-semibold text-github-dark-text" {...props} />,
            // Style for links
            a: (props) => <a className="text-blue-400 hover:underline" {...props} />,
          }}
        >
          {explanation.content}
        </ReactMarkdown>

        {/* Render code snippets if any */}
        {explanation.codeSnippets && explanation.codeSnippets.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-github-dark-text mb-2">Code Examples:</h3>
            {explanation.codeSnippets.map((snippet: string, idx: number) => (
              <pre
                key={idx}
                className="bg-github-dark-bg-tertiary text-github-dark-text p-4 rounded-md overflow-x-auto text-sm mb-4"
              >
                <code>{snippet}</code>
              </pre>
            ))}
          </div>
        )}
      </div>
    ) : (
      <div className="text-github-dark-text-secondary">
        <p>No explanation available yet.</p>
      </div>
    )
      ) : (
        content && selectedFile.type === 'file' ? (
          <CodeViewer 
            fileName={selectedFile.name}
            filePath={selectedFile.path}
            content={content}
            apiKey={apiKey}
          />
        ) : (
          <div className="text-github-dark-text-secondary">
            <p>No code content available.</p>
          </div>
        )
      )}
    </div>
  );
};

export default ExplanationDisplay;