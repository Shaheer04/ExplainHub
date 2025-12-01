import React, { useState } from 'react';
import { useRepo } from '../contexts/RepoContext';
import { useExplanations } from '../contexts/ExplanationContext';

interface SearchAndAskProps {
  apiKey: string;
}

const SearchAndAsk: React.FC<SearchAndAskProps> = ({ apiKey }) => {
  const { selectedFile, fileContents } = useRepo();
  const { generateQuestionResponse, generating, explanations } = useExplanations();
  const [question, setQuestion] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleAsk = () => {
    if (!question.trim() || !selectedFile) return;
    
    const fileContent = fileContents[selectedFile.path] || '';
    generateQuestionResponse(question, selectedFile.path, fileContent);
    setQuestion('');
  };

  // For search, we would typically search through the repo structure
  // This is a basic implementation that filters the file tree
  const handleSearch = () => {
    // In a real implementation, we'd search through the repo structure and highlight matching files
    console.log('Searching for:', searchTerm);
  };

  return (
    <div className="p-4 border-b">
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search files in repository..."
            className="w-full p-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <svg 
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Ask about code section - only show if a file is selected */}
      {selectedFile && (
        <div className="mt-4">
          <h3 className="font-medium text-gray-700 mb-2">Ask about this code</h3>
          <div className="flex">
            <input
              type="text"
              placeholder={`Ask about ${selectedFile.name}...`}
              className="flex-1 p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
            />
            <button
              onClick={handleAsk}
              disabled={generating || !question.trim()}
              className={`px-4 py-2 rounded-r-md text-white ${
                generating || !question.trim() 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              Ask
            </button>
          </div>
        </div>
      )}

      {/* Show question responses if any */}
      {Object.entries(explanations).map(([key, explanation]) => {
        if (key.includes('_question_')) {
          return (
            <div key={key} className="mt-4 p-3 bg-blue-50 rounded-md">
              <div className="text-sm font-medium text-blue-800">Question Response</div>
              <div className="mt-1 text-gray-700">{explanation.content}</div>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
};

export default SearchAndAsk;