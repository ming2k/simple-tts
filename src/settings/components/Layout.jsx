import styled from 'styled-components';

export const SettingsContainer = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  font-family: system-ui, -apple-system, sans-serif;
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  min-height: 100vh;
`;

export const SettingsLayout = styled.div`
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 20px;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

export const SettingsContent = styled.div`
  width: 100%;
`; 