import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SupabaseAuthProvider, useSupabaseAuthContext } from "./contexts/SupabaseAuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import StudentDashboard from "./pages/student/StudentDashboard";
import RecruiterDashboard from "./pages/recruiter/RecruiterDashboard";
import PlacementDashboard from "./pages/placement/PlacementDashboard";
import FacultyDashboard from "./pages/faculty/FacultyDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import { Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database['public']['Enums']['app_role'];

const queryClient = new QueryClient();

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRole?: AppRole }> = ({ 
  children, 
  allowedRole 
}) => {
  const { isAuthenticated, role, isLoading } = useSupabaseAuthContext();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRole && role !== allowedRole) {
    return <Navigate to={`/${role}`} replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { isAuthenticated, role, isLoading } = useSupabaseAuthContext();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={
        isAuthenticated && role ? <Navigate to={`/${role}`} replace /> : <Index />
      } />
      <Route path="/auth" element={
        isAuthenticated && role ? <Navigate to={`/${role}`} replace /> : <Auth />
      } />
      
      {/* Student Routes */}
      <Route
        path="/student/*"
        element={
          <ProtectedRoute allowedRole="student">
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      {/* Recruiter Routes */}
      <Route
        path="/recruiter/*"
        element={
          <ProtectedRoute allowedRole="recruiter">
            <RecruiterDashboard />
          </ProtectedRoute>
        }
      />

      {/* Placement Cell Routes */}
      <Route
        path="/placement/*"
        element={
          <ProtectedRoute allowedRole="placement">
            <PlacementDashboard />
          </ProtectedRoute>
        }
      />

      {/* Faculty Routes */}
      <Route
        path="/faculty/*"
        element={
          <ProtectedRoute allowedRole="faculty">
            <FacultyDashboard />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SupabaseAuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </SupabaseAuthProvider>
  </QueryClientProvider>
);

export default App;
