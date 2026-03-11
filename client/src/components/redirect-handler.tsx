import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

interface RedirectHandlerProps {
  children: ReactNode;
}

export default function RedirectHandler({ children }: RedirectHandlerProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // Handle logout redirects
    if (location === '/logout') {
      logout();
      setLocation('/');
      return;
    }

    // Handle unauthenticated users trying to access protected routes
    if (!user && (location.includes('/dashboard/') || location.includes('/admin') || location.includes('/employee'))) {
      setLocation('/login');
      return;
    }

    // Handle role-based redirects for manual URL access
    if (user) {
      const userRole = user.role?.toLowerCase();
      const currentPath = location;

      // Employee trying to access admin routes
      if (userRole === 'employee' && (currentPath.includes('/dashboard/admin') || currentPath.includes('/admin'))) {
        console.warn(`Employee ${user.username} attempting to access admin route: ${currentPath}`);
        setLocation('/dashboard/employee');
        return;
      }

      // Admin trying to access employee routes (optional - can be allowed)
      if ((userRole === 'admin' || userRole === 'super_admin') && 
          (currentPath.includes('/dashboard/employee') || currentPath.includes('/employee'))) {
        // Allow this for management purposes, but log it
        console.log(`Admin ${user.username} accessing employee route: ${currentPath}`);
      }
    }
  }, [user, location, setLocation, logout]);

  return <>{children}</>;
}
