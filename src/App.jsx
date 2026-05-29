import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ConfirmProvider } from './context/ConfirmContext.jsx';
import Navbar from './components/Navbar.jsx';
import NotificationDrawer from './components/NotificationDrawer.jsx';
import Footer from "./components/Footer.jsx";
import LoginPage from './pages/LoginPage.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import CreateEvent from './pages/admin/CreateEvent.jsx';
import EventDetails from './pages/admin/EventDetails.jsx';
import AdminConstituencies from './pages/admin/AdminConstituencies.jsx';
import AdminApprovals from './pages/admin/AdminApprovals.jsx';
import ConstituencyOverview from './pages/admin/ConstituencyOverview.jsx';
import PartyDashboard from './pages/party/PartyDashboard.jsx';
import VoterDashboard from './pages/voter/VoterDashboard.jsx';
import VotingPage from './pages/voter/VotingPage.jsx';
import VoterHistory from './pages/voter/VoterHistory.jsx';
import LiveResults from './pages/voter/LiveResults.jsx';
import LandingPage from './pages/LandingPage.jsx';
import CandidateDashboard from './pages/candidate/CandidateDashboard.jsx';

const ProtectedRoute = ({ children, role }) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role && user?.role !== role) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AppContent = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  return (
    <div className="flex flex-col min-h-screen bg-emerald-950">
      {!isLandingPage && <Navbar />}
      {!isLandingPage && isAuthenticated && <NotificationDrawer />}

      <main className="flex-grow">
        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated ?
                <Navigate to={
                  user?.role === 'admin' ? '/admin' :
                  user?.role === 'party' ? '/party' :
                  user?.role === 'independent' ? '/candidate' :
                  '/voter'
                } replace /> :
                <LoginPage />
            }
          />

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/events/create" element={<ProtectedRoute role="admin"><CreateEvent /></ProtectedRoute>} />
          <Route path="/admin/events/:id" element={<ProtectedRoute role="admin"><EventDetails /></ProtectedRoute>} />
          <Route path="/admin/constituencies" element={<ProtectedRoute role="admin"><AdminConstituencies /></ProtectedRoute>} />
          <Route path="/admin/approvals" element={<ProtectedRoute role="admin"><AdminApprovals /></ProtectedRoute>} />
          <Route path="/admin/overview" element={<ProtectedRoute role="admin"><ConstituencyOverview /></ProtectedRoute>} />

          {/* Party Manager Routes */}
          <Route path="/party" element={<ProtectedRoute role="party"><PartyDashboard /></ProtectedRoute>} />

          {/* Candidate Routes */}
          <Route path="/candidate" element={<ProtectedRoute role="independent"><CandidateDashboard /></ProtectedRoute>} />

          {/* Voter Routes */}
          <Route path="/voter" element={<ProtectedRoute role="voter"><VoterDashboard /></ProtectedRoute>} />
          <Route path="/voter/vote/:eventId" element={<ProtectedRoute role="voter"><VotingPage /></ProtectedRoute>} />
          <Route path="/voter/history" element={<ProtectedRoute role="voter"><VoterHistory /></ProtectedRoute>} />
          <Route path="/voter/results" element={<ProtectedRoute role="voter"><LiveResults /></ProtectedRoute>} />

          {/* Landing Page (public) */}
          <Route path="/" element={<LandingPage />} />
        </Routes>
      </main>

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      {!isLandingPage && <Footer />}
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <Router>
          <AppContent />
        </Router>
      </ConfirmProvider>
    </AuthProvider>
  );
};

export default App;
