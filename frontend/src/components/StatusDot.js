import React from 'react';
import styled from 'styled-components';

const Dot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  background: ${(p) => (p.$on ? p.theme.green : p.theme.red)};
  box-shadow: ${(p) => (p.$on ? `0 0 10px ${p.theme.green}` : `0 0 8px ${p.theme.red}`)};
  animation: ${(p) => (p.$on ? 'pulseDot 1.8s ease-in-out infinite' : 'none')};
`;

export default function StatusDot({ on }) {
  return <Dot $on={on} aria-hidden="true" />;
}
