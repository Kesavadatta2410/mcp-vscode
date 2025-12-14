import React, { useState, useEffect, useRef } from 'react';
import { FaFolder, FaFolderOpen, FaFile, FaPython, FaJs, FaUpload } from 'react-icons/fa';
import { VscJson, VscMarkdown, VscNewFile, VscNewFolder, VscTrash, VscRefresh } from 'react-icons/vsc';
import mcpClient from '@/services/mcpClient';
import type { FileNode } from '@/types';

interface FileTreeProps {
    onFileSelect: (path: string) => void;
    selectedFile: string | null;
}

interface ContextMenuState {
    visible: boolean;
    x: number;
    y: number;
    path: string;
    isDirectory: boolean;
}

const FileTree: React.FC<FileTreeProps> = ({ onFileSelect, selectedFile }) => {
    const [tree, setTree] = useState<FileNode[]>([]);
    const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['/']));
    const [loading, setLoading] = useState(true);
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, path: '', isDirectory: false });
    const [showNewFileInput, setShowNewFileInput] = useState<string | null>(null);
    const [newFileName, setNewFileName] = useState('');
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadTree();
        // Close context menu on click outside
        const handleClick = () => setContextMenu(prev => ({ ...prev, visible: false }));
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
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
        // Handle MCP SDK response format: { content: [{ type: 'text', text: 'JSON string' }] }
        let parsedData = data;

        if (data && data.content && Array.isArray(data.content) && data.content[0]) {
            const textContent = data.content[0].text;
            if (typeof textContent === 'string') {
                try {
                    parsedData = JSON.parse(textContent);
                } catch (e) {
                    console.error('Failed to parse MCP response:', e);
                    return [];
                }
            }
        }

        if (parsedData && typeof parsedData === 'object') {
            // Handle tree with children array
            if (parsedData.children && Array.isArray(parsedData.children)) {
                return parsedData.children.map((child: any) => convertToFileNode(child));
            }
            // Handle single node
            if (parsedData.name && parsedData.type) {
                return [convertToFileNode(parsedData)];
            }
            // Handle array of nodes
            if (Array.isArray(parsedData)) {
                return parsedData.map((item: any) => convertToFileNode(item));
            }
        }
        if (typeof parsedData === 'string') {
            const lines = parsedData.split('\n').filter(line => line.trim());
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
                    if (isDir) stack.push({ node, level });
                } else {
                    while (stack.length > 0 && stack[stack.length - 1].level >= level) stack.pop();
                    if (stack.length > 0) {
                        const parent = stack[stack.length - 1].node;
                        parent.children = parent.children || [];
                        parent.children.push(node);
                        node.path = `${parent.path}/${cleanName}`;
                        if (isDir) stack.push({ node, level });
                    }
                }
            });
            return root;
        }
        return [];
    };

    const convertToFileNode = (node: any): FileNode => ({
        name: node.name,
        path: node.path,
        type: node.type,
        children: node.children ? node.children.map((c: any) => convertToFileNode(c)) : undefined
    });

    const toggleDirectory = (path: string) => {
        const newExpanded = new Set(expandedDirs);
        if (newExpanded.has(path)) {
            newExpanded.delete(path);
        } else {
            newExpanded.add(path);
        }
        setExpandedDirs(newExpanded);
    };

    const handleContextMenu = (e: React.MouseEvent, path: string, isDirectory: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ visible: true, x: e.clientX, y: e.clientY, path, isDirectory });
    };

    const handleNewFile = (parentPath: string) => {
        setShowNewFileInput(parentPath);
        setIsCreatingFolder(false);
        setNewFileName('');
        setContextMenu(prev => ({ ...prev, visible: false }));
    };

    const handleNewFolder = (parentPath: string) => {
        setShowNewFileInput(parentPath);
        setIsCreatingFolder(true);
        setNewFileName('');
        setContextMenu(prev => ({ ...prev, visible: false }));
    };

    const handleCreateFile = async () => {
        if (!showNewFileInput || !newFileName.trim()) return;
        const fullPath = `${showNewFileInput}/${newFileName}`;
        try {
            if (isCreatingFolder) {
                // Use create_folder tool directly
                const response = await mcpClient.call({
                    server: 'repo',
                    tool: 'create_folder',
                    args: { path: fullPath }
                });
                if (!response.success) {
                    console.error('Failed to create folder:', response.error);
                    alert(`Failed to create folder: ${response.error?.message || 'Unknown error'}`);
                    return;
                }
            } else {
                await mcpClient.writeFile(fullPath, '');
            }
            setShowNewFileInput(null);
            setNewFileName('');
            await loadTree();
        } catch (error) {
            console.error('Create error:', error);
            alert('Failed to create. Please try again.');
        }
    };

    const handleDelete = async (path: string) => {
        if (!confirm(`Delete ${path}?`)) return;
        setContextMenu(prev => ({ ...prev, visible: false }));
        try {
            const response = await mcpClient.deleteFile(path);
            if (response.success) {
                await loadTree();
            } else {
                console.error('Failed to delete:', response.error);
                alert(`Failed to delete: ${response.error?.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete. Please try again.');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        for (const file of Array.from(files)) {
            const reader = new FileReader();
            reader.onload = async () => {
                const content = reader.result as string;
                await mcpClient.writeFile(`/${file.name}`, content);
                await loadTree();
            };
            reader.readAsText(file);
        }
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
                        className={`flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-vscode-active ${isSelected ? 'bg-vscode-highlight' : ''}`}
                        style={{ paddingLeft: `${level * 12 + 8}px` }}
                        onClick={() => toggleDirectory(node.path)}
                        onContextMenu={(e) => handleContextMenu(e, node.path, true)}
                    >
                        {isExpanded ? <FaFolderOpen className="text-yellow-500" /> : <FaFolder className="text-yellow-600" />}
                        <span className="text-sm">{node.name}</span>
                    </div>
                    {isExpanded && node.children && (
                        <div>
                            {showNewFileInput === node.path && (
                                <div className="flex items-center gap-1 px-2 py-1" style={{ paddingLeft: `${(level + 1) * 12 + 8}px` }}>
                                    {isCreatingFolder ? <FaFolder className="text-yellow-600" /> : <FaFile className="text-gray-500" />}
                                    <input
                                        type="text"
                                        value={newFileName}
                                        onChange={(e) => setNewFileName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' ? handleCreateFile() : e.key === 'Escape' && setShowNewFileInput(null)}
                                        onBlur={() => setShowNewFileInput(null)}
                                        autoFocus
                                        className="bg-vscode-editor border border-blue-500 rounded px-1 text-sm w-32"
                                        placeholder={isCreatingFolder ? 'folder name' : 'file name'}
                                    />
                                </div>
                            )}
                            {node.children.map(child => renderNode(child, level + 1))}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div
                key={node.path}
                className={`flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-vscode-active ${isSelected ? 'bg-vscode-highlight' : ''}`}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
                onClick={() => onFileSelect(node.path)}
                onContextMenu={(e) => handleContextMenu(e, node.path, false)}
            >
                {getFileIcon(node.name)}
                <span className="text-sm">{node.name}</span>
            </div>
        );
    };

    if (loading) {
        return <div className="p-4 text-sm text-gray-400">Loading file tree...</div>;
    }

    return (
        <div className="h-full flex flex-col bg-vscode-sidebar">
            {/* Header with actions */}
            <div className="px-2 py-2 flex items-center justify-between border-b border-vscode-border">
                <span className="text-xs font-semibold text-gray-400 uppercase">Explorer</span>
                <div className="flex items-center gap-1">
                    <button onClick={() => handleNewFile('.')} className="p-1 hover:bg-vscode-active rounded" title="New File">
                        <VscNewFile size={14} />
                    </button>
                    <button onClick={() => handleNewFolder('.')} className="p-1 hover:bg-vscode-active rounded" title="New Folder">
                        <VscNewFolder size={14} />
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="p-1 hover:bg-vscode-active rounded" title="Upload">
                        <FaUpload size={12} />
                    </button>
                    <button onClick={loadTree} className="p-1 hover:bg-vscode-active rounded" title="Refresh">
                        <VscRefresh size={14} />
                    </button>
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
            />

            {/* File tree */}
            <div className="flex-1 overflow-y-auto">
                {/* Root-level new file/folder input */}
                {showNewFileInput === '.' && (
                    <div className="flex items-center gap-1 px-2 py-1" style={{ paddingLeft: '8px' }}>
                        {isCreatingFolder ? <FaFolder className="text-yellow-600" /> : <FaFile className="text-gray-500" />}
                        <input
                            type="text"
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' ? handleCreateFile() : e.key === 'Escape' && setShowNewFileInput(null)}
                            onBlur={() => setTimeout(() => setShowNewFileInput(null), 100)}
                            autoFocus
                            className="bg-vscode-editor border border-blue-500 rounded px-1 text-sm w-32"
                            placeholder={isCreatingFolder ? 'folder name' : 'file name'}
                        />
                    </div>
                )}
                {tree.map(node => renderNode(node))}
            </div>

            {/* Context Menu */}
            {contextMenu.visible && (
                <div
                    className="fixed bg-vscode-sidebar border border-vscode-border rounded shadow-lg py-1 z-50"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {contextMenu.isDirectory && (
                        <>
                            <button
                                className="w-full px-4 py-1 text-sm text-left hover:bg-vscode-active flex items-center gap-2"
                                onClick={() => handleNewFile(contextMenu.path)}
                            >
                                <VscNewFile size={14} /> New File
                            </button>
                            <button
                                className="w-full px-4 py-1 text-sm text-left hover:bg-vscode-active flex items-center gap-2"
                                onClick={() => handleNewFolder(contextMenu.path)}
                            >
                                <VscNewFolder size={14} /> New Folder
                            </button>
                            <div className="border-t border-vscode-border my-1" />
                        </>
                    )}
                    <button
                        className="w-full px-4 py-1 text-sm text-left hover:bg-vscode-active flex items-center gap-2 text-red-400"
                        onClick={() => handleDelete(contextMenu.path)}
                    >
                        <VscTrash size={14} /> Delete
                    </button>
                </div>
            )}
        </div>
    );
};

export default FileTree;

