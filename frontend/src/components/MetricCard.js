import React from 'react';
import styled from 'styled-components';
import useAnimatedNumber from '../hooks/useAnimatedNumber';
import Gauge from './Gauge';

const Card = styled.div`
  position: relative;
  overflow: hidden;
  background: ${(p) => p.theme.panel};
  border: 1px solid ${(p) => p.theme.panelBorder};
  border-radius: 18px;
  padding: 16px 16px 14px;
  backdrop-filter: blur(14px);
  box-shadow: 0 10px 30px ${(p) => p.theme.shadow};
  transition: transform 0.25s ease;
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, ${(p) => p.$accent}, transparent 70%);
  }
  &:hover {
    transform: translateY(-3px);
  }
`;

const Top = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
`;

const IconWrap = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(p) => p.$accent}22;
  color: ${(p) => p.$accent};
`;

const Label = styled.span`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: ${(p) => p.theme.textDim};
`;

const GaugeBox = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 6px;
`;

const ValueBox = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`;

const Value = styled.div`
  font-family: 'Orbitron', sans-serif;
  font-weight: 800;
  font-size: 30px;
  line-height: 1;
  color: ${(p) => p.$color};
  text-shadow: 0 0 18px ${(p) => p.$color}66;
`;

const Unit = styled.div`
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1px;
  color: ${(p) => p.theme.textDim};
  margin-top: 4px;
`;

// Animated card showing one electrical parameter with a radial gauge.
export default function MetricCard({ label, value, unit, color, icon, max, decimals = 1 }) {
  const animated = useAnimatedNumber(value);

  return (
    <Card $accent={color}>
      <Top>
        <IconWrap $accent={color}>{icon}</IconWrap>
        <Label>{label}</Label>
      </Top>
      <GaugeBox>
        <Gauge value={animated} max={max} color={color} />
        <ValueBox>
          <Value $color={color}>{animated.toFixed(decimals)}</Value>
          <Unit>{unit || '\u00A0'}</Unit>
        </ValueBox>
      </GaugeBox>
    </Card>
  );
}
