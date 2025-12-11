import React, { useState, useEffect } from 'react';
import { FaFolder, FaFolderOpen, FaFile, FaPython, FaJs } from 'react-icons/fa';
import { VscJson, VscMarkdown } from 'react-icons/vsc';
import mcpClient from '@/services/mcpClient';
import type { FileNode } from '@/types';

interface FileTreeProps {
    onFileSelect: (path: string) => void;
    selectedFile: string | null;
}

const FileTree: React.FC<FileTreeProps> = ({ onFileSelect, selectedFile }) => {
    const [tree, setTree] = useState<FileNode[]>([]);
    const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['/']));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTree();
    }, []);

    const loadTree = async () => {
        setLoading(true);
        const response = await mcpClient.getTree(5);
        if (response.success && response.data) {
            setTree(parseTree(response.data));
        }
        setLoading(false);
    };

    const parseTree = (data: any): FileNode[] => {
        // Parse tree data from MCP response
        if (typeof data === 'string') {
            // Parse tree string format
            const lines = data.split('\n').filter(line => line.trim());
            const root: FileNode[] = [];
            const stack: { node: FileNode; level: number }[] = [];

            lines.forEach(line => {
                const match = line.match(/^(\s*)(.+)$/);
                if (!match) return;

                const indent = match[1].length;
                const name = match[2].replace(/[├└─│]/g, '').trim();
                const isDir = name.endsWith('/');
                const cleanName = isDir ? name.slice(0, -1) : name;

                const node: FileNode = {
                    name: cleanName,
                    path: cleanName,
                    type: isDir ? 'directory' : 'file',
                    children: isDir ? [] : undefined,
                };

                const level = Math.floor(indent / 2);

                if (level === 0) {
                    root.push(node);
                    if (isDir) {
                        stack.push({ node, level });
                    }
                } else {
                    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
                        stack.pop();
                    }
                    if (stack.length > 0) {
                        const parent = stack[stack.length - 1].node;
                        parent.children = parent.children || [];
                        parent.children.push(node);
                        node.path = `${parent.path}/${cleanName}`;
                        if (isDir) {
                            stack.push({ node, level });
                        }
                    }
                }
            });

            return root;
        }
        return [];
    };

    const toggleDirectory = (path: string) => {
        const newExpanded = new Set(expandedDirs);
        if (newExpanded.has(path)) {
            newExpanded.delete(path);
        } else {
            newExpanded.add(path);
        }
        setExpandedDirs(newExpanded);
    };

    const getFileIcon = (name: string) => {
        if (name.endsWith('.py')) return <FaPython className="text-blue-400" />;
        if (name.endsWith('.js') || name.endsWith('.jsx')) return <FaJs className="text-yellow-400" />;
        if (name.endsWith('.ts') || name.endsWith('.tsx')) return <FaJs className="text-blue-500" />;
        if (name.endsWith('.json')) return <VscJson className="text-yellow-600" />;
        if (name.endsWith('.md')) return <VscMarkdown className="text-gray-400" />;
        return <FaFile className="text-gray-500" />;
    };

    const renderNode = (node: FileNode, level: number = 0): React.ReactNode => {
        const isExpanded = expandedDirs.has(node.path);
        const isSelected = selectedFile === node.path;

        if (node.type === 'directory') {
            return (
                <div key={node.path}>
                    <div
                        className={`flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-vscode-active ${isSelected ? 'bg-vscode-highlight' : ''
                            }`}
                        style={{ paddingLeft: `${level * 12 + 8}px` }}
                        onClick={() => toggleDirectory(node.path)}
                    >
                        {isExpanded ? <FaFolderOpen className="text-yellow-500" /> : <FaFolder className="text-yellow-600" />}
                        <span className="text-sm">{node.name}</span>
                    </div>
                    {isExpanded && node.children && (
                        <div>
                            {node.children.map(child => renderNode(child, level + 1))}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div
                key={node.path}
                className={`flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-vscode-active ${isSelected ? 'bg-vscode-highlight' : ''
                    }`}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
                onClick={() => onFileSelect(node.path)}
            >
                {getFileIcon(node.name)}
                <span className="text-sm">{node.name}</span>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="p-4 text-sm text-gray-400">
                Loading file tree...
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-vscode-sidebar">
            <div className="px-2 py-2 text-xs font-semibold text-gray-400 uppercase">
                Explorer
            </div>
            <div>
                {tree.map(node => renderNode(node))}
            </div>
        </div>
    );
};

export default FileTree;
