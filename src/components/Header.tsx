import React from 'react';

interface HeaderProps {
  activeTab: 'editor' | 'compare';
  setActiveTab: (tab: 'editor' | 'compare') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="logo-container">
          <svg className="app-logo" viewBox="0 0 100 100" fill="none">
            {/* Elegant stylized Kitsune Fox shape */}
            <path
              d="M50 15 L62 35 L78 30 L68 48 L85 62 L55 60 L50 85 L45 60 L15 62 L32 48 L22 30 L38 35 Z"
              fill="url(#fox-gradient)"
              stroke="var(--color-primary-accent)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M50 15 L50 85"
              stroke="rgba(0, 0, 0, 0.15)"
              strokeWidth="1.5"
            />
            <defs>
              <linearGradient id="fox-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" /> {/* Amber */}
                <stop offset="50%" stopColor="#ea580c" /> {/* Orange */}
                <stop offset="100%" stopColor="#b91c1c" /> {/* Red */}
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="brand-texts">
          <h1 className="brand-name">Kitsune</h1>
          <span className="brand-tagline">Config & Markup Developer Suite</span>
        </div>
      </div>

      <nav className="header-nav">
        <button
          className={`nav-tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
          onClick={() => setActiveTab('editor')}
        >
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="tab-icon">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Editor & Tools
        </button>
        <button
          className={`nav-tab-btn ${activeTab === 'compare' ? 'active' : ''}`}
          onClick={() => setActiveTab('compare')}
        >
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="tab-icon">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Compare Files
        </button>
      </nav>
    </header>
  );
};
