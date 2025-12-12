/**
 * Gemini AI Assistant Service
 * Uses Google Gemini API for code generation, refactoring, and explanation
 */

import axios from 'axios';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

export interface AssistantRequest {
    prompt: string;
    action: 'generate' | 'refactor' | 'explain' | 'optimize' | 'comment' | 'fix' | 'test';
    context?: {
        filePath?: string;
        selectedCode?: string;
        language?: string;
    };
}

export interface AssistantResponse {
    success: boolean;
    data?: {
        generatedCode?: string;
        explanation?: string;
        diff?: {
            original: string;
            modified: string;
        };
    };
    error?: {
        message: string;
        code?: string;
    };
}

/**
 * Generate code using Gemini AI
 */
export async function generateCode(request: AssistantRequest): Promise<AssistantResponse> {
    try {
        // Build the prompt based on action type
        const systemPrompt = buildSystemPrompt(request.action);
        const fullPrompt = `${systemPrompt}\n\n${request.prompt}`;

        // Add context if available
        let contextPrompt = fullPrompt;
        if (request.context?.selectedCode) {
            contextPrompt += `\n\n## Current Code:\n\`\`\`${request.context.language || 'typescript'}\n${request.context.selectedCode}\n\`\`\``;
        }

        // Call Gemini API
        const response = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            {
                contents: [
                    {
                        parts: [
                            {
                                text: contextPrompt
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        // Extract generated text
        const generatedText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
            throw new Error('No response from Gemini API');
        }

        // Parse the response
        const result = parseGeminiResponse(generatedText, request);

        return {
            success: true,
            data: result
        };

    } catch (error: any) {
        console.error('Gemini API error:', error);

        return {
            success: false,
            error: {
                message: error.message || 'Failed to generate code',
                code: error.response?.status?.toString()
            }
        };
    }
}

/**
 * Build system prompt based on action type
 */
function buildSystemPrompt(action: AssistantRequest['action']): string {
    const prompts = {
        generate: 'You are a code generation assistant. Generate clean, well-documented code based on the user\'s requirements. Include type annotations and error handling.',
        refactor: 'You are a code refactoring assistant. Improve the provided code by making it more readable, maintainable, and efficient. Explain your changes.',
        explain: 'You are a code explanation assistant. Explain the provided code in clear, simple terms. Break down complex logic and highlight important patterns.',
        optimize: 'You are a code optimization assistant. Analyze the provided code and suggest performance improvements. Focus on time/space complexity and best practices.',
        comment: 'You are a code documentation assistant. Add clear, helpful comments to the provided code. Use JSDoc format for functions and classes.',
        fix: 'You are a debugging assistant. Analyze the provided code for bugs, errors, or potential issues. Suggest fixes with explanations.',
        test: 'You are a test generation assistant. Generate comprehensive unit tests for the provided code. Use appropriate testing frameworks and cover edge cases.'
    };

    return prompts[action] || prompts.generate;
}

/**
 * Parse Gemini response and extract code/diff
 */
function parseGeminiResponse(text: string, request: AssistantRequest) {
    // Extract code blocks from markdown
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/g;
    const codeBlocks = [];
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
        codeBlocks.push(match[1].trim());
    }

    // Generate diff if we're modifying existing code
    if (request.context?.selectedCode && codeBlocks.length > 0) {
        return {
            generatedCode: codeBlocks[0],
            explanation: text.replace(/```[\s\S]*?```/g, '').trim(),
            diff: {
                original: request.context.selectedCode,
                modified: codeBlocks[0]
            }
        };
    }

    // Otherwise just return the generated code
    return {
        generatedCode: codeBlocks[0] || text,
        explanation: text
    };
}

export default {
    generateCode
};
