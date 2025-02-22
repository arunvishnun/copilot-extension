import { Octokit } from '@octokit/rest';
import atob from 'atob';
import { GITHUB_TOKEN, REPO_OWNER, REPO_NAME } from './config';

const octokit = new Octokit({ auth: GITHUB_TOKEN });

const ALLOWED_EXTENSIONS = ['js', 'ts', 'tsx', 'jsx', 'json', 'yaml', 'yml', 'mdx', 'css', 'scss', 'html'];

interface RepoFile {
    path: string;
    name: string;
    extension: string;
    content: string;
}

/**
 * Recursively fetch all relevant code files from the repository.
 */
async function fetchRepoFiles(path = ''): Promise<RepoFile[]> {
    try {
        const { data } = await octokit.repos.getContent({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path
        });

        let files: RepoFile[] = [];
        if (Array.isArray(data)) {
            for (const item of data) {
                if (item.type === 'dir') {
                    const subFiles = await fetchRepoFiles(item.path);
                    files = files.concat(subFiles);
                } else if (item.type === 'file' && isValidFile(item.name)) {
                    const content = await fetchFileContent(item.path);
                    files.push({
                        path: item.path,
                        name: item.name,
                        extension: getFileExtension(item.name),
                        content
                    });
                }
            }
        } else {
            if (isValidFile(data.name)) {
                const content = await fetchFileContent(data.path);
                files.push({
                    path: data.path,
                    name: data.name,
                    extension: getFileExtension(data.name),
                    content
                });
            }
        }
        return files;
    } catch (error) {
        console.error('Error fetching repo files:', error);
        throw error;
    }
}

/**
 * Fetch and decode the content of a file.
 */
async function fetchFileContent(path: string): Promise<string> {
    try {
        const { data } = await octokit.repos.getContent({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path
        });

        return data.content ? atob(data.content) : '';
    } catch (error) {
        console.error(`Error fetching file content for ${path}:`, error);
        return '';
    }
}

/**
 * Check if the file is a valid code file based on extension.
 */
function isValidFile(filename: string): boolean {
    const ext = getFileExtension(filename);
    return ALLOWED_EXTENSIONS.includes(ext);
}

/**
 * Extract the file extension from a filename.
 */
function getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
}

export { fetchRepoFiles };