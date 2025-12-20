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
import Test from "./pages/Test";

// Admin Imports
import AdminLayout from "./layouts/AdminLayout";
import StudentLayout from "./layouts/StudentLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProfile from "./pages/admin/AdminProfile";
import Announcements from "./pages/admin/Announcements";
import ContactStudent from "./pages/admin/ContactStudent";
import DetailedReport from "./pages/admin/DetailedReport";
import LiveMonitoring from "./pages/admin/LiveMonitoring";
import QuestionAnalytics from "./pages/admin/QuestionAnalytics";
import QuestionBank from "./pages/admin/QuestionBank";
import QuestionBankSubject from "./pages/admin/QuestionBankSubject";
import Reports from "./pages/admin/Reports";
import Settings from "./pages/admin/Settings";
import StudentManagement from "./pages/admin/StudentManagement";
import StudentQuestions from "./pages/admin/StudentQuestions";




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
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="questions" element={<QuestionAnalytics />} />
            <Route path="monitoring" element={<LiveMonitoring />} />
            <Route path="students" element={<StudentManagement />} />
            <Route path="students/:studentId/questions" element={<StudentQuestions />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="contact" element={<ContactStudent />} />
            <Route path="reports" element={<Reports />} />
            <Route path="reports/detailed" element={<DetailedReport />} />
            <Route path="settings" element={<Settings />} />
            <Route path="question-bank" element={<QuestionBank />} />
            <Route path="question-bank/:subject" element={<QuestionBankSubject />} />
            <Route path="profile" element={<AdminProfile />} />
          </Route>



          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
