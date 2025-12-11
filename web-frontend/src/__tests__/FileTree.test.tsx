import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FileTree from '../components/FileTree';

// Mock MCP client
vi.mock('@/services/mcpClient', () => ({
    default: {
        getTree: vi.fn(() => Promise.resolve({
            success: true,
            data: `
project/
├── src/
│   ├── index.ts
│   └── utils.ts
├── package.json
└── README.md
      `.trim()
        })),
    },
}));

describe('FileTree Component', () => {
    it('renders file tree', async () => {
        const onFileSelect = vi.fn();

        render(<FileTree onFileSelect={onFileSelect} selectedFile={null} />);

        // Wait for tree to load
        await waitFor(() => {
            expect(screen.getByText('Explorer')).toBeInTheDocument();
        });
    });

    it('calls onFileSelect when file is clicked', async () => {
        const onFileSelect = vi.fn();

        render(<FileTree onFileSelect={onFileSelect} selectedFile={null} />);

        await waitFor(() => {
            const fileElement = screen.queryByText('index.ts');
            if (fileElement) {
                fireEvent.click(fileElement);
                expect(onFileSelect).toHaveBeenCalled();
            }
        });
    });
});
