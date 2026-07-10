import React, { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';
import { html } from '@codemirror/lang-html';
import { markdown } from '@codemirror/lang-markdown';
import type { FileFormat } from '../utils/detect';
import { EditorView } from '@codemirror/view';

interface CodeEditorProps {
  value: string;
  onChange: (val: string) => void;
  format: FileFormat;
  onFormatChange: (format: FileFormat) => void;
  isAutoDetected: boolean;
  setIsAutoDetected: (val: boolean) => void;
  placeholder?: string;
  readOnly?: boolean;
  label?: string;
  onShowToast?: (type: 'success' | 'warning' | 'error', msg: string) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  format,
  onFormatChange,
  isAutoDetected,
  setIsAutoDetected,
  placeholder = 'Paste your content here...',
  readOnly = false,
  label = 'Editor',
  onShowToast
}) => {
  const [copied, setCopied] = useState(false);

  const getExtensions = () => {
    const exts = [EditorView.lineWrapping];
    switch (format) {
      case 'json':
        exts.push(json());
        break;
      case 'xml':
        exts.push(xml());
        break;
      case 'yaml':
        exts.push(yaml());
        break;
      case 'html':
        exts.push(html());
        break;
      case 'markdown':
        exts.push(markdown());
        break;
    }
    return exts;
  };

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (onShowToast) onShowToast('success', 'Content copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      if (onShowToast) onShowToast('error', 'Failed to copy content');
    }
  };

  const handlePaste = async () => {
    if (readOnly) return;
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onChange(text);
        if (onShowToast) onShowToast('success', 'Pasted content from clipboard');
      } else {
        if (onShowToast) onShowToast('warning', 'Clipboard is empty');
      }
    } catch {
      if (onShowToast) {
        onShowToast(
          'warning',
          'Clipboard read permission denied. Please paste directly using Ctrl+V / Cmd+V.'
        );
      }
    }
  };

  const handleFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFormatChange(e.target.value as FileFormat);
    setIsAutoDetected(false);
  };

  const lineCount = value ? value.split(/\r?\n/).length : 0;
  const charCount = value.length;

  return (
    <div className="editor-card">
      <div className="editor-header">
        <div className="editor-label-group">
          <span className="editor-label">{label}</span>
          {isAutoDetected && !readOnly && (
            <span className="auto-detect-badge">Auto-detected</span>
          )}
        </div>
        
        <div className="editor-controls">
          {!readOnly && format !== 'markdown' && (
            <div className="format-selector-wrapper">
              <select
                className="format-dropdown"
                value={format}
                onChange={handleFormatChange}
              >
                <option value="html">HTML</option>
                <option value="json">JSON</option>
                <option value="properties">Properties</option>
                <option value="toml">TOML</option>
                <option value="xml">XML</option>
                <option value="yaml">YAML</option>
              </select>
            </div>
          )}
          
          <div className="button-group">
            {!readOnly && (
              <button
                className="control-btn"
                onClick={handlePaste}
                title="Paste from Clipboard"
              >
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="btn-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Paste
              </button>
            )}
            <button
              className={`control-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
              disabled={!value}
              title="Copy to Clipboard"
            >
              {copied ? (
                <>
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="btn-icon text-success">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="btn-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="codemirror-wrapper">
        <CodeMirror
          value={value}
          height="100%"
          theme="dark"
          placeholder={placeholder}
          extensions={getExtensions()}
          onChange={(val) => {
            if (!readOnly) onChange(val);
          }}
          readOnly={readOnly}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            dropCursor: true,
            allowMultipleSelections: false,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: false,
            crosshairCursor: false,
          }}
        />
      </div>

      <div className="editor-footer">
        <span>Lines: {lineCount}</span>
        <span>Chars: {charCount}</span>
        {readOnly && <span className="format-indicator-badge">{format.toUpperCase()}</span>}
      </div>
    </div>
  );
};
