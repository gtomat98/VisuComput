import React from 'react';

export function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

export function SearchField({ value, onChange, placeholder = "Digite o nome da unidade..." }) {
  return (
    <div className="field unit-search">
      <span>Pesquisar unidade</span>
      <div className="search-input">
        <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={value}
          onChange={evento => onChange(evento.target.value)}
          placeholder={placeholder}
        />
        {value && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => onChange('')}
            title="Limpar pesquisa"
            aria-label="Limpar pesquisa"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
