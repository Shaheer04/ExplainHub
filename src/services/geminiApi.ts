import { cacheService } from './cacheService';
import { generateLocalArchitecture } from './fallbackGenerator';
import { ArchitectureData, CodebaseAnalysis } from '../types/architecture';

// Queue-based Rate Limiter to prevent bursts and ensuring serial execution
class RateLimiter {
  private queue: Promise<void> = Promise.resolve();
  private lastCallTime = 0;
  // Free tier is ~15 RPM, which is 1 request every 4 seconds.
  // We'll set it to 2 seconds to allow *some* speed but rely on backoff if we hit limits,
  // or 4 seconds to be super safe. Let's go with 2000ms + random jitter to avoid lockstep.
  // Actually, user is hitting 429s easily. Let's try 3.5s to be safe for free tier.
  private readonly MIN_INTERVAL = 3500;

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    const operation = this.queue.then(async () => {
      const now = Date.now();
      const timeSinceLast = now - this.lastCallTime;

      if (timeSinceLast < this.MIN_INTERVAL) {
        const wait = this.MIN_INTERVAL - timeSinceLast;
        console.log(`⏳ Rate Limiter: Waiting ${wait}ms...`);
        await new Promise(resolve => setTimeout(resolve, wait));
      }

      try {
        this.lastCallTime = Date.now();
        return await fn();
      } catch (error) {
        throw error;
      }
    });

    // Update queue to wait for this operation (catch errors so queue doesn't stall)
    // We use then() ensuring it returns Promise<void>
    this.queue = operation.then(() => { }, () => { });

    return operation;
  }
}

export const rateLimiter = new RateLimiter();

// Deprecated: old helper, mapped to new system for backward compatibility if needed, 
// but we will replace usages.
async function waitForRateLimit() {
  // No-op in favor of wrapping calls in rateLimiter.schedule
}

export interface Explanation {
  content: string;
  codeSnippets?: string[];
}

export const generateRepoExplanation = async (
  repoName: string,
  repoStructure: any,
  readmeContent: string | null,
  apiKey: string
): Promise<Explanation> => {
  const prompt = `You are a senior developer explaining a GitHub repository to a teammate. Provide a high-level explanation of the repository "${repoName}" and its structure. Based on the repository structure and README content below, explain:

1. What this project is and what problem it solves
2. The high-level architecture and organization
3. Key directories and their purposes
4. Any important configuration files
5. Main entry points
6. Technology stack used

Be conversational like a coworker. Explain the 'why' not just the 'what'. Point out interesting patterns. Structure your response to be clear and informative.

REPOSITORY STRUCTURE:
${JSON.stringify(repoStructure, null, 2)}

README CONTENT:
${readmeContent || 'No README found'}`;

  return callGeminiAPI(prompt, apiKey);
};

export const generateDirectoryExplanation = async (
  dirPath: string,
  dirContents: any[],
  repoName: string,
  apiKey: string
): Promise<Explanation> => {
  const prompt = `Explain the "${dirPath}" directory:\n\nContents:\n${dirContents.map(item => `- ${item.name} (${item.type})`).join('\n')}\n\nProvide:\n1. Purpose of this directory (1-2 sentences)\n2. Key items and their roles\n3. How it fits in the project\n\nBe concise.`;

  return callGeminiAPI(prompt, apiKey);
};

export const generateFileExplanation = async (
  filePath: string,
  fileContent: string,
  repoName: string,
  apiKey: string
): Promise<Explanation> => {
  const fileExtension = filePath.split('.').pop()?.toLowerCase() || '';
  const lineCount = fileContent.split('\n').length;
  const charCount = fileContent.length;

  // Send full file when possible for complete context
  const maxChars = 15000;
  let contentToSend = fileContent;
  let isTruncated = false;

  if (charCount > maxChars) {
    isTruncated = true;
    const halfLimit = Math.floor(maxChars / 2);
    const start = fileContent.substring(0, halfLimit);
    const end = fileContent.substring(fileContent.length - halfLimit);
    contentToSend = `${start}\n\n... [middle section truncated - ${charCount - maxChars} characters omitted] ...\n\n${end}`;
  }

  // Detailed prompt with clear instructions
  let prompt = `You are analyzing the file "${filePath}" from the ${repoName} repository.

FILE STATISTICS:
- Lines: ${lineCount}
- Characters: ${charCount}
${isTruncated ? '- Note: Middle section truncated, but you have beginning and end for full understanding\n' : '- Status: Complete file content provided\n'}

FILE CONTENT:
\`\`\`
${contentToSend}
\`\`\`

IMPORTANT INSTRUCTIONS:
- You have ${isTruncated ? 'substantial portions of' : 'the complete'} file content above
- DO NOT mention "incomplete context", "limited context", or "need more information"
- Analyze and explain based on what IS provided
- Be thorough and detailed in your explanation
- Focus on what the code DOES and WHY it matters

`;

  if (['py', 'pyw', 'js', 'jsx', 'ts', 'tsx'].includes(fileExtension)) {
    prompt += `Provide a comprehensive explanation covering:

1. **Purpose & Overview**: What this file does and its role in the project (2-3 sentences)
2. **Key Components**: Main functions, classes, or components with their purposes
3. **Implementation Details**: Important patterns, algorithms, or logic flows
4. **Dependencies**: Key imports and how they're used
5. **Notable Features**: Any interesting patterns, optimizations, or important details

Be thorough and detailed. Explain the logic and reasoning behind the code.`;
  } else if (fileExtension === 'json') {
    prompt += `Provide a detailed explanation covering:

1. **Configuration Purpose**: What this configuration controls (2-3 sentences)
2. **Key Settings**: Important configuration values and their meanings
3. **Impact**: How these settings affect the project
4. **Notable Entries**: Any particularly important or interesting configurations

Be thorough and explain the significance of the configuration.`;
  } else if (fileExtension === 'md') {
    prompt += `Provide a comprehensive summary covering:

1. **Document Purpose**: What this document covers (2-3 sentences)
2. **Main Sections**: Overview of the major sections and topics
3. **Key Information**: Important details, instructions, or guidelines
4. **Highlights**: Notable points that developers should know

Be thorough and informative.`;
  } else if (['toml', 'yaml', 'yml', 'xml'].includes(fileExtension)) {
    prompt += `Provide a detailed explanation covering:

1. **Configuration Purpose**: What this configuration file controls (2-3 sentences)
2. **Key Settings**: Important configuration values and their effects
3. **Structure**: How the configuration is organized
4. **Impact**: How these settings affect the project

Be thorough and explain the configuration's significance.`;
  } else {
    prompt += `Provide a comprehensive explanation covering:

1. **Purpose**: What this file does and why it exists (2-3 sentences)
2. **Content Analysis**: Key elements and their purposes
3. **Structure**: How the file is organized
4. **Important Details**: Notable aspects developers should understand

Be thorough and detailed in your explanation.`;
  }

  return callGeminiAPI(prompt, apiKey);
};

export const generateCodeQuestionResponse = async (
  question: string,
  filePath: string,
  fileContent: string,
  repoName: string,
  apiKey: string
): Promise<Explanation> => {
  const charCount = fileContent.length;
  const maxChars = 12000;

  let contentToSend = fileContent;
  let isTruncated = false;

  if (charCount > maxChars) {
    isTruncated = true;
    const halfLimit = Math.floor(maxChars / 2);
    const start = fileContent.substring(0, halfLimit);
    const end = fileContent.substring(fileContent.length - halfLimit);
    contentToSend = `${start}\n\n... [middle section omitted] ...\n\n${end}`;
  }

  const prompt = `You are answering a question about the file "${filePath}" from the ${repoName} repository.

USER QUESTION: "${question}"

${isTruncated ? 'SUBSTANTIAL' : 'COMPLETE'} FILE CONTENT:
\`\`\`
${contentToSend}
\`\`\`

INSTRUCTIONS:
- Answer the question directly and thoroughly based on the code provided
- DO NOT mention "incomplete context" or "need more information" - work with what's provided
- Reference specific code sections when relevant
- Be detailed and helpful
- If the answer requires context from the visible code, explain it fully

Provide a clear, comprehensive answer:`;

  return callGeminiAPI(prompt, apiKey);
};

export const generateFunctionExplanation = async (
  functionName: string,
  functionCode: string,
  apiKey: string
): Promise<string> => {
  const prompt = `Explain the purpose of this function in 1-2 sentences. Be specific about what it does:

\`\`\`
${functionCode}
\`\`\``;

  const result = await callGeminiAPI(prompt, apiKey);
  return result.content;
};

export const generateBatchFunctionExplanations = async (
  functions: Array<{ name: string; code: string }>,
  apiKey: string
): Promise<Record<string, string>> => {
  if (functions.length === 0) return {};

  const functionsText = functions.map((func, idx) =>
    `FUNCTION_${idx + 1}: ${func.name}\n\`\`\`\n${func.code.slice(0, 500)}\n\`\`\``
  ).join('\n\n');

  const prompt = `Explain each function below in 1-2 sentences. Be specific about what each does.

${functionsText}

Respond in this exact format:
FUNCTION_1: [explanation]
FUNCTION_2: [explanation]
...`;

  const result = await callGeminiAPI(prompt, apiKey);

  const explanations: Record<string, string> = {};
  const lines = result.content.split('\n');

  functions.forEach((func, idx) => {
    const pattern = `FUNCTION_${idx + 1}:`;
    const line = lines.find(l => l.trim().startsWith(pattern));
    if (line) {
      const explanation = line.substring(line.indexOf(':') + 1).trim();
      explanations[func.name] = explanation;
    } else {
      explanations[func.name] = 'No explanation available';
    }
  });

  return explanations;
};

export const generateArchitectureDiagram = async (
  repoName: string,
  repoStructure: any,
  apiKey: string
): Promise<string> => {
  // 1. Check Cache
  const cacheKey = cacheService.generateKey(repoName, 'root', 'diagram');
  const cachedDiagram = cacheService.get<string>(cacheKey);

  if (cachedDiagram) {
    console.log('✨ Using cached architecture diagram');
    return cachedDiagram;
  }

  // CONFIGURATION: Token budget management
  const MAX_TREE_DEPTH = 3;

  const MAX_CHILDREN_PER_DIR = 20;

  /**
   * Generates a concise text-based tree representation
   */
  const generateTreeRepresentation = (node: any, prefix: string = '', depth: number = 0): string => {
    if (depth > MAX_TREE_DEPTH) return '';

    // Sort directories first, then files
    const children = (node.children || []).sort((a: any, b: any) => {
      if (a.type === 'dir' && b.type !== 'dir') return -1;
      if (a.type !== 'dir' && b.type === 'dir') return 1;
      return a.name.localeCompare(b.name);
    });

    let output = '';
    const relevantChildren = children.filter((c: any) => {
      const ignored = [
        'node_modules', '.git', '.vscode', '.idea', 'dist', 'build', 'coverage',
        'package-lock.json', 'yarn.lock', '.DS_Store'
      ];
      return !ignored.some(pattern => c.name === pattern || c.name.startsWith(pattern));
    });

    const visibleChildren = relevantChildren.slice(0, MAX_CHILDREN_PER_DIR);
    const hiddenCount = relevantChildren.length - visibleChildren.length;

    visibleChildren.forEach((child: any, index: number) => {
      const isLast = index === visibleChildren.length - 1 && hiddenCount === 0;
      const marker = isLast ? '└── ' : '├── ';
      const newPrefix = prefix + (isLast ? '    ' : '│   ');

      output += `${prefix}${marker}${child.name}${child.type === 'dir' ? '/' : ''}\n`;

      if (child.type === 'dir') {
        output += generateTreeRepresentation(child, newPrefix, depth + 1);
      }
    });

    if (hiddenCount > 0) {
      output += `${prefix}└── ... (${hiddenCount} more files)\n`;
    }

    return output;
  };

  const treeStructure = generateTreeRepresentation(repoStructure);

  // Calculate stats for context
  const fileCount = JSON.stringify(repoStructure).match(/"type":"file"/g)?.length || 0;
  const dirCount = JSON.stringify(repoStructure).match(/"type":"dir"/g)?.length || 0;

  const prompt = `You are a Senior Software Architect. Analyze the codebase structure and generate a tailored Technical Architecture Diagram in JSON format.
  
  CONTEXT:
  - Repository: ${repoName}
  - Files: ~${fileCount} | Directories: ~${dirCount}
  
  FILE STRUCTURE (TreeMap):
  \`\`\`
  ${treeStructure}
  \`\`\`
  
  INSTRUCTIONS:
  1. **Concept over Files**: Do NOT list every file. Group them into logical "Functional Blocks" (e.g., instead of listing auth.ts, user.ts, session.ts -> create one node "Auth Module").
  2. **Technical Depth**: Identify patterns (MVC, Hexagonal, Clean Arch). Use proper technical names (e.g., "REST API Controller", "PostgreSQL Adapter", "React Router").
  3. **Relationships**: Show data flow (solid lines) and dependencies (dotted lines).
  4. **Status Indicator**: You MUST include a special unconnected subgraph labeled "Status" containing a single node "AI_GEN" with label "✨ AI Generated Architecture".
  
  OUTPUT FORMAT:
  Return ONLY a valid JSON object matching this TypeScript interface:
  
  \`\`\`typescript
  interface DiagramData {
    modules: {
      id: string;       // e.g., "backend_api"
      label: string;    // e.g., "Backend API"
      components: {
        id: string;     // e.g., "auth_controller"
        label: string;  // e.g., "Auth Controller"
      }[];
    }[];
    relationships: {
      from: string;
      to: string;
      type: 'solid' | 'dotted';
      label?: string;
    }[];
  }
  \`\`\`
  
  CONSTRAINTS:
  - IDs must be alphanumeric using underscores.
  - Max 20 nodes total (keep it high-level).
  - IMPORTANT: Include the "Status" module with "AI_GEN" component as requested.
  - Do NOT output Mermaid code directly. Output strictly JSON.
  
  GENERATE JSON NOW:`;

  console.log('Architecture diagram - JSON Prompt length:', prompt.length);

  // Wrap in queue
  return rateLimiter.schedule(async () => {
    // Retry logic
    const maxRetries = 3;
    let lastError: any = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Default backoff - wait inside the queue slot
          let waitTime = Math.pow(2, attempt) * 2000;
          console.log(`Retry attempt ${attempt + 1}/${maxRetries} for JSON generation...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 4000,
              topK: 40,
              topP: 0.8,
              responseMimeType: "application/json"
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt + 2) * 1000;

            console.error('🚨 429 Rate Limit (Architecture)');
            await new Promise(resolve => setTimeout(resolve, waitTime));
            lastError = { status: 429, message: 'Rate limit exceeded' };
            continue;
          }

          throw new Error(`API error: ${response.status} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) throw new Error('No content returned from API');

        // Parse JSON
        let diagramData: any;
        try {
          const jsonStr = text.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
          diagramData = JSON.parse(jsonStr);
        } catch (e) {
          console.error('Failed to parse Gemini JSON:', text);
          throw new Error('AI returned invalid JSON');
        }

        const diagram = convertJsonToMermaid(diagramData);

        // Save to Cache
        try {
          cacheService.set(cacheKey, diagram);
        } catch (e) {
          console.warn('Failed to cache diagram:', e);
        }

        return diagram;

      } catch (error: any) {
        console.error(`Attempt ${attempt + 1} failed:`, error);
        lastError = error;
      }
    }

    // FALLBACK STRATEGY
    // If we are here, all retries failed (including 429s).
    // Instead of showing an error, show the Local Fallback Diagram.
    console.warn('⚠️ All AI attempts failed. Generating local fallback diagram.');
    return generateLocalArchitecture(repoStructure);
  });
};

export const extractArchitectureData = async (
  repoName: string,
  repoStructure: any,
  analysis: CodebaseAnalysis,
  apiKey: string
): Promise<ArchitectureData> => {
  const fileCount = JSON.stringify(repoStructure).match(/"type":"file"/g)?.length || 0;

  // Serialize analysis for the prompt (limit size if needed)
  const analysisSummary = analysis.files.map(f => {
    return `File: ${f.file}
    - Imports: ${f.imports.join(', ')}
    - Hooks: ${f.hooks.join(', ')}
    - API Calls: ${f.apiCalls.join(', ')}`;
  }).join('\n\n').slice(0, 10000); // hard limit to avoid context overflow

  const prompt = `You are a Senior Software Architect. Analyze the codebase structure and static analysis data to generate a structured architecture definition.

CONTEXT:
- Repository: ${repoName}
- Files: ~${fileCount}
- Static Analysis Data (Imports, Hooks, API Calls):
${analysisSummary}

INSTRUCTIONS:
1. **Identify High-Level Modules**: specific functional blocks (e.g., "Auth Service", "User Context", "Payment Controller") that EXIST in the code.
2. **Abstract UI Components**: Do NOT list individual UI atoms like "Button", "Input", "Header". Group them into a single "Presentation Layer" or "UI Components" node.
3. **Determine Layers**: logical layers (e.g., "Presentation", "State Management", "Services", "Data", "External").
4. **Map Relationships**: usage and dependencies based on the imports and calls provided.
5. **Strict Grounding**: DO NOT INVENT COMPONENTS. Every component must correspond to a real file or directory visible in the "FILE STRUCTURE" or "Static Analysis Data". If it's not in the code, do not include it.
6. **Strict JSON**: Return only valid JSON adhering to the schema.

OUTPUT SCHEMA:
{
  "components": [
    {
      "id": "unique_snake_case_id",
      "name": "Human Readable Name",
      "type": "service|controller|model|view|utility|component|context|hook",
      "layer": "presentation|state|services|data|infrastructure|external",
      "responsibilities": ["list", "of", "responsibilities"]
    }
  ],
  "relationships": [
    {
      "from": "component_id_a",
      "to": "component_id_b",
      "type": "calls|depends_on|imports|inherits|uses|provides",
      "description": "context of relationship"
    }
  ],
  "layers": ["Presentation", "Services", "Data"]
}

Constraints:
- Generate comprehensive high-level architecture.
- **Max 20 components**. Focus on the most important modules.
- Ensure all IDs in relationships exist in components.
- **NO HALLUCINATIONS**: Do not add databases, caches, or services unless you see code for them (e.g., a Redis client file).
- Response must be pure JSON.
`;

  return callGeminiAPI(prompt, apiKey).then(res => {
    // Check if the response implies a failure (rate limit, error message, etc)
    if (res.content.trim().startsWith('⚠️') || res.content.includes('Rate Limit Exceeded')) {
      console.warn('AI Generation prevented due to error:', res.content);
      throw new Error(res.content); // Propagate the actual error message
    }

    try {
      const jsonStr = res.content.replace(/^[\s\S]*?```json/g, '').replace(/```[\s\S]*?$/g, '').trim();
      // Fallback cleanup if regex misses
      const cleanJson = jsonStr.replace(/```/g, '');
      return JSON.parse(cleanJson) as ArchitectureData;
    } catch (e) {
      console.error("JSON Parse Error in extractArchitectureData", e);
      console.error("Raw AI Content:", res.content); // Log raw content for debugging
      throw new Error("Failed to parse Architecture JSON. The AI might have returned invalid format.");
    }
  });
};

/**
 * Converts the structured JSON architecture data into valid Mermaid syntax
 * guaranteeing correct quoting and escaping.
 */
const convertJsonToMermaid = (data: any): string => {
  if (!data || !data.modules || !Array.isArray(data.modules)) {
    throw new Error('Invalid diagram data structure');
  }

  let mermaid = 'graph TD\n';
  const validIds = new Set<string>();

  // 1. Process Modules & Components
  data.modules.forEach((mod: any) => {
    // Sanitize module label
    const safeModLabel = (mod.label || 'Module').replace(/"/g, "'");

    mermaid += `    subgraph "${safeModLabel}"\n`;

    if (Array.isArray(mod.components)) {
      mod.components.forEach((comp: any) => {
        // Ensure ID is safe (alphanumeric + underscore)
        const safeId = (comp.id || 'node').replace(/[^a-zA-Z0-9_]/g, '_');
        validIds.add(safeId);

        // Ensure label is strictly quoted
        const safeLabel = (comp.label || safeId).replace(/"/g, "'");

        mermaid += `        ${safeId}["${safeLabel}"]\n`;
      });
    }

    mermaid += `    end\n`;
  });

  // 2. Process Relationships
  if (Array.isArray(data.relationships)) {
    data.relationships.forEach((rel: any) => {
      const fromId = (rel.from || '').replace(/[^a-zA-Z0-9_]/g, '_');
      const toId = (rel.to || '').replace(/[^a-zA-Z0-9_]/g, '_');

      // Only draw edges between valid, existing nodes to prevent ghost nodes
      if (validIds.has(fromId) && validIds.has(toId)) {
        const arrow = rel.type === 'dotted' ? '-.->' : '-->';
        mermaid += `    ${fromId} ${arrow} ${toId}\n`;
      }
    });
  }

  // 3. Styling (Optional: Add common class)
  mermaid += '\n    classDef default fill:#1f2937,stroke:#3b82f6,stroke-width:2px,color:#fff;';

  return mermaid;
};

const callGeminiAPI = async (prompt: string, apiKey: string): Promise<Explanation> => {
  if (!apiKey) {
    throw new Error('Gemini API key is required');
  }

  // Wrap the entire API interaction in the queue
  return rateLimiter.schedule(async () => {
    const modelNames = [
      'gemini-3-flash-preview',
      'gemini-2.5-flash',
    ];

    let lastError: any = null;
    const maxRetries = 2;

    for (const modelName of modelNames) {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            // ... existing retry backoff ... 
            // Note: RateLimiter handles inter-request spacing, but *retries* might need their own wait 
            // IF the failure wasn't a rate limit? 
            // Actually, if we fail inside the schedule, we are holding the lock?
            // Yes, 'await fn()' holds the queue.
            const waitTime = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }

          console.log(`Trying model: ${modelName} (attempt ${attempt + 1})`);
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: prompt
                }]
              }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192,
                topK: 40,
                topP: 0.95
              }
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            // Handle Rate Limits specifically
            if (response.status === 429) {
              console.error(`429 Rate Limit on ${modelName}`);
              // If we hit 429 inside the serialized queue, it really means we are pushing too hard 
              // OR quota is done.
              // We should NOT hold the queue forever if we loop.
              // But the loop is finite.
              lastError = { status: 429, message: 'Rate limit / Quota exceeded', details: errorData };

              // If specific retry-after?
              const retryAfter = response.headers.get('Retry-After');
              if (retryAfter) {
                await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000));
                continue; // Retry same model
              }
              // Else continue to next model? 
              // Usually 429 applies to key, not model. But let's try.
              break;
            }

            console.error(`Model ${modelName} failed with status ${response.status}:`, errorData);
            lastError = errorData;
            break; // Next model
          }

          const data = await response.json();
          // ... (validation logic) ...
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

          if (!text) {
            // ... error handling ...
            lastError = 'No text in response';
            break;
          }

          return {
            content: text,
            codeSnippets: extractCodeSnippets(text)
          };

        } catch (error) {
          console.warn(`Model ${modelName} attempt ${attempt + 1} failed:`, error);
          lastError = error;
          if (attempt === maxRetries - 1) break;
        }
      }
    }

    // Fallback error
    const errorMessage = lastError ? JSON.stringify(lastError, null, 2) : 'Unknown error';
    if (lastError?.status === 429) {
      return {
        content: `⚠️ **Rate Limit Exceeded**\nPlease wait a moment. The Free Tier limit is strict (15 req/min). We are pacing requests, but you may have hit the daily quota.`,
        codeSnippets: []
      };
    }

    return {
      content: `⚠️ Generation Failed.\nLast error: ${errorMessage}`,
      codeSnippets: []
    };
  });
};


const extractCodeSnippets = (text: string): string[] => {
  const regex = /```[\s\S]*?```/g;
  const matches = text.match(regex) || [];
  return matches;
};
