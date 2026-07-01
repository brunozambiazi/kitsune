import React from 'react';
import type { DiffLine } from '../utils/diff';

interface DiffResultProps {
  diffLines: DiffLine[];
  hasCompared: boolean;
}

export const DiffResult: React.FC<DiffResultProps> = ({ diffLines, hasCompared }) => {
  if (!hasCompared) {
    return (
      <div className="diff-empty-state">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="empty-icon">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        <p>Paste content in both panes and click "Compare Contents" to see differences.</p>
      </div>
    );
  }

  // If there's differences, but diffLines is empty, it means they are identical
  const onlySkipped = diffLines.every(l => l.type === 'skipped');
  const isIdentical = diffLines.length === 0 || onlySkipped;

  if (isIdentical) {
    return (
      <div className="diff-empty-state diff-success-state">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="empty-icon text-success">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-success-heading">Files are Identical!</p>
        <p>No differences detected between the two contents.</p>
      </div>
    );
  }

  return (
    <div className="diff-result-container">
      <div className="diff-result-header">
        <span className="diff-header-title">Focused Differences</span>
        <span className="diff-header-legend">
          <span className="legend-item legend-added"><span className="legend-dot"></span> Added</span>
          <span className="legend-item legend-removed"><span className="legend-dot"></span> Removed</span>
        </span>
      </div>
      
      <div className="diff-table">
        {diffLines.map((line, idx) => {
          if (line.type === 'skipped') {
            return (
              <div key={idx} className="diff-row row-skipped">
                <div className="line-num line-num-old">-</div>
                <div className="line-num line-num-new">-</div>
                <div className="diff-sign"> </div>
                <div className="diff-content text-skipped">
                  <span>{line.content}</span>
                </div>
              </div>
            );
          }

          const sign = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';

          return (
            <div key={idx} className={`diff-row row-${line.type}`}>
              <div className="line-num line-num-old">
                {line.lineNumberOld !== undefined ? line.lineNumberOld : ''}
              </div>
              <div className="line-num line-num-new">
                {line.lineNumberNew !== undefined ? line.lineNumberNew : ''}
              </div>
              <div className="diff-sign">{sign}</div>
              <pre className="diff-content">
                <code>{line.content || ' '}</code>
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
};
