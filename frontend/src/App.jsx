import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthPage from './components/Auth/AuthPage'
import Layout from './components/Layout/Layout'
import ChatWindow from './components/Chat/ChatWindow'
import Explore from './pages/Explore'
import Create from './pages/Create'
import AdminPanel from './pages/AdminPanel'
import APIKeys from './pages/APIKeys'
import Billing from './pages/Billing'
import PublicLanding from './pages/PublicLanding'
import Prompts from './pages/Prompts'
import Settings from './pages/Settings'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import GoogleCallback from './pages/GoogleCallback'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/" replace />
}

function PublicRoute({ children }) {
  const { user } = useAuth()
  return !user ? children : <Navigate to="/chat" replace />
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public landing — no auth required */}
      <Route path="/" element={<PublicRoute><PublicLanding /></PublicRoute>} />

      {/* Auth pages — unified sliding panel component */}
      <Route path="/login" element={<PublicRoute><AuthPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><AuthPage /></PublicRoute>} />

      {/* Protected app shell */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/chat" element={<ChatWindow />} />
        <Route path="/chat/:chatId" element={<ChatWindow />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/create" element={<Create />} />
        <Route path="/prompts" element={<Prompts />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/api-platform" element={<APIKeys />} />
        <Route path="/billing" element={<Billing />} />
      </Route>

      {/* Auth utility routes — accessible regardless of login state */}
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/auth/google/callback" element={<GoogleCallback />} />

      {/* Legacy / convenience redirects */}
      <Route path="/bots" element={<Navigate to="/explore" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
