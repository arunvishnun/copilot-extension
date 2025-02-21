import fetch from 'node-fetch';

export const GITHUB_API_URL = process.env.GITHUB_API_URL || 'https://api.github.com';

interface GitHubFile {
    path: string;
    content: string;
}

export async function fetchFileFromGitHub(owner: string, repo: string, path: string, ref: string): Promise<GitHubFile> {
    const response = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}/contents/${path}?ref=${ref}`);
    const data = await response.json() as any;

    if (data.content) {
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        return { path: data.path, content };
    }

    throw new Error('File not found');
}