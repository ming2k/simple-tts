import styled from 'styled-components';

export const Container = styled.div`
  padding: 2rem;
`;

export const Title = styled.h1`
  font-size: 1.5rem;
  color: #1a1a1a;
  margin-bottom: 1rem;
`;

export const Description = styled.p`
  color: #4b5563;
  line-height: 1.6;
  margin-bottom: 1.5rem;
`;

export const ErrorMessage = styled.div`
  color: #dc2626;
  font-size: 0.875rem;
  margin-top: 0.5rem;
`;

export const StepContainer = styled.div`
  display: ${props => props.isActive ? 'block' : 'none'};
  animation: fadeIn 0.5s;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`; 