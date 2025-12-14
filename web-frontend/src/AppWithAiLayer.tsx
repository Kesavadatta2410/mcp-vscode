/**
 * App Wrapper with AI Floating Panel
 * Shows VS Code UI with an integrated AI input panel
 */

import React, { useState, useCallback } from 'react';
import App from './App';
import AiFloatingPanel from './components/AiFloatingPanel';
import type { GeneratedFile } from './hooks/useAiGeneration';

const AppWithAiLayer: React.FC = () => {
    const [showAiPanel, setShowAiPanel] = useState(true);

    const handleComplete = useCallback((_files?: GeneratedFile[]) => {
        // Files are saved, minimize or hide the AI panel
        setShowAiPanel(false);
    }, []);

    const handleMinimize = useCallback(() => {
        setShowAiPanel(false);
    }, []);

    const handleShowPanel = useCallback(() => {
        setShowAiPanel(true);
    }, []);

    return (
        <div className="relative h-screen w-screen overflow-hidden">
            {/* VS Code UI - always visible */}
            <App />

            {/* AI Floating Panel - overlays on top of the editor */}
            <AiFloatingPanel
                isOpen={showAiPanel}
                onComplete={handleComplete}
                onMinimize={handleMinimize}
                onOpen={handleShowPanel}
            />
        </div>
    );
};

export default AppWithAiLayer;
