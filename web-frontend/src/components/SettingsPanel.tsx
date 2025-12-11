import React, { useState, useEffect } from 'react';
import { FaCog, FaSave } from 'react-icons/fa';

interface Settings {
    editor: {
        fontSize: number;
        tabSize: number;
        theme: 'vs-dark' | 'vs-light';
    };
    terminal: {
        fontSize: number;
        fontFamily: string;
    };
    assistant: {
        enabled: boolean;
        model: string;
    };
}

const defaultSettings: Settings = {
    editor: {
        fontSize: 14,
        tabSize: 2,
        theme: 'vs-dark',
    },
    terminal: {
        fontSize: 14,
        fontFamily: '"Cascadia Code", monospace',
    },
    assistant: {
        enabled: true,
        model: 'gpt-4',
    },
};

const SettingsPanel: React.FC = () => {
    const [settings, setSettings] = useState<Settings>(defaultSettings);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        // Load from localStorage
        const stored = localStorage.getItem('mcp-settings');
        if (stored) {
            try {
                setSettings(JSON.parse(stored));
            } catch {
                // Ignore parse errors
            }
        }
    }, []);

    const handleSave = () => {
        localStorage.setItem('mcp-settings', JSON.stringify(settings));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);

        // Trigger reload for settings to take effect
        window.location.reload();
    };

    const updateSetting = (path: string[], value: any) => {
        const newSettings = { ...settings };
        let current: any = newSettings;

        for (let i = 0; i < path.length - 1; i++) {
            current = current[path[i]];
        }

        current[path[path.length - 1]] = value;
        setSettings(newSettings);
    };

    return (
        <div className="h-full flex flex-col bg-vscode-panel">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-vscode-sidebar border-b border-vscode-border">
                <div className="flex items-center gap-2">
                    <FaCog />
                    <span className="text-sm font-semibold">Settings</span>
                </div>
                <button
                    onClick={handleSave}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                >
                    <FaSave />
                    {saved ? 'Saved!' : 'Save'}
                </button>
            </div>

            {/* Settings */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-6">
                    {/* Editor Settings */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3">Editor</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Font Size</label>
                                <input
                                    type="number"
                                    value={settings.editor.fontSize}
                                    onChange={(e) =>
                                        updateSetting(['editor', 'fontSize'], parseInt(e.target.value))
                                    }
                                    min="10"
                                    max="24"
                                    className="w-full bg-vscode-editor border border-vscode-border rounded px-3 py-2 text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Tab Size</label>
                                <select
                                    value={settings.editor.tabSize}
                                    onChange={(e) =>
                                        updateSetting(['editor', 'tabSize'], parseInt(e.target.value))
                                    }
                                    className="w-full bg-vscode-editor border border-vscode-border rounded px-3 py-2 text-sm"
                                >
                                    <option value="2">2 spaces</option>
                                    <option value="4">4 spaces</option>
                                    <option value="8">8 spaces</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Theme</label>
                                <select
                                    value={settings.editor.theme}
                                    onChange={(e) =>
                                        updateSetting(['editor', 'theme'], e.target.value)
                                    }
                                    className="w-full bg-vscode-editor border border-vscode-border rounded px-3 py-2 text-sm"
                                >
                                    <option value="vs-dark">Dark</option>
                                    <option value="vs-light">Light</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Terminal Settings */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3">Terminal</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Font Size</label>
                                <input
                                    type="number"
                                    value={settings.terminal.fontSize}
                                    onChange={(e) =>
                                        updateSetting(['terminal', 'fontSize'], parseInt(e.target.value))
                                    }
                                    min="10"
                                    max="24"
                                    className="w-full bg-vscode-editor border border-vscode-border rounded px-3 py-2 text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Font Family</label>
                                <input
                                    type="text"
                                    value={settings.terminal.fontFamily}
                                    onChange={(e) =>
                                        updateSetting(['terminal', 'fontFamily'], e.target.value)
                                    }
                                    className="w-full bg-vscode-editor border border-vscode-border rounded px-3 py-2 text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* AI Assistant Settings */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3">AI Assistant</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={settings.assistant.enabled}
                                    onChange={(e) =>
                                        updateSetting(['assistant', 'enabled'], e.target.checked)
                                    }
                                    className="cursor-pointer"
                                />
                                <label className="text-sm">Enable AI Assistant</label>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Model</label>
                                <select
                                    value={settings.assistant.model}
                                    onChange={(e) =>
                                        updateSetting(['assistant', 'model'], e.target.value)
                                    }
                                    disabled={!settings.assistant.enabled}
                                    className="w-full bg-vscode-editor border border-vscode-border rounded px-3 py-2 text-sm disabled:opacity-50"
                                >
                                    <option value="gpt-4">GPT-4</option>
                                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                    <option value="claude-3">Claude 3</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
