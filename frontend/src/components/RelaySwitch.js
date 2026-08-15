import React, { useEffect, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { useApp } from '../context/AppContext';
import { PlugIcon } from './Icons';

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 18px rgba(0,229,160,.5), 0 0 46px rgba(0,229,160,.25), inset 0 0 14px rgba(255,255,255,.2); }
  50% { box-shadow: 0 0 30px rgba(0,229,160,.9), 0 0 70px rgba(0,229,160,.4), inset 0 0 14px rgba(255,255,255,.28); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const Panel = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: ${(p) => p.theme.panel};
  border: 1px solid ${(p) => p.theme.panelBorder};
  border-radius: 18px;
  padding: 22px;
  backdrop-filter: blur(14px);
  box-shadow: 0 10px 30px ${(p) => p.theme.shadow};
`;

const PanelTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Orbitron', sans-serif;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${(p) => p.theme.textDim};
`;

const Track = styled.button`
  width: 104px;
  height: 52px;
  border-radius: 28px;
  border: none;
  position: relative;
  cursor: pointer;
  background: ${(p) =>
    p.$on
      ? 'linear-gradient(135deg, #00E5A0, #00A86B)'
      : p.theme.name === 'dark'
      ? '#1C2038'
      : '#E3E6F2'};
  box-shadow: ${(p) =>
    p.$on
      ? '0 0 18px rgba(0,229,160,.5), inset 0 0 14px rgba(255,255,255,.25)'
      : `inset 0 3px 8px ${p.theme.shadow}`};
  transition: background 0.3s ease;
  ${(p) => p.$on && css`animation: ${pulse} 2.2s ease-in-out infinite;`}
  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`;

const Knob = styled.span`
  position: absolute;
  top: 6px;
  left: ${(p) => (p.$on ? '58px' : '6px')};
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${(p) => (p.theme.name === 'dark' ? '#0f1220' : '#ffffff')};
  color: ${(p) => (p.$on ? '#00E5A0' : p.theme.textDim)};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35);
`;

const Spinner = styled.span`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid ${(p) => p.theme.textDim};
  border-top-color: transparent;
  animation: ${spin} 0.7s linear infinite;
`;

const StateLine = styled.div`
  font-family: 'Orbitron', sans-serif;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 2px;
  color: ${(p) => (p.$on ? p.theme.green : p.theme.textDim)};
  text-shadow: ${(p) => (p.$on ? `0 0 16px ${p.theme.green}88` : 'none')};
`;

const Hint = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: ${(p) => p.theme.textDim};
  text-align: center;
  code {
    background: ${(p) => p.theme.panelBorder};
    padding: 1px 6px;
    border-radius: 5px;
    font-size: 11px;
  }
`;

// Big satisfying relay toggle. One click publishes ON/OFF to the ThingSpeak
// config channel — the device polls it and applies the command within ~10 s.
export default function RelaySwitch() {
  const { state, toggleRelay } = useApp();
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);
  const on = state.relay === 'ON';

  // Re-render every second so the cooldown countdown stays accurate.
  useEffect(() => {
    const id = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const cooldownLeft = Math.max(0, Math.ceil((state.relayCooldownUntil - Date.now()) / 1000));
  const locked = cooldownLeft > 0;

  const handle = async () => {
    if (busy || locked) return;
    setBusy(true);
    await toggleRelay();
    setBusy(false);
  };

  return (
    <Panel>
      <PanelTitle>
        <PlugIcon size={16} /> Relay Control
      </PanelTitle>
      <Track
        $on={on}
        onClick={handle}
        disabled={busy || locked}
        role="switch"
        aria-checked={on}
        aria-label="Relay switch"
      >
        <Knob $on={on}>{busy ? <Spinner /> : <PlugIcon size={18} />}</Knob>
      </Track>
      <StateLine $on={on}>
        {busy ? 'SWITCHING' : locked ? `WAIT ${cooldownLeft} s` : on ? 'RELAY ON' : 'RELAY OFF'}
      </StateLine>
      <Hint>
        Single click sends &quot;{on ? 'OFF' : 'ON'}&quot; to the ThingSpeak config channel
        &mdash; the device applies it within ~10&nbsp;s. ThingSpeak free tier allows one update
        per 15&nbsp;s, so the switch briefly locks after each command.
      </Hint>
    </Panel>
  );
}
