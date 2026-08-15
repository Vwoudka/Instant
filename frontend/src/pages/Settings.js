import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useApp } from '../context/AppContext';

const Title = styled.h1`
  font-size: 22px;
  letter-spacing: 1px;
  margin-bottom: 18px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.section`
  background: ${(p) => p.theme.panel};
  border: 1px solid ${(p) => p.theme.panelBorder};
  border-radius: 18px;
  padding: 20px;
  backdrop-filter: blur(14px);
  box-shadow: 0 10px 30px ${(p) => p.theme.shadow};
`;

const CardTitle = styled.h3`
  font-size: 14px;
  letter-spacing: 1px;
  color: ${(p) => p.theme.textDim};
  text-transform: uppercase;
  margin-bottom: 16px;
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 16px;
`;

const FieldLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: ${(p) => p.theme.textDim};
`;

const Input = styled.input`
  padding: 11px 13px;
  border-radius: 11px;
  border: 1px solid ${(p) => p.theme.panelBorder};
  background: ${(p) => p.theme.bg2};
  color: ${(p) => p.theme.text};
  font-size: 15px;
  font-weight: 600;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: ${(p) => p.theme.cyan};
  }
`;

const SegBtn = styled.button`
  padding: 10px 18px;
  border-radius: 10px;
  border: 1px solid ${(p) => p.theme.panelBorder};
  background: ${(p) => (p.$active ? p.theme.green : 'transparent')};
  color: ${(p) => (p.$active ? p.theme.bg : p.theme.textDim)};
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: ${(p) => (p.$active ? p.theme.bg : p.theme.green)};
  }
`;

const SegRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
`;

const SaveBtn = styled.button`
  width: 100%;
  padding: 13px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #ffffff;
  background: linear-gradient(135deg, ${(p) => p.theme.cyan}, ${(p) => p.theme.magenta});
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;
  box-shadow: 0 8px 22px ${(p) => p.theme.glow};

  &:hover {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`;

const Note = styled.p`
  margin: 14px 0 0;
  font-size: 12px;
  color: ${(p) => p.theme.textDim};
  line-height: 1.6;

  code {
    background: ${(p) => p.theme.panelBorder};
    padding: 1px 6px;
    border-radius: 5px;
    font-size: 11px;
  }
`;

const Chip = styled.span`
  display: inline-block;
  padding: 4px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  margin-left: 8px;
  color: ${(p) => (p.$ok ? p.theme.green : p.theme.amber)};
  background: ${(p) => (p.$ok ? `${p.theme.green}1f` : `${p.theme.amber}1f`)};
`;

export default function Settings() {
  const { state, saveThresholds, notify } = useApp();
  const [vmax, setVmax] = useState('');
  const [imax, setImax] = useState('');
  const [pmax, setPmax] = useState('');
  const [relayDefault, setRelayDefault] = useState('OFF');
  const [saving, setSaving] = useState(false);

  // Keep the form in sync with the latest loaded values.
  useEffect(() => {
    const th = state.thresholds;
    if (th.vmax) {
      setVmax(String(th.vmax));
      setImax(String(th.imax));
      setPmax(String(th.pmax));
    }
    setRelayDefault(state.relay);
  }, [state.thresholds, state.relay]);

  const validate = () => {
    const n = (x) => Number(x);
    if (!Number.isFinite(n(vmax)) || n(vmax) <= 0 || n(vmax) > 400)
      return 'Voltage max must be between 1 and 400 V';
    if (!Number.isFinite(n(imax)) || n(imax) <= 0 || n(imax) > 100)
      return 'Current max must be between 0.1 and 100 A';
    if (!Number.isFinite(n(pmax)) || n(pmax) <= 0 || n(pmax) > 100000)
      return 'Power max must be between 1 and 100000 W';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      notify('error', err);
      return;
    }
    setSaving(true);
    await saveThresholds({
      vmax: Number(vmax),
      imax: Number(imax),
      pmax: Number(pmax),
      relay: relayDefault,
    });
    setSaving(false);
  };

  const fromMqtt = state.thresholdsSource === 'mqtt';

  return (
    <>
      <Title>Settings</Title>

      <Grid>
        <Card>
          <CardTitle>
            Safety thresholds
            <Chip $ok={fromMqtt}>{fromMqtt ? 'From device (MQTT)' : 'Local defaults'}</Chip>
          </CardTitle>

          <Field>
            <FieldLabel>Voltage max (V) &mdash; <code>settings/vmax</code></FieldLabel>
            <Input
              type="number"
              min="1"
              max="400"
              step="0.1"
              value={vmax}
              onChange={(e) => setVmax(e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel>Current max (A) &mdash; <code>settings/imax</code></FieldLabel>
            <Input
              type="number"
              min="0.1"
              max="100"
              step="0.1"
              value={imax}
              onChange={(e) => setImax(e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel>Power max (W) &mdash; <code>settings/pmax</code></FieldLabel>
            <Input
              type="number"
              min="1"
              max="100000"
              step="10"
              value={pmax}
              onChange={(e) => setPmax(e.target.value)}
            />
          </Field>

          <Note>
            Published to MQTT topics <code>settings/vmax</code>, <code>settings/imax</code> and{' '}
            <code>settings/pmax</code> — the device picks them up instantly. The backend recomputes
            the fault status whenever a live reading exceeds these limits.
          </Note>
        </Card>

        <Card>
          <CardTitle>Relay default state &mdash; <code>relay/command</code></CardTitle>

          <SegRow>
            <SegBtn $active={relayDefault === 'ON'} onClick={() => setRelayDefault('ON')}>
              ON
            </SegBtn>
            <SegBtn $active={relayDefault === 'OFF'} onClick={() => setRelayDefault('OFF')}>
              OFF
            </SegBtn>
          </SegRow>

          <Note>
            Current live relay state: <strong>{state.relay}</strong>. Saving publishes the default
            on <code>relay/command</code> so the device can restore it on boot.
          </Note>

          <div style={{ marginTop: 18 }}>
            <SaveBtn onClick={handleSave} disabled={saving}>
              {saving ? 'Publishing\u2026' : 'Publish settings over MQTT'}
            </SaveBtn>
          </div>

          <Note>
            REST API: <code>POST /api/thresholds</code> &middot; MQTT topics:{' '}
            <code>settings/vmax</code>, <code>settings/imax</code>, <code>settings/pmax</code>,{' '}
            <code>relay/command</code>
          </Note>
        </Card>
      </Grid>
    </>
  );
}
