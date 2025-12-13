/**
 * Command Palette Component
 * VS Code-style command palette with fuzzy search
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VscSearch, VscChevronRight } from 'react-icons/vsc';

export interface CommandItem {
    id: string;
    label: string;
    description?: string;
    category?: string;
    keybinding?: string;
    action: () => void | Promise<void>;
}

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    commands: CommandItem[];
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
    isOpen,
    onClose,
    commands,
}) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Filter commands based on query
    const filteredCommands = commands.filter((cmd) => {
        const searchText = `${cmd.label} ${cmd.description || ''} ${cmd.category || ''}`.toLowerCase();
        return query.split(' ').every((word) => searchText.includes(word.toLowerCase()));
    });

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex((prev) =>
                        prev < filteredCommands.length - 1 ? prev + 1 : prev
                    );
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (filteredCommands[selectedIndex]) {
                        filteredCommands[selectedIndex].action();
                        onClose();
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
            }
        },
        [filteredCommands, selectedIndex, onClose]
    );

    // Scroll selected item into view
    useEffect(() => {
        const list = listRef.current;
        if (list) {
            const selectedElement = list.children[selectedIndex] as HTMLElement;
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    // Reset selection when query changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-40"
                onClick={onClose}
            />

            {/* Palette */}
            <div className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50">
                <div className="bg-vscode-sidebar border border-vscode-border rounded-lg shadow-2xl overflow-hidden">
                    {/* Search input */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-vscode-border">
                        <VscSearch className="text-gray-400" size={18} />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a command or search..."
                            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-500"
                        />
                    </div>

                    {/* Command list */}
                    <div
                        ref={listRef}
                        className="max-h-80 overflow-y-auto"
                    >
                        {filteredCommands.length === 0 ? (
                            <div className="px-4 py-8 text-center text-gray-500">
                                No commands found
                            </div>
                        ) : (
                            filteredCommands.map((cmd, index) => (
                                <div
                                    key={cmd.id}
                                    className={`
                                        flex items-center justify-between px-4 py-2 cursor-pointer
                                        ${index === selectedIndex
                                            ? 'bg-blue-600/30 text-white'
                                            : 'hover:bg-vscode-active text-gray-300'
                                        }
                                    `}
                                    onClick={() => {
                                        cmd.action();
                                        onClose();
                                    }}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                >
                                    <div className="flex items-center gap-2">
                                        {cmd.category && (
                                            <>
                                                <span className="text-xs text-gray-500">{cmd.category}</span>
                                                <VscChevronRight className="text-gray-500" size={12} />
                                            </>
                                        )}
                                        <span className="text-sm">{cmd.label}</span>
                                        {cmd.description && (
                                            <span className="text-xs text-gray-500 ml-2">
                                                {cmd.description}
                                            </span>
                                        )}
                                    </div>
                                    {cmd.keybinding && (
                                        <kbd className="px-2 py-0.5 text-xs bg-vscode-editor rounded text-gray-400">
                                            {cmd.keybinding}
                                        </kbd>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default CommandPalette;
