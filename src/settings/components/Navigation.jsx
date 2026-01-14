import React from 'react';
import styled from 'styled-components';

const Nav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 2px;

  @media (max-width: 768px) {
    flex-direction: row;
    overflow-x: auto;
    gap: 0;
    border-bottom: 1px solid var(--border);
  }
`;

const TabButton = styled.a`
  display: block;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: ${props => props.$active ? '500' : '400'};
  color: ${props => props.$active ? 'var(--accent)' : 'var(--text-secondary)'};
  background: ${props => props.$active ? 'var(--bg-hover)' : 'transparent'};
  border-radius: var(--radius);
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: var(--bg-hover);
    color: ${props => props.$active ? 'var(--accent)' : 'var(--text)'};
    text-decoration: none;
  }

  @media (max-width: 768px) {
    flex: 1;
    text-align: center;
    white-space: nowrap;
    border-radius: 0;
    border-bottom: 2px solid ${props => props.$active ? 'var(--accent)' : 'transparent'};
  }
`;

export function Navigation({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'api', label: 'API' },
    { id: 'audio', label: 'Audio' },
    { id: 'document', label: 'Docs' },
    { id: 'about', label: 'About' },
    { id: 'sponsor', label: 'Sponsor' }
  ];

  return (
    <Nav>
      {tabs.map(tab => (
        <TabButton
          key={tab.id}
          href={`#${tab.id}`}
          $active={activeTab === tab.id}
          onClick={(e) => {
            e.preventDefault();
            onTabChange(tab.id);
          }}
        >
          {tab.label}
        </TabButton>
      ))}
    </Nav>
  );
}
