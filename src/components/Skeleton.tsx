import React from 'react';

export const StatSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="stats-grid animate-fade-in">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="stat-card glass-panel skeleton-stat-card">
          <div className="flex items-center justify-between">
            <div className="skeleton skeleton-avatar" style={{ width: 40, height: 40 }} />
            <div className="skeleton skeleton-text" style={{ width: 50, height: 16 }} />
          </div>
          <div style={{ marginTop: 8 }}>
            <div className="skeleton skeleton-title" style={{ width: '70%', height: 26, marginBottom: 8 }} />
            <div className="skeleton skeleton-text" style={{ width: '50%', height: 14 }} />
          </div>
        </div>
      ))}
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="glass-panel table-container animate-fade-in">
      <div className="skeleton-table-wrapper">
        <div className="flex items-center justify-between" style={{ padding: '8px 12px' }}>
          <div className="skeleton skeleton-title" style={{ width: 140, height: 18 }} />
          <div className="flex gap-2">
            <div className="skeleton" style={{ width: 80, height: 28, borderRadius: 8 }} />
            <div className="skeleton" style={{ width: 80, height: 28, borderRadius: 8 }} />
          </div>
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton-row">
            <div className="skeleton skeleton-avatar" />
            <div className="flex-1">
              <div className="skeleton skeleton-text" style={{ width: '40%', height: 16, marginBottom: 6 }} />
              <div className="skeleton skeleton-text" style={{ width: '25%', height: 12 }} />
            </div>
            <div className="skeleton" style={{ width: 90, height: 22, borderRadius: 20 }} />
            <div className="skeleton" style={{ width: 70, height: 16 }} />
            <div className="skeleton" style={{ width: 60, height: 28, borderRadius: 8 }} />
          </div>
        ))}
      </div>
    </div>
  );
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="flex flex-col gap-3 animate-fade-in" style={{ width: '100%' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="job-card glass-panel skeleton-card">
          <div className="flex justify-between items-center">
            <div className="skeleton skeleton-title" style={{ width: '55%', height: 18 }} />
            <div className="skeleton" style={{ width: 70, height: 20, borderRadius: 6 }} />
          </div>
          <div className="flex items-center gap-2">
            <div className="skeleton" style={{ width: 14, height: 14, borderRadius: '50%' }} />
            <div className="skeleton skeleton-text" style={{ width: '65%', height: 13 }} />
          </div>
          <div className="flex justify-between items-center" style={{ marginTop: 6 }}>
            <div className="skeleton" style={{ width: 85, height: 20, borderRadius: 12 }} />
            <div className="skeleton" style={{ width: 95, height: 28, borderRadius: 8 }} />
          </div>
        </div>
      ))}
    </div>
  );
};

export const PageHeaderSkeleton: React.FC = () => {
  return (
    <header className="page-header animate-fade-in">
      <div>
        <div className="skeleton skeleton-title" style={{ width: 220, height: 32, marginBottom: 8 }} />
        <div className="skeleton skeleton-text" style={{ width: 340, height: 16 }} />
      </div>
      <div className="flex gap-2">
        <div className="skeleton" style={{ width: 110, height: 38, borderRadius: 10 }} />
        <div className="skeleton" style={{ width: 130, height: 38, borderRadius: 10 }} />
      </div>
    </header>
  );
};
