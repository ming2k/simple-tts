import React from 'react';
import styled from 'styled-components';
import { ErrorMessage } from './StyledComponents';

const InputGroup = styled.div`
  margin-bottom: 1.5rem;

  label {
    display: block;
    margin-bottom: 0.5rem;
    color: #4b5563;
    font-weight: 500;
  }

  input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 1rem;
    transition: all 0.2s;

    &:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
  }
`;

export function AzureForm({ azureKey, azureRegion, onChange, error }) {
  return (
    <>
      <InputGroup>
        <label htmlFor="azureKey">Azure Speech Key</label>
        <input
          type="password"
          id="azureKey"
          value={azureKey}
          onChange={(e) => onChange('azureKey', e.target.value)}
          placeholder="Enter your Azure Speech key"
        />
      </InputGroup>

      <InputGroup>
        <label htmlFor="azureRegion">Azure Region</label>
        <input
          type="text"
          id="azureRegion"
          value={azureRegion}
          onChange={(e) => onChange('azureRegion', e.target.value)}
          placeholder="e.g., japanwest"
        />
      </InputGroup>

      {error && <ErrorMessage>{error}</ErrorMessage>}
    </>
  );
} 