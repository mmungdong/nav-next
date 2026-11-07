'use client';

// Static placeholders shaped like the final layout; no pulse animation because
// the new front end only animates through React Bits components.
export default function HomeSkeleton() {
  return (
    <div className="nx-layout" aria-busy="true" aria-label="正在加载站点数据">
      <aside className="nx-sidebar" aria-hidden="true">
        <div className="nx-side-head">
          <span>分类</span>
          <span>--</span>
        </div>
        <div style={{ display: 'grid', gap: 10, padding: '0 10px' }}>
          {Array.from({ length: 8 }).map((_, index) => (
            <span
              key={index}
              className="nx-skeleton"
              style={{ height: 12, width: `${70 - (index % 3) * 12}%` }}
            />
          ))}
        </div>
      </aside>
      <main className="nx-main" aria-hidden="true">
        <div className="nx-hero">
          <span className="nx-skeleton" style={{ display: 'block', width: 120, height: 10 }} />
          <span
            className="nx-skeleton"
            style={{ display: 'block', width: 'min(420px, 80%)', height: 38, marginTop: 20 }}
          />
          <span
            className="nx-skeleton"
            style={{ display: 'block', width: 'min(320px, 70%)', height: 14, marginTop: 14 }}
          />
          <span
            className="nx-skeleton"
            style={{ display: 'block', width: 'min(620px, 100%)', height: 52, marginTop: 24 }}
          />
        </div>
        <div className="nx-sections" style={{ marginTop: 24 }}>
          {Array.from({ length: 3 }).map((_, group) => (
            <div key={group} className="nx-group">
              <div className="nx-group-head">
                <span className="nx-skeleton" style={{ width: 18, height: 10 }} />
                <span className="nx-skeleton" style={{ width: 92, height: 14 }} />
              </div>
              <div className="nx-grid">
                {Array.from({ length: 4 }).map((_, card) => (
                  <div key={card} className="nx-skeleton-card">
                    <div style={{ padding: 14 }}>
                      <span className="nx-skeleton nx-skeleton-icon" />
                      <span className="nx-skeleton nx-skeleton-line is-title" />
                      <span className="nx-skeleton nx-skeleton-line" />
                      <span className="nx-skeleton nx-skeleton-line is-short" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
