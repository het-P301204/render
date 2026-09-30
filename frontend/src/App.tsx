import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LoadingScreen } from './components/LoadingScreen';
import { AppLayout } from './components/layout/AppLayout';
import { Landing } from './pages/Landing';
import { AttackLab } from './pages/AttackLab';
import { Engines } from './pages/Engines';
import { Payloads } from './pages/Payloads';
import { Detection } from './pages/Detection';
import { Telemetry } from './pages/Telemetry';
import { Findings } from './pages/Findings';
import { Compare } from './pages/Compare';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { useUiStore } from './stores/uiStore';
import { useLabStore } from './stores/labStore';

export default function App() {
  const { initialized, setInitialized } = useUiStore();
  const { fetchStatus, startPolling } = useLabStore();

  useEffect(() => {
    fetchStatus().catch(() => {});
    const stopPolling = startPolling();
    return stopPolling;
  }, []);

  if (!initialized) {
    return <LoadingScreen onComplete={() => setInitialized(true)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/lab" element={<AttackLab />} />
          <Route path="/engines" element={<Engines />} />
          <Route path="/payloads" element={<Payloads />} />
          <Route path="/detection" element={<Detection />} />
          <Route path="/telemetry" element={<Telemetry />} />
          <Route path="/findings" element={<Findings />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
