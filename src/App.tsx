import { useState } from 'react';
import { Header } from './components/Header';
import { EditorTab } from './components/EditorTab';
import { CompareTab } from './components/CompareTab';
import { MarkdownTab } from './components/MarkdownTab';
import { ToastList } from './components/Toast';
import type { ToastMessage } from './components/Toast';
import type { FileFormat } from './utils/detect';

function App() {
  const [activeTab, setActiveTab] = useState<'editor' | 'compare' | 'markdown'>('editor');
  
  // Shared state for the Editor Tab
  const [editorValue, setEditorValue] = useState<string>('');
  const [editorFormat, setEditorFormat] = useState<FileFormat>('yaml');
  const [editorIsAutoDetected, setEditorIsAutoDetected] = useState<boolean>(true);
  const [validationStatus, setValidationStatus] = useState<{
    isValid: boolean | null;
    error?: string;
  }>({ isValid: null });

  // Toast notification state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'warning' | 'error', message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="app-container">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="app-main-content">
        {activeTab === 'editor' && (
          <EditorTab
            value={editorValue}
            onChange={setEditorValue}
            format={editorFormat}
            onFormatChange={setEditorFormat}
            isAutoDetected={editorIsAutoDetected}
            setIsAutoDetected={setEditorIsAutoDetected}
            validationStatus={validationStatus}
            setValidationStatus={setValidationStatus}
            onShowToast={addToast}
          />
        )}
        {activeTab === 'compare' && (
          <CompareTab
            mainEditorValue={editorValue}
            mainEditorFormat={editorFormat}
            onShowToast={addToast}
          />
        )}
        {activeTab === 'markdown' && (
          <MarkdownTab
            onShowToast={addToast}
          />
        )}
      </main>

      <footer className="app-footer-brand">
        <p>&copy; {new Date().getFullYear()} Kitsune Developer Suite. Clean. Simple. Private.</p>
      </footer>

      <ToastList toasts={toasts} onClose={removeToast} />
    </div>
  );
}

export default App;
