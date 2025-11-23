import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AINotesPage from "./pages/AINotesPage";
import Landing from "./pages/Landing";
import Leaderboard from "./pages/Leaderboard";
import Levels from "./pages/Levels";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import Registration from "./pages/Registration";
import Results from "./pages/Results";
import Review from "./pages/Review";
import Test from "./pages/Test";
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
          <Route path="/registration" element={<Registration />} />
          <Route path="/login" element={<Login />} />
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
