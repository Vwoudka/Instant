import React from 'react';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';
import { useApp } from '../context/AppContext';
import StatusDot from './StatusDot';
import { LogoIcon, SunIcon, MoonIcon } from './Icons';

const HeaderBar = styled.header`
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
  padding: 14px 20px;
  margin-bottom: 22px;
  border-radius: 16px;
  background: ${(p) => p.theme.panel};
  border: 1px solid ${(p) => p.theme.panelBorder};
  backdrop-filter: blur(14px);
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Orbitron', sans-serif;
  font-weight: 800;
  font-size: 22px;
  letter-spacing: 1.5px;
`;

const BrandMark = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, ${(p) => p.theme.cyan}, ${(p) => p.theme.magenta});
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  box-shadow: 0 0 16px ${(p) => p.theme.glow};
`;

const Nav = styled.nav`
  display: flex;
  gap: 6px;
  margin-left: auto;
  flex-wrap: wrap;
`;

const StyledNavLink = styled(NavLink)`
  text-decoration: none;
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: ${(p) => p.theme.textDim};
  transition: all 0.2s;

  &.active {
    color: ${(p) => p.theme.cyan};
    background: ${(p) => p.theme.panel};
    box-shadow: inset 0 0 0 1px ${(p) => p.theme.panelBorder};
    text-shadow: 0 0 12px ${(p) => p.theme.glow};
  }

  &:hover {
    color: ${(p) => p.theme.text};
  }
`;

const Right = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const Status = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: ${(p) => p.theme.textDim};
`;

const ThemeBtn = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid ${(p) => p.theme.panelBorder};
  background: ${(p) => p.theme.panel};
  color: ${(p) => p.theme.text};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    border-color: ${(p) => p.theme.cyan};
    color: ${(p) => p.theme.cyan};
  }
`;

export default function Header() {
  const { state, connected, theme, toggleTheme } = useApp();
  const online = connected && state.connected;

  return (
    <HeaderBar>
      <Brand>
        <BrandMark>
          <LogoIcon size={20} />
        </BrandMark>
        <span>INSTANT</span>
      </Brand>

      <Nav>
        <StyledNavLink to="/">Dashboard</StyledNavLink>
        <StyledNavLink to="/history">History</StyledNavLink>
        <StyledNavLink to="/settings">Settings</StyledNavLink>
      </Nav>

      <Right>
        <Status>
          <StatusDot on={online} />
          <span>{online ? 'Live' : 'Offline'}</span>
        </Status>
        <ThemeBtn onClick={toggleTheme} title="Toggle theme" aria-label="Toggle theme">
          {theme === 'dark' ? <SunIcon size={18} /> : <MoonIcon size={18} />}
        </ThemeBtn>
      </Right>
    </HeaderBar>
  );
}
