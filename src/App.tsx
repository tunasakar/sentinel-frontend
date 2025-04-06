import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { SessionContextProvider, useSession } from '@supabase/auth-helpers-react';
import { ThemeProvider } from './components/ThemeProvider';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { DataEntry } from './pages/data-entry/DataEntry';
import { CompanyList } from './pages/data-entry/CompanyList';
import { CountryList } from './pages/data-entry/CountryList';
import { CityList } from './pages/data-entry/CityList';
import { DistrictList } from './pages/data-entry/DistrictList';
import { LineTypeList } from './pages/data-entry/LineTypeList';
import { LineList } from './pages/data-entry/LineList';
import { MachineList } from './pages/data-entry/MachineList';
import { KpiList } from './pages/data-entry/KpiList';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Protected route wrapper component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const session = useSession();
  
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/settings', element: <Settings /> },
      { path: '/data-entry', element: <DataEntry /> },
      { path: '/data-entry/companies', element: <CompanyList /> },
      { path: '/data-entry/countries', element: <CountryList /> },
      { path: '/data-entry/cities', element: <CityList /> },
      { path: '/data-entry/districts', element: <DistrictList /> },
      { path: '/data-entry/line-types', element: <LineTypeList /> },
      { path: '/data-entry/lines', element: <LineList /> },
      { path: '/data-entry/machines', element: <MachineList /> },
      { path: '/data-entry/kpis', element: <KpiList /> },
    ],
  },
  {
    path: '/login',
    element: <Login />,
  },
]);

function App() {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </SessionContextProvider>
  );
}

export default App
