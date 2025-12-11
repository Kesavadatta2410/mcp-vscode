/**
 * LLM Assistant Service
 * Handles AI-powered code generation and refactoring
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface AssistantRequest {
    prompt: string;
    context: {
        currentFile?: string;
        selectedCode?: string;
        files?: string[];
    };
    action: 'generate' | 'refactor' | 'explain' | 'fix' | 'test';
}

export interface AssistantResponse {
    success: boolean;
    data?: {
        diff?: string;
        summary: string;
        explanation?: string;
        files?: Array<{
            path: string;
            content: string;
        }>;
    };
    error?: {
        type: string;
        message: string;
    };
}

class AssistantService {
    async generate(request: AssistantRequest): Promise<AssistantResponse> {
        try {
            const response = await axios.post(`${API_BASE_URL}/assistant/generate`, request);
            return {
                success: true,
                data: response.data,
            };
        } catch (error: any) {
            console.error('Assistant request failed:', error);
            return {
                success: false,
                error: {
                    type: error.response?.data?.type || 'AssistantError',
                    message: error.response?.data?.message || error.message || 'Assistant request failed',
                },
            };
        }
    }

    async explainCode(code: string, language: string): Promise<AssistantResponse> {
        return this.generate({
            prompt: `Explain this ${language} code:\n\n${code}`,
            context: { selectedCode: code },
            action: 'explain',
        });
    }

    async fixError(code: string, error: string, language: string): Promise<AssistantResponse> {
        return this.generate({
            prompt: `Fix this error in ${language}:\n\nError: ${error}\n\nCode:\n${code}`,
            context: { selectedCode: code },
            action: 'fix',
        });
    }

    async generateTests(filePath: string, code: string): Promise<AssistantResponse> {
        return this.generate({
            prompt: `Generate comprehensive unit tests for this code`,
            context: { currentFile: filePath, selectedCode: code },
            action: 'test',
        });
    }

    async refactorCode(code: string, instruction: string): Promise<AssistantResponse> {
        return this.generate({
            prompt: instruction,
            context: { selectedCode: code },
            action: 'refactor',
        });
    }
}

export const assistantService = new AssistantService();
export default assistantService;
