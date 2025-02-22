import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import NodeCache from 'node-cache';
import { fetchFileFromGitHub, fetchFileList } from './githubService';

const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

interface Snippet {
    label: string;
    detail: string;
    code: string;
}

function loadConfig() {
    const configPath = path.resolve(__dirname, '../framework-config.json');
    const configContent = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(configContent);
}

function saveCache(snippets: Snippet[]) {
    cache.set('snippets', snippets);
}

function loadCache(): Snippet[] | null {
    return cache.get('snippets') || null;
}

function analyzeFile(content: string): Snippet[] {
    const snippets: Snippet[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('function ')) {
            const functionName = trimmedLine.split(' ')[1].split('(')[0];
            const snippet: Snippet = {
                label: functionName,
                detail: 'Function',
                code: line
            };
            snippets.push(snippet);
        } else if (trimmedLine.startsWith('class ')) {
            const className = trimmedLine.split(' ')[1];
            const snippet: Snippet = {
                label: className,
                detail: 'Class',
                code: line
            };
            snippets.push(snippet);
        } else if (trimmedLine.startsWith('const ') || trimmedLine.startsWith('let ') || trimmedLine.startsWith('var ')) {
            const variableName = trimmedLine.split(' ')[1].split('=')[0];
            const snippet: Snippet = {
                label: variableName,
                detail: 'Variable',
                code: line
            };
            snippets.push(snippet);
        } else if (trimmedLine.startsWith('interface ')) {
            const interfaceName = trimmedLine.split(' ')[1];
            const snippet: Snippet = {
                label: interfaceName,
                detail: 'Interface',
                code: line
            };
            snippets.push(snippet);
        }
    });

    return snippets;
}

async function analyzeRepo(owner: string, repo: string, ref: string): Promise<Snippet[]> {
    const config = loadConfig();
    const snippets: Snippet[] = [];

    for (const pkg of config.packages) {
        const packagePath = path.join(pkg);
        const fileList = await fetchFileList(owner, repo, packagePath, ref);

        const filePromises = fileList.map(async (file) => {
            if (config.fileExtensions.includes(path.extname(file))) {
                const fileData = await fetchFileFromGitHub(owner, repo, file, ref);
                const fileSnippets = analyzeFile(fileData.content);
                snippets.push(...fileSnippets);
            }
        });

        await Promise.all(filePromises);
    }

    saveCache(snippets);
    return snippets;
}

export async function getFrameworkSnippets(owner: string, repo: string, ref: string): Promise<Snippet[]> {
    // const cachedSnippets = loadCache();
    // if (cachedSnippets) {
    //     return cachedSnippets;
    // }

    const snippets = await analyzeRepo(owner, repo, ref);
    return snippets;
}