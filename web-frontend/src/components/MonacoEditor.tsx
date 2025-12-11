import React, { useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

interface MonacoEditorProps {
    value: string;
    path: string;
    onChange: (value: string | undefined) => void;
    onSave: () => void;
}

const MonacoEditorWrapper: React.FC<MonacoEditorProps> = ({ value, path, onChange, onSave }) => {
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;

        // Add save command (Ctrl+S / Cmd+S)
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            onSave();
        });

        // Focus editor
        editor.focus();
    };

    const getLanguage = (filePath: string): string => {
        const ext = filePath.split('.').pop()?.toLowerCase();
        const languageMap: Record<string, string> = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'py': 'python',
            'json': 'json',
            'md': 'markdown',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'yaml': 'yaml',
            'yml': 'yaml',
            'xml': 'xml',
            'sh': 'shell',
            'bash': 'shell',
        };
        return languageMap[ext || ''] || 'plaintext';
    };

    useEffect(() => {
        // Update editor language when path changes
        if (editorRef.current) {
            const model = editorRef.current.getModel();
            if (model) {
                monaco.editor.setModelLanguage(model, getLanguage(path));
            }
        }
    }, [path]);

    return (
        <Editor
            height="100%"
            defaultLanguage={getLanguage(path)}
            language={getLanguage(path)}
            value={value}
            onChange={onChange}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{
                fontSize: 14,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                insertSpaces: true,
                wordWrap: 'on',
                formatOnPaste: true,
                formatOnType: true,
                suggest: {
                    showWords: true,
                    showSnippets: true,
                },
            }}
        />
    );
};

export default MonacoEditorWrapper;
