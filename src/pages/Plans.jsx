import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Crown, Zap, Star, Sparkles, ArrowLeft, Loader } from "lucide-react";
import { Card, PrimaryButton } from "../components/UI";
import { c, headingFont, displayFont } from "../utils/theme";
import { get, post } from "../utils/api";

export default function PlansPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [userSubscription, setUserSubscription] = useState(null);

  useEffect(() => {
    loadPlans();
    loadUserSubscription();
  }, []);

  async function loadPlans() {
    try {
      setLoading(true);
      const response = await get("/plans");
      
      if (response && response.plans) {
        // Sort plans by price
        const sortedPlans = response.plans.sort((a, b) => a.price_inr - b.price_inr);
        setPlans(sortedPlans);
        
        // Pre-select the middle plan (usually the most popular)
        if (sortedPlans.length > 0) {
          setSelectedPlan(sortedPlans[Math.floor(sortedPlans.length / 2)]);
        }
      }
    } catch (error) {
      console.error("Failed to load plans:", error);
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

  async function handlePayNow() {
    if (!selectedPlan) {
      alert("Please select a plan first");
      return;
    }

    try {
      setProcessing(true);
      
      // Create subscription
      const response = await post("/subscriptions", {
        plan_id: selectedPlan.id,
      });

      if (response && response.subscription) {
        alert(`✅ Successfully subscribed to ${selectedPlan.name}!\n\nYour subscription is now active for ${selectedPlan.duration_days} days.`);
        navigate("/dashboard");
      } else {
        alert("Payment processing... Please check your subscription status.");
      }
    } catch (error) {
      console.error("Payment failed:", error);
      alert("Payment failed. Please try again or contact support.");
    } finally {
      setProcessing(false);
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
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <Loader size={40} color={c.primary} className="animate-spin mx-auto mb-4" />
          <p style={{ color: c.gray }}>Loading plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Back Button */}
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
          marginBottom: '24px',
          fontSize: '14px',
          fontWeight: '600',
        }}
        onMouseEnter={(e) => e.target.style.color = c.primary}
        onMouseLeave={(e) => e.target.style.color = c.gray}
      >
        <ArrowLeft size={18} />
        Back
      </button>

      {/* Header Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4" style={{
          background: `${c.primary}15`,
          border: `1px solid ${c.primary}30`,
        }}>
          <Sparkles size={16} color={c.primary} />
          <span className="text-xs font-bold" style={{ color: c.primary }}>
            CHOOSE YOUR PLAN
          </span>
          <Sparkles size={16} color={c.primary} />
        </div>

        <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ 
          ...displayFont, 
          color: c.dark,
          lineHeight: '1.2',
        }}>
          Unlock Your Learning Potential
        </h1>

        <p className="text-lg md:text-xl mb-2" style={{ color: c.gray, maxWidth: '700px', margin: '0 auto' }}>
          Choose the perfect plan for your educational journey
        </p>

        {userSubscription && (
          <div className="mt-6 inline-block px-4 py-2 rounded-lg" style={{ 
            background: `${c.accent}15`,
            border: `1px solid ${c.accent}30`,
          }}>
            <p className="text-sm" style={{ color: c.accent }}>
              Current Plan: <strong>{userSubscription.plan?.name || "Free"}</strong> • 
              Expires: {new Date(userSubscription.end_date).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {plans.map((plan, index) => {
          const Icon = getPlanIcon(index);
          const planColor = getPlanColor(index);
          const isPopular = index === Math.floor(plans.length / 2);
          const isSelected = selectedPlan?.id === plan.id;

          return (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan)}
              style={{
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
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
                  {plan.features && plan.features.map((feature, idx) => (
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

                {/* Select Button */}
                <button
                  onClick={() => setSelectedPlan(plan)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: 'none',
                    background: isSelected 
                      ? `linear-gradient(135deg, ${planColor} 0%, ${planColor}dd 100%)`
                      : c.lighterGray,
                    color: isSelected ? c.white : c.dark,
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    ...headingFont,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.target.style.background = `${planColor}20`;
                      e.target.style.color = planColor;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.target.style.background = c.lighterGray;
                      e.target.style.color = c.dark;
                    }
                  }}
                >
                  {isSelected ? '✓ Selected' : 'Select Plan'}
                </button>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Payment Section */}
      {selectedPlan && (
        <Card style={{
          background: `linear-gradient(135deg, ${c.primary}05 0%, ${c.accent}05 100%)`,
          border: `2px solid ${c.primary}30`,
          maxWidth: '600px',
          margin: '0 auto',
        }}>
          <div className="text-center">
            <h3 className="text-xl font-bold mb-3" style={{ ...headingFont, color: c.dark }}>
              Ready to Subscribe?
            </h3>
            
            <div className="mb-6">
              <p className="text-sm mb-2" style={{ color: c.gray }}>
                You've selected:
              </p>
              <div className="inline-block px-6 py-3 rounded-lg" style={{ 
                background: c.white,
                border: `2px solid ${getPlanColor(plans.indexOf(selectedPlan))}`,
              }}>
                <div className="text-lg font-bold" style={{ color: c.dark }}>
                  {selectedPlan.name}
                </div>
                <div className="text-2xl font-bold" style={{ 
                  ...displayFont, 
                  color: getPlanColor(plans.indexOf(selectedPlan)) 
                }}>
                  ₹{selectedPlan.price_inr}
                </div>
                <div className="text-xs" style={{ color: c.gray }}>
                  Valid for {selectedPlan.duration_days} days
                </div>
              </div>
            </div>

            <button
              onClick={handlePayNow}
              disabled={processing}
              style={{
                background: processing 
                  ? c.gray
                  : `linear-gradient(135deg, ${c.primary} 0%, ${c.primaryDark} 100%)`,
                color: c.white,
                padding: '18px 60px',
                borderRadius: '14px',
                border: 'none',
                fontSize: '20px',
                fontWeight: '700',
                cursor: processing ? 'not-allowed' : 'pointer',
                boxShadow: processing ? 'none' : `0 10px 30px ${c.primary}40`,
                transition: 'all 0.3s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                opacity: processing ? 0.6 : 1,
                ...headingFont,
              }}
              onMouseEnter={(e) => {
                if (!processing) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = `0 15px 40px ${c.primary}60`;
                }
              }}
              onMouseLeave={(e) => {
                if (!processing) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = `0 10px 30px ${c.primary}40`;
                }
              }}
            >
              {processing ? (
                <>
                  <Loader size={24} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Crown size={24} />
                  Pay Now
                  <Sparkles size={20} />
                </>
              )}
            </button>

            <p className="text-xs mt-4" style={{ color: c.gray }}>
              🔒 Secure payment • Cancel anytime • 100% satisfaction guaranteed
            </p>
          </div>
        </Card>
      )}

      {/* Bottom Features */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: "🎯", title: "Personalized Learning", desc: "AI-powered content tailored to your needs" },
          { icon: "💬", title: "24/7 AI Tutor", desc: "Get instant help whenever you need it" },
          { icon: "📊", title: "Track Progress", desc: "Detailed analytics and performance insights" },
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
