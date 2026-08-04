// ============================================================
//  ProtectedRoute — Redirects unauthenticated/wrong-role users
// ============================================================
import { useAuth } from '../../context/AuthContext';

/**
 * @param {object}   props
 * @param {string[]} props.allowedRoles  - roles that can access this route
 * @param {Function} props.onDeny        - called when access denied (no redirect needed in stateful app)
 * @param {React.ReactNode} props.children
 */
export default function ProtectedRoute({ allowedRoles, children, onUnauthorized }) {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) return null;  // Session still loading

  if (!isAuthenticated) {
    if (onUnauthorized) onUnauthorized('login');
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    if (onUnauthorized) onUnauthorized('forbidden');
    return null;
  }

  return children;
}
