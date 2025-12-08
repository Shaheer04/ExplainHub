import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useRepo } from '../contexts/RepoContext';
import { useExplanations } from '../contexts/ExplanationContext';
import { fetchCompleteRepoStructure } from '../services/githubApi';
import { generateArchitectureDiagram } from '../services/geminiApi';

interface ArchitectureDiagramProps {
  apiKey: string;
}

const ArchitectureDiagram: React.FC<ArchitectureDiagramProps> = ({ apiKey }) => {
  const { repo } = useRepo();
  const { architectureDiagram, setArchitectureDiagram } = useExplanations();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const diagramRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#58a6ff',
        primaryTextColor: '#c9d1d9',
        primaryBorderColor: '#58a6ff',
        lineColor: '#58a6ff',
        secondaryColor: '#1f6feb',
        tertiaryColor: '#56d364',
        background: '#0d1117',
        mainBkg: '#161b22',
        secondBkg: '#21262d',
        textColor: '#c9d1d9',
        fontSize: '14px',
      },
    });
  }, []);

  const generateDiagram = async () => {
    if (!repo) {
      setError('No repository loaded');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch complete repo structure
      console.log('ArchitectureDiagram: Fetching repo structure...');
      const structure = await fetchCompleteRepoStructure(repo.owner, repo.name, '', 3, 0);
      
      console.log('ArchitectureDiagram: Structure fetched:', structure);
      
      if (!structure) {
        throw new Error('Failed to fetch repository structure');
      }

      console.log('ArchitectureDiagram: Calling generateArchitectureDiagram with apiKey:', apiKey ? 'Present' : 'Missing');
      const diagram = await generateArchitectureDiagram(repo.name, structure, apiKey);
      
      console.log('ArchitectureDiagram: Diagram generated successfully');
      setArchitectureDiagram(diagram);
    } catch (err) {
      console.error('ArchitectureDiagram: Error details:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate architecture diagram';
      console.error('ArchitectureDiagram: Setting error:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (architectureDiagram && diagramRef.current) {
      // Extract mermaid code from markdown code blocks if present
      let mermaidCode = architectureDiagram;
      const match = architectureDiagram.match(/```mermaid\n([\s\S]*?)```/);
      if (match) {
        mermaidCode = match[1];
      } else if (architectureDiagram.includes('```')) {
        // Try to extract any code block
        const genericMatch = architectureDiagram.match(/```\n?([\s\S]*?)```/);
        if (genericMatch) {
          mermaidCode = genericMatch[1];
        }
      }

      // Clean up the mermaid code
      mermaidCode = mermaidCode.trim();

      // Clear previous diagram
      diagramRef.current.innerHTML = '';
      diagramRef.current.removeAttribute('data-processed');

      // Create a unique ID for the diagram
      const id = `mermaid-${Date.now()}`;
      
      try {
        console.log('Rendering mermaid code:', mermaidCode);
        mermaid.render(id, mermaidCode).then(({ svg }) => {
          if (diagramRef.current) {
            diagramRef.current.innerHTML = svg;
          }
        }).catch((err) => {
          console.error('Mermaid rendering error:', err);
          if (diagramRef.current) {
            diagramRef.current.innerHTML = `
              <div class="text-red-400 p-4 bg-red-900 bg-opacity-20 rounded">
                <p class="font-semibold mb-2">Failed to render diagram</p>
                <p class="text-sm">The diagram syntax may be invalid. Error: ${err.message || 'Unknown error'}</p>
                <button 
                  onclick="this.parentElement.parentElement.parentElement.querySelector('details').open = true"
                  class="mt-2 text-xs underline"
                >
                  View source code to debug
                </button>
              </div>
            `;
          }
        });
      } catch (err: any) {
        console.error('Mermaid error:', err);
        if (diagramRef.current) {
          diagramRef.current.innerHTML = `
            <div class="text-red-400 p-4 bg-red-900 bg-opacity-20 rounded">
              <p class="font-semibold mb-2">Failed to render diagram</p>
              <p class="text-sm">Error: ${err.message || 'Unknown error'}</p>
            </div>
          `;
        }
      }
    }
  }, [architectureDiagram]);

  if (!repo) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="bg-github-dark-bg-secondary p-8 rounded-2xl shadow-lg border border-github-dark-border">
          <div className="text-7xl mb-4 font-mono">[ ]</div>
          <p className="text-2xl font-bold text-github-dark-text mb-2">No Repository Loaded</p>
          <p className="text-github-dark-text-secondary">Load a repository first to generate its architecture</p>
          <p className="text-github-dark-text-secondary text-sm mt-2 font-mono">// Load a repo using the form above</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!architectureDiagram && !loading && !error && (
        <div className="bg-github-dark-bg-secondary p-8 rounded-lg border border-github-dark-border text-center">
          <div className="text-6xl mb-4 font-mono">{ }</div>
          <h3 className="text-xl font-bold text-github-dark-text mb-3">Generate Architecture Diagram</h3>
          <p className="text-github-dark-text-secondary mb-4 max-w-2xl mx-auto">
            Analyze repository structure and visualize:
          </p>
          <ul className="text-left text-github-dark-text mb-6 max-w-xl mx-auto space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-github-dark-accent mt-1">→</span>
              <span><strong>Actual files and directories</strong> from your repository</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">→</span>
              <span><strong>Dependencies and imports</strong> between files</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-1">→</span>
              <span><strong>Project structure</strong> with real file paths</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400 mt-1">→</span>
              <span><strong>Entry points</strong> and key components</span>
            </li>
          </ul>
          <button
            onClick={generateDiagram}
            className="px-6 py-3 bg-github-dark-accent hover:bg-github-dark-accent-hover text-white font-medium rounded-lg transition-colors flex items-center gap-2 mx-auto"
          >
            <span className="font-mono">{ }</span>
            Generate Diagram
          </button>
        </div>
      )}

      {loading && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 bg-opacity-50 border-l-4 border-github-dark-accent rounded-lg shadow-sm p-6">
          <div className="flex items-center mb-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mr-3"></div>
            <span className="text-blue-300 font-semibold text-lg">Analyzing repository structure...</span>
          </div>
          <div className="text-sm text-blue-200 space-y-2">
            <p>• Fetching directory structure (up to 3 levels deep)</p>
            <p>• Mapping actual files and their relationships</p>
            <p>• Identifying dependencies between components</p>
            <p>• Generating visual diagram with real file paths</p>
          </div>
          <div className="mt-4 flex items-center text-xs text-github-dark-accent bg-github-dark-bg bg-opacity-50 px-3 py-2 rounded font-mono">
            <span className="mr-2">⟳</span>
            This may take 10-15 seconds...
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-900 bg-opacity-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex items-start">
            <span className="text-2xl mr-3">⚠</span>
            <div className="flex-1">
              <h3 className="text-red-200 font-semibold mb-1">Failed to Generate Diagram</h3>
              <p className="text-red-300 mb-2">{error}</p>
              <p className="text-red-400 text-xs font-mono mb-3">Check browser console (F12) for detailed logs</p>
              <div className="flex gap-2">
                <button
                  onClick={generateDiagram}
                  className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-medium rounded transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => {
                    console.log('API Key present:', !!apiKey);
                    console.log('Repo:', repo);
                  }}
                  className="px-4 py-2 bg-github-dark-bg-secondary hover:bg-github-dark-bg-tertiary text-white text-sm font-medium rounded transition-colors"
                >
                  Debug Info
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {architectureDiagram && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-github-dark-text flex items-center gap-2">
              <span>🏛️</span>
              Architecture Overview
            </h3>
            <button
              onClick={generateDiagram}
              className="px-4 py-2 bg-github-dark-bg-secondary hover:bg-github-dark-bg-tertiary text-github-dark-text text-sm font-medium rounded transition-colors flex items-center gap-2"
            >
              <span>🔄</span>
              Regenerate
            </button>
          </div>

          <div className="bg-github-dark-bg p-6 rounded-lg border border-github-dark-border overflow-auto">
            <div 
              ref={diagramRef} 
              className="mermaid-diagram flex justify-center"
              style={{ minHeight: '400px' }}
            />
          </div>

          <div className="bg-github-dark-bg-secondary p-4 rounded-lg border border-github-dark-border">
            <details>
              <summary className="cursor-pointer text-sm font-medium text-github-dark-text hover:text-github-dark-text">
                View Diagram Source Code
              </summary>
              <pre className="mt-3 bg-github-dark-bg-tertiary p-4 rounded text-xs text-github-dark-text overflow-x-auto">
                {architectureDiagram}
              </pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchitectureDiagram;
