import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  FiCode, FiMoon, FiSun, FiRotateCcw, FiMaximize2, FiMinimize2
} from 'react-icons/fi';

const LANGUAGE_OPTIONS = [
  { id: 'c', label: 'C (GCC)', monacoLang: 'c' },
  { id: 'cpp', label: 'C++ (G++)', monacoLang: 'cpp' },
  { id: 'java', label: 'Java 17', monacoLang: 'java' },
  { id: 'python', label: 'Python 3', monacoLang: 'python' },
  { id: 'javascript', label: 'JavaScript (Node.js)', monacoLang: 'javascript' }
];

const CodeEditor = ({
  code = '',
  onChange = () => {},
  language = 'javascript',
  onLanguageChange = () => {},
  onResetCode = () => {},
  readOnly = false,
  height = '480px',
  initialTheme = 'light',
  className = '',
  style = {}
}) => {
  const [theme, setTheme] = useState(initialTheme || 'light');
  const [fontSize, setFontSize] = useState(14);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentLangObj = LANGUAGE_OPTIONS.find(l => l.id === language) || LANGUAGE_OPTIONS[0];

  const toggleTheme = () => {
    setTheme(prev => prev === 'vs-dark' ? 'light' : 'vs-dark');
  };

  return (
    <div 
      className={`code-editor-wrapper d-flex flex-column border rounded-3 overflow-hidden shadow-sm ${className}`}
      style={{
        backgroundColor: theme === 'vs-dark' ? '#1e1e1e' : '#f8f9fa',
        borderColor: theme === 'vs-dark' ? '#334155' : '#cbd5e1',
        height: isFullscreen ? '100vh' : height,
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        right: isFullscreen ? 0 : 'auto',
        bottom: isFullscreen ? 0 : 'auto',
        zIndex: isFullscreen ? 9999 : 'auto',
        ...style
      }}
    >
      {/* Editor Top Toolbar */}
      <div 
        className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom select-none"
        style={{
          backgroundColor: theme === 'vs-dark' ? '#18181b' : '#f1f5f9',
          borderColor: theme === 'vs-dark' ? '#27272a' : '#e2e8f0',
          fontSize: '0.8rem'
        }}
      >
        {/* Language Selector */}
        <div className="d-flex align-items-center gap-2">
          <FiCode className={theme === 'vs-dark' ? 'text-info' : 'text-primary'} />
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            disabled={readOnly}
            className={`form-select form-select-sm py-1 px-2.5 rounded-2 ${theme === 'vs-dark' ? 'bg-dark text-white border-secondary' : 'bg-white text-dark'}`}
            style={{ width: '170px', fontSize: '0.78rem', fontWeight: 500 }}
          >
            {LANGUAGE_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Toolbar Controls */}
        <div className="d-flex align-items-center gap-2">
          {/* Font Size Adjuster */}
          <div className="d-flex align-items-center gap-1">
            <span className={theme === 'vs-dark' ? 'text-white-50 small' : 'text-muted small'} style={{ fontSize: '0.7rem' }}>Font:</span>
            <select
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className={`form-select form-select-sm py-0.5 px-1.5 rounded ${theme === 'vs-dark' ? 'bg-dark text-white border-secondary' : 'bg-white text-dark'}`}
              style={{ width: '60px', fontSize: '0.72rem' }}
            >
              {[12, 13, 14, 15, 16, 18].map(sz => (
                <option key={sz} value={sz}>{sz}px</option>
              ))}
            </select>
          </div>

          {/* Reset Code Button */}
          {!readOnly && (
            <button
              onClick={onResetCode}
              className={`btn btn-sm py-1 px-2 d-flex align-items-center gap-1 rounded ${theme === 'vs-dark' ? 'btn-outline-secondary text-white-50' : 'btn-outline-secondary'}`}
              style={{ fontSize: '0.72rem' }}
              title="Reset to starter template"
            >
              <FiRotateCcw size={12} /> Reset
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`btn btn-sm p-1 rounded-circle ${theme === 'vs-dark' ? 'btn-dark text-warning' : 'btn-light text-dark'}`}
            title={theme === 'vs-dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {theme === 'vs-dark' ? <FiSun size={13} /> : <FiMoon size={13} />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`btn btn-sm p-1 rounded-circle ${theme === 'vs-dark' ? 'btn-dark text-white-50' : 'btn-light text-dark'}`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Editor to Fullscreen'}
            style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {isFullscreen ? <FiMinimize2 size={13} /> : <FiMaximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Monaco Code Editor Stage */}
      <div className="flex-grow-1 position-relative">
        <Editor
          height="100%"
          language={currentLangObj.monacoLang}
          value={code}
          theme={theme}
          onChange={(val) => onChange(val || '')}
          options={{
            fontSize,
            fontFamily: "'Fira Code', 'Consolas', 'Courier New', monospace",
            minimap: { enabled: false },
            lineNumbers: 'on',
            roundedSelection: true,
            scrollBeyondLastLine: false,
            readOnly,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            wordWrap: 'on',
            bracketPairColorization: { enabled: true },
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            padding: { top: 12, bottom: 12 }
          }}
          loading={
            <div className="d-flex justify-content-center align-items-center h-100 text-muted small">
              <div className="spinner-border spinner-border-sm me-2 text-primary" role="status" />
              Loading VS Code Editor...
            </div>
          }
        />
      </div>
    </div>
  );
};

export default CodeEditor;
