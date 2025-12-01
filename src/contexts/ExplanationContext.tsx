import React, { createContext, useContext, useState, ReactNode } from 'react';
import { GitHubFile } from '../services/githubApi';
import {
  generateDirectoryExplanation,
  generateFileExplanation,
  generateCodeQuestionResponse,
  Explanation
} from '../services/geminiApi';

interface ExplanationContextType {
  explanations: Record<string, Explanation>;
  generating: boolean;
  error: string | null;
  generateExplanation: (item: GitHubFile, content?: string) => Promise<void>;
  generateQuestionResponse: (question: string, filePath: string, fileContent: string) => Promise<void>;
}

const ExplanationContext = createContext<ExplanationContextType | undefined>(undefined);

export const useExplanations = () => {
  const context = useContext(ExplanationContext);
  if (!context) {
    throw new Error('useExplanations must be used within an ExplanationProvider');
  }
  return context;
};

interface ExplanationProviderProps {
  children: ReactNode;
  apiKey: string;
  repoName: string;
}

export const ExplanationProvider: React.FC<ExplanationProviderProps> = ({ children, apiKey, repoName }) => {
  const [explanations, setExplanations] = useState<Record<string, Explanation>>({});
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const generateExplanation = async (item: GitHubFile, content?: string) => {
    // Check cache first - instant return if available
    if (explanations[item.path]) {
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      let explanation: Explanation;
      
      if (item.type === 'dir') {
        explanation = await generateDirectoryExplanation(item.path, [], repoName, apiKey);
      } else {
        if (content) {
          // Start timing for performance monitoring
          const startTime = Date.now();
          explanation = await generateFileExplanation(item.path, content, repoName, apiKey);
          const duration = Date.now() - startTime;
          console.log(`AI explanation generated in ${duration}ms`);
        } else {
          explanation = { content: 'No content provided for explanation' };
        }
      }

      setExplanations(prev => ({
        ...prev,
        [item.path]: explanation
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while generating explanation');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const generateQuestionResponse = async (question: string, filePath: string, fileContent: string) => {
    setGenerating(true);
    setError(null);

    try {
      const startTime = Date.now();
      const explanation = await generateCodeQuestionResponse(
        question, 
        filePath, 
        fileContent, 
        repoName, 
        apiKey
      );
      const duration = Date.now() - startTime;
      console.log(`Question response generated in ${duration}ms`);

      // Store question response separately or with a special key
      const questionKey = `${filePath}_question_${Date.now()}`;
      setExplanations(prev => ({
        ...prev,
        [questionKey]: explanation
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while generating response');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const value = {
    explanations,
    generating,
    error,
    generateExplanation,
    generateQuestionResponse
  };

  return (
    <ExplanationContext.Provider value={value}>
      {children}
    </ExplanationContext.Provider>
  );
};