import { Route, Router, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { Toaster } from "./components/ui/toaster";
import LoginPage from "./pages/login-page";
import SecureAdminDashboard from "./pages/secure-admin-dashboard";
import EmployeeDashboard from "./pages/employee-dashboard";
import ProtectedRoute from "./components/protected-route";
import RedirectHandler from "./components/redirect-handler";

function AppRouter() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation('/');
  };

  return (
    <>
      <Toaster />
      <RedirectHandler>
        <Router>
          <Route path="/" component={LoginPage} />
          <Route path="/login" component={LoginPage} />

          {/* Dashboard Routes with Role Protection */}
          <Route path="/dashboard/admin">
            <ProtectedRoute requiredRole="admin">
              <SecureAdminDashboard onLogout={handleLogout} />
            </ProtectedRoute>
          </Route>
          
          <Route path="/dashboard/employee">
            <ProtectedRoute requiredRole="employee">
              <EmployeeDashboard onLogout={handleLogout} />
            </ProtectedRoute>
          </Route>

          {/* Legacy Routes for backward compatibility with protection */}
          <Route path="/admin">
            <ProtectedRoute requiredRole="admin">
              <SecureAdminDashboard onLogout={handleLogout} />
            </ProtectedRoute>
          </Route>
          
          <Route path="/employee">
            <ProtectedRoute requiredRole="employee">
              <EmployeeDashboard onLogout={handleLogout} />
            </ProtectedRoute>
          </Route>
        </Router>
      </RedirectHandler>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
