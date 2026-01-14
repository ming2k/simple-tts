import styled from 'styled-components';

export const SettingsContainer = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
  min-height: 100vh;
`;

export const SettingsLayout = styled.div`
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

export const SettingsContent = styled.div`
  width: 100%;
`;
