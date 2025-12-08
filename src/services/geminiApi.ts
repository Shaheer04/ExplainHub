
// Rate limiting helper
let lastGeminiCallTime = 0;
const MIN_CALL_INTERVAL = 1000; // 1 second between calls

async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastCall = now - lastGeminiCallTime;
  if (timeSinceLastCall < MIN_CALL_INTERVAL) {
    const waitTime = MIN_CALL_INTERVAL - timeSinceLastCall;
    console.log(`⏳ Rate limiting: waiting ${waitTime}ms...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  lastGeminiCallTime = Date.now();
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
  // Extract minimal structured information
  const extractMinimalInfo = (struct: any): { dirs: string[], files: string[] } => {
    const info = { dirs: [] as string[], files: [] as string[] };
    
    if (struct.children && Array.isArray(struct.children)) {
      struct.children.forEach((child: any) => {
        if (child.type === 'dir') {
          info.dirs.push(child.name);
        } else if (child.type === 'file') {
          info.files.push(child.name);
        }
      });
    }
    
    return info;
  };

  const { dirs, files } = extractMinimalInfo(repoStructure);
  const topDirs = dirs.slice(0, 6).join(', ');
  const topFiles = files.slice(0, 8).join(', ');
  
  console.log('Architecture diagram - Dirs:', dirs.length, 'Files:', files.length);

  const prompt = `Create mermaid architecture diagram for "${repoName}". 
Dirs: ${topDirs}
Files: ${topFiles}

Show 4 layers (UI, Logic, Service, Data) with arrows. Use actual names above. Return ONLY mermaid code starting with \`\`\`mermaid`;

  console.log('Architecture diagram - Prompt length:', prompt.length);
  
  // Retry logic with exponential backoff for rate limiting
  const maxRetries = 3;
  let lastError: any = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`Rate limit retry attempt ${attempt + 1}/${maxRetries}, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 800,
            topK: 40,
            topP: 0.85
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData?.error?.message || errorData?.error?.status || `HTTP ${response.status}`;
        
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData,
          fullError: JSON.stringify(errorData)
        });
        
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt + 1) * 1000;
          lastError = new Error(`API rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds and try again.`);
          
          if (attempt < maxRetries - 1) {
            console.log(`Rate limited, will retry in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          throw lastError;
        }
        
        if (response.status === 404) {
          throw new Error(`Model not found: gemini-2.5-flash may not be available yet. Error: ${errorMsg}`);
        }
        
        if (response.status === 400) {
          throw new Error(`Bad request: ${errorMsg}. Check if the model name is correct and API key is valid.`);
        }
        
        throw new Error(`API error: ${response.status} - ${errorMsg}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'API error');
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        console.error('No text in response. Full API response:', JSON.stringify(data, null, 2));
        console.error('Candidates:', data.candidates);
        console.error('Finish reason:', data.candidates?.[0]?.finishReason);
        console.error('Safety ratings:', data.candidates?.[0]?.safetyRatings);
        
        const finishReason = data.candidates?.[0]?.finishReason;
        if (finishReason === 'SAFETY') {
          throw new Error('Content was blocked by safety filters. Try simplifying the prompt.');
        }
        if (finishReason === 'RECITATION') {
          throw new Error('Content blocked due to recitation concerns.');
        }
        if (finishReason === 'MAX_TOKENS') {
          throw new Error('Response exceeded token limit.');
        }
        
        throw new Error(`No diagram generated. Finish reason: ${finishReason || 'Unknown'}`);
      }

      console.log('Architecture diagram - Generated successfully');
      return text;
    } catch (error) {
      console.error(`Architecture diagram - Attempt ${attempt + 1} failed:`, error);
      lastError = error;
      
      if (attempt === maxRetries - 1 || (error instanceof Error && !error.message.includes('rate limit'))) {
        throw error;
      }
    }
  }
  
  throw lastError || new Error('Failed to generate diagram after retries');
};

const callGeminiAPI = async (prompt: string, apiKey: string): Promise<Explanation> => {
  if (!apiKey) {
    throw new Error('Gemini API key is required');
  }

  // Apply rate limiting
  await waitForRateLimit();

  // Use Gemini 2.5 Flash everywhere
  const modelNames = [
      'gemini-2.5-flash',
  ];

  let lastError: any = null;
  const maxRetries = 2;

  for (const modelName of modelNames) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`Retry attempt ${attempt + 1}/${maxRetries} for ${modelName}, waiting ${waitTime}ms...`);
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
              maxOutputTokens: 2048,
              topK: 40,
              topP: 0.95
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error(`Model ${modelName} failed with status ${response.status}:`, errorData);
          
          // Handle rate limiting with retry
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt + 2) * 1000;
            
            console.error('🚨 Gemini API Rate Limit Hit!');
            console.error(`Free tier limits: 15 requests/min, 1500 requests/day`);
            console.error(`Wait time: ${Math.ceil(waitTime / 1000)} seconds`);
            
            lastError = {
              status: 429,
              message: `Gemini API rate limit exceeded! Free tier: 15 requests/min, 1500/day. Wait ${Math.ceil(waitTime / 1000)}s. Consider: 1) Wait a minute 2) Use fewer AI features 3) Upgrade API tier`,
              details: errorData
            };
            
            if (attempt < maxRetries - 1) {
              console.log(`Rate limited, waiting ${waitTime}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
          } else {
            lastError = errorData;
          }
          break; // Move to next model
        }

      const data = await response.json();

      if (data.error) {
        console.error(`Model ${modelName} returned error:`, data.error);
        lastError = data.error;
        break; // Move to next model
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
        break; // Move to next model
      }

      console.log(`Successfully generated with model: ${modelName}`);
      
      return {
        content: text,
        codeSnippets: extractCodeSnippets(text)
      };
    } catch (error) {
      console.warn(`Model ${modelName} attempt ${attempt + 1} failed:`, error);
      lastError = error;
      
      if (attempt === maxRetries - 1) {
        break; // Move to next model after all retries
      }
    }
    }
  }

  // If all models failed, provide detailed error
  const errorMessage = lastError ? JSON.stringify(lastError, null, 2) : 'Unknown error';
  console.error('All models failed. Last error:', lastError);
  
  // Check if it's a rate limit error
  if (lastError?.status === 429 || lastError?.message?.includes('rate limit')) {
    return {
      content: `⚠️ **Gemini API Rate Limit Exceeded**\n\n**Free Tier Limits:**\n- 15 requests per minute\n- 1500 requests per day\n\n**What to do:**\n1. ⏳ Wait 60 seconds and try again\n2. 🔄 Reload the page to reset\n3. 📉 Use AI features sparingly\n4. 💰 Upgrade your API tier at [Google AI Studio](https://aistudio.google.com)\n\n**Tip:** The batch function explanation feature reduces API calls significantly!`,
      codeSnippets: []
    };
  }

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
