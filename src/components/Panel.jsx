import React from 'react';

export function Panel({ title, sub, children }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          <p>{sub}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

