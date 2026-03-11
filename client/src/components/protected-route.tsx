import { ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'super_admin' | 'admin' | 'employee';
  fallbackPath?: string;
}

export default function ProtectedRoute({ children, requiredRole, fallbackPath = "/login" }: ProtectedRouteProps) {
  const { user } = useAuth();
  const [location] = useLocation();

  // If no user, redirect to login
  if (!user) {
    window.location.href = fallbackPath;
    return null;
  }

  // Check role-based access
  if (requiredRole) {
    const userRole = user.role?.toLowerCase();
    const requiredRoleLower = requiredRole.toLowerCase();

    // Admin can access admin routes
    if (requiredRoleLower === 'admin' && userRole !== 'admin' && userRole !== 'super_admin') {
      console.warn(`Role leak attempt: ${userRole} trying to access admin route`);
      window.location.href = fallbackPath;
      return null;
    }

    // Super admin can access all routes
    if (requiredRoleLower === 'super_admin' && userRole !== 'super_admin') {
      console.warn(`Role leak attempt: ${userRole} trying to access super admin route`);
      window.location.href = fallbackPath;
      return null;
    }

    // Employee can only access employee routes
    if (requiredRoleLower === 'employee' && userRole !== 'employee') {
      console.warn(`Role leak attempt: ${userRole} trying to access employee route as non-employee`);
      window.location.href = fallbackPath;
      return null;
    }
  }

  // Check for manual URL access to wrong dashboard
  const currentPath = location;
  
  if (user.role?.toLowerCase() === 'employee') {
    // Employee trying to access admin routes
    if (currentPath.includes('/dashboard/admin') || currentPath.includes('/admin')) {
      console.warn(`Employee ${user.username} attempting to access admin route: ${currentPath}`);
      window.location.href = '/dashboard/employee';
      return null;
    }
  }

  if ((user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'super_admin') && 
      (currentPath.includes('/dashboard/employee') || currentPath.includes('/employee'))) {
    console.warn(`Admin ${user.username} attempting to access employee route: ${currentPath}`);
    // Allow admins to access employee routes if needed (for management)
    // but log the attempt for security monitoring
  }

  return <>{children}</>;
}
