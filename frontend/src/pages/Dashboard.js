import React from 'react';
import styled from 'styled-components';
import { useApp } from '../context/AppContext';
import MetricCard from '../components/MetricCard';
import AppLineChart from '../components/AppLineChart';
import RelaySwitch from '../components/RelaySwitch';
import FaultBanner from '../components/FaultBanner';
import { BoltIcon, WaveIcon, ZapIcon, PulseIcon } from '../components/Icons';

const ACCENTS = {
  voltage: '#00CFFF',
  current: '#FF9F2E',
  power: '#A96BFF',
  pf: '#00E5A0',
};

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const Title = styled.h1`
  font-size: 22px;
  letter-spacing: 1px;
`;

const LastUpdated = styled.span`
  font-size: 12px;
  color: ${(p) => p.theme.textDim};
  background: ${(p) => p.theme.panel};
  border: 1px solid ${(p) => p.theme.panelBorder};
  padding: 6px 12px;
  border-radius: 10px;
`;

const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(215px, 1fr));
  gap: 16px;
`;

const Lower = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
  align-items: stretch;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.section`
  background: ${(p) => p.theme.panel};
  border: 1px solid ${(p) => p.theme.panelBorder};
  border-radius: 18px;
  padding: 18px;
  backdrop-filter: blur(14px);
  box-shadow: 0 10px 30px ${(p) => p.theme.shadow};
`;

const CardTitle = styled.h3`
  font-size: 14px;
  letter-spacing: 1px;
  color: ${(p) => p.theme.textDim};
  text-transform: uppercase;
  margin-bottom: 12px;
`;

export default function Dashboard() {
  const { state } = useApp();
  const { voltage, current, power, pf, fault, lastUpdated, history, thresholds } = state;

  const labels = history.map((h) => new Date(h.t).toLocaleTimeString([], { hour12: false }));
  const series = [
    { label: 'Power (W)', data: history.map((h) => h.power), color: ACCENTS.power, fill: true, borderWidth: 2 },
    { label: 'Voltage (V)', data: history.map((h) => h.voltage), color: ACCENTS.voltage, fill: false, borderWidth: 1.5, yAxisID: 'y1' },
  ];

  return (
    <>
      <TopBar>
        <Title>Dashboard</Title>
        <LastUpdated>
          Last update:{' '}
          {lastUpdated
            ? new Date(lastUpdated).toLocaleTimeString([], { hour12: false })
            : 'waiting for data\u2026'}
        </LastUpdated>
      </TopBar>

      {fault && <FaultBanner fault={fault} />}

      <Cards>
        <MetricCard
          label="Voltage"
          value={voltage}
          unit="V"
          color={ACCENTS.voltage}
          icon={<BoltIcon size={18} />}
          max={Math.max(260, thresholds.vmax * 1.1)}
          decimals={1}
        />
        <MetricCard
          label="Current"
          value={current}
          unit="A"
          color={ACCENTS.current}
          icon={<WaveIcon size={18} />}
          max={Math.max(15, thresholds.imax * 1.5)}
          decimals={2}
        />
        <MetricCard
          label="Power"
          value={power}
          unit="W"
          color={ACCENTS.power}
          icon={<ZapIcon size={18} />}
          max={Math.max(2500, thresholds.pmax)}
          decimals={0}
        />
        <MetricCard
          label="Power Factor"
          value={pf}
          unit=""
          color={ACCENTS.pf}
          icon={<PulseIcon size={18} />}
          max={1}
          decimals={2}
        />
      </Cards>

      <Lower>
        <ChartCard>
          <CardTitle>Power consumption &mdash; last 5 minutes</CardTitle>
          <AppLineChart labels={labels} series={series} height={320} />
        </ChartCard>
        <RelaySwitch />
      </Lower>
    </>
  );
}
