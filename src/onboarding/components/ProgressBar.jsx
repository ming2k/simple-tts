import React from 'react';
import styled from 'styled-components';

const Bar = styled.div`
  width: 100%;
  height: 4px;
  background: #eee;
  margin-bottom: 2rem;
  border-radius: 2px;
  overflow: hidden;
`;

const Progress = styled.div`
  height: 100%;
  width: ${props => props.percentage}%;
  background: #2563eb;
  transition: width 0.3s ease;
`;

export function ProgressBar({ percentage }) {
  return (
    <Bar>
      <Progress percentage={percentage} />
    </Bar>
  );
} 