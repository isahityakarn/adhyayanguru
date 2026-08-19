import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { get } from "./api";

/**
 * SubscriptionGuard - Middleware component to check subscription status
 * Wraps protected routes and redirects to dashboard if subscription is expired
 */
export default function SubscriptionGuard({ children }) {
  const [isChecking, setIsChecking] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const location = useLocation();

  useEffect(() => {
    checkSubscription();
  }, [location.pathname]);

  async function checkSubscription() {
    setIsChecking(true);
    
    try {
      const response = await get("/user");
      const subscription = response?.user?.subscription;
      
      if (subscription && subscription.end_date) {
        const endDate = new Date(subscription.end_date);
        const today = new Date();
        
        if (endDate <= today) {
          // Subscription expired
          setIsExpired(true);
          
          // Store expiry status in localStorage for quick access
          localStorage.setItem("studyyodha_subscription_expired", "true");
        } else {
          // Subscription active
          setIsExpired(false);
          localStorage.removeItem("studyyodha_subscription_expired");
        }
      } else {
        // No subscription or free plan - allow access
        setIsExpired(false);
        localStorage.removeItem("studyyodha_subscription_expired");
      }
    } catch (error) {
      console.error("Failed to check subscription:", error);
      // On error, check localStorage cache
      const cachedExpiry = localStorage.getItem("studyyodha_subscription_expired");
      setIsExpired(cachedExpiry === "true");
    } finally {
      setIsChecking(false);
    }
  }

  // Show loading state while checking
  if (isChecking) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f4f6',
          borderTop: '4px solid #e07a3f',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Verifying subscription...
        </p>
      </div>
    );
  }

  // If subscription is expired, redirect to dashboard with state
  if (isExpired) {
    return (
      <Navigate 
        to="/dashboard" 
        state={{ 
          from: location.pathname,
          subscriptionExpired: true,
          message: "Your subscription has expired. Please renew to access this feature."
        }} 
        replace 
      />
    );
  }

  // Subscription active - render protected component
  return children;
}

/**
 * Hook to check subscription status in any component
 */
export function useSubscriptionStatus() {
  const [status, setStatus] = useState({
    isExpired: false,
    isLoading: true,
    daysRemaining: 0,
    endDate: null
  });

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    try {
      const response = await get("/user");
      const subscription = response?.user?.subscription;
      
      if (subscription && subscription.end_date) {
        const endDate = new Date(subscription.end_date);
        const today = new Date();
        const diffTime = endDate - today;
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        setStatus({
          isExpired: daysRemaining <= 0,
          isLoading: false,
          daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
          endDate: subscription.end_date
        });
      } else {
        setStatus({
          isExpired: false,
          isLoading: false,
          daysRemaining: Infinity,
          endDate: null
        });
      }
    } catch (error) {
      console.error("Failed to check subscription status:", error);
      setStatus(prev => ({ ...prev, isLoading: false }));
    }
  }

  return { ...status, refetch: checkStatus };
}
