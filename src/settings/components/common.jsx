import styled from 'styled-components';

export const Section = styled.div`
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

export const InputGroup = styled.div`
  margin-bottom: 16px;

  label {
    display: block;
    margin-bottom: 8px;
    color: #666;
  }

  input {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    transition: border-color 0.2s;

    &:focus {
      border-color: #2196F3;
      outline: none;
      box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
    }
  }
`;

export const SaveButton = styled.button`
  background: ${props => props.$saving ? '#4CAF50' : '#2196F3'};
  color: white;
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
    background: ${props => props.$saving ? '#4CAF50' : '#1976D2'};
  }
`; 