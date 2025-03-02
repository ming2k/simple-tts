import styled from 'styled-components';

export const InputContainer = styled.div`
  width: 100%;
`;

export const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  max-width: ${props => props.$short ? '200px' : '320px'};
`;

export const StyledInput = styled.input`
  width: 100%;
  height: 44px;
  padding: 0 ${props => props.$hasEye ? '40px' : '12px'} 0 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: all 0.2s;
  font-family: ${props => props.$isKey ? 'monospace' : 'inherit'};
  box-sizing: border-box;
  text-overflow: ellipsis;
  
  &[type="password"] {
    font-family: text-security-disc;
    letter-spacing: 1px;
  }

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

export const EyeButton = styled.button`
  position: absolute;
  right: 6px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  border-radius: 4px;
  transition: all 0.2s ease;
  padding: 0;
  z-index: 1;

  &:hover {
    color: #374151;
    background-color: rgba(0, 0, 0, 0.04);
  }

  &:focus {
    outline: none;
    background-color: rgba(0, 0, 0, 0.04);
  }

  svg {
    width: 16px;
    height: 16px;
    stroke-width: 2px;
  }
`;

export const ButtonContainer = styled.div`
  max-width: 320px;
  margin-top: 24px;
`; 