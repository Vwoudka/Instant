import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useApp } from '../context/AppContext';
import AppLineChart from '../components/AppLineChart';
import { getHistory } from '../api/client';

const RANGES = [
  { label: '1 hour', minutes: 60 },
  { label: '6 hours', minutes: 360 },
  { label: '24 hours', minutes: 1440 },
  { label: '7 days', minutes: 10080 },
];

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

const Ranges = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const RangeBtn = styled.button`
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid ${(p) => p.theme.panelBorder};
  background: ${(p) => (p.$active ? p.theme.cyan : 'transparent')};
  color: ${(p) => (p.$active ? p.theme.bg : p.theme.textDim)};
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: ${(p) => (p.$active ? p.theme.bg : p.theme.cyan)};
  }
`;

const Card = styled.section`
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

const Center = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: ${(p) => p.theme.textDim};
  font-size: 14px;
`;

const Two = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Table = styled.div`
  overflow-x: auto;
`;

const TableEl = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
`;

const Th = styled.th`
  text-align: left;
  padding: 8px 10px;
  color: ${(p) => p.theme.textDim};
  font-weight: 600;
  border-bottom: 1px solid ${(p) => p.theme.panelBorder};
  text-transform: uppercase;
  font-size: 10.5px;
  letter-spacing: 0.6px;
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 8px 10px;
  border-bottom: 1px solid ${(p) => p.theme.panelBorder};
  white-space: nowrap;
`;

const Badge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 11px;
  color: ${(p) => (p.$on ? p.theme.green : p.theme.textDim)};
  background: ${(p) => (p.$on ? `${p.theme.green}22` : p.theme.panelBorder)};
`;

export default function History() {
  const { notify } = useApp();
  const [range, setRange] = useState(1440);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // ThingSpeak serves the stored history directly from the browser, so it
    // works even when the device is offline (it returns the last known data).
    let active = true;
    setLoading(true);
    getHistory(range)
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        if (active) notify('error', err.message || 'Failed to load history');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [range, notify]);

  const points = data?.points || [];
  const labels = points.map((p) => new Date(p.t).toLocaleString([], { hour12: false }));
  const series = [
    { label: 'Power (W)', data: points.map((p) => p.power), color: '#A96BFF', fill: true, borderWidth: 2 },
    { label: 'Voltage (V)', data: points.map((p) => p.voltage), color: '#00CFFF', fill: false, borderWidth: 1.5, yAxisID: 'y1' },
  ];

  const recent = points.slice(-12).reverse();
  const relayLog = (data?.relayLog || []).slice(-10).reverse();

  return (
    <>
      <TopBar>
        <Title>History</Title>
        <Ranges>
          {RANGES.map((r) => (
            <RangeBtn key={r.minutes} $active={range === r.minutes} onClick={() => setRange(r.minutes)}>
              {r.label}
            </RangeBtn>
          ))}
        </Ranges>
      </TopBar>

      <Card>
        <CardTitle>Power &amp; voltage over time</CardTitle>
        {loading ? (
          <Center>Loading\u2026</Center>
        ) : points.length === 0 ? (
          <Center>No history yet &mdash; waiting for data from ThingSpeak.</Center>
        ) : (
          <AppLineChart labels={labels} series={series} height={340} />
        )}
      </Card>

      <Two>
        <Card>
          <CardTitle>Recent readings</CardTitle>
          {recent.length === 0 ? (
            <Center>No readings recorded yet.</Center>
          ) : (
            <Table>
              <TableEl>
                <thead>
                  <tr>
                    <Th>Time</Th>
                    <Th>Voltage (V)</Th>
                    <Th>Current (A)</Th>
                    <Th>Power (W)</Th>
                    <Th>PF</Th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((p, i) => (
                    <tr key={`${p.t}-${i}`}>
                      <Td>{new Date(p.t).toLocaleTimeString([], { hour12: false })}</Td>
                      <Td>{p.voltage.toFixed(1)}</Td>
                      <Td>{p.current.toFixed(2)}</Td>
                      <Td>{p.power.toFixed(0)}</Td>
                      <Td>{p.pf.toFixed(2)}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableEl>
            </Table>
          )}
        </Card>

        <Card>
          <CardTitle>Relay activity</CardTitle>
          {relayLog.length === 0 ? (
            <Center>No relay toggles logged yet.</Center>
          ) : (
            <Table>
              <TableEl>
                <thead>
                  <tr>
                    <Th>Time</Th>
                    <Th>State</Th>
                  </tr>
                </thead>
                <tbody>
                  {relayLog.map((r, i) => (
                    <tr key={`${r.t}-${i}`}>
                      <Td>{new Date(r.t).toLocaleString([], { hour12: false })}</Td>
                      <Td>
                        <Badge $on={r.state === 'ON'}>{r.state}</Badge>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableEl>
            </Table>
          )}
        </Card>
      </Two>
    </>
  );
}
