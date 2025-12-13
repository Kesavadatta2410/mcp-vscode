/**
 * Activity Bar Component
 * VS Code-style vertical icon bar on the left side
 */

import React from 'react';
import {
    VscFiles,
    VscSearch,
    VscSourceControl,
    VscExtensions,
    VscSettingsGear,
    VscTerminal,
    VscDebugAlt,
    VscRemote,
} from 'react-icons/vsc';
import { FaRobot } from 'react-icons/fa';

export type PanelType =
    | 'explorer'
    | 'search'
    | 'git'
    | 'ai'
    | 'extensions'
    | 'settings'
    | 'terminal'
    | 'debug'
    | 'ports';

interface ActivityBarProps {
    activePanel: PanelType;
    onPanelChange: (panel: PanelType) => void;
    bottomPanelVisible: boolean;
    onToggleBottomPanel: () => void;
}

interface ActivityBarItem {
    id: PanelType;
    icon: React.ReactNode;
    label: string;
    position: 'top' | 'bottom';
}

const ActivityBar: React.FC<ActivityBarProps> = ({
    activePanel,
    onPanelChange,
    bottomPanelVisible,
    onToggleBottomPanel,
}) => {
    const items: ActivityBarItem[] = [
        { id: 'explorer', icon: <VscFiles size={24} />, label: 'Explorer', position: 'top' },
        { id: 'search', icon: <VscSearch size={24} />, label: 'Search', position: 'top' },
        { id: 'git', icon: <VscSourceControl size={24} />, label: 'Source Control', position: 'top' },
        { id: 'ai', icon: <FaRobot size={20} />, label: 'AI Assistant', position: 'top' },
        { id: 'debug', icon: <VscDebugAlt size={24} />, label: 'Run & Debug', position: 'top' },
        { id: 'extensions', icon: <VscExtensions size={24} />, label: 'Extensions', position: 'top' },
        { id: 'ports', icon: <VscRemote size={24} />, label: 'Ports', position: 'bottom' },
        { id: 'settings', icon: <VscSettingsGear size={24} />, label: 'Settings', position: 'bottom' },
    ];

    const topItems = items.filter((item) => item.position === 'top');
    const bottomItems = items.filter((item) => item.position === 'bottom');

    const renderItem = (item: ActivityBarItem) => {
        const isActive = activePanel === item.id;
        return (
            <button
                key={item.id}
                onClick={() => onPanelChange(item.id)}
                className={`
                    relative w-12 h-12 flex items-center justify-center
                    transition-all duration-150 ease-out
                    hover:text-white
                    ${isActive ? 'text-white' : 'text-gray-500'}
                `}
                title={item.label}
                aria-label={item.label}
            >
                {/* Active indicator */}
                {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-white rounded-r" />
                )}
                {item.icon}
            </button>
        );
    };

    return (
        <div className="flex flex-col h-full w-12 bg-vscode-activitybar border-r border-vscode-border">
            {/* Top icons */}
            <div className="flex flex-col items-center pt-1">
                {topItems.map(renderItem)}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Terminal toggle */}
            <button
                onClick={onToggleBottomPanel}
                className={`
                    w-12 h-12 flex items-center justify-center
                    transition-all duration-150 ease-out
                    hover:text-white
                    ${bottomPanelVisible ? 'text-white' : 'text-gray-500'}
                `}
                title="Toggle Panel"
                aria-label="Toggle Panel"
            >
                <VscTerminal size={24} />
            </button>

            {/* Bottom icons */}
            <div className="flex flex-col items-center pb-2">
                {bottomItems.map(renderItem)}
            </div>
        </div>
    );
};

export default ActivityBar;
