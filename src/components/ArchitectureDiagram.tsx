import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useRepo } from '../contexts/RepoContext';
import { useExplanations } from '../contexts/ExplanationContext';
import { fetchCompleteRepoStructure, fetchGitHubFileContent } from '../services/githubApi';
import { architectureGenerator } from '../services/architectureGenerator';
import { staticAnalysisService } from '../services/staticAnalysis';

interface ArchitectureDiagramProps {
  apiKey: string;
}

const ArchitectureDiagram: React.FC<ArchitectureDiagramProps> = ({ apiKey }) => {
  const { repo } = useRepo();
  const { architectureDiagram, setArchitectureDiagram } = useExplanations();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const diagramRef = useRef<HTMLDivElement>(null);

  // Zoom & Pan State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const scaleAmount = -e.deltaY * 0.001;
      setZoom(z => Math.min(Math.max(0.1, z + scaleAmount), 5));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

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

    if (!apiKey) {
      setError('Gemini API key is required. Please enter your API key above.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch complete repo structure
      console.log('ArchitectureDiagram: Starting diagram generation...');
      const structure = await fetchCompleteRepoStructure(repo.owner, repo.name, '', 3, 0);

      if (!structure || !structure.children || structure.children.length === 0) {
        throw new Error('Repository appears to be empty or inaccessible');
      }

      // 2. Identification of Key Files for Static Analysis
      const keyFilesToAnalyze = ['package.json', 'tsconfig.json'];
      const searchPaths = ['src/App.tsx', 'src/App.js', 'src/index.tsx', 'src/main.tsx', 'App.tsx', 'index.js'];

      const filesToFetch: { name: string; url: string; path: string }[] = [];

      // Helper to traverse and find files
      const findFile = (node: any, path: string) => {
        if (node.type === 'file') {
          if (keyFilesToAnalyze.includes(node.name) || searchPaths.includes(node.path)) {
            filesToFetch.push({ name: node.name, url: node.download_url, path: node.path });
          }
        } else if (node.children) {
          node.children.forEach((child: any) => findFile(child, child.path));
        }
      };

      findFile(structure, '');

      // Limit to 5 files to avoid rate limits
      const selectedFiles = filesToFetch.slice(0, 5);
      console.log('Fetching content for analysis:', selectedFiles.map(f => f.path));

      // 3. Fetch File Contents
      const fileContents: Record<string, string> = {};
      await Promise.all(selectedFiles.map(async (file) => {
        if (file.url) {
          try {
            const content = await fetchGitHubFileContent(file.url);
            fileContents[file.path] = content;
          } catch (e) {
            console.warn(`Failed to fetch content for ${file.path}`, e);
          }
        }
      }));

      // 4. Static Analysis
      console.log('Running Static Analysis...');
      const analysis = staticAnalysisService.analyzeCodebase(fileContents);

      // 5. Generate Diagram via Architecture Service
      console.log('Generating Architecture Diagram...');
      const diagram = await architectureGenerator.generateDiagram(repo.name, structure, analysis, apiKey);

      console.log('ArchitectureDiagram: Diagram generated successfully');
      setArchitectureDiagram(diagram);
    } catch (err) {
      console.error('ArchitectureDiagram: Error occurred:', err);

      let errorMessage = 'Failed to generate architecture diagram';

      if (err instanceof Error) {
        errorMessage = err.message;

        if (err.message.includes('rate limit')) {
          errorMessage += '\n\nTip: GitHub has a rate limit for unauthenticated requests.';
        } else if (err.message.includes('404')) {
          errorMessage += '\n\nPlease verify the repository exists and is public.';
        } else if (err.message.includes('API key')) {
          errorMessage += '\n\nCheck that your Gemini API key is valid.';
        }
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (architectureDiagram && diagramRef.current) {
      // Extract mermaid code from markdown code blocks if present
      let mermaidCode = architectureDiagram.trim();

      console.log('Raw diagram content:', mermaidCode.substring(0, 200));

      // Try multiple patterns to extract mermaid code
      const patterns = [
        /```mermaid\s*\n([\s\S]*?)```/,           // ```mermaid\n...\n```
        /```mermaid\s+([\s\S]*?)```/,              // ```mermaid ...```
        /```\s*mermaid\s*\n([\s\S]*?)```/,         // ``` mermaid\n...\n```
        /```\s*\n?([\s\S]*?)```/,                   // ```\n...``` or ```...```
      ];

      for (const pattern of patterns) {
        const match = mermaidCode.match(pattern);
        if (match && match[1]) {
          mermaidCode = match[1].trim();
          console.log('Extracted mermaid code using pattern:', pattern);
          break;
        }
      }

      // Remove any remaining markdown artifacts
      mermaidCode = mermaidCode
        .replace(/^```mermaid\s*/i, '')
        .replace(/^```\s*/, '')
        .replace(/```\s*$/, '')
        .trim();

      // Additional client-side validation and cleanup
      const lines = mermaidCode.split('\n');
      const cleanLines: string[] = [];

      for (let line of lines) {
        const trimmedLine = line.trim();

        // Skip empty lines
        if (!trimmedLine) {
          cleanLines.push(line);
          continue;
        }

        // CRITICAL: Remove lines with ONLY dashes/decorators
        if (/^[-=_*#]+$/.test(trimmedLine)) {
          console.log('Client: Removing decorative line:', trimmedLine);
          continue;
        }

        // Remove inline comments that might break parsing
        line = line.replace(/\s*%%.*$/, '');

        // Ensure subgraph names are quoted
        if (trimmedLine.startsWith('subgraph') && !line.includes('"') && !line.includes("'")) {
          line = line.replace(/subgraph\s+([^"\s]+)/, 'subgraph "$1"');
        }

        // Fix node IDs with dashes
        line = line.replace(/\b([A-Za-z0-9]+)-([A-Za-z0-9]+)/g, '$1_$2');

        cleanLines.push(line);
      }

      mermaidCode = cleanLines.join('\n').trim();

      console.log('Final mermaid code to render:', mermaidCode.substring(0, 200));

      // Clear previous diagram
      diagramRef.current.innerHTML = '';
      diagramRef.current.removeAttribute('data-processed');

      // Create a unique ID for the diagram
      const id = `mermaid-${Date.now()}`;

      try {
        mermaid.render(id, mermaidCode).then(({ svg }) => {
          if (diagramRef.current) {
            diagramRef.current.innerHTML = svg;
          }
        }).catch((err) => {
          console.error('Mermaid rendering error:', err);
          console.error('Failed code snippet:', mermaidCode.substring(0, 500));
          if (diagramRef.current) {
            diagramRef.current.innerHTML = `
              <div class="text-red-400 p-4 bg-red-900 bg-opacity-20 rounded">
                <p class="font-semibold mb-2">Failed to render diagram</p>
                <p class="text-sm mb-2">The diagram syntax may be invalid. Error: ${err.message || 'Unknown error'}</p>
                <p class="text-xs text-gray-400 mb-2">This usually happens when the AI generates invalid Mermaid syntax. Try regenerating.</p>
                <details class="mt-2">
                  <summary class="text-xs underline cursor-pointer">View problematic code</summary>
                  <pre class="mt-2 text-xs bg-gray-800 p-2 rounded overflow-x-auto">${mermaidCode.substring(0, 1000)}</pre>
                </details>
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
          <p className="text-github-dark-text-secondary text-sm mt-2 font-mono">{/* // Load a repo using the form above */}</p>
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

          <div className="bg-github-dark-bg p-6 rounded-lg border border-github-dark-border relative overflow-hidden h-[600px]">
            {/* Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
              <button onClick={() => setZoom(z => Math.min(z + 0.1, 5))} className="p-2 bg-gray-700 rounded text-white hover:bg-gray-600" title="Zoom In">+</button>
              <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="p-2 bg-gray-700 rounded text-white hover:bg-gray-600" title="Zoom Out">-</button>
              <button onClick={resetZoom} className="p-2 bg-gray-700 rounded text-white hover:bg-gray-600" title="Reset">⟲</button>
            </div>

            <div
              className={`w-full h-full cursor-${isDragging ? 'grabbing' : 'grab'} overflow-hidden border border-gray-800 rounded bg-[#0d1117]`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            >
              <div
                ref={diagramRef}
                className="mermaid-diagram origin-center transition-transform duration-75 ease-out"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  minHeight: '400px'
                }}
              />
            </div>
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
