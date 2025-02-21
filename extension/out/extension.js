"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const node_cache_1 = __importDefault(require("node-cache"));
const cache = new node_cache_1.default({ stdTTL: 3600 }); // Cache for 1 hour
function activate(context) {
    console.log('Extension "framework-copilot" is now active!');
    let disposable = vscode.commands.registerCommand('extension.frameworkCopilot', () => {
        vscode.window.showInformationMessage('Framework Copilot Activated!');
    });
    context.subscriptions.push(disposable);
    vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'javascript' }, {
        provideCompletionItems: async (document, position) => {
            const completionItems = [];
            const snippets = await fetchSnippetsFromService();
            snippets.forEach((snippet) => {
                const completionItem = new vscode.CompletionItem(snippet.label, vscode.CompletionItemKind.Function);
                completionItem.detail = snippet.detail;
                completionItem.insertText = snippet.code;
                completionItems.push(completionItem);
            });
            return completionItems;
        }
    });
}
function deactivate() { }
async function fetchSnippetsFromService() {
    const cacheKey = 'pui-snippets';
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }
    const response = await (0, node_fetch_1.default)('http://localhost:3000/snippets?owner=vercel&repo=next.js&ref=main');
    const data = (await response.json());
    cache.set(cacheKey, data.snippets);
    return data.snippets;
}
