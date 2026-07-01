import React, { useState } from 'react';
import type { FileFormat } from '../utils/detect';

interface ActionPanelProps {
  format: FileFormat;
  onValidate: () => void;
  onFormat: (indentSize: number) => void;
  onMinify: () => void;
  onRemoveComments: () => void;
  onConvert: (target: FileFormat) => void;
  validationStatus: { isValid: boolean | null; error?: string };
}

export const ActionPanel: React.FC<ActionPanelProps> = ({
  format,
  onValidate,
  onFormat,
  onMinify,
  onRemoveComments,
  onConvert,
  validationStatus
}) => {
  const [indentSize, setIndentSize] = useState<number>(2);

  // Conversion Compatibility definitions
  const isCompatible = (target: FileFormat): boolean => {
    if (format === target) return false;
    if (format === 'html' || target === 'html') return false;
    return true;
  };

  const getWarningHint = (target: FileFormat): string | null => {
    if (!isCompatible(target)) return null;
    
    if (target === 'properties') {
      return 'Hierarchical structures will be flattened using dots (lossy for arrays).';
    }
    if (target === 'toml' && (format === 'json' || format === 'yaml' || format === 'xml')) {
      return 'TOML does not support null values or mixed-type arrays (lossy conversion).';
    }
    if (target === 'xml' && (format === 'json' || format === 'yaml' || format === 'toml')) {
      return 'Conversion will wrap values in a root element and format attributes with @_ prefixes.';
    }
    if (format === 'properties' && (target === 'json' || target === 'yaml' || target === 'toml' || target === 'xml')) {
      return 'Flat keys containing dots will be unflattened into nested objects.';
    }
    return null;
  };

  const formatsList: { value: FileFormat; label: string }[] = [
    { value: 'html', label: 'HTML' },
    { value: 'json', label: 'JSON' },
    { value: 'properties', label: 'Properties' },
    { value: 'toml', label: 'TOML' },
    { value: 'xml', label: 'XML' },
    { value: 'yaml', label: 'YAML' }
  ];

  return (
    <div className="action-panel">
      <div className="action-group">
        <h3 className="action-heading">Structure Tools</h3>
        <div className="action-buttons-grid">
          {/* Validate */}
          <button className="action-btn validate-btn" onClick={onValidate}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="action-icon">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Validate Syntax
          </button>

          {/* Format */}
          <div className="format-control-group">
            <button className="action-btn format-btn" onClick={() => onFormat(indentSize)}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="action-icon">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              Format Content
            </button>
            <select 
              className="indent-select"
              value={indentSize}
              onChange={(e) => setIndentSize(Number(e.target.value))}
              title="Indentation Spaces"
            >
              <option value={2}>2 Spaces</option>
              <option value={4}>4 Spaces</option>
              <option value={8}>8 Spaces</option>
            </select>
          </div>

          {/* Minify */}
          <button className="action-btn minify-btn" onClick={onMinify}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="action-icon">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
            </svg>
            Minify Content
          </button>

          {/* Remove Comments */}
          <button className="action-btn comment-btn" onClick={onRemoveComments}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="action-icon">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            Strip Comments
          </button>
        </div>
      </div>

      {/* Validation Status Display */}
      {validationStatus.isValid !== null && (
        <div className={`validation-alert-box alert-${validationStatus.isValid ? 'success' : 'error'}`}>
          <div className="alert-header">
            <span className="alert-badge">
              {validationStatus.isValid ? 'VALID' : 'INVALID'}
            </span>
            <span className="alert-format">
              {format.toUpperCase()}
            </span>
          </div>
          {validationStatus.error && (
            <div className="alert-message">{validationStatus.error}</div>
          )}
        </div>
      )}

      {/* Conversion panel */}
      <div className="action-group conversion-group">
        <h3 className="action-heading">Convert Content</h3>
        <div className="conversion-grid">
          {formatsList.map((target) => {
            const compat = isCompatible(target.value);
            const warning = getWarningHint(target.value);
            
            return (
              <button
                key={target.value}
                className={`convert-btn-item ${!compat ? 'disabled' : ''} ${warning ? 'has-warning' : ''}`}
                disabled={!compat}
                onClick={() => onConvert(target.value)}
                title={!compat ? `Cannot convert ${format.toUpperCase()} to ${target.label}` : warning || `Convert to ${target.label}`}
              >
                <span className="convert-label">{target.label}</span>
                {warning && (
                  <span className="warning-indicator" title={warning}>
                    ⚠️
                  </span>
                )}
                {!compat && (
                  <span className="lock-indicator" title="Incompatible">
                    🔒
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
