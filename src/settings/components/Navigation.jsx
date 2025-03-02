import React from 'react';
import styled from 'styled-components';

const Nav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: #f5f5f5;
  padding: 8px;
  border-radius: 8px;

  @media (max-width: 768px) {
    flex-direction: row;
    background: none;
    padding: 0;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
`;

const TabButton = styled.a`
  display: block;
  padding: 12px 16px;
  text-align: left;
  background: ${props => props.$active ? '#2563eb' : '#ffffff'};
  border: 1px solid ${props => props.$active ? '#2563eb' : '#e0e0e0'};
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: ${props => props.$active ? 'white' : '#4b5563'};
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$active ? '#2563eb' : '#f8f9fa'};
    border-color: #2563eb;
    color: ${props => props.$active ? 'white' : '#2563eb'};
  }

  @media (max-width: 768px) {
    flex: 1;
    white-space: nowrap;
    text-align: center;
    padding: 8px 16px;
  }
`;

export function Navigation({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'api', label: 'API Settings' },
    { id: 'voice', label: 'Voice Settings' },
    { id: 'document', label: 'Document' },
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