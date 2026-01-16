import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import Layout from '@/components/Layout'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import EventsPage from '@/pages/EventsPage'
import EventDetailPage from '@/pages/EventDetailPage'
import EventLivePage from '@/pages/EventLivePage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes without navbar */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Routes with navbar */}
          <Route element={<Layout />}>
            <Route path="/events" element={<EventsPage />} />
            <Route path="/events/:id" element={<EventDetailPage />} />
            <Route path="/events/:id/live" element={<EventLivePage />} />
          </Route>

          {/* Redirect root to events */}
          <Route path="/" element={<Navigate to="/events" replace />} />
          <Route path="*" element={<Navigate to="/events" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
