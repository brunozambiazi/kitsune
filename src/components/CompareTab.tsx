import React, { useState } from 'react';
import { CodeEditor } from './CodeEditor';
import { DiffResult } from './DiffResult';
import { detectFormat } from '../utils/detect';
import type { FileFormat } from '../utils/detect';
import { calculateDiff } from '../utils/diff';
import type { DiffLine } from '../utils/diff';

interface CompareTabProps {
  // Pass down editorValue so we can pre-fill or "Load from Editor"
  mainEditorValue: string;
  mainEditorFormat: FileFormat;
  onShowToast: (type: 'success' | 'warning' | 'error', message: string) => void;
}

export const CompareTab: React.FC<CompareTabProps> = ({
  mainEditorValue,
  mainEditorFormat,
  onShowToast
}) => {
  const [leftValue, setLeftValue] = useState<string>('');
  const [leftFormat, setLeftFormat] = useState<FileFormat>('yaml');
  const [leftIsAutoDetected, setLeftIsAutoDetected] = useState<boolean>(true);

  const [rightValue, setRightValue] = useState<string>('');
  const [rightFormat, setRightFormat] = useState<FileFormat>('yaml');
  const [rightIsAutoDetected, setRightIsAutoDetected] = useState<boolean>(true);

  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);
  const [hasCompared, setHasCompared] = useState<boolean>(false);

  const handleLeftChange = (val: string) => {
    setLeftValue(val);
    setHasCompared(false); // Reset comparison state when content changes
    if (leftIsAutoDetected && val.trim()) {
      const detected = detectFormat(val);
      if (detected !== leftFormat) setLeftFormat(detected);
    }
  };

  const handleRightChange = (val: string) => {
    setRightValue(val);
    setHasCompared(false); // Reset comparison state when content changes
    if (rightIsAutoDetected && val.trim()) {
      const detected = detectFormat(val);
      if (detected !== rightFormat) setRightFormat(detected);
    }
  };

  const handleLoadLeftFromEditor = () => {
    if (!mainEditorValue.trim()) {
      onShowToast('warning', 'Main editor content is empty.');
      return;
    }
    setLeftValue(mainEditorValue);
    setLeftFormat(mainEditorFormat);
    setLeftIsAutoDetected(false);
    setHasCompared(false);
    onShowToast('success', 'Loaded main editor content into Original Pane.');
  };

  const handleCompare = () => {
    if (!leftValue.trim() && !rightValue.trim()) {
      onShowToast('warning', 'Please paste content into at least one pane.');
      return;
    }
    const diff = calculateDiff(leftValue, rightValue);
    setDiffLines(diff);
    setHasCompared(true);
    
    const onlySkipped = diff.every(l => l.type === 'skipped');
    const isIdentical = diff.length === 0 || onlySkipped;

    if (isIdentical) {
      onShowToast('success', 'Contents are identical!');
    } else {
      const addedCount = diff.filter(l => l.type === 'added').length;
      const removedCount = diff.filter(l => l.type === 'removed').length;
      onShowToast('warning', `Comparison completed. Found ${addedCount} addition${addedCount !== 1 ? 's' : ''} and ${removedCount} removal${removedCount !== 1 ? 's' : ''}.`);
    }
  };

  const handleClear = () => {
    setLeftValue('');
    setRightValue('');
    setDiffLines([]);
    setHasCompared(false);
    onShowToast('success', 'Cleared comparison panes.');
  };

  return (
    <div className="compare-tab-layout">
      <div className="compare-editors-row">
        {/* Left/Original Editor */}
        <div className="compare-editor-col">
          <div className="compare-editor-header-actions">
            <button className="shortcut-btn" onClick={handleLoadLeftFromEditor}>
              📥 Load from Editor
            </button>
          </div>
          <CodeEditor
            value={leftValue}
            onChange={handleLeftChange}
            format={leftFormat}
            onFormatChange={setLeftFormat}
            isAutoDetected={leftIsAutoDetected}
            setIsAutoDetected={setLeftIsAutoDetected}
            label="Original Content (Left)"
            placeholder="Paste original content here..."
            onShowToast={onShowToast}
          />
        </div>

        {/* Right/Modified Editor */}
        <div className="compare-editor-col">
          <div className="compare-editor-header-actions" style={{ visibility: 'hidden' }}>
            {/* Kept for height alignment */}
            <span className="shortcut-btn">Placeholder</span>
          </div>
          <CodeEditor
            value={rightValue}
            onChange={handleRightChange}
            format={rightFormat}
            onFormatChange={setRightFormat}
            isAutoDetected={rightIsAutoDetected}
            setIsAutoDetected={setRightIsAutoDetected}
            label="Modified Content (Right)"
            placeholder="Paste modified content here..."
            onShowToast={onShowToast}
          />
        </div>
      </div>

      <div className="compare-action-row">
        <button className="action-btn compare-run-btn" onClick={handleCompare}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="action-icon">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
          </svg>
          Compare Contents
        </button>
        {(leftValue || rightValue) && (
          <button className="action-btn-secondary" onClick={handleClear}>
            Clear Panes
          </button>
        )}
      </div>

      <div className="compare-result-row">
        <DiffResult diffLines={diffLines} hasCompared={hasCompared} />
      </div>
    </div>
  );
};
