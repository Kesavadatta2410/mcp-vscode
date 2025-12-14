/**
 * useAiGeneration Hook
 * Orchestrates AI code generation workflow using Gemini API
 */

import { useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface GeneratedFile {
    id: string;
    path: string;
    content: string;
    language: string;
    status: 'pending' | 'approved' | 'rejected' | 'modified';
}

export interface AiGenerationState {
    isLoading: boolean;
    error: string | null;
    files: GeneratedFile[];
    projectName: string | null;
    projectDescription: string | null;
}

interface UseAiGenerationReturn extends AiGenerationState {
    generateFromPrompt: (prompt: string) => Promise<void>;
    approveFile: (fileId: string) => void;
    rejectFile: (fileId: string) => void;
    modifyFile: (fileId: string, newContent: string) => void;
    approveAll: () => void;
    rejectAll: () => void;
    clearFiles: () => void;
    saveApprovedFiles: () => Promise<{ success: boolean; savedFiles: string[] }>;
}

/**
 * Parse AI response to extract files
 */
function parseAiResponse(text: string): { files: Omit<GeneratedFile, 'id' | 'status'>[]; projectName: string; projectDescription: string } {
    const files: Omit<GeneratedFile, 'id' | 'status'>[] = [];
    let projectName = 'Generated Project';
    let projectDescription = '';

    // Try to extract project name from response
    const projectMatch = text.match(/(?:project|app|application)\s*(?:name|called|named)?:?\s*["']?([^"'\n]+)["']?/i);
    if (projectMatch) {
        projectName = projectMatch[1].trim();
    }

    // Extract file blocks - look for patterns like:
    // **filename.ext** or `filename.ext` followed by code blocks
    const filePatterns = [
        /(?:\*\*|`)([^`*\n]+\.[\w]+)(?:\*\*|`)\s*\n```(\w*)\n([\s\S]*?)```/g,
        /(?:file|create|add):\s*["']?([^"'\n]+\.[\w]+)["']?\s*\n```(\w*)\n([\s\S]*?)```/gi,
        /```(\w+):([^\n]+\.[\w]+)\n([\s\S]*?)```/g,
    ];

    for (const pattern of filePatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            let filename: string;
            let language: string;
            let content: string;

            if (pattern.source.includes(':([^\\n]+')) {
                // Pattern: ```language:filename
                language = match[1];
                filename = match[2].trim();
                content = match[3].trim();
            } else {
                // Pattern: **filename** or `filename` followed by ```lang
                filename = match[1].trim();
                language = match[2] || detectLanguage(filename);
                content = match[3].trim();
            }

            // Avoid duplicates
            if (!files.some(f => f.path === filename)) {
                files.push({
                    path: filename,
                    content,
                    language: language || detectLanguage(filename),
                });
            }
        }
    }

    // Fallback: if no files found but there's a code block, create a main file
    if (files.length === 0) {
        const codeBlockMatch = text.match(/```(\w*)\n([\s\S]*?)```/);
        if (codeBlockMatch) {
            const lang = codeBlockMatch[1] || 'javascript';
            const content = codeBlockMatch[2].trim();
            const ext = getExtension(lang);
            files.push({
                path: `main${ext}`,
                content,
                language: lang,
            });
        }
    }

    // Extract description
    const descMatch = text.match(/(?:description|about|overview):\s*([^\n]+)/i);
    if (descMatch) {
        projectDescription = descMatch[1].trim();
    }

    return { files, projectName, projectDescription };
}

function detectLanguage(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
        ts: 'typescript',
        tsx: 'typescriptreact',
        js: 'javascript',
        jsx: 'javascriptreact',
        py: 'python',
        rb: 'ruby',
        go: 'go',
        rs: 'rust',
        java: 'java',
        cpp: 'cpp',
        c: 'c',
        cs: 'csharp',
        php: 'php',
        html: 'html',
        css: 'css',
        scss: 'scss',
        json: 'json',
        yaml: 'yaml',
        yml: 'yaml',
        md: 'markdown',
        sql: 'sql',
        sh: 'shell',
        bash: 'shell',
    };
    return langMap[ext] || 'plaintext';
}

function getExtension(lang: string): string {
    const extMap: Record<string, string> = {
        typescript: '.ts',
        typescriptreact: '.tsx',
        javascript: '.js',
        javascriptreact: '.jsx',
        python: '.py',
        ruby: '.rb',
        go: '.go',
        rust: '.rs',
        java: '.java',
        cpp: '.cpp',
        c: '.c',
        csharp: '.cs',
        php: '.php',
        html: '.html',
        css: '.css',
        scss: '.scss',
        json: '.json',
        yaml: '.yaml',
        markdown: '.md',
        sql: '.sql',
        shell: '.sh',
    };
    return extMap[lang] || '.txt';
}

export function useAiGeneration(): UseAiGenerationReturn {
    const [state, setState] = useState<AiGenerationState>({
        isLoading: false,
        error: null,
        files: [],
        projectName: null,
        projectDescription: null,
    });

    const generateFromPrompt = useCallback(async (prompt: string) => {
        setState(prev => ({ ...prev, isLoading: true, error: null, files: [] }));

        try {
            const systemPrompt = `You are an expert code generator. Based on the user's request, generate complete, production-ready code files.

For each file you create, format it like this:
**filename.ext**
\`\`\`language
// code content here
\`\`\`

Guidelines:
- Generate complete, working code with proper imports
- Use modern best practices and patterns
- Include helpful comments
- Create all necessary files (components, styles, configs, etc.)
- Use appropriate file extensions
- Make the code immediately runnable

User Request: ${prompt}`;

            const response = await axios.post(
                `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
                {
                    contents: [
                        {
                            parts: [{ text: systemPrompt }]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 4096,
                    }
                },
                {
                    headers: { 'Content-Type': 'application/json' }
                }
            );

            const generatedText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!generatedText) {
                throw new Error('No response from AI');
            }

            const { files, projectName, projectDescription } = parseAiResponse(generatedText);

            if (files.length === 0) {
                throw new Error('Could not parse any files from response');
            }

            const filesWithIds: GeneratedFile[] = files.map((f, idx) => ({
                ...f,
                id: `file-${Date.now()}-${idx}`,
                status: 'pending' as const,
            }));

            setState({
                isLoading: false,
                error: null,
                files: filesWithIds,
                projectName,
                projectDescription,
            });

        } catch (error: any) {
            console.error('AI generation error:', error);
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error.message || 'Failed to generate code',
            }));
        }
    }, []);

    const approveFile = useCallback((fileId: string) => {
        setState(prev => ({
            ...prev,
            files: prev.files.map(f =>
                f.id === fileId ? { ...f, status: 'approved' as const } : f
            ),
        }));
    }, []);

    const rejectFile = useCallback((fileId: string) => {
        setState(prev => ({
            ...prev,
            files: prev.files.map(f =>
                f.id === fileId ? { ...f, status: 'rejected' as const } : f
            ),
        }));
    }, []);

    const modifyFile = useCallback((fileId: string, newContent: string) => {
        setState(prev => ({
            ...prev,
            files: prev.files.map(f =>
                f.id === fileId ? { ...f, content: newContent, status: 'modified' as const } : f
            ),
        }));
    }, []);

    const approveAll = useCallback(() => {
        setState(prev => ({
            ...prev,
            files: prev.files.map(f =>
                f.status === 'pending' ? { ...f, status: 'approved' as const } : f
            ),
        }));
    }, []);

    const rejectAll = useCallback(() => {
        setState(prev => ({
            ...prev,
            files: prev.files.map(f =>
                f.status === 'pending' ? { ...f, status: 'rejected' as const } : f
            ),
        }));
    }, []);

    const clearFiles = useCallback(() => {
        setState({
            isLoading: false,
            error: null,
            files: [],
            projectName: null,
            projectDescription: null,
        });
    }, []);

    const saveApprovedFiles = useCallback(async () => {
        const filesToSave = state.files.filter(f =>
            f.status === 'approved' || f.status === 'modified'
        );

        const savedFiles: string[] = [];

        for (const file of filesToSave) {
            try {
                await axios.post(`${API_URL}/api/files`, {
                    path: file.path,
                    content: file.content,
                });
                savedFiles.push(file.path);
            } catch (error) {
                console.error(`Failed to save ${file.path}:`, error);
            }
        }

        return {
            success: savedFiles.length === filesToSave.length,
            savedFiles,
        };
    }, [state.files]);

    return {
        ...state,
        generateFromPrompt,
        approveFile,
        rejectFile,
        modifyFile,
        approveAll,
        rejectAll,
        clearFiles,
        saveApprovedFiles,
    };
}

export default useAiGeneration;
