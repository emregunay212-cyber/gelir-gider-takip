import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Borclar from './pages/Borclar';
import Gelirler from './pages/Gelirler';
import Hesaplar from './pages/Hesaplar';
import Faturalar from './pages/Faturalar';
import Gecmis from './pages/Gecmis';
import Ayarlar from './pages/Ayarlar';
import { Toaster } from '@/components/ui/sonner';
import { PWAUpdater } from '@/components/PWAUpdater';

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="borclar" element={<Borclar />} />
          <Route path="gelirler" element={<Gelirler />} />
          <Route path="hesaplar" element={<Hesaplar />} />
          <Route path="faturalar" element={<Faturalar />} />
          <Route path="gecmis" element={<Gecmis />} />
          <Route path="ayarlar" element={<Ayarlar />} />
        </Route>
      </Routes>
      <Toaster position="top-center" richColors />
      <PWAUpdater />
    </>
  );
}
