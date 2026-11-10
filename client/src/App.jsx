import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import DrivePage from './pages/DrivePage';
import SharedPage from './pages/SharedPage';
export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading DriveSpace…</div>;
  return <Routes><Route path="/login" element={user ? <Navigate to="/" /> : <AuthPage />} /><Route path="/" element={user ? <DrivePage /> : <Navigate to="/login" />} /><Route path="/share/:token" element={<SharedPage />} /><Route path="*" element={<Navigate to="/" />} /></Routes>;
}
