import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Crown, Zap, Star, Sparkles, ArrowLeft, Loader } from "lucide-react";
import { Card } from "../components/UI";
import { c, headingFont, displayFont } from "../utils/theme";
import { get, post } from "../utils/api";

// Helper function to extract items from API response
function getItems(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.plans)) return response.plans;
  return [];
}

export default function PlansPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processingPlanId, setProcessingPlanId] = useState(null);
  const [userSubscription, setUserSubscription] = useState(null);
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    loadPlans();
    loadUserSubscription();
  }, []);

  async function loadPlans() {
    try {
      setLoading(true);
      const plansEndpoint = import.meta.env.VITE_PLANS_ENDPOINT || "/plans";
      const response = await get(plansEndpoint);
      
      const plansData = getItems(response);

      // Filter out Free Trial / Free plans (only show paid subscription plans)
      const isPaidPlan = (plan) => {
        const name = (plan.name || "").toLowerCase().trim();
        return name !== "free trial" && !name.includes("free trial") && !name.includes("free") && Number(plan.price_inr) > 0;
      };

      const filteredPlansData = plansData.filter(isPaidPlan);

      if (filteredPlansData.length > 0) {
        const sortedPlans = filteredPlansData.sort((a, b) => a.price_inr - b.price_inr);
        setPlans(sortedPlans);
        
        // Pre-select the middle/recommended plan
        const middlePlan = sortedPlans[Math.floor(sortedPlans.length / 2)];
        setSelectedPlan(middlePlan);
      } else {
        const rawPlans = (Array.isArray(response) ? response : []).filter(isPaidPlan);
        
        if (rawPlans.length > 0) {
          const sortedPlans = rawPlans.sort((a, b) => a.price_inr - b.price_inr);
          setPlans(sortedPlans);
          setSelectedPlan(sortedPlans[Math.floor(sortedPlans.length / 2)]);
        } else {
          // Fallback sample paid plans
          const samplePlans = [
            {
              id: 1,
              name: "1 Month Plan",
              description: "Perfect for getting started",
              price_inr: 299,
              duration_days: 30,
              features: ["Access to all subjects", "Unlimited quizzes", "AI Tutor 24/7", "Progress tracking"]
            },
            {
              id: 2,
              name: "6 Month Plan",
              description: "Most popular choice",
              price_inr: 1499,
              duration_days: 180,
              features: ["Access to all subjects", "Unlimited quizzes", "AI Tutor 24/7", "Detailed analytics", "Priority support"]
            },
            {
              id: 3,
              name: "12 Month Plan",
              description: "Best value for full year mastery",
              price_inr: 2499,
              duration_days: 365,
              features: ["Access to all subjects", "Unlimited quizzes", "AI Tutor 24/7", "Downloadable content", "Priority support", "30% savings"]
            }
          ];
          setPlans(samplePlans);
          setSelectedPlan(samplePlans[1]);
        }
      }
    } catch (error) {
      console.error("Failed to load plans:", error);
      const samplePlans = [
        {
          id: 1,
          name: "1 Month Plan",
          description: "Perfect for getting started",
          price_inr: 299,
          duration_days: 30,
          features: ["Access to all subjects", "Unlimited quizzes", "AI Tutor 24/7", "Progress tracking"]
        },
        {
          id: 2,
          name: "6 Month Plan",
          description: "Most popular choice",
          price_inr: 1499,
          duration_days: 180,
          features: ["Access to all subjects", "Unlimited quizzes", "AI Tutor 24/7", "Detailed analytics", "Priority support"]
        },
        {
          id: 3,
          name: "12 Month Plan",
          description: "Best value for full year mastery",
          price_inr: 2499,
          duration_days: 365,
          features: ["Access to all subjects", "Unlimited quizzes", "AI Tutor 24/7", "Downloadable content", "Priority support", "30% savings"]
        }
      ];
      setPlans(samplePlans);
      setSelectedPlan(samplePlans[1]);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserSubscription() {
    try {
      const response = await get("/user");
      if (response?.user?.subscription) {
        setUserSubscription(response.user.subscription);
      }
    } catch (error) {
      console.error("Failed to load user subscription:", error);
    }
  }

  async function handlePayNow(plan) {
    if (!plan) {
      alert("Please select a plan first");
      return;
    }

    try {
      setProcessingPlanId(plan.id);
      
      const response = await post("/subscriptions", {
        plan_id: plan.id,
      });

      if (response && response.subscription) {
        alert(`✅ Successfully subscribed to ${plan.name}!\n\nYour subscription is now active for ${plan.duration_days} days.`);
        navigate("/dashboard");
      } else {
        alert("Payment processing... Please check your subscription status.");
      }
    } catch (error) {
      console.error("Payment failed:", error);
      alert("Payment failed. Please try again or contact support.");
    } finally {
      setProcessingPlanId(null);
    }
  }

  // Plan feature icons
  const getPlanIcon = (index) => {
    const icons = [Star, Zap, Crown];
    return icons[index % icons.length];
  };

  // Plan colors
  const getPlanColor = (index) => {
    const colors = [c.secondary, c.primary, c.accent];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <Loader size={40} color={c.primary} className="animate-spin mx-auto mb-4" />
          <p style={{ color: c.primary }} className="font-semibold mb-2">Loading Plans...</p>
          <p className="text-xs" style={{ color: c.gray }}>Fetching available subscription plans</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Navigation / Back */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'transparent',
            border: 'none',
            color: c.gray,
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
          }}
          onMouseEnter={(e) => e.target.style.color = c.primary}
          onMouseLeave={(e) => e.target.style.color = c.gray}
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <button
          onClick={() => setDebugMode(!debugMode)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: debugMode ? c.warning : c.lighterGray,
            color: debugMode ? c.white : c.gray,
            border: 'none',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          {debugMode ? '🔧 Debug Mode ON' : '🔧 Debug Mode OFF'}
        </button>
      </div>

      {debugMode && (
        <Card className="mb-6" style={{ background: c.lighterGray, border: `2px solid ${c.warning}` }}>
          <div className="text-center">
            <h4 className="text-sm font-bold mb-2" style={{ color: c.warning }}>
              Debug Information
            </h4>
            <div className="grid grid-cols-2 gap-2 text-left">
              <div className="text-xs">
                <strong>Plans Count:</strong> {plans.length}
              </div>
              <div className="text-xs">
                <strong>Selected Plan:</strong> {selectedPlan ? selectedPlan.name : 'None'}
              </div>
              <div className="text-xs">
                <strong>API Base URL:</strong> {import.meta.env.VITE_API_BASE_URL}
              </div>
              <div className="text-xs">
                <strong>Plans Endpoint:</strong> {import.meta.env.VITE_PLANS_ENDPOINT || "/plans"}
              </div>
              <div className="col-span-2 text-xs">
                <strong>Plans JSON:</strong>
                <pre className="text-xs mt-1 overflow-auto" style={{ maxHeight: '100px' }}>
                  {JSON.stringify(plans, null, 2)}
                </pre>
              </div>
            </div>
            <button
              onClick={loadPlans}
              style={{
                background: c.primary,
                color: c.white,
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                marginTop: '10px',
              }}
            >
              Reload Plans Data
            </button>
          </div>
        </Card>
      )}

      {/* Header Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4" style={{
          background: `${c.primary}15`,
          border: `1px solid ${c.primary}30`,
        }}>
          <Sparkles size={16} color={c.primary} />
          <span className="text-xs font-bold" style={{ color: c.primary }}>
            UPGRADE YOUR LEARNING
          </span>
          <Sparkles size={16} color={c.primary} />
        </div>

        <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ 
          ...displayFont, 
          color: c.dark,
          lineHeight: '1.2',
        }}>
          Choose the Perfect Plan
        </h1>

        <p className="text-lg md:text-xl mb-2" style={{ color: c.gray, maxWidth: '700px', margin: '0 auto' }}>
          Select a subscription plan tailored to your study schedule and academic goals
        </p>

        <div className="flex flex-wrap gap-3 justify-center mt-4">
          <div className="text-xs px-3 py-1 rounded-full" style={{ 
            background: plans.length > 0 ? `${c.success}15` : `${c.warning}15`, 
            color: plans.length > 0 ? c.success : c.warning 
          }}>
            {plans.length > 0 ? `${plans.length} Plans Available` : 'No Plans Found'}
          </div>
          <div className="text-xs px-3 py-1 rounded-full" style={{ background: `${c.accent}15`, color: c.accent }}>
            Instant Activation
          </div>
          <div className="text-xs px-3 py-1 rounded-full" style={{ background: `${c.secondary}15`, color: c.secondary }}>
            24/7 AI Tutor Access
          </div>
        </div>

        {userSubscription && (
          <div className="mt-6 inline-block px-4 py-2 rounded-lg" style={{ 
            background: `${c.accent}15`,
            border: `1px solid ${c.accent}30`,
          }}>
            <p className="text-sm" style={{ color: c.accent }}>
              Current Plan: <strong>{userSubscription.plan?.name || "Active"}</strong> • 
              Expires: {new Date(userSubscription.end_date).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      {/* Plans Grid - Single Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {plans.map((plan, index) => {
          const Icon = getPlanIcon(index);
          const planColor = getPlanColor(index);
          const isPopular = index === Math.floor(plans.length / 2); // Middle plan is popular
          const isSelected = selectedPlan?.id === plan.id;
          const isProcessing = processingPlanId === plan.id;

          return (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan)}
              style={{
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              {/* Popular Badge */}
              {isPopular && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: `linear-gradient(135deg, ${planColor} 0%, ${planColor}dd 100%)`,
                  color: c.white,
                  padding: '6px 20px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  boxShadow: `0 4px 15px ${planColor}60`,
                  zIndex: 10,
                }}>
                  ⭐ Most Popular
                </div>
              )}

              <Card
                hover
                style={{
                  height: '100%',
                  border: isSelected ? `3px solid ${planColor}` : `1px solid ${c.lightGray}`,
                  background: isSelected 
                    ? `linear-gradient(135deg, ${planColor}08 0%, ${planColor}03 100%)`
                    : c.white,
                  boxShadow: isSelected 
                    ? `0 10px 40px ${planColor}40`
                    : '0 2px 8px rgba(0,0,0,0.05)',
                }}
              >
                {/* Radio / Selection Indicator */}
                <div className="flex justify-end mb-3">
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: `2px solid ${isSelected ? planColor : c.lightGray}`,
                      background: isSelected ? planColor : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {isSelected && <Check size={14} color={c.white} strokeWidth={3} />}
                  </div>
                </div>

                {/* Plan Icon */}
                <div className="mb-6">
                  <div 
                    className="inline-flex p-3 rounded-2xl"
                    style={{ background: `${planColor}15` }}
                  >
                    <Icon size={32} color={planColor} />
                  </div>
                </div>

                {/* Plan Name */}
                <h3 className="text-2xl font-bold mb-2" style={{ ...headingFont, color: c.dark }}>
                  {plan.name}
                </h3>

                {/* Plan Description */}
                {plan.description && (
                  <p className="text-sm mb-4" style={{ color: c.gray }}>
                    {plan.description}
                  </p>
                )}

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold" style={{ ...displayFont, color: planColor }}>
                      ₹{plan.price_inr}
                    </span>
                    <span className="text-sm" style={{ color: c.gray }}>
                      / {plan.duration_days} days
                    </span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: c.gray }}>
                    ≈ ₹{Math.round(plan.price_inr / (plan.duration_days / 30))}/month
                  </div>
                </div>

                {/* Divider */}
                <div style={{ 
                  height: '1px', 
                  background: c.lightGray, 
                  margin: '20px 0' 
                }} />

                {/* Features */}
                <div className="space-y-3 mb-6">
                  {plan.features && (Array.isArray(plan.features) ? plan.features : []).map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div 
                        className="flex-shrink-0 mt-0.5"
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: `${planColor}20`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Check size={14} color={planColor} strokeWidth={3} />
                      </div>
                      <span className="text-sm" style={{ color: c.dark }}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Select / Pay Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isSelected) {
                      handlePayNow(plan);
                    } else {
                      setSelectedPlan(plan);
                    }
                  }}
                  disabled={isProcessing}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: isSelected ? 'none' : `2px solid ${c.lightGray}`,
                    background: isSelected 
                      ? `linear-gradient(135deg, ${planColor} 0%, ${planColor}dd 100%)`
                      : c.white,
                    color: isSelected ? c.white : c.dark,
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: isSelected ? `0 4px 15px ${planColor}40` : 'none',
                    ...headingFont,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !isProcessing) {
                      e.target.style.background = `${planColor}15`;
                      e.target.style.color = planColor;
                      e.target.style.borderColor = planColor;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && !isProcessing) {
                      e.target.style.background = c.white;
                      e.target.style.color = c.dark;
                      e.target.style.borderColor = c.lightGray;
                    }
                  }}
                >
                  {isProcessing ? (
                    <>
                      <Loader size={20} className="animate-spin" />
                      Processing...
                    </>
                  ) : isSelected ? (
                    <>
                      <Crown size={20} />
                      Pay Now (₹{plan.price_inr})
                    </>
                  ) : (
                    "Select Plan"
                  )}
                </button>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Summary / Checkout Card */}
      {selectedPlan && (
        <Card style={{
          background: `linear-gradient(135deg, ${c.primary}08 0%, ${c.accent}08 100%)`,
          border: `2px solid ${c.primary}30`,
          maxWidth: '700px',
          margin: '0 auto 40px',
          textAlign: 'center',
          padding: '24px',
        }}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-left">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: c.primary }}>
                Selected Plan
              </span>
              <h3 className="text-2xl font-bold" style={{ ...headingFont, color: c.dark }}>
                {selectedPlan.name}
              </h3>
              <p className="text-xs mt-1" style={{ color: c.gray }}>
                Full access for {selectedPlan.duration_days} days • ₹{selectedPlan.price_inr}
              </p>
            </div>

            <button
              onClick={() => handlePayNow(selectedPlan)}
              disabled={processingPlanId === selectedPlan.id}
              style={{
                padding: '14px 28px',
                borderRadius: '12px',
                border: 'none',
                background: processingPlanId === selectedPlan.id
                  ? c.gray
                  : `linear-gradient(135deg, ${c.primary} 0%, ${c.accent} 100%)`,
                color: c.white,
                fontSize: '16px',
                fontWeight: '700',
                cursor: processingPlanId === selectedPlan.id ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: `0 4px 15px ${c.primary}40`,
                ...headingFont,
              }}
            >
              {processingPlanId === selectedPlan.id ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Crown size={20} />
                  Pay Now (₹{selectedPlan.price_inr})
                </>
              )}
            </button>
          </div>
        </Card>
      )}

      {/* Debug/Reload Section - For Development */}
      {plans.length === 0 && (
        <Card className="mb-8" style={{ 
          background: `linear-gradient(135deg, ${c.warning}15 0%, ${c.warning}05 100%)`,
          border: `2px solid ${c.warning}`,
        }}>
          <div className="text-center">
            <h3 className="text-lg font-bold mb-3" style={{ ...headingFont, color: c.warning }}>
              No Plans Found
            </h3>
            <p className="text-sm mb-4" style={{ color: c.gray }}>
              The API might not be responding or there are no paid plans in the database.
            </p>
            <button
              onClick={loadPlans}
              style={{
                background: c.warning,
                color: c.white,
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                ...headingFont,
              }}
            >
              <Loader size={16} />
              Reload Plans
            </button>
          </div>
        </Card>
      )}

      {/* Bottom Features */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: "🎯", title: "Personalized Learning", desc: "AI-powered content tailored to your syllabus and goals" },
          { icon: "💬", title: "24/7 AI Tutor", desc: "Get instant step-by-step guidance whenever you need help" },
          { icon: "📊", title: "Track Progress", desc: "Comprehensive chapter-wise analytics and performance insights" },
        ].map((feature, idx) => (
          <div key={idx} className="text-center">
            <div className="text-4xl mb-3">{feature.icon}</div>
            <h4 className="text-base font-bold mb-2" style={{ ...headingFont, color: c.dark }}>
              {feature.title}
            </h4>
            <p className="text-sm" style={{ color: c.gray }}>
              {feature.desc}
            </p>
          </div>
        ))}
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
