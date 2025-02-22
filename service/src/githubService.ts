import { Octokit } from '@octokit/rest';
import atob from 'atob';

const GITHUB_API_URL = process.env.GITHUB_API_URL || 'https://api.github.com';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Add your GitHub token to environment variables

if (!GITHUB_TOKEN) {
    throw new Error('GitHub token is not set in the environment variables.');
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });

const ALLOWED_EXTENSIONS = ['js', 'ts', 'tsx', 'jsx', 'json', 'yaml', 'yml', 'mdx', 'css', 'scss', 'html'];

interface GitHubFile {
    path: string;
    content: string;
}

function isFileContent(data: any): data is { content: string } {
    return 'content' in data;
}

export async function fetchFileFromGitHub(owner: string, repo: string, path: string, ref: string): Promise<GitHubFile> {
    const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path,
        ref
    });

    if (isFileContent(data)) {
        const content = atob(data.content);
        return { path: data.path, content };
    }

    throw new Error('File not found');
}

export async function fetchFileList(owner: string, repo: string, dirPath: string, ref: string): Promise<string[]> {
    let fileList: string[] = [];

    const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: dirPath,
        ref
    });

    if (Array.isArray(data)) {
        for (const item of data) {
            if (item.type === 'file' && isValidFile(item.name)) {
                fileList.push(item.path);
            } else if (item.type === 'dir') {
                const subDirFiles = await fetchFileList(owner, repo, item.path, ref);
                fileList = fileList.concat(subDirFiles);
            }
        }
    } else {
        console.error(`Error fetching file list from ${dirPath}:`, data);
    }

    return fileList;
}

async function fetchFileContent(owner: string, repo: string, path: string, ref: string): Promise<string> {
    const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path,
        ref
    });

    if (isFileContent(data)) {
        return atob(data.content);
    }

    return '';
}

function isValidFile(filename: string): boolean {
    const ext = getFileExtension(filename);
    return ALLOWED_EXTENSIONS.includes(ext);
}

function getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
}