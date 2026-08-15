import { createGlobalStyle } from 'styled-components';
import styled from 'styled-components';

// Bold, vivid palettes. Dark is the default look of INSTANT.
export const palettes = {
  dark: {
    name: 'dark',
    bg: '#0B0D17',
    bg2: '#141830',
    panel: 'rgba(255, 255, 255, 0.045)',
    panelBorder: 'rgba(255, 255, 255, 0.09)',
    text: '#E9ECFF',
    textDim: '#8A91B4',
    cyan: '#00D2FF',
    magenta: '#FF007F',
    purple: '#8B5CFF',
    green: '#00E5A0',
    orange: '#FF9F2E',
    red: '#FF3B6B',
    amber: '#FFD166',
    glow: 'rgba(0, 210, 255, 0.35)',
    shadow: 'rgba(0, 0, 0, 0.45)',
  },
  light: {
    name: 'light',
    bg: '#F1F3FA',
    bg2: '#FFFFFF',
    panel: 'rgba(255, 255, 255, 0.8)',
    panelBorder: 'rgba(20, 26, 60, 0.12)',
    text: '#151A33',
    textDim: '#5A6288',
    cyan: '#00A2C9',
    magenta: '#E60077',
    purple: '#7A45E0',
    green: '#00B080',
    orange: '#E88A17',
    red: '#E02D55',
    amber: '#C99A1E',
    glow: 'rgba(0, 162, 201, 0.3)',
    shadow: 'rgba(20, 26, 60, 0.14)',
  },
};

export const GlobalStyle = createGlobalStyle`
  * { box-sizing: border-box; }

  html, body, #root { min-height: 100%; }

  body {
    margin: 0;
    font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
    background: ${(p) => p.theme.bg};
    color: ${(p) => p.theme.text};
    transition: background 0.4s ease, color 0.4s ease;
    -webkit-font-smoothing: antialiased;
  }

  h1, h2, h3, h4 {
    font-family: 'Orbitron', 'Inter', sans-serif;
    font-weight: 700;
    margin: 0;
  }

  button, input, select { font-family: inherit; }
  a { color: inherit; }

  @keyframes slideIn {
    from { transform: translateX(120%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  @keyframes pulseDot {
    0%, 100% { transform: scale(1); opacity: 0.9; }
    50% { transform: scale(1.25); opacity: 1; }
  }
`;

// Fixed full-screen backdrop with slow-drifting neon orbs for a vivid feel.
export const Background = styled.div`
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  background: ${(p) => p.theme.bg};
  background-image: ${(p) =>
    p.theme.name === 'dark'
      ? 'radial-gradient(1200px 600px at 80% -10%, rgba(255,0,127,0.10), transparent 60%), radial-gradient(1000px 700px at -10% 110%, rgba(0,210,255,0.10), transparent 60%)'
      : 'radial-gradient(1200px 600px at 80% -10%, rgba(255,0,127,0.06), transparent 60%), radial-gradient(1000px 700px at -10% 110%, rgba(0,162,201,0.08), transparent 60%)'};

  &::before,
  &::after {
    content: '';
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.5;
    animation: drift 18s ease-in-out infinite alternate;
  }

  &::before {
    width: 420px;
    height: 420px;
    left: -120px;
    top: 30%;
    background: rgba(139, 92, 255, 0.16);
  }

  &::after {
    width: 360px;
    height: 360px;
    right: -100px;
    bottom: 10%;
    background: rgba(0, 210, 255, 0.14);
    animation-delay: -6s;
  }

  @keyframes drift {
    from {
      transform: translateY(0) scale(1);
    }
    to {
      transform: translateY(-30px) scale(1.08);
    }
  }
`;
