import React from 'react';
import ReactMarkdown from 'react-markdown';
import { useRepo } from '../contexts/RepoContext';
import { useExplanations } from '../contexts/ExplanationContext';

interface ExplanationDisplayProps {
  apiKey: string;
}

const ExplanationDisplay: React.FC<ExplanationDisplayProps> = ({ apiKey }) => {
  const { selectedFile, fileContents } = useRepo();
  const { explanations, generateExplanation, generating, error } = useExplanations();
  
  React.useEffect(() => {
    if (selectedFile) {
      const content = fileContents[selectedFile.path];
      if (content && !explanations[selectedFile.path]) {
        generateExplanation(selectedFile, content);
      }
    }
  }, [selectedFile, fileContents, explanations, generateExplanation]);

  if (!selectedFile) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-indigo-100">
          <div className="text-7xl mb-4 animate-bounce">📂</div>
          <p className="text-2xl font-bold text-gray-800 mb-2">No File Selected</p>
          <p className="text-gray-500">Select a file from the sidebar to view AI-powered explanations</p>
        </div>
      </div>
    );
  }

  const explanation = explanations[selectedFile.path];
  const content = fileContents[selectedFile.path];
  
  // Show generating state with file preview for better UX
  if (generating && !explanation) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6 pb-4 border-b border-gray-200">
          <div className="flex items-center mb-2">
            <span className="text-2xl mr-2">{selectedFile.type === 'dir' ? '📁' : '📄'}</span>
            <h2 className="text-2xl font-bold text-gray-800">{selectedFile.name}</h2>
          </div>
          <p className="text-sm text-gray-500 font-mono">{selectedFile.path}</p>
        </div>
        
        {/* Show file info while generating */}
        {content && (
          <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg shadow-sm">
            <div className="flex items-center mb-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-800 font-semibold text-lg">AI is analyzing this file...</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center text-blue-700">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                </svg>
                <span className="font-medium">{content.length.toLocaleString()} characters</span>
              </div>
              <div className="flex items-center text-blue-700">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                </svg>
                <span className="font-medium">{content.split('\n').length} lines</span>
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-blue-600 bg-white bg-opacity-50 px-3 py-2 rounded">
              <span className="mr-2">⚡</span>
              Powered by Gemini 2.5 Flash for lightning-fast responses
            </div>
          </div>
        )}
        
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          <div className="h-5 bg-gray-200 rounded w-2/3 mt-6"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-4/5"></div>
        </div>
      </div>
    );
  }

  if (!content && !generating) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800">{selectedFile.name}</h2>
          <p className="text-sm text-gray-500">{selectedFile.path}</p>
        </div>
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
          <span className="text-gray-600 font-medium">Loading file content...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800">{selectedFile.name}</h2>
          <p className="text-sm text-gray-500">{selectedFile.path}</p>
        </div>
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex items-start">
            <span className="text-2xl mr-3">⚠️</span>
            <div>
              <h3 className="text-red-800 font-semibold mb-1">Error Generating Explanation</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 overflow-auto h-full max-w-4xl mx-auto">
      <div className="mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center mb-2">
          <span className="text-2xl mr-2">{selectedFile.type === 'dir' ? '📁' : '📄'}</span>
          <h2 className="text-2xl font-bold text-gray-800">{selectedFile.name}</h2>
        </div>
        <p className="text-sm text-gray-500 font-mono">{selectedFile.path}</p>
      </div>

      {explanation ? (
        <div className="prose max-w-none">
          <ReactMarkdown
            components={{
              // Style for paragraphs
              p: (props) => <p className="mb-3 text-gray-700" {...props} />,
              // Style for headings
              h1: (props) => <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-800" {...props} />,
              h2: (props) => <h2 className="text-xl font-bold mt-5 mb-3 text-gray-800" {...props} />,
              h3: (props) => <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-800" {...props} />,
              // Style for lists
              ul: (props) => <ul className="list-disc list-inside ml-4 mb-3" {...props} />,
              ol: (props) => <ol className="list-decimal list-inside ml-4 mb-3" {...props} />,
              li: (props) => <li className="mb-1 text-gray-700" {...props} />,
              // Style for code blocks
              code: ({node, className, children, ...props}) => {
                const isInline = typeof children === 'string' && !children.includes('\n');
                return isInline ? (
                  <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                    {children}
                  </code>
                ) : (
                  <code className="block bg-gray-800 text-gray-100 p-4 rounded-md overflow-x-auto text-sm" {...props}>
                    {children}
                  </code>
                );
              },
              // Style for pre blocks
              pre: (props) => (
                <pre className="bg-gray-800 text-gray-100 p-4 rounded-md overflow-x-auto text-sm mb-4" {...props} />
              ),
              // Style for emphasis
              em: (props) => <em className="italic text-gray-700" {...props} />,
              strong: (props) => <strong className="font-semibold text-gray-800" {...props} />,
              // Style for links
              a: (props) => <a className="text-blue-600 hover:underline" {...props} />,
            }}
          >
            {explanation.content}
          </ReactMarkdown>

          {/* Render code snippets if any */}
          {explanation.codeSnippets && explanation.codeSnippets.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-800 mb-2">Code Examples:</h3>
              {explanation.codeSnippets.map((snippet: string, idx: number) => (
                <pre
                  key={idx}
                  className="bg-gray-800 text-gray-100 p-4 rounded-md overflow-x-auto text-sm mb-4"
                >
                  <code>{snippet}</code>
                </pre>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-gray-500">
          <p>No explanation available yet.</p>
        </div>
      )}

      {/* Show file content if it's a file (not directory) */}
      {selectedFile.type === 'file' && fileContents[selectedFile.path] && (
        <div className="mt-6">
          <h3 className="font-semibold text-gray-800 mb-2">File Content:</h3>
          <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto text-sm max-h-60 overflow-y-auto">
            <code className="text-gray-800">{fileContents[selectedFile.path]}</code>
          </pre>
        </div>
      )}
    </div>
  );
};

export default ExplanationDisplay;