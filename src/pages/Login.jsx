import { useNavigate } from "react-router-dom";
import { User, Phone, GraduationCap, Globe } from "lucide-react";
import { Card, PrimaryButton } from "../components/UI";
import { c, headingFont } from "../utils/theme";

export default function LoginPage() {
  const navigate = useNavigate();
  
  const Field = ({ label, placeholder, icon: Icon, as = "input" }) => (
    <div className="mb-4">
      <label className="block text-sm font-semibold mb-2" style={{ color: c.dark }}>
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <Icon size={18} color={c.gray} />
          </div>
        )}
        {as === "input" ? (
          <input
            placeholder={placeholder}
            className="w-full px-4 py-3 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:ring-2"
            style={{ 
              background: c.white, 
              border: `2px solid ${c.lighterGray}`,
              paddingLeft: Icon ? '2.5rem' : '1rem'
            }}
            onFocus={(e) => e.target.style.borderColor = c.primary}
            onBlur={(e) => e.target.style.borderColor = c.lighterGray}
          />
        ) : (
          <select 
            className="w-full px-4 py-3 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:ring-2" 
            style={{ 
              background: c.white, 
              border: `2px solid ${c.lighterGray}`,
              paddingLeft: Icon ? '2.5rem' : '1rem'
            }}
            onFocus={(e) => e.target.style.borderColor = c.primary}
            onBlur={(e) => e.target.style.borderColor = c.lighterGray}
          >
            <option>{placeholder}</option>
          </select>
        )}
      </div>
    </div>
  );
  
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ ...headingFont, color: c.dark }}>
            Create Your Account
          </h1>
          <p className="text-sm" style={{ color: c.gray }}>
            Start your learning journey in under a minute
          </p>
        </div>
        
        <Card>
          <Field label="Student Name" placeholder="Enter your name" icon={User} />
          
          <div className="grid grid-cols-2 gap-4">
            <Field label="Class" placeholder="Select Class" icon={GraduationCap} as="select" />
            <Field label="Board" placeholder="CBSE" as="select" />
          </div>
          
          <Field label="Phone Number" placeholder="+91 98xxxxxxx0" icon={Phone} />
          <Field label="Preferred Language" placeholder="Hindi + English" icon={Globe} as="select" />
          
          <PrimaryButton className="w-full mt-2" onClick={() => navigate("/dashboard")}>
            Create Account →
          </PrimaryButton>
          
          <div className="text-center mt-4">
            <p className="text-sm" style={{ color: c.gray }}>
              Already have an account?{" "}
              <span className="font-semibold cursor-pointer" style={{ color: c.primary }}>
                Log in
              </span>
            </p>
          </div>
        </Card>
        
        {/* Trust Indicators */}
        <div className="mt-6 text-center text-xs" style={{ color: c.gray }}>
          <p>🔒 Your data is secure · 📚 CBSE Aligned · 🎓 Trusted by 10,000+ students</p>
        </div>
      </div>
    </div>
  );
}
