
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
  // Limit file content for faster processing
  const limitedContent = fileContent.length > 1800 ? fileContent.substring(0, 1800) + '... [truncated]' : fileContent;

  const fileExtension = filePath.split('.').pop()?.toLowerCase() || '';

  // Concise but informative prompt
  let prompt = `Explain the file "${filePath}" concisely:\n\n${limitedContent}\n\n`;

  if (['py', 'pyw', 'js', 'jsx', 'ts', 'tsx'].includes(fileExtension)) {
    prompt += `Provide:\n1. What this file does (1-2 sentences)\n2. Key functions/components\n3. Important patterns\n4. Any gotchas\n\nBe concise and helpful.`;
  } else if (fileExtension === 'json') {
    prompt += `Provide:\n1. Purpose of this config (1-2 sentences)\n2. Key configuration values\n3. Impact on project\n\nBe concise.`;
  } else if (fileExtension === 'md') {
    prompt += `Provide:\n1. What this document covers (1-2 sentences)\n2. Main sections\n3. Key information\n\nBe concise.`;
  } else if (['toml', 'yaml', 'yml', 'xml'].includes(fileExtension)) {
    prompt += `Provide:\n1. Purpose of this config (1-2 sentences)\n2. Key settings\n3. Impact on project\n\nBe concise.`;
  } else {
    prompt += `Provide:\n1. What this file does (1-2 sentences)\n2. Key elements\n3. Important aspects\n\nBe concise.`;
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
  // Limit content for faster responses
  const limitedContent = fileContent.length > 1500 ? fileContent.substring(0, 1500) + '... [truncated]' : fileContent;
  
  const prompt = `Answer this question about "${filePath}": "${question}"\n\nFile content:\n${limitedContent}\n\nProvide a clear, concise answer based on the code.`;

  return callGeminiAPI(prompt, apiKey);
};

const callGeminiAPI = async (prompt: string, apiKey: string): Promise<Explanation> => {
  // Check if API key is provided
  if (!apiKey) {
    throw new Error('Gemini API key is required');
  }

  // Use the fastest models first for lower latency
  const modelNames = [
    'gemini-2.5-flash-lite',    // Fastest model
  ];

  // Try each model until one works
  for (const modelName of modelNames) {
    try {
      // Try with optimized config first
      let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
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
            maxOutputTokens: 800,
            topK: 40,
            topP: 0.95
          }
        })
      });

      // If config fails, try without config
      if (!response.ok) {
        console.warn(`Model ${modelName} with config failed, trying without config...`);
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }]
          })
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Model ${modelName} failed with status ${response.status}:`, errorData);
        // If this model fails, continue to the next one
        continue;
      }

      const data = await response.json();

      // Check for errors in the response
      if (data.error) {
        console.error(`Model ${modelName} returned error:`, data.error);
        // If this model returns an error, continue to the next one
        continue;
      }

      // Extract the text from the response
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        console.error(`Model ${modelName} returned no text:`, data);
        continue;
      }

      console.log(`Successfully generated with model: ${modelName}`);
      
      return {
        content: text,
        codeSnippets: extractCodeSnippets(text)
      };
    } catch (error) {
      console.warn(`Model ${modelName} failed, trying next model...`);
      continue; // Try the next model
    }
  }

  // If all models fail, return a mock explanation
  return {
    content: `⚠️ Unable to generate AI explanation.\n\nAll API models failed. Please check:\n- Your API key is valid\n- You have internet connection\n- The Gemini API is accessible\n\nTry refreshing the page or checking your API key.`,
    codeSnippets: []
  };
};

// Simple regex to extract potential code snippets from explanation
const extractCodeSnippets = (text: string): string[] => {
  const regex = /```[\s\S]*?```/g;
  const matches = text.match(regex) || [];
  return matches;
};