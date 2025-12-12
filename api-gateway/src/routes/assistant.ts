/**
 * Backend LLM Assistant Endpoint
 * Uses Google Gemini API for AI-powered code generation
 */

import express from 'express';
import axios from 'axios';

const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

interface AssistantRequest {
    prompt: string;
    action: 'generate' | 'refactor' | 'explain' | 'optimize' | 'comment' | 'fix' | 'test';
    context?: {
        filePath?: string;
        selectedCode?: string;
        language?: string;
    };
}

/**
 * POST /api/assistant/generate
 * Generate code using Gemini AI
 */
router.post('/generate', async (req, res) => {
    try {
        const { prompt, action, context }: AssistantRequest = req.body;

        if (!prompt) {
            return res.status(400).json({
                success: false,
                error: { message: 'Prompt is required' }
            });
        }

        if (!GEMINI_API_KEY) {
            return res.status(500).json({
                success: false,
                error: { message: 'Gemini API key not configured. Set GEMINI_API_KEY environment variable.' }
            });
        }

        // Build system prompt
        const systemPrompt = buildSystemPrompt(action);
        let fullPrompt = `${systemPrompt}\n\n${prompt}`;

        // Add context if provided
        if (context?.selectedCode) {
            fullPrompt += `\n\n## Current Code:\n\`\`\`${context.language || 'typescript'}\n${context.selectedCode}\n\`\`\``;
        }

        // Call Gemini API
        const geminiResponse = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            {
                contents: [
                    {
                        parts: [{ text: fullPrompt }]
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
                headers: { 'Content-Type': 'application/json' }
            }
        );

        // Extract response
        const generatedText = geminiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
            throw new Error('No response from Gemini');
        }

        // Parse response
        const result = parseGeminiResponse(generatedText, context?.selectedCode);

        res.json({
            success: true,
            data: result
        });

    } catch (error: any) {
        console.error('Gemini API error:', error.response?.data || error.message);

        res.status(500).json({
            success: false,
            error: {
                message: error.message || 'Failed to generate code',
                code: error.response?.status?.toString()
            }
        });
    }
});

function buildSystemPrompt(action: string): string {
    const prompts: Record<string, string> = {
        generate: 'You are a code generation assistant. Generate clean, well-documented code. Include type annotations.',
        refactor: 'You are a refactoring assistant. Improve code readability and maintainability.',
        explain: 'You are a code explanation assistant. Explain code clearly and simply.',
        optimize: 'You are an optimization assistant. Suggest performance improvements.',
        comment: 'You are a documentation assistant. Add helpful comments in JSDoc format.',
        fix: 'You are a debugging assistant. Find and fix bugs or issues.',
        test: 'You are a test generation assistant. Generate comprehensive unit tests.'
    };

    return prompts[action] || prompts.generate;
}

function parseGeminiResponse(text: string, originalCode?: string) {
    // Extract code blocks
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/g;
    const codeBlocks = [];
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
        codeBlocks.push(match[1].trim());
    }

    const explanation = text.replace(/```[\s\S]*?```/g, '').trim();

    // Generate diff if modifying code
    if (originalCode && codeBlocks.length > 0) {
        return {
            generatedCode: codeBlocks[0],
            explanation,
            diff: {
                original: originalCode,
                modified: codeBlocks[0]
            }
        };
    }

    return {
        generatedCode: codeBlocks[0] || text,
        explanation
    };
}

export default router;
