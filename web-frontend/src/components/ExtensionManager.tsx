/**
 * ExtensionManager - VS Code Extension Pack Manager
 * Allows installing extension packs with real-time progress
 */

import { useState, useEffect, useCallback } from 'react';
import { VscExtensions, VscCheck, VscError, VscLoading, VscPackage } from 'react-icons/vsc';
import mcpClient from '../services/mcpClient';

interface ExtensionPack {
    name: string;
    displayName: string;
    extensions: string[];
}

interface ProgressEvent {
    type: 'installing' | 'completed' | 'failed' | 'pack_start' | 'pack_complete' | 'connected';
    extension?: string;
    pack?: string;
    message: string;
}

interface ExtensionManagerProps {
    onStatusChange?: (status: string) => void;
}

export default function ExtensionManager({ onStatusChange }: ExtensionManagerProps) {
    const [packs, setPacks] = useState<ExtensionPack[]>([]);
    const [installedExtensions, setInstalledExtensions] = useState<string[]>([]);
    const [installing, setInstalling] = useState<string | null>(null);
    const [progressLogs, setProgressLogs] = useState<ProgressEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load extension packs and installed extensions
    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const [packsRes, installedRes] = await Promise.all([
                mcpClient.getExtensionPacks(),
                mcpClient.listInstalledExtensions()
            ]);

            if (packsRes.success && packsRes.data?.packs) {
                setPacks(packsRes.data.packs);
            }

            if (installedRes.success && installedRes.data?.extensions) {
                setInstalledExtensions(installedRes.data.extensions);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load extensions');
        } finally {
            setLoading(false);
        }
    }, []);

    // Connect to WebSocket for real-time progress
    useEffect(() => {
        const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:4000/extensions`;
        let ws: WebSocket | null = null;

        try {
            ws = new WebSocket(wsUrl);

            ws.onmessage = (event) => {
                try {
                    const data: ProgressEvent = JSON.parse(event.data);
                    setProgressLogs(prev => [...prev.slice(-20), data]); // Keep last 20 logs

                    if (data.type === 'pack_complete') {
                        setInstalling(null);
                        onStatusChange?.('Extensions ready');
                        // Refresh installed extensions
                        mcpClient.listInstalledExtensions().then(res => {
                            if (res.success && res.data?.extensions) {
                                setInstalledExtensions(res.data.extensions);
                            }
                        });
                    } else if (data.type === 'installing') {
                        onStatusChange?.(`Installing ${data.extension || 'extension'}...`);
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            };

            ws.onerror = () => {
                console.log('Extension WebSocket error - running without real-time updates');
            };
        } catch (e) {
            console.log('WebSocket not available for extension progress');
        }

        return () => {
            ws?.close();
        };
    }, [onStatusChange]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleInstallPack = async (packName: string) => {
        setInstalling(packName);
        setProgressLogs([]);
        onStatusChange?.(`Installing ${packName} pack...`);

        try {
            const result = await mcpClient.installExtensionPack(packName);

            if (result.success) {
                setProgressLogs(prev => [...prev, {
                    type: 'pack_complete',
                    pack: packName,
                    message: `Installed ${result.data?.installed || 0}/${result.data?.total || 0} extensions`
                }]);
            } else {
                setProgressLogs(prev => [...prev, {
                    type: 'failed',
                    pack: packName,
                    message: result.error?.message || 'Installation failed'
                }]);
            }
        } catch (err: any) {
            setProgressLogs(prev => [...prev, {
                type: 'failed',
                pack: packName,
                message: err.message || 'Installation failed'
            }]);
        } finally {
            setInstalling(null);
            onStatusChange?.('Extensions ready');
            loadData();
        }
    };

    const isPackInstalled = (pack: ExtensionPack) => {
        return pack.extensions.every(ext =>
            installedExtensions.some(installed =>
                installed.toLowerCase() === ext.toLowerCase()
            )
        );
    };

    const getPackStatus = (pack: ExtensionPack) => {
        const installed = pack.extensions.filter(ext =>
            installedExtensions.some(i => i.toLowerCase() === ext.toLowerCase())
        ).length;
        return `${installed}/${pack.extensions.length}`;
    };

    if (loading) {
        return (
            <div className="extension-manager loading">
                <VscLoading className="spin" />
                <span>Loading extensions...</span>
            </div>
        );
    }

    return (
        <div className="extension-manager">
            <div className="extension-header">
                <VscExtensions />
                <span>Extension Packs</span>
            </div>

            {error && (
                <div className="extension-error">
                    <VscError /> {error}
                </div>
            )}

            <div className="extension-packs">
                {packs.map(pack => (
                    <div key={pack.name} className="extension-pack">
                        <div className="pack-info">
                            <VscPackage />
                            <div className="pack-details">
                                <span className="pack-name">{pack.displayName}</span>
                                <span className="pack-count">{getPackStatus(pack)} installed</span>
                            </div>
                        </div>

                        <button
                            className={`pack-install-btn ${isPackInstalled(pack) ? 'installed' : ''} ${installing === pack.name ? 'installing' : ''}`}
                            onClick={() => handleInstallPack(pack.name)}
                            disabled={installing !== null}
                        >
                            {installing === pack.name ? (
                                <><VscLoading className="spin" /> Installing...</>
                            ) : isPackInstalled(pack) ? (
                                <><VscCheck /> Installed</>
                            ) : (
                                'Install'
                            )}
                        </button>
                    </div>
                ))}
            </div>

            {progressLogs.length > 0 && (
                <div className="extension-progress">
                    <div className="progress-header">Installation Progress</div>
                    <div className="progress-logs">
                        {progressLogs.map((log, i) => (
                            <div key={i} className={`progress-log ${log.type}`}>
                                {log.type === 'installing' && <VscLoading className="spin" />}
                                {log.type === 'completed' && <VscCheck />}
                                {log.type === 'failed' && <VscError />}
                                {log.type === 'pack_complete' && <VscPackage />}
                                <span>{log.message}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="installed-count">
                <VscExtensions />
                <span>{installedExtensions.length} extensions installed</span>
            </div>

            <style>{`
                .extension-manager {
                    padding: 10px;
                    font-size: 13px;
                    color: var(--vscode-foreground);
                }
                .extension-manager.loading {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 20px;
                    justify-content: center;
                }
                .extension-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-weight: 600;
                    margin-bottom: 15px;
                    font-size: 14px;
                }
                .extension-error {
                    color: var(--vscode-errorForeground);
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    padding: 8px;
                    margin-bottom: 10px;
                    background: rgba(255, 0, 0, 0.1);
                    border-radius: 4px;
                }
                .extension-packs {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .extension-pack {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 12px;
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 6px;
                }
                .pack-info {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .pack-details {
                    display: flex;
                    flex-direction: column;
                }
                .pack-name {
                    font-weight: 500;
                }
                .pack-count {
                    font-size: 11px;
                    opacity: 0.7;
                }
                .pack-install-btn {
                    padding: 4px 12px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                .pack-install-btn:hover:not(:disabled) {
                    background: var(--vscode-button-hoverBackground);
                }
                .pack-install-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .pack-install-btn.installed {
                    background: var(--vscode-testing-iconPassed);
                }
                .pack-install-btn.installing {
                    background: var(--vscode-progressBar-background);
                }
                .extension-progress {
                    margin-top: 15px;
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 6px;
                    overflow: hidden;
                }
                .progress-header {
                    padding: 8px 12px;
                    background: var(--vscode-editor-background);
                    font-weight: 500;
                    font-size: 12px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                .progress-logs {
                    max-height: 150px;
                    overflow-y: auto;
                    padding: 8px;
                }
                .progress-log {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 0;
                    font-size: 11px;
                    font-family: var(--vscode-editor-font-family);
                }
                .progress-log.installing { color: var(--vscode-terminal-ansiYellow); }
                .progress-log.completed { color: var(--vscode-terminal-ansiGreen); }
                .progress-log.failed { color: var(--vscode-terminal-ansiRed); }
                .progress-log.pack_complete { color: var(--vscode-terminal-ansiCyan); }
                .installed-count {
                    margin-top: 15px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    opacity: 0.7;
                    font-size: 12px;
                }
                .spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
