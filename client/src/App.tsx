import { Route, Router, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { Toaster } from "./components/ui/toaster";
import LoginPage from "./pages/login-page";
import SecureAdminDashboard from "./pages/secure-admin-dashboard";
import EmployeeDashboard from "./pages/employee-dashboard";

function AppRouter() {
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/";
  };

  return (
    <>
      <Toaster />
      <Router>
        <Route path="/" component={LoginPage} />
        <Route path="/login" component={LoginPage} />

        {/* Dashboard Routes */}
        <Route path="/dashboard/admin">
          <SecureAdminDashboard onLogout={handleLogout} />
        </Route>
        <Route path="/dashboard/employee">
          <EmployeeDashboard onLogout={handleLogout} />
        </Route>

        {/* Legacy Routes for backward compatibility */}
        <Route path="/admin">
          <SecureAdminDashboard onLogout={handleLogout} />
        </Route>
        <Route path="/employee">
          <EmployeeDashboard onLogout={handleLogout} />
        </Route>
      </Router>
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
