/**
 * Backend LLM Assistant Endpoint
 * Uses Google Gemini API for AI-powered code generation and MCP tool orchestration
 */

import express from 'express';
import axios from 'axios';

const router = express.Router();

// Read API key at request time (after dotenv has loaded in main file)
const getGeminiApiKey = () => process.env.GEMINI_API_KEY || '';
// Using gemini-1.5-flash which is the latest free model
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Available MCP tools for AI planning
const MCP_TOOLS = [
    { server: 'repo', tool: 'read_file', description: 'Read file contents', args: ['path'] },
    { server: 'repo', tool: 'write_file', description: 'Write content to file', args: ['path', 'content'] },
    { server: 'repo', tool: 'list_files', description: 'List files in directory', args: ['path'] },
    { server: 'repo', tool: 'get_tree', description: 'Get directory tree', args: ['depth'] },
    { server: 'git', tool: 'git_status', description: 'Get git status', args: [] },
    { server: 'git', tool: 'git_commit', description: 'Create git commit', args: ['message'] },
    { server: 'git', tool: 'git_diff', description: 'Get git diff', args: [] },
    { server: 'exec', tool: 'run_code', description: 'Execute code', args: ['language', 'code'] },
    { server: 'vscode', tool: 'get_diagnostics', description: 'Get code diagnostics/errors', args: ['path'] },
    { server: 'vscode', tool: 'search_text', description: 'Search for text in files', args: ['query'] },
    { server: 'vscode', tool: 'format_document', description: 'Format a document', args: ['path'] },
];

interface AssistantRequest {
    prompt: string;
    action: 'generate' | 'refactor' | 'explain' | 'optimize' | 'comment' | 'fix' | 'test' | 'plan';
    context?: {
        filePath?: string;
        selectedCode?: string;
        language?: string;
    };
}

interface McpAction {
    id: string;
    tool: string;
    server: string;
    args: Record<string, any>;
    description: string;
    requiresApproval: boolean;
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

        if (!getGeminiApiKey()) {
            return res.status(500).json({
                success: false,
                error: { message: 'Gemini API key not configured. Set getGeminiApiKey() environment variable.' }
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
            `${GEMINI_API_URL}?key=${getGeminiApiKey()}`,
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

/**
 * POST /api/assistant/plan
 * Generate MCP tool execution plan for user request
 */
router.post('/plan', async (req, res) => {
    try {
        const { prompt, context }: AssistantRequest = req.body;

        if (!prompt) {
            return res.status(400).json({
                success: false,
                error: { message: 'Prompt is required' }
            });
        }

        if (!getGeminiApiKey()) {
            return res.status(500).json({
                success: false,
                error: { message: 'Gemini API key not configured' }
            });
        }

        // Build MCP planning prompt
        const planningPrompt = buildMcpPlanningPrompt(prompt, context);

        const geminiResponse = await axios.post(
            `${GEMINI_API_URL}?key=${getGeminiApiKey()}`,
            {
                contents: [{ parts: [{ text: planningPrompt }] }],
                generationConfig: {
                    temperature: 0.3, // Lower temp for more deterministic planning
                    topK: 20,
                    topP: 0.8,
                    maxOutputTokens: 4096,
                }
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const responseText = geminiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            throw new Error('No response from Gemini');
        }

        // Parse the plan
        const plan = parseMcpPlan(responseText);

        res.json({
            success: true,
            data: {
                plan,
                rawResponse: responseText
            }
        });

    } catch (error: any) {
        console.error('Planning error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: { message: error.message || 'Failed to create plan' }
        });
    }
});

/**
 * POST /api/assistant/chat
 * Conversational AI with MCP context
 */
router.post('/chat', async (req, res) => {
    try {
        const { messages, context } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({
                success: false,
                error: { message: 'Messages array is required' }
            });
        }

        if (!getGeminiApiKey()) {
            return res.status(500).json({
                success: false,
                error: { message: 'Gemini API key not configured' }
            });
        }

        const systemContext = `You are an AI coding assistant integrated with a VS Code-like IDE. 
You can help users with:
- Writing and refactoring code
- Understanding codebases
- Debugging issues
- Running code and tests
- Git operations

You have access to MCP tools for file operations, code execution, and IDE features.
When users ask you to perform actions, explain what you would do step by step.
Be concise but helpful. Use markdown formatting.`;

        // Format conversation for Gemini
        const formattedMessages = messages.map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

        // Add system context to first message
        if (formattedMessages.length > 0) {
            formattedMessages[0].parts[0].text = `${systemContext}\n\n${formattedMessages[0].parts[0].text}`;
        }

        const geminiResponse = await axios.post(
            `${GEMINI_API_URL}?key=${getGeminiApiKey()}`,
            {
                contents: formattedMessages,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048,
                }
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const responseText = geminiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text;

        res.json({
            success: true,
            data: {
                message: responseText || 'No response generated',
                role: 'assistant'
            }
        });

    } catch (error: any) {
        console.error('Chat error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: { message: error.message || 'Chat failed' }
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
        test: 'You are a test generation assistant. Generate comprehensive unit tests.',
        plan: 'You are a planning assistant. Create step-by-step execution plans.'
    };

    return prompts[action] || prompts.generate;
}

function buildMcpPlanningPrompt(userRequest: string, context?: any): string {
    const toolsDoc = MCP_TOOLS.map(t =>
        `- ${t.server}.${t.tool}: ${t.description} (args: ${t.args.join(', ') || 'none'})`
    ).join('\n');

    return `You are an AI assistant that plans MCP tool executions for a VS Code-like IDE.

## Available MCP Tools:
${toolsDoc}

## User Request:
${userRequest}

${context?.filePath ? `## Current File: ${context.filePath}` : ''}
${context?.selectedCode ? `## Selected Code:\n\`\`\`\n${context.selectedCode}\n\`\`\`` : ''}

## Instructions:
Create a step-by-step plan to accomplish the user's request using the available MCP tools.
For each step, specify:
1. The tool to use (server.tool format)
2. The arguments needed
3. A brief description
4. Whether it requires user approval (true for write/execute operations)

Format your response as a JSON array:
[
  {
    "step": 1,
    "tool": "server.tool_name",
    "args": {"arg1": "value1"},
    "description": "What this step does",
    "requiresApproval": true/false
  }
]

Only output the JSON array, no other text.`;
}

function parseMcpPlan(responseText: string): McpAction[] {
    try {
        // Extract JSON from response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            return [];
        }

        const rawPlan = JSON.parse(jsonMatch[0]);

        return rawPlan.map((step: any, index: number) => {
            const [server, tool] = (step.tool || '').split('.');
            return {
                id: `action-${Date.now()}-${index}`,
                server: server || 'unknown',
                tool: tool || step.tool || 'unknown',
                args: step.args || {},
                description: step.description || '',
                requiresApproval: step.requiresApproval !== false
            };
        });
    } catch (error) {
        console.error('Failed to parse MCP plan:', error);
        return [];
    }
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


