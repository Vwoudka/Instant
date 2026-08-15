import React from 'react';
import { Routes, Route } from 'react-router-dom';
import styled, { ThemeProvider } from 'styled-components';
import { useApp } from './context/AppContext';
import { palettes, GlobalStyle, Background } from './theme';
import Header from './components/Header';
import ToastHost from './components/Toast';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Settings from './pages/Settings';

const Shell = styled.div`
  max-width: 1320px;
  margin: 0 auto;
  padding: 18px 18px 30px;
`;

const Main = styled.main`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const Footer = styled.footer`
  text-align: center;
  color: ${(p) => p.theme.textDim};
  font-size: 12px;
  padding: 22px 0 6px;
  letter-spacing: 0.4px;
`;

export default function App() {
  const { theme } = useApp();

  return (
    <ThemeProvider theme={palettes[theme]}>
      <GlobalStyle />
      <Background />
      <Shell>
        <Header />
        <Main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </Main>
        <Footer>INSTANT &middot; real-time energy monitoring &middot; ThingSpeak</Footer>
      </Shell>
      <ToastHost />
    </ThemeProvider>
  );
}
