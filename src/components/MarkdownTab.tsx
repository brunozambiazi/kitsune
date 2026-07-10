import React, { useState, useMemo } from 'react';
import { CodeEditor } from './CodeEditor';
import { marked } from 'marked';
import { formatMarkdown } from '../utils/markdownFormatter';

interface MarkdownTabProps {
  // Shared with other tabs for consistency
  onShowToast: (type: 'success' | 'warning' | 'error', message: string) => void;
}

export const MarkdownTab: React.FC<MarkdownTabProps> = ({ onShowToast }) => {
  const [value, setValue] = useState<string>('');

  const handleFormat = () => {
    if (!value.trim()) {
      onShowToast('warning', 'Please paste or write some markdown content to format.');
      return;
    }
    try {
      const formatted = formatMarkdown(value);
      setValue(formatted);
      onShowToast('success', 'Formatted Markdown successfully.');
    } catch (err: any) {
      onShowToast('error', err.message || 'Markdown formatting failed.');
    }
  };

  const handleClear = () => {
    setValue('');
    onShowToast('success', 'Cleared content.');
  };

  // Convert markdown to HTML in real-time
  const renderedHtml = useMemo(() => {
    if (!value.trim()) {
      return `
        <div class="markdown-empty-state">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" class="empty-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3>No Content to Preview</h3>
          <p>Type some Markdown on the left to see the rendered HTML preview here in real time.</p>
        </div>
      `;
    }
    try {
      // Replace literal "\n" with actual line breaks and convert bullet points (•) to markdown hyphens (-)
      const processedMarkdown = value
        .replace(/\\n/g, '\n')
        .replace(/^(\s*)•(\s*)/gm, '$1-$2');
      return marked.parse(processedMarkdown, { breaks: true }) as string;
    } catch (err: any) {
      return `
        <div class="markdown-error-state">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" class="empty-icon text-error">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3>Parsing Error</h3>
          <p>${err.message || err}</p>
        </div>
      `;
    }
  }, [value]);

  return (
    <div className="markdown-tab-layout">
      <div className="markdown-control-bar">
        <div className="control-bar-info">
          <h2 className="tab-title">Markdown Viewer</h2>
          <p className="tab-subtitle">Real-time Markdown editor, formatter, and HTML previewer.</p>
        </div>
        <div className="control-bar-actions">
          <button className="action-btn format-btn" onClick={handleFormat}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="action-icon">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            Format Markdown
          </button>
          {value && (
            <button className="action-btn-secondary" onClick={handleClear}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="markdown-panels-row">
        {/* Editor Side */}
        <div className="markdown-panel-col">
          <CodeEditor
            value={value}
            onChange={setValue}
            format="markdown"
            onFormatChange={() => {}}
            isAutoDetected={false}
            setIsAutoDetected={() => {}}
            label="Markdown Source"
            placeholder="Type your markdown here... (e.g. # Title, **bold**, - list)"
            onShowToast={onShowToast}
          />
        </div>

        {/* Live Preview Side */}
        <div className="markdown-panel-col">
          <div className="editor-card markdown-preview-card">
            <div className="editor-header">
              <span className="editor-label">Live Preview</span>
              <div className="editor-controls">
                <span className="format-indicator-badge">HTML Render</span>
              </div>
            </div>
            <div className="markdown-preview-scroll-wrapper">
              <div
                className="markdown-preview-body"
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
