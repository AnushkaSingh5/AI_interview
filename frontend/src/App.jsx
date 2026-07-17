import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Context
import { AuthProvider } from './context/AuthContext';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Sidebar from './components/Sidebar';
import HeaderBar from './components/HeaderBar';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import MockInterviews from './pages/MockInterviews';
import PerformanceDashboard from './pages/PerformanceDashboard';
import InterviewHistory from './pages/InterviewHistory';
import NotFound from './pages/NotFound';
import ResumeUpload from './pages/ResumeUpload';
import ResumePreview from './pages/ResumePreview';
import ExtractedDataEditor from './pages/ExtractedDataEditor';
import InterviewCreate from './pages/InterviewCreate';
import InterviewQuestionsReview from './pages/InterviewQuestionsReview';
import InterviewActive from './pages/InterviewActive';
import InterviewReport from './pages/InterviewReport';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Pages Layout Shell */}
          <Route
            element={
              <div className="d-flex flex-column min-vh-100 bg-white text-dark">
                <Navbar />
                <main className="flex-grow-1">
                  <Outlet />
                </main>
                <Footer />
              </div>
            }
          >
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>

          {/* Protected Pages Layout Shell */}
          <Route element={<ProtectedRoute />}>
            <Route
              element={
                <div className="dashboard-layout-container">
                  <Sidebar />
                  <div className="dashboard-main-canvas">
                    <HeaderBar />
                    <main className="page-content-canvas">
                      <Outlet />
                    </main>
                  </div>
                </div>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/mock-interviews" element={<MockInterviews />} />
              <Route path="/performance" element={<PerformanceDashboard />} />
              <Route path="/interviews/history" element={<InterviewHistory />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/resume/upload" element={<ResumeUpload />} />
              <Route path="/resume/preview" element={<ResumePreview />} />
              <Route path="/resume/data" element={<ExtractedDataEditor />} />
              <Route path="/interview/create" element={<InterviewCreate />} />
              <Route path="/interview/:id/questions" element={<InterviewQuestionsReview />} />
              <Route path="/interview/:id/active" element={<InterviewActive />} />
              <Route path="/interview/:id/report" element={<InterviewReport />} />
            </Route>
          </Route>

          {/* 404 Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>

        {/* Toast Alerts System */}
        <ToastContainer 
          position="bottom-right" 
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
      </Router>
    </AuthProvider>
  );
}

export default App;
