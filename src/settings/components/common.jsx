import styled from 'styled-components';

export const Section = styled.div`
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px var(--shadow-primary);
`;

export const InputGroup = styled.div`
  margin-bottom: 16px;

  label {
    display: block;
    margin-bottom: 8px;
    color: var(--text-tertiary);
  }

  input {
    width: 100%;
    padding: 8px;
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    font-size: 14px;
    transition: border-color 0.2s;
    background: var(--bg-primary);
    color: var(--text-primary);

    &:focus {
      border-color: var(--border-accent);
      outline: none;
      box-shadow: 0 0 0 2px var(--shadow-accent);
    }

    &::placeholder {
      color: var(--text-tertiary);
    }
  }
`;

export const SaveButton = styled.button`
  background: ${props => props.$saving ? 'var(--bg-success)' : 'var(--bg-accent)'};
  color: var(--text-white);
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  width: 100%;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    background: ${props => props.$saving ? 'var(--bg-success)' : 'var(--bg-accent-hover)'};
  }
`; 