import React from 'react';
import styled from 'styled-components';
import { useApp } from '../context/AppContext';

const Host = styled.div`
  position: fixed;
  right: 18px;
  bottom: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 1000;
`;

const COLORS = { success: '#00E5A0', error: '#FF3B6B', info: '#00D2FF' };

const Item = styled.div`
  min-width: 260px;
  max-width: 360px;
  padding: 12px 14px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: ${(p) => p.theme.bg2};
  color: ${(p) => p.theme.text};
  border-left: 3px solid ${(p) => COLORS[p.$type] || COLORS.info};
  box-shadow: 0 8px 24px ${(p) => p.theme.shadow};
  animation: slideIn 0.3s ease;
  font-size: 13px;
`;

const Close = styled.button`
  margin-left: auto;
  background: transparent;
  border: none;
  color: ${(p) => p.theme.textDim};
  font-size: 15px;
  cursor: pointer;
  padding: 0 2px;
`;

// Renders the current toast notifications.
export default function ToastHost() {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <Host>
      {toasts.map((t) => (
        <Item key={t.id} $type={t.type}>
          <span>{t.message}</span>
          <Close onClick={() => dismissToast(t.id)} aria-label="Dismiss">x</Close>
        </Item>
      ))}
    </Host>
  );
}
