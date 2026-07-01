import React from 'react';
import { CodeEditor } from './CodeEditor';
import { ActionPanel } from './ActionPanel';
import type { FileFormat } from '../utils/detect';
import { detectFormat } from '../utils/detect';
import { validateAndParse } from '../utils/parsers';
import { prettify, minify } from '../utils/formatters';
import { removeComments } from '../utils/comments';
import { convertFormat } from '../utils/converters';

interface EditorTabProps {
  value: string;
  onChange: (val: string) => void;
  format: FileFormat;
  onFormatChange: (format: FileFormat) => void;
  isAutoDetected: boolean;
  setIsAutoDetected: (val: boolean) => void;
  validationStatus: { isValid: boolean | null; error?: string };
  setValidationStatus: (status: { isValid: boolean | null; error?: string }) => void;
  onShowToast: (type: 'success' | 'warning' | 'error', message: string) => void;
}

export const EditorTab: React.FC<EditorTabProps> = ({
  value,
  onChange,
  format,
  onFormatChange,
  isAutoDetected,
  setIsAutoDetected,
  validationStatus,
  setValidationStatus,
  onShowToast
}) => {
  
  const handleValueChange = (newVal: string) => {
    onChange(newVal);
    setValidationStatus({ isValid: null }); // Reset validation status on change

    if (newVal.trim().length > 0) {
      // Auto-detect format if enabled
      if (isAutoDetected) {
        const detected = detectFormat(newVal);
        if (detected !== format) {
          onFormatChange(detected);
        }
      }
    }
  };

  const handleValidate = () => {
    if (!value.trim()) {
      onShowToast('warning', 'Please paste some content to validate first.');
      return;
    }
    const result = validateAndParse(value, format);
    setValidationStatus({
      isValid: result.isValid,
      error: result.error
    });
    if (result.isValid) {
      onShowToast('success', `${format.toUpperCase()} syntax is valid!`);
    } else {
      onShowToast('error', `Invalid ${format.toUpperCase()} syntax detected.`);
    }
  };

  const handleFormat = (indentSize: number) => {
    if (!value.trim()) {
      onShowToast('warning', 'Please paste some content to format first.');
      return;
    }
    try {
      const formatted = prettify(value, format, indentSize);
      onChange(formatted);
      setValidationStatus({ isValid: true });
      onShowToast('success', `Formatted successfully using ${indentSize} spaces.`);
    } catch (err: any) {
      onShowToast('error', err.message || 'Formatting failed. Please validate syntax.');
    }
  };

  const handleMinify = () => {
    if (!value.trim()) {
      onShowToast('warning', 'Please paste some content to minify first.');
      return;
    }
    try {
      const minified = minify(value, format);
      onChange(minified);
      setValidationStatus({ isValid: true });
      onShowToast('success', 'Minified successfully.');
    } catch (err: any) {
      onShowToast('error', err.message || 'Minification failed. Please validate syntax.');
    }
  };

  const handleRemoveComments = () => {
    if (!value.trim()) {
      onShowToast('warning', 'Please paste some content first.');
      return;
    }
    try {
      const cleaned = removeComments(value, format);
      onChange(cleaned);
      onShowToast('success', 'Comments removed successfully.');
    } catch (err: any) {
      onShowToast('error', err.message || 'Failed to remove comments.');
    }
  };

  const handleConvert = (target: FileFormat) => {
    if (!value.trim()) {
      onShowToast('warning', 'Please paste some content to convert first.');
      return;
    }
    const result = convertFormat(value, format, target);
    if (result.success && result.output !== undefined) {
      onChange(result.output);
      onFormatChange(target);
      setIsAutoDetected(false);
      setValidationStatus({ isValid: true });
      
      onShowToast('success', `Successfully converted to ${target.toUpperCase()}`);
      result.warnings.forEach(warn => {
        onShowToast('warning', warn);
      });
    } else {
      onShowToast('error', result.error || 'Conversion failed.');
    }
  };

  return (
    <div className="editor-tab-layout">
      <div className="editor-tab-main">
        <CodeEditor
          value={value}
          onChange={handleValueChange}
          format={format}
          onFormatChange={onFormatChange}
          isAutoDetected={isAutoDetected}
          setIsAutoDetected={setIsAutoDetected}
          label="Source Editor"
          placeholder={`Paste your code here... (Auto-detect will identify XML, JSON, YAML, TOML, Properties, HTML)`}
          onShowToast={onShowToast}
        />
      </div>
      <div className="editor-tab-sidebar">
        <ActionPanel
          format={format}
          onValidate={handleValidate}
          onFormat={handleFormat}
          onMinify={handleMinify}
          onRemoveComments={handleRemoveComments}
          onConvert={handleConvert}
          validationStatus={validationStatus}
        />
      </div>
    </div>
  );
};
