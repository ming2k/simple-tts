import styled from 'styled-components';

export const Section = styled.div`
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  margin-bottom: 20px;
`;

export const InputGroup = styled.div`
  margin-bottom: 16px;

  label {
    display: block;
    margin-bottom: 6px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text);
  }

  input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-size: 14px;
    background: var(--bg);
    color: var(--text);
    transition: border-color 0.15s;

    &:focus {
      border-color: var(--accent);
      outline: none;
    }

    &::placeholder {
      color: var(--text-muted);
    }
  }
`;

export const SaveButton = styled.button`
  background: ${props => props.$saving ? 'var(--success)' : 'var(--accent)'};
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;

  &:hover:not(:disabled) {
    background: ${props => props.$saving ? 'var(--success)' : 'var(--accent-hover)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
