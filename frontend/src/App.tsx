import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AINotesPage from "./pages/AINotesPage";
import About from "./pages/About";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Contact from "./pages/Contact";
import ContactAdmin from "./pages/ContactAdmin";
import Help from "./pages/Help";
import Landing from "./pages/Landing";
import Leaderboard from "./pages/Leaderboard";
import Levels from "./pages/Levels";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import ResetPassword from "./pages/ResetPassword";
import Results from "./pages/Results";
import Review from "./pages/Review";
import Signup from "./pages/Signup";
import TarsAI from "./pages/TarsAI";
import Test from "./pages/Test";

// Institution Access Control Pages
import ApplyForAccess from "./pages/ApplyForAccess";
import AuthCallback from "./pages/AuthCallback";
import OrgRegister from "./pages/OrgRegister";

// Admin Imports
import AdminLayout from "./layouts/AdminLayout";
import StudentLayout from "./layouts/StudentLayout";
import AdminIndexRouter from "./pages/admin/AdminIndexRouter";
import AdminProfile from "./pages/admin/AdminProfile";
import Announcements from "./pages/admin/Announcements";
// import ContactStudent from "./pages/admin/ContactStudent"; // Replaced by ContactUsers
import ContactUsers from "./pages/admin/ContactUsers";
import DetailedReport from "./pages/admin/DetailedReport";
import GlobalMonitoring from "./pages/admin/GlobalMonitoring";
import LiveMonitoring from "./pages/admin/LiveMonitoring";
import PlatformReports from "./pages/admin/PlatformReports";
import PlatformSettings from "./pages/admin/PlatformSettings";
import QuestionAnalytics from "./pages/admin/QuestionAnalytics";
import QuestionBank from "./pages/admin/QuestionBank";
import QuestionBankSubject from "./pages/admin/QuestionBankSubject";
import Reports from "./pages/admin/Reports";
import Settings from "./pages/admin/Settings";
import StudentManagement from "./pages/admin/StudentManagement";
import StudentQuestions from "./pages/admin/StudentQuestions";
import StudentReviewDashboard from "./pages/admin/StudentReviewDashboard";
import SuperAdminContactAdmin from "./pages/admin/SuperAdminContactAdmin";
import SuperAdminDashboard from "./pages/admin/SuperAdminDashboard";
import SuperAdminOverview from "./pages/admin/SuperAdminOverview";


const FinalResults = React.lazy(() => import("./pages/FinalResults"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/help" element={<Help />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/registration" element={<Navigate to="/signup" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Institution Access Control Routes */}
          <Route path="/apply" element={<ApplyForAccess />} />
          <Route path="/org-register" element={<OrgRegister />} />
          <Route path="/auth-callback" element={<AuthCallback />} />

          {/* Student Routes */}
          <Route element={<StudentLayout />}>
            <Route path="/levels" element={<Levels />} />
            <Route path="/test" element={<Test />} />
            <Route path="/results" element={<Results />} />
            <Route path="/final-results" element={
              <Suspense fallback={<div>Loading...</div>}>
                <FinalResults />
              </Suspense>
            } />
            <Route path="/profile" element={<Profile />} />
            <Route path="/review/:level" element={<Review />} />
            <Route path="/ai-notes/:level" element={<AINotesPage />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/contact-admin" element={<ContactAdmin />} />
            <Route path="/tars-ai" element={<TarsAI />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminIndexRouter />} />
            <Route path="questions" element={<QuestionAnalytics />} />
            <Route path="monitoring" element={<LiveMonitoring />} />
            <Route path="students" element={<StudentManagement />} />
            <Route path="students/:studentId/questions" element={<StudentQuestions />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="contact" element={<ContactUsers />} />
            <Route path="reports" element={<Reports />} />
            <Route path="reports/detailed" element={<DetailedReport />} />
            <Route path="settings" element={<Settings />} />
            <Route path="question-bank" element={<QuestionBank />} />
            <Route path="question-bank/:subject" element={<QuestionBankSubject />} />
            <Route path="profile" element={<AdminProfile />} />
            {/* Institution Access Control Admin Routes */}
            <Route path="institutions" element={<SuperAdminDashboard />} />
            <Route path="student-requests" element={<StudentReviewDashboard />} />
            {/* Super Admin Platform Routes */}
            <Route path="platform-overview" element={<SuperAdminOverview />} />
            <Route path="global-monitoring" element={<GlobalMonitoring />} />
            <Route path="platform-reports" element={<PlatformReports />} />
            <Route path="platform-settings" element={<PlatformSettings />} />
            <Route path="contact-admin" element={<SuperAdminContactAdmin />} />
          </Route>



          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
