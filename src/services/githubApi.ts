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
  
  // Fetch repository contents
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents`);
  
  if (!response.ok) {
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