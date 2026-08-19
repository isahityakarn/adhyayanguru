import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Clock, TrendingUp, BookOpen, MessageCircle, Award, Flame, AlertCircle, Sparkles, Zap, Crown } from "lucide-react";
import { Card, Bar, PrimaryButton } from "../components/UI";
import { c, headingFont, displayFont } from "../utils/theme";
import { get } from "../utils/api";

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const storedUser = JSON.parse(localStorage.getItem("studyyodha_user") || "null");
  const userName = storedUser?.name || "Student";
  const userClass = storedUser?.classLevel || "Class 10";
  const userBoard = storedUser?.board || "CBSE";
  const [userPlan, setUserPlan] = useState(null);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [redirectMessage, setRedirectMessage] = useState(null);

  useEffect(() => {
    loadUserData();
    
    // Check if user was redirected from a protected route
    if (location.state?.subscriptionExpired && location.state?.message) {
      setRedirectMessage(location.state.message);
      
      // Clear the message after 10 seconds
      setTimeout(() => {
        setRedirectMessage(null);
      }, 10000);
    }
  }, [location]);

  async function loadUserData() {
    try {
      const response = await get("/user");
      
      // Get subscription with plan details
      const subscription = response?.user?.subscription;
      
      let effectivePlan = "free";
      let planDetails = null;
      let isSubscriptionActive = false;
      let maxStreakDays = 7; // default for free
      
      if (subscription && subscription.plan) {
        const endDate = new Date(subscription.end_date);
        const today = new Date();
        
        // Check if subscription is still valid
        if (endDate > today) {
          // Subscription is active
          isSubscriptionActive = true;
          planDetails = subscription.plan;
          
          // Determine streak based on plan duration
          const durationDays = subscription.plan.duration_days;
          
          if (durationDays >= 365) {
            effectivePlan = "premium";
            maxStreakDays = 30;
          } else if (durationDays >= 180) {
            effectivePlan = "basic";
            maxStreakDays = 14;
          } else if (durationDays >= 30) {
            effectivePlan = "basic";
            maxStreakDays = 14;
          } else {
            effectivePlan = "free";
            maxStreakDays = 7;
          }
        } else {
          // Subscription expired
          effectivePlan = "free";
          maxStreakDays = 7;
          setUserPlan({ 
            name: "free", 
            displayName: "Free",
            expired: true,
            expiredPlan: subscription.plan.name
          });
        }
      }
      
      // Set user plan with all details
      if (isSubscriptionActive && planDetails) {
        setUserPlan({ 
          name: effectivePlan,
          displayName: planDetails.name,
          price: planDetails.price_inr,
          duration: planDetails.duration_days,
          features: planDetails.features,
          isActive: true,
          endDate: subscription.end_date
        });
      } else if (!userPlan?.expired) {
        setUserPlan({ 
          name: "free",
          displayName: "Free Plan",
          isActive: false
        });
      }
      
      // Calculate days remaining in subscription
      let remainingDays = 0;
      
      if (subscription && subscription.end_date) {
        const endDate = new Date(subscription.end_date);
        const today = new Date();
        const diffTime = endDate - today;
        remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // If negative (expired), set to 0
        if (remainingDays < 0) remainingDays = 0;
      }
      
      setDaysRemaining(remainingDays);
      
    } catch (error) {
      console.error("Failed to load user data:", error);
      // Default values on error
      setDaysRemaining(0);
      setUserPlan({ name: "free", displayName: "Free Plan" });
    }
  }
  
  const stats = [
    { icon: Clock, num: "4.5h", lbl: "Studied this week", color: c.primary },
    { icon: TrendingUp, num: "82%", lbl: "Avg quiz score", color: c.accent },
    { icon: BookOpen, num: "12", lbl: "Chapters completed", color: c.secondary },
    { icon: MessageCircle, num: "3", lbl: "Doubts this week", color: c.info },
  ];
  
  const subjects = [
    { name: "Mathematics", pct: 60, color: c.primary, icon: "📐" },
    { name: "Science", pct: 40, color: c.accent, icon: "🔬" },
    { name: "Social Science", pct: 75, color: c.secondary, icon: "🌍" },
  ];
  
  return (
    <div>
      {/* Redirect Message from Protected Route */}
      {redirectMessage && (
        <Card className="mb-6" style={{ 
          background: `linear-gradient(135deg, ${c.error}15 0%, ${c.error}05 100%)`, 
          border: `2px solid ${c.error}`,
          animation: 'fadeIn 0.3s ease-in'
        }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: c.error, color: c.white }}>
              <AlertCircle size={24} />
            </div>
            <div className="flex-1">
              <div className="text-lg font-bold mb-1" style={{ color: c.error }}>
                Access Denied
              </div>
              <div className="text-sm" style={{ color: c.gray }}>
                {redirectMessage}
              </div>
            </div>
            <button
              onClick={() => setRedirectMessage(null)}
              style={{
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                color: c.gray,
                cursor: 'pointer',
                fontSize: '20px'
              }}
            >
              ×
            </button>
          </div>
        </Card>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1" style={{ ...headingFont, color: c.dark }}>
            Welcome back, {userName}! 👋
          </h1>
          <p className="text-sm" style={{ color: c.gray }}>
            {userClass} · {userBoard} · {userPlan?.displayName || "Free Plan"} · Ready to continue learning?
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl" 
          style={{ background: `linear-gradient(135deg, ${c.secondary} 0%, ${c.secondaryDark} 100%)` }}>
          <Flame size={20} color={c.white} />
          <div>
            <div className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
              {userPlan?.isActive ? 'Plan Expires In' : 'Free Plan'}
            </div>
            <div className="text-lg font-bold" style={{ color: c.white }}>
              {userPlan?.isActive ? `${daysRemaining} days` : '∞'}
            </div>
          </div>
        </div>
      </div>

      {/* Plan Info Banner (if applicable) */}
      {userPlan?.isActive && userPlan.name !== "free" && (
        <Card className="mb-6" style={{ background: `linear-gradient(135deg, ${c.accent}15 0%, ${c.accent}05 100%)`, border: `1px solid ${c.accent}40` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: c.accent, color: c.white }}>
                <Award size={20} />
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color: c.dark }}>
                  {userPlan.displayName} Active
                </div>
                <div className="text-xs" style={{ color: c.gray }}>
                  {userPlan.duration} days plan • Expires: {new Date(userPlan.endDate).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold" style={{ color: c.accent }}>
                ₹{userPlan.price}
              </div>
              <div className="text-xs" style={{ color: c.gray }}>
                {userPlan.duration} days
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Expired Subscription Warning */}
      {userPlan?.expired && (
        <Card className="mb-6" style={{ background: `linear-gradient(135deg, ${c.error}15 0%, ${c.error}05 100%)`, border: `1px solid ${c.error}40` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: c.error, color: c.white }}>
                <Award size={20} />
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color: c.error }}>
                  {userPlan.expiredPlan} Subscription Expired
                </div>
                <div className="text-xs" style={{ color: c.gray }}>
                  Your premium features are now limited. Renew to continue enjoying full access.
                </div>
              </div>
            </div>
            <PrimaryButton className="text-xs">
              Renew Now
            </PrimaryButton>
          </div>
        </Card>
      )}

      {/* Modern Update Plan Section - Shows when days remaining is 0 */}
      {daysRemaining === 0 && !userPlan?.isActive && (
        <div className="mb-8" style={{ 
          position: 'relative',
          borderRadius: '20px',
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${c.primary} 0%, ${c.primaryDark} 50%, ${c.accent} 100%)`,
          boxShadow: `0 20px 60px -15px ${c.primary}60`,
        }}>
          {/* Animated background effect */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
            animation: 'pulse 3s ease-in-out infinite',
          }} />
          
          <div style={{ position: 'relative', padding: '40px 32px' }}>
            {/* Header section */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4" style={{
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
              }}>
                <Sparkles size={16} color={c.white} />
                <span className="text-xs font-bold" style={{ color: c.white }}>
                  YOUR PLAN HAS EXPIRED
                </span>
                <Sparkles size={16} color={c.white} />
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ 
                ...displayFont, 
                color: c.white,
                textShadow: '0 2px 20px rgba(0,0,0,0.2)'
              }}>
                Unlock Your Full Potential
              </h2>
              
              <p className="text-base md:text-lg mb-6" style={{ 
                color: 'rgba(255,255,255,0.95)',
                maxWidth: '600px',
                margin: '0 auto'
              }}>
                Get unlimited access to all subjects, AI tutor, quizzes, and premium content
              </p>
            </div>

            {/* Features grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { icon: Crown, title: "Premium Content", desc: "Access all subjects & chapters" },
                { icon: Zap, title: "AI Tutor 24/7", desc: "Get instant help anytime" },
                { icon: Award, title: "Track Progress", desc: "Detailed analytics & reports" },
              ].map((feature, idx) => (
                <div key={idx} style={{
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '16px',
                  padding: '20px',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}>
                  <feature.icon size={24} color={c.white} className="mb-3" />
                  <div className="text-sm font-bold mb-1" style={{ color: c.white }}>
                    {feature.title}
                  </div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {feature.desc}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <div className="text-center">
              <button
                onClick={() => navigate("/plans")}
                style={{
                  background: c.white,
                  color: c.primary,
                  padding: '16px 48px',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '18px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                  transition: 'all 0.3s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '12px',
                  ...headingFont,
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 15px 40px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
                }}
              >
                <Crown size={24} />
                Update Your Plan Now
                <Sparkles size={20} />
              </button>
              
              <div className="mt-4 text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>
                Choose from flexible plans starting at ₹99/month
              </div>
            </div>
          </div>

          {/* CSS Animation */}
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 0.5; }
              50% { opacity: 1; }
            }
          `}</style>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.lbl}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: `${s.color}20` }}>
                  <Icon size={20} color={s.color} />
                </div>
              </div>
              <div className="text-2xl font-bold mb-1" style={{ ...headingFont, color: c.dark }}>
                {s.num}
              </div>
              <div className="text-xs" style={{ color: c.gray }}>
                {s.lbl}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Continue Learning Card */}
      <Card className="mb-8 p-0 overflow-hidden" style={{ opacity: daysRemaining === 0 ? 0.6 : 1 }}>
        <div className="p-6" style={{ background: `linear-gradient(135deg, ${c.primary} 0%, ${c.primaryDark} 100%)` }}>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
                Continue Learning
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ ...headingFont, color: c.white }}>
                Trigonometry — Chapter 8
              </h3>
              <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.9)' }}>
                Mathematics · 60% complete
              </p>
              <PrimaryButton 
                variant="secondary" 
                onClick={() => daysRemaining > 0 ? navigate("/chapters") : alert("Your subscription has expired. Please renew to continue learning.")}
                disabled={daysRemaining === 0}
              >
                {daysRemaining > 0 ? "Resume Learning →" : "🔒 Subscription Expired"}
              </PrimaryButton>
            </div>
            <div className="hidden md:block text-6xl opacity-20">📐</div>
          </div>
        </div>
        <div className="h-2" style={{ background: c.lighterGray }}>
          <div className="h-full" style={{ width: '60%', background: c.secondary }}></div>
        </div>
      </Card>

      {/* Subjects */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-5" style={{ ...headingFont, color: c.dark }}>
          Your Subjects
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {subjects.map((s) => (
            <Card 
              key={s.name} 
              hover={daysRemaining > 0}
              onClick={() => daysRemaining > 0 ? navigate("/chapters") : alert("Your subscription has expired. Please renew to access chapters.")}
              style={{ opacity: daysRemaining === 0 ? 0.6 : 1, cursor: daysRemaining === 0 ? 'not-allowed' : 'pointer' }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl">{s.icon}</div>
                <div className="flex-1">
                  <div className="text-base font-bold mb-1" style={{ color: c.dark }}>
                    {s.name} {daysRemaining === 0 && "🔒"}
                  </div>
                  <div className="text-xs" style={{ color: c.gray }}>
                    {s.pct}% completed
                  </div>
                </div>
                <Award size={20} color={s.color} />
              </div>
              <Bar pct={s.pct} color={s.color} />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
