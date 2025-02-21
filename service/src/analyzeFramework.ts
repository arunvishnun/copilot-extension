import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import NodeCache from 'node-cache';
import { fetchFileFromGitHub, GITHUB_API_URL } from './githubService';

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
    const sourceFile = ts.createSourceFile('tempFile.ts', content, ts.ScriptTarget.Latest, true);
    const snippets: Snippet[] = [];

    function visit(node: ts.Node) {
        if (ts.isFunctionDeclaration(node) && node.name) {
            const snippet: Snippet = {
                label: node.name.text,
                detail: 'Function',
                code: content.substring(node.pos, node.end).trim()
            };
            snippets.push(snippet);
        } else if (ts.isClassDeclaration(node) && node.name) {
            const snippet: Snippet = {
                label: node.name.text,
                detail: 'Class',
                code: content.substring(node.pos, node.end).trim()
            };
            snippets.push(snippet);
        }
        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return snippets;
}

async function analyzeRepo(owner: string, repo: string, ref: string) {
    const config = loadConfig();
    const snippets: Snippet[] = [];

    for (const pkg of config.packages) {
        const packagePath = path.join(pkg);
        const fileList = await fetchFileList(owner, repo, packagePath, ref);
        for (const file of fileList) {
            if (config.fileExtensions.includes(path.extname(file))) {
                const fileData = await fetchFileFromGitHub(owner, repo, file, ref);
                const fileSnippets = analyzeFile(fileData.content);
                snippets.push(...fileSnippets);
            }
        }
    }

    saveCache(snippets);
    return snippets;
}

async function fetchFileList(owner: string, repo: string, path: string, ref: string): Promise<string[]> {
    const response = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}/contents/${path}?ref=${ref}`);
    const data = await response.json();
    if (Array.isArray(data)) {
        return data.map(file => file.path);
    }
    return [];
}

export async function getFrameworkSnippets(owner: string, repo: string, ref: string): Promise<Snippet[]> {
    const cachedSnippets = loadCache();
    if (cachedSnippets) {
        return cachedSnippets;
    }

    const snippets = await analyzeRepo(owner, repo, ref);
    return snippets;
}