// Service for fetching GitHub repository data
export interface GitHubFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  download_url?: string;
  sha?: string;
  url?: string;
}

export interface GitHubRepo {
  name: string;
  owner: string;
  path: string;
  files: GitHubFile[];
}

export const fetchGitHubRepo = async (repoUrl: string): Promise<GitHubRepo> => {
  // Extract owner and repo name from URL
  const regex = /github\.com\/([^\/]+)\/([^\/]+)/;
  const match = repoUrl.match(regex);
  
  if (!match) {
    throw new Error('Invalid GitHub URL. Please provide a valid GitHub repository URL.');
  }
  
  const [, owner, repo] = match;
  
  // Fetch repository contents (public access only)
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents`);
  
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('GitHub API rate limit exceeded. Please try again later.');
    }
    if (response.status === 404) {
      throw new Error('Repository not found or is private. Only public repositories are supported.');
    }
    throw new Error(`Failed to fetch repository: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Convert GitHub API response to our format
  const files: GitHubFile[] = data.map((item: any) => ({
    name: item.name,
    path: item.path,
    type: item.type as 'file' | 'dir',
    size: item.size,
    download_url: item.download_url,
    sha: item.sha,
    url: item.url,
  }));
  
  return {
    name: repo,
    owner,
    path: '',
    files,
  };
};

export const fetchGitHubDirContents = async (owner: string, repo: string, path: string): Promise<GitHubFile[]> => {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch directory contents: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  return data.map((item: any) => ({
    name: item.name,
    path: item.path,
    type: item.type as 'file' | 'dir',
    size: item.size,
    download_url: item.download_url,
    sha: item.sha,
    url: item.url,
  }));
};

export const fetchGitHubFileContent = async (downloadUrl: string): Promise<string> => {
  const response = await fetch(downloadUrl);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch file content: ${response.statusText}`);
  }
  
  return await response.text();
};

export const fetchCompleteRepoStructure = async (
  owner: string,
  repo: string,
  path: string = '',
  maxDepth: number = 3,
  currentDepth: number = 0
): Promise<any> => {
  if (currentDepth >= maxDepth) {
    return { name: path.split('/').pop() || repo, type: 'dir', children: [] };
  }

  try {
    // Add a small delay to avoid rate limiting
    if (currentDepth > 0) {
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`);
    
    if (!response.ok) {
      if (response.status === 429) {
        console.warn('Rate limit hit, waiting before retry...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        // Retry once
        const retryResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`);
        if (!retryResponse.ok) {
          console.warn(`Failed to fetch ${path}: ${retryResponse.statusText}`);
          return null;
        }
        const retryData = await retryResponse.json();
        if (Array.isArray(retryData)) {
          return processDataArray(retryData, owner, repo, path, maxDepth, currentDepth);
        }
        return null;
      }
      console.warn(`Failed to fetch ${path}: ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    
    if (Array.isArray(data)) {
      return processDataArray(data, owner, repo, path, maxDepth, currentDepth);
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching structure for ${path}:`, error);
    return null;
  }
};

// Helper function to process data array with batching
async function processDataArray(
  data: any[],
  owner: string,
  repo: string,
  path: string,
  maxDepth: number,
  currentDepth: number
): Promise<any> {
  // Process items in smaller batches to avoid rate limiting
  const batchSize = 3;
  const structure: any[] = [];
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (item: any) => {
        if (item.type === 'dir') {
          // Recursively fetch subdirectories
          const children = await fetchCompleteRepoStructure(owner, repo, item.path, maxDepth, currentDepth + 1);
          return {
            name: item.name,
            type: 'dir',
            path: item.path,
            children: children?.children || []
          };
        } else {
          return {
            name: item.name,
            type: 'file',
            path: item.path,
            size: item.size
          };
        }
      })
    );
    structure.push(...batchResults);
  }
  
  return {
    name: path.split('/').pop() || repo,
    type: 'dir',
    path: path,
    children: structure.filter(Boolean)
  };
}