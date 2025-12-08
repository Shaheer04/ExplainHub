import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { generateBatchFunctionExplanations } from '../services/geminiApi';
import { useRepo } from '../contexts/RepoContext';

interface CodeViewerProps {
  fileName: string;
  filePath: string;
  content: string;
  apiKey: string;
}

interface FunctionInfo {
  name: string;
  line: number;
  isImported: boolean;
  tooltip: string;
  code?: string;
  aiExplanation?: string;
  importPath?: string;
}

const CodeViewer: React.FC<CodeViewerProps> = ({ fileName, filePath, content, apiKey }) => {
  const [hoveredFunction, setHoveredFunction] = useState<string | null>(null);
  const [functionExplanations, setFunctionExplanations] = useState<Record<string, string>>({});
  const [loadingBatch, setLoadingBatch] = useState(false);
  const { repo, fetchFileContent } = useRepo();

  // Extract function code from lines starting at given index
  const extractFunctionCode = useCallback((lines: string[], startIndex: number): string => {
    let braceCount = 0;
    let code = '';
    let started = false;

    for (let i = startIndex; i < Math.min(startIndex + 50, lines.length); i++) {
      const line = lines[i];
      code += line + '\n';

      // Count braces to find function end
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          started = true;
        } else if (char === '}') {
          braceCount--;
          if (started && braceCount === 0) {
            return code;
          }
        }
      }

      // For arrow functions without braces
      if (line.includes('=>') && !line.includes('{')) {
        if (i < lines.length - 1 && !lines[i + 1].trim().startsWith('.')) {
          return code;
        }
      }
    }

    return code;
  }, []);

  // Parse functions from code
  const functions = useMemo(() => {
    const funcs: FunctionInfo[] = [];
    const lines = content.split('\n');
    const fileExt = fileName.split('.').pop()?.toLowerCase();

    if (['js', 'jsx', 'ts', 'tsx'].includes(fileExt || '')) {
      // Find function declarations and arrow functions
      lines.forEach((line, index) => {
        // Skip comments
        if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) {
          return;
        }

        // Regular function declaration: function name()
        const funcMatch = line.match(/\bfunction\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/);
        if (funcMatch) {
          // Extract function code
          const funcCode = extractFunctionCode(lines, index);
          funcs.push({
            name: funcMatch[1],
            line: index + 1,
            isImported: false,
            tooltip: `Function ${funcMatch[1]} defined at line ${index + 1}`,
            code: funcCode
          });
        }

        // Arrow function: const/let/var name = () => or async () =>
        const arrowMatch = line.match(/\b(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/);
        if (arrowMatch) {
          const funcCode = extractFunctionCode(lines, index);
          funcs.push({
            name: arrowMatch[1],
            line: index + 1,
            isImported: false,
            tooltip: `Arrow function ${arrowMatch[1]} defined at line ${index + 1}`,
            code: funcCode
          });
        }

        // Class method: methodName() { or async methodName() {
        const methodMatch = line.match(/^\s+(?:async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*[{:]/);
        if (methodMatch && !line.includes('function') && !line.includes('if') && !line.includes('while') && !line.includes('for')) {
          const funcCode = extractFunctionCode(lines, index);
          funcs.push({
            name: methodMatch[1],
            line: index + 1,
            isImported: false,
            tooltip: `Method ${methodMatch[1]} defined at line ${index + 1}`,
            code: funcCode
          });
        }

        // React component: const Name = () => or function Name()
        const componentMatch = line.match(/\bconst\s+([A-Z][a-zA-Z0-9_$]*)\s*=\s*\([^)]*\)\s*=>/);
        if (componentMatch) {
          const funcCode = extractFunctionCode(lines, index);
          funcs.push({
            name: componentMatch[1],
            line: index + 1,
            isImported: false,
            tooltip: `React component ${componentMatch[1]} defined at line ${index + 1}`,
            code: funcCode
          });
        }
      });

      // Find imported functions (only relative imports from local files)
      lines.forEach((line, index) => {
        // Named imports: import { name1, name2 } from
        const namedImportMatch = line.match(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/);
        if (namedImportMatch) {
          const imports = namedImportMatch[1].split(',');
          const module = namedImportMatch[2];
          // Only include relative imports (local files)
          if (module.startsWith('./') || module.startsWith('../')) {
            imports.forEach(imp => {
              const name = imp.trim().split(/\s+as\s+/)[0].trim();
              if (name && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
                funcs.push({
                  name: name,
                  line: index + 1,
                  isImported: true,
                  tooltip: `Imported from '${module}' at line ${index + 1}`,
                  importPath: module
                });
              }
            });
          }
        }

        // Default import: import Name from
        const defaultImportMatch = line.match(/import\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s+from\s+['"]([^'"]+)['"]/);
        if (defaultImportMatch && !line.includes('{')) {
          const name = defaultImportMatch[1];
          const module = defaultImportMatch[2];
          // Only include relative imports (local files)
          if (module.startsWith('./') || module.startsWith('../')) {
            funcs.push({
              name: name,
              line: index + 1,
              isImported: true,
              tooltip: `Default import from '${module}' at line ${index + 1}`,
              importPath: module
            });
          }
        }
      });
    } else if (fileExt === 'py') {
      // Python functions
      lines.forEach((line, index) => {
        // Skip comments
        if (line.trim().startsWith('#')) {
          return;
        }

        // Function definition: def name(
        const funcMatch = line.match(/^\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
        if (funcMatch) {
          const funcCode = extractFunctionCode(lines, index);
          funcs.push({
            name: funcMatch[1],
            line: index + 1,
            isImported: false,
            tooltip: `Function ${funcMatch[1]} defined at line ${index + 1}`,
            code: funcCode
          });
        }

        // Class method
        const methodMatch = line.match(/^\s+def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
        if (methodMatch) {
          const funcCode = extractFunctionCode(lines, index);
          funcs.push({
            name: methodMatch[1],
            line: index + 1,
            isImported: false,
            tooltip: `Method ${methodMatch[1]} defined at line ${index + 1}`,
            code: funcCode
          });
        }

        // Imported functions: from module import name1, name2 (only relative imports)
        const importMatch = line.match(/from\s+([\w.]+)\s+import\s+(.+)/);
        if (importMatch) {
          const module = importMatch[1];
          // Only include relative imports (starting with .)
          if (module.startsWith('.')) {
            const imports = importMatch[2].split(',');
            imports.forEach(imp => {
              const name = imp.trim().split(/\s+as\s+/)[0].trim();
              if (name && name !== '*' && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
                funcs.push({
                  name: name,
                  line: index + 1,
                  isImported: true,
                  tooltip: `Imported from '${module}' at line ${index + 1}`,
                  importPath: module
                });
              }
            });
          }
        }
      });
    }

    // Remove duplicates by name (keep first occurrence)
    const seen = new Set<string>();
    return funcs.filter(func => {
      if (seen.has(func.name)) {
        return false;
      }
      seen.add(func.name);
      return true;
    });
  }, [content, fileName, extractFunctionCode]);

  // Separate local and imported functions
  const localFunctions = functions.filter(f => !f.isImported);
  const importedFunctions = functions.filter(f => f.isImported);

  console.log('CodeViewer - Total functions:', functions.length);
  console.log('CodeViewer - Local functions:', localFunctions.length);
  console.log('CodeViewer - Imported functions:', importedFunctions.length);

  // Batch load all function explanations on mount
  useEffect(() => {
    const loadAllExplanations = async () => {
      if (localFunctions.length === 0) return;
      if (Object.keys(functionExplanations).length > 0) return;
      if (loadingBatch) return;

      setLoadingBatch(true);

      try {
        const functionsToExplain = localFunctions
          .filter(f => f.code)
          .map(f => ({ name: f.name, code: f.code! }));

        if (functionsToExplain.length > 0) {
          console.log('Loading explanations for', functionsToExplain.length, 'functions in batch...');
          const explanations = await generateBatchFunctionExplanations(functionsToExplain, apiKey);
          setFunctionExplanations(explanations);
          console.log('Batch explanations loaded successfully');
        }
      } catch (error) {
        console.error('Failed to generate batch function explanations:', error);
      } finally {
        setLoadingBatch(false);
      }
    };

    loadAllExplanations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localFunctions.length, apiKey]);

  // Handle function hover
  const handleFunctionHover = useCallback((func: FunctionInfo) => {
    setHoveredFunction(func.name);
  }, []);

  // Handle imported function click to navigate to file
  const handleImportedFunctionClick = useCallback(async (func: FunctionInfo) => {
    if (!func.isImported || !func.importPath || !repo) return;
    
    console.log('Clicked imported function:', func.name, 'from:', func.importPath);
    
    const importPath = func.importPath;
    
    // Handle relative imports (starts with ./ or ../)
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      // Get current file directory
      const currentFilePath = filePath;
      const currentDir = currentFilePath.substring(0, currentFilePath.lastIndexOf('/'));
      
      console.log('Current file:', currentFilePath);
      console.log('Current dir:', currentDir);
      
      // Resolve relative path
      const pathParts = currentDir ? currentDir.split('/') : [];
      const importParts = importPath.split('/');
      
      for (const part of importParts) {
        if (part === '..') {
          pathParts.pop();
        } else if (part !== '.' && part !== '') {
          pathParts.push(part);
        }
      }
      
      const basePath = pathParts.join('/');
      console.log('Resolved base path:', basePath);
      
      // Try common file extensions
      const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.py'];
      
      for (const ext of extensions) {
        const potentialPath = basePath + ext;
        console.log('Trying path:', potentialPath);
        
        try {
          // Try to fetch the file directly from GitHub API
          const response = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.name}/contents/${potentialPath}`);
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.type === 'file' && data.download_url) {
              console.log('Found file:', potentialPath);
              
              const file: any = {
                name: data.name,
                path: data.path,
                type: 'file',
                size: data.size,
                download_url: data.download_url,
                sha: data.sha,
                url: data.url
              };
              
              await fetchFileContent(file);
              return;
            }
          }
        } catch (error) {
          console.log('Error fetching:', potentialPath, error);
        }
      }
      
      // Try index files
      const indexExtensions = ['/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
      for (const ext of indexExtensions) {
        const potentialPath = basePath + ext;
        console.log('Trying index:', potentialPath);
        
        try {
          const response = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.name}/contents/${potentialPath}`);
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.type === 'file' && data.download_url) {
              console.log('Found index file:', potentialPath);
              
              const file: any = {
                name: data.name,
                path: data.path,
                type: 'file',
                size: data.size,
                download_url: data.download_url,
                sha: data.sha,
                url: data.url
              };
              
              await fetchFileContent(file);
              return;
            }
          }
        } catch (error) {
          console.log('Error fetching index:', potentialPath, error);
        }
      }
      
      console.log('File not found for import:', importPath);
      alert(`Could not find file for import: ${importPath}\nTried path: ${basePath}`);
    } else {
      console.log('Skipping non-relative import:', importPath);
    }
  }, [repo, filePath, fetchFileContent]);

  return (
    <div className="space-y-4">
      {/* Function Lists */}
      {(localFunctions.length > 0 || importedFunctions.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Local Functions */}
          {localFunctions.length > 0 && (
            <div className="bg-github-dark-bg-secondary rounded-lg p-4 border border-github-dark-border">
              <h3 className="text-sm font-semibold text-blue-400 mb-3 flex items-center">
                <span className="mr-2">🔧</span>
                Defined Functions ({localFunctions.length})
              </h3>
              <div className="space-y-2 ">
                {localFunctions.map((func, idx) => (
                  <div
                    key={idx}
                    className="relative flex items-center justify-between p-2 bg-github-dark-bg rounded hover:bg-github-dark-bg-secondary transition-colors cursor-pointer"
                    onMouseEnter={() => handleFunctionHover(func)}
                    onMouseLeave={() => setHoveredFunction(null)}
                  >
                    <span className="text-sm font-mono text-github-dark-text">{func.name}</span>
                    <span className="text-xs text-github-dark-text-secondary">Line {func.line}</span>
                    
                    {/* Tooltip */}
                    {hoveredFunction === func.name && (
                      <div className="absolute z-50 left-0 top-full mt-2 px-4 py-3 bg-github-dark-bg border border-github-dark-border rounded-lg shadow-xl text-xs text-github-dark-text whitespace-normal w-80 max-w-md">
                        <div className="font-semibold text-blue-400 mb-2">{func.name}()</div>
                        {loadingBatch ? (
                          <div className="flex items-center gap-2 text-github-dark-text-secondary">
                            <div className="animate-spin w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                            <span>Loading explanations...</span>
                          </div>
                        ) : functionExplanations[func.name] ? (
                          <div className="text-github-dark-text">{functionExplanations[func.name]}</div>
                        ) : (
                          <div className="text-github-dark-text-secondary">Defined at line {func.line}</div>
                        )}
                        <div className="absolute bottom-full left-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-700"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Imported Functions */}
          {importedFunctions.length > 0 && (
            <div className="bg-github-dark-bg-secondary rounded-lg p-4 border border-github-dark-border">
              <h3 className="text-sm font-semibold text-purple-400 mb-3 flex items-center">
                <span className="mr-2">📦</span>
                Imported Functions ({importedFunctions.length})
              </h3>
              <div className="space-y-2 ">
                {importedFunctions.map((func, idx) => (
                  <div
                    key={idx}
                    className="relative flex items-center justify-between p-2 bg-github-dark-bg rounded hover:bg-github-dark-bg-secondary transition-colors cursor-pointer"
                    onMouseEnter={() => handleFunctionHover(func)}
                    onMouseLeave={() => setHoveredFunction(null)}
                    onClick={() => handleImportedFunctionClick(func)}
                  >
                    <span className="text-sm font-mono text-github-dark-text">{func.name}</span>
                    <span className="text-xs text-purple-500 flex items-center gap-1">
                      External
                      {func.importPath && func.importPath.startsWith('.') && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      )}
                    </span>
                    
                    {/* Tooltip */}
                    {hoveredFunction === func.name && (
                      <div className="absolute z-50 left-0 top-full mt-2 px-4 py-3 bg-github-dark-bg border border-github-dark-border rounded-lg shadow-xl text-xs text-github-dark-text whitespace-normal w-80 max-w-md">
                        <div className="font-semibold text-purple-400 mb-2">{func.name}</div>
                        <div className="text-github-dark-text-secondary">{func.tooltip}</div>
                        {func.importPath && func.importPath.startsWith('.') && (
                          <div className="text-blue-400 text-xs mt-2">💡 Click to open file</div>
                        )}
                        <div className="absolute bottom-full left-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-700"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Code Display */}
      <div className="bg-github-dark-bg-tertiary rounded-lg border border-github-dark-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-github-dark-bg-secondary border-b border-github-dark-border">
          <span className="text-sm font-mono text-github-dark-text">{fileName}</span>
          <span className="text-xs text-github-dark-text-secondary">{content.split('\n').length} lines</span>
        </div>
        <div className="relative">
          <pre className="p-4 overflow-x-auto text-sm overflow-y-auto" style={{ maxHeight: "calc(100vh - 300px)" }}>
            <code className="text-github-dark-text font-mono">
              {content.split('\n').map((line, index) => {
                const lineNum = index + 1;
                const hasFunction = functions.find(f => f.line === lineNum);
                
                return (
                  <div
                    key={index}
                    className={`flex ${hasFunction && !hasFunction.isImported ? 'bg-blue-900 bg-opacity-20' : ''}`}
                  >
                    <span className="inline-block w-12 text-right pr-4 text-github-dark-text-secondary select-none">
                      {lineNum}
                    </span>
                    <span 
                      className="flex-1"
                    >
                      {line.split(/(\w+)/).map((part, i) => {
                        const func = functions.find(f => f.name === part);
                        if (func) {
                          return (
                            <span
                              key={i}
                              className={`${
                                func.isImported 
                                  ? 'text-purple-400' 
                                  : 'text-blue-400'
                              }`}
                            >
                              {part}
                            </span>
                          );
                        }
                        return <span key={i}>{part}</span>;
                      })}
                    </span>
                  </div>
                );
              })}
            </code>
          </pre>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-github-dark-text-secondary">
        <div className="flex items-center">
          <span className="w-3 h-3 bg-blue-400 rounded mr-2"></span>
          <span>Defined in this file</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 bg-purple-400 rounded mr-2"></span>
          <span>Imported from external</span>
        </div>
      </div>
    </div>
  );
};

export default CodeViewer;
