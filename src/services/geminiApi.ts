
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

export const generateArchitectureDiagram = async (
  repoName: string,
  repoStructure: any,
  apiKey: string
): Promise<string> => {
  // Create a super simplified list of just file/folder names (no JSON)
  const extractFileList = (struct: any, currentPath: string = '', depth: number = 0): string[] => {
    if (depth > 2) return [];
    
    const items: string[] = [];
    
    if (struct.type === 'file') {
      items.push(currentPath || struct.name);
    } else if (struct.type === 'dir') {
      const dirName = currentPath ? `${currentPath}/${struct.name}` : struct.name;
      items.push(dirName + '/');
      
      if (struct.children && Array.isArray(struct.children)) {
        // Only take first 10 items from each directory
        struct.children.slice(0, 10).forEach((child: any) => {
          items.push(...extractFileList(child, dirName, depth + 1));
        });
      }
    }
    
    return items;
  };

  const fileList = extractFileList(repoStructure).slice(0, 25); // Reduced to 25 files
  const fileListString = fileList.join('\n');
  
  console.log('Architecture diagram - File count:', fileList.length);

  const prompt = `Create technical architecture diagram for: ${repoName}

Files:
${fileListString}

Show:
- Entry points (index, main, App)
- Core folders (components, services, utils)
- Data flow: entry → UI → logic → data
- Config files

Example:
\`\`\`mermaid
graph TD
    Entry[index.tsx] --> App[App.tsx]
    App --> UI[components/]
    App --> Services[services/]
    UI --> Header[Header.tsx]
    Services --> API[api.ts]
\`\`\`

Rules:
- Use real file names
- 10-15 nodes max
- Use --> for flow
- Descriptive IDs

IMPORTANT: Keep diagram SMALL and SIMPLE. Return ONLY mermaid code block.`;

  console.log('Architecture diagram - Prompt length:', prompt.length);
  
  // Use a specialized API call with lower output tokens for diagrams
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 800,  // Smaller limit for diagrams
          topK: 20,
          topP: 0.8
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'API error');
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      console.error('No text in response:', data);
      throw new Error('No diagram generated');
    }

    console.log('Architecture diagram - Generated successfully');
    return text;
  } catch (error) {
    console.error('Architecture diagram - Error:', error);
    throw error;
  }
};

const callGeminiAPI = async (prompt: string, apiKey: string): Promise<Explanation> => {
  if (!apiKey) {
    throw new Error('Gemini API key is required');
  }

  // Use latest Gemini models (as of Dec 2024)
  const modelNames = [
      'gemini-2.5-pro',
  ];

  let lastError: any = null;

  for (const modelName of modelNames) {
    try {
      console.log(`Trying model: ${modelName}`);
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
            maxOutputTokens: 2048,
            topK: 40,
            topP: 0.95
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Model ${modelName} failed with status ${response.status}:`, errorData);
        lastError = errorData;
        continue;
      }

      const data = await response.json();

      if (data.error) {
        console.error(`Model ${modelName} returned error:`, data.error);
        lastError = data.error;
        continue;
      }

      // Check response structure
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        console.error(`Model ${modelName} returned no text.`);
        console.error('Finish reason:', data.candidates?.[0]?.finishReason);
        console.error('Has candidates:', !!data.candidates);
        console.error('Candidates length:', data.candidates?.length);
        
        // Check if content was blocked
        if (data.candidates?.[0]?.finishReason === 'SAFETY') {
          lastError = 'Content blocked by safety filters';
        } else if (data.candidates?.[0]?.finishReason === 'RECITATION') {
          lastError = 'Content blocked due to recitation';
        } else if (data.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
          lastError = 'Response too long, truncated';
        } else if (data.candidates?.[0]?.finishReason) {
          lastError = `Generation stopped: ${data.candidates[0].finishReason}`;
        } else if (!data.candidates || data.candidates.length === 0) {
          lastError = 'API returned empty candidates array - possible content filter';
        } else {
          lastError = 'No text in response - check console for details';
        }
        continue;
      }

      console.log(`Successfully generated with model: ${modelName}`);
      
      return {
        content: text,
        codeSnippets: extractCodeSnippets(text)
      };
    } catch (error) {
      console.warn(`Model ${modelName} failed:`, error);
      lastError = error;
      continue;
    }
  }

  // If all models failed, provide detailed error
  const errorMessage = lastError ? JSON.stringify(lastError, null, 2) : 'Unknown error';
  console.error('All models failed. Last error:', lastError);

  return {
    content: `⚠️ Unable to generate AI explanation.\n\n**All API models failed.** Please check:\n\n- ✓ Your API key is valid and active\n- ✓ You have internet connection\n- ✓ The Gemini API is accessible from your location\n- ✓ Your API key has proper permissions\n\n**Models tried:** ${modelNames.join(', ')}\n\n**Last error:** ${errorMessage}\n\nTry refreshing the page or checking your API key at: https://aistudio.google.com/app/apikey`,
    codeSnippets: []
  };
};

const extractCodeSnippets = (text: string): string[] => {
  const regex = /```[\s\S]*?```/g;
  const matches = text.match(regex) || [];
  return matches;
};
