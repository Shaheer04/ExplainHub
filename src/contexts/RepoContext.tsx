import React, { createContext, useContext, useState, ReactNode } from 'react';
import { GitHubRepo, GitHubFile, fetchGitHubRepo, fetchGitHubDirContents, fetchGitHubFileContent } from '../services/githubApi';

interface RepoContextType {
  repo: GitHubRepo | null;
  selectedFile: GitHubFile | null;
  fileContents: Record<string, string>;
  loading: boolean;
  error: string | null;
  githubToken?: string;
  setSelectedFile: (file: GitHubFile | null) => void;
  fetchRepo: (url: string, token?: string) => Promise<void>;
  fetchFileContent: (file: GitHubFile) => Promise<void>;
  fetchDirectoryContents: (dir: GitHubFile) => Promise<GitHubFile[]>;
}

const RepoContext = createContext<RepoContextType | undefined>(undefined);

export const useRepo = () => {
  const context = useContext(RepoContext);
  if (!context) {
    throw new Error('useRepo must be used within a RepoProvider');
  }
  return context;
};

interface RepoProviderProps {
  children: ReactNode;
}

export const RepoProvider: React.FC<RepoProviderProps> = ({ children }) => {
  const [repo, setRepo] = useState<GitHubRepo | null>(null);
  const [selectedFile, setSelectedFile] = useState<GitHubFile | null>(null);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [githubToken, setGithubToken] = useState<string | undefined>();

  const fetchRepo = async (url: string, token?: string) => {
    setLoading(true);
    setError(null);
    setGithubToken(token);
    try {
      const repoData = await fetchGitHubRepo(url, token);
      setRepo(repoData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching the repository');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFileContent = async (file: GitHubFile) => {
    if (!repo || !file.download_url) return;
    
    if (fileContents[file.path]) {
      // Content already loaded
      setSelectedFile(file);
      return;
    }

    try {
      const content = await fetchGitHubFileContent(file.download_url);
      setFileContents(prev => ({
        ...prev,
        [file.path]: content
      }));
      setSelectedFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching file content');
      console.error(err);
    }
  };

  const fetchDirectoryContents = async (dir: GitHubFile): Promise<GitHubFile[]> => {
    if (!repo) return [];

    try {
      // Make sure we're using the correct path format for the API
      const path = dir.path.startsWith('/') ? dir.path.substring(1) : dir.path;
      console.log('RepoContext: Fetching directory contents for:', path);
      const contents = await fetchGitHubDirContents(repo.owner, repo.name, path, githubToken);
      console.log('RepoContext: Received', contents.length, 'items');
      return contents;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching directory contents');
      console.error(`Error fetching directory contents for path: ${dir.path}`, err);
      return [];
    }
  };

  const value = {
    repo,
    selectedFile,
    fileContents,
    loading,
    error,
    githubToken,
    setSelectedFile,
    fetchRepo,
    fetchFileContent,
    fetchDirectoryContents
  };

  return (
    <RepoContext.Provider value={value}>
      {children}
    </RepoContext.Provider>
  );
};