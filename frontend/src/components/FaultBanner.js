import React from 'react';
import styled from 'styled-components';
import { useApp } from '../context/AppContext';
import { WarningIcon } from './Icons';

const Banner = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  border-radius: 14px;
  background: linear-gradient(90deg, rgba(255, 59, 107, 0.18), rgba(255, 59, 107, 0.05));
  border: 1px solid rgba(255, 59, 107, 0.45);
  color: ${(p) => p.theme.text};
  animation: slideIn 0.3s ease;
`;

const ResetBtn = styled.button`
  margin-left: auto;
  padding: 7px 14px;
  border-radius: 9px;
  border: 1px solid ${(p) => p.theme.red};
  background: transparent;
  color: ${(p) => p.theme.red};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    background: ${(p) => p.theme.red};
    color: #ffffff;
  }
`;

// Warning banner shown whenever a safety limit is exceeded. Reset clears it
// locally until the next violating reading arrives.
export default function FaultBanner({ fault }) {
  const { resetFault } = useApp();

  return (
    <Banner role="alert">
      <WarningIcon size={22} color="#FF3B6B" />
      <div>
        <strong style={{ color: '#FF3B6B' }}>FAULT DETECTED</strong>
        <div style={{ fontSize: 13, marginTop: 2 }}>
          {fault} — one or more safety limits have been exceeded.
        </div>
      </div>
      <ResetBtn onClick={resetFault}>Reset</ResetBtn>
    </Banner>
  );
}
