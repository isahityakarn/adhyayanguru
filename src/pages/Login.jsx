import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Phone, GraduationCap, Globe, Mail, Lock, School, KeyRound, CheckCircle2, ArrowLeft, RefreshCw } from "lucide-react";
import * as yup from "yup";
import { Card, FormField, Input, PasswordInput, PrimaryButton, Select } from "../components/UI";
import { c, headingFont } from "../utils/theme";
import { get, post } from "../utils/api";

const loginSchema = yup.object({
  name: yup.string().trim().required("Student name is required"),
  email: yup.string().trim().email("Enter a valid email address").required("Email is required"),
  password: yup.string().min(8, "Password must be at least 8 characters").required("Password is required"),
  passwordConfirmation: yup.string()
    .oneOf([yup.ref("password")], "Passwords must match")
    .required("Please confirm your password"),
  schoolName: yup.string().trim().required("School name is required"),
  classLevel: yup.string().required("Please select a class"),
  board: yup.string().required("Please select a board"),
  phone: yup.string()
    .trim()
    .matches(/^\+?[0-9\s-]{10,15}$/, "Enter a valid phone number")
    .required("Phone number is required"),
  language: yup.string().oneOf(["1", "2"]).required("Please select a language"),
});

const signInSchema = yup.object({
  email: yup.string().trim().email("Enter a valid email address").required("Email is required"),
  password: yup.string().required("Password is required"),
});

function getItems(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.results)) return response.results;
  return [];
}

function getOptionValue(item) {
  if (typeof item === "string" || typeof item === "number") return item;
  return item?.id ?? item?.value ?? item?.name ?? item?.title;
}

function getOptionLabel(item) {
  if (typeof item === "string" || typeof item === "number") return item;
  return item?.name ?? item?.label ?? item?.title ?? item?.class_name ?? item?.className;
}

function LoginFields({ form, errors, updateForm }) {
  return (
    <>
      <FormField label="Email">
        <Input placeholder="Enter your email" icon={Mail} type="email" value={form.email} onChange={updateForm("email")} required />
        {errors.email && <p className="text-xs mt-1" style={{ color: c.error }}>{errors.email}</p>}
      </FormField>
      <FormField label="Password">
        <PasswordInput placeholder="Enter your password" icon={Lock} value={form.password} onChange={updateForm("password")} required />
        {errors.password && <p className="text-xs mt-1" style={{ color: c.error }}>{errors.password}</p>}
      </FormField>
    </>
  );
}

function getApiFieldErrors(errors) {
  return Object.entries(errors).reduce((fieldMessages, [field, messages]) => {
    const fieldName = field === "password_confirmation" ? "passwordConfirmation" : field;
    const message = Array.isArray(messages) ? messages[0] : messages;
    fieldMessages[fieldName] = message;
    if (field === "password" && /confirm|match/i.test(message)) {
      fieldMessages.passwordConfirmation = message;
    }
    return fieldMessages;
  }, {});
}

function getAuthToken(response) {
  return response?.token
    ?? response?.access_token
    ?? response?.data?.token
    ?? response?.data?.access_token
    ?? response?.user?.token
    ?? response?.user?.access_token;
}

const FALLBACK_CLASS_LEVELS = [
  { id: 1, name: "Class 9" },
  { id: 2, name: "Class 10" },
  { id: 3, name: "Class 11" },
  { id: 4, name: "Class 12" },
];

const FALLBACK_BOARDS = [
  { id: 1, name: "CBSE Board" },
  { id: 2, name: "ICSE Board" },
  { id: 3, name: "State Board" },
];

const FALLBACK_PLANS = [
  { id: 1, name: "Free Plan" },
  { id: 2, name: "Pro Plan" },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [classLevels, setClassLevels] = useState([]);
  const [boards, setBoards] = useState([]);
  const [plans, setPlans] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [loginErrors, setLoginErrors] = useState({});
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  
  // OTP Verification state
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    passwordConfirmation: "",
    schoolName: "",
    plan: "",
    classLevel: "",
    board: "",
    phone: "",
    language: "2",
  });

  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  const loadOptions = async () => {
    setOptionsLoading(true);
    setOptionsError("");
    try {
      const [classRes, boardRes, plansRes] = await Promise.allSettled([
        get("/class-levels"),
        get("/boards"),
        get(import.meta.env.VITE_PLANS_ENDPOINT || "/plans"),
      ]);

      const fetchedClasses = classRes.status === "fulfilled" ? getItems(classRes.value) : [];
      const fetchedBoards = boardRes.status === "fulfilled" ? getItems(boardRes.value) : [];
      const fetchedPlans = plansRes.status === "fulfilled" ? getItems(plansRes.value) : [];

      setClassLevels(fetchedClasses.length > 0 ? fetchedClasses : FALLBACK_CLASS_LEVELS);
      setBoards(fetchedBoards.length > 0 ? fetchedBoards : FALLBACK_BOARDS);
      setPlans(fetchedPlans.length > 0 ? fetchedPlans : FALLBACK_PLANS);

      if (classRes.status === "rejected" && boardRes.status === "rejected" && plansRes.status === "rejected") {
        setOptionsError("Server unreachable. Default options loaded.");
      }
    } catch (error) {
      setClassLevels(FALLBACK_CLASS_LEVELS);
      setBoards(FALLBACK_BOARDS);
      setPlans(FALLBACK_PLANS);
      setOptionsError("Unable to load live options. Loaded default list.");
    } finally {
      setOptionsLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  const updateForm = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  async function handleSendOtp(event) {
    if (event) event.preventDefault();
    setFormError("");
    setFieldErrors({});
    setOtpError("");
    setSendingOtp(true);

    try {
      await loginSchema.validate(form, { abortEarly: false });
      const res = await post("/send-otp", { email: form.email, name: form.name });
      if (res?.success) {
        setShowOtpStep(true);
        setOtpSuccess(res?.message || `Verification OTP sent to ${form.email}`);
        setResendTimer(30);
      } else {
        setFormError(res?.message || "Failed to send verification email.");
      }
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        const errors = {};
        error.inner.forEach((validationError) => {
          if (validationError.path && !errors[validationError.path]) {
            errors[validationError.path] = validationError.message;
          }
        });
        setFieldErrors(errors);
        return;
      }
      if (Object.keys(error?.errors || {}).length > 0) {
        setFieldErrors(getApiFieldErrors(error.errors));
      }
      setFormError(error.message || "Could not send verification OTP.");
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setOtpError("");
    setSubmitting(true);

    if (!otp || otp.trim().length !== 6) {
      setOtpError("Please enter the complete 6-digit verification code.");
      setSubmitting(false);
      return;
    }

    try {
      const signupResponse = await post(import.meta.env.VITE_SIGNUP_ENDPOINT || "/signup", {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        password_confirmation: form.passwordConfirmation,
        school_name: form.schoolName,
        language_pref: form.language === "1" ? "hi" : "en",
        class_id: Number(form.classLevel),
        board_id: Number(form.board),
        plan_id: 1,
        otp: otp.trim(),
      });

      const signupToken = getAuthToken(signupResponse);
      if (signupToken) localStorage.setItem("studyyodha_token", signupToken);

      localStorage.setItem("studyyodha_user", JSON.stringify({
        ...signupResponse?.user,
        name: form.name,
        email: form.email,
        phone: form.phone,
        schoolName: form.schoolName,
        plan: "free",
        class_id: Number(form.classLevel),
        board_id: Number(form.board),
        classLevel: form.classLevel,
        board: form.board,
        language: form.language === "1" ? "hi" : "en",
        role: 3,
      }));
      localStorage.setItem("studyyodha_user_role", "student");
      navigate("/dashboard");
    } catch (error) {
      if (error?.errors?.otp) {
        setOtpError(Array.isArray(error.errors.otp) ? error.errors.otp[0] : error.errors.otp);
      } else {
        setOtpError(error.message || "Registration failed. Invalid or expired verification code.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const updateLoginForm = (field) => (event) => {
    setLoginForm((current) => ({ ...current, [field]: event.target.value }));
  };

  async function handleLogin(event) {
    event.preventDefault();
    setFormError("");
    setLoginErrors({});
    setSubmitting(true);

    try {
      await signInSchema.validate(loginForm, { abortEarly: false });
      const loginResponse = await post(import.meta.env.VITE_LOGIN_ENDPOINT || "/login", loginForm);
      const loginToken = getAuthToken(loginResponse);
      if (loginToken) localStorage.setItem("studyyodha_token", loginToken);
      
      const loggedInUser = loginResponse?.user || { email: loginForm.email };
      const rawRole = String(loggedInUser.role || "").toLowerCase();
      const isAdmin = rawRole === "admin" || rawRole === "1" || loggedInUser.role === 1 || rawRole === "super_admin";
      const userRole = isAdmin ? "admin" : "student";

      localStorage.setItem("studyyodha_user", JSON.stringify(loggedInUser));
      localStorage.setItem("studyyodha_user_role", userRole);

      // Route based on role
      if (isAdmin) {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        const errors = {};
        error.inner.forEach((validationError) => {
          if (validationError.path && !errors[validationError.path]) {
            errors[validationError.path] = validationError.message;
          }
        });
        setLoginErrors(errors);
      } else {
        setFormError(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  }
  
  return (
    <div className="login-page flex items-center justify-center">
      <div className="w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ ...headingFont, color: c.dark }}>
            {isLogin ? "Welcome Back" : showOtpStep ? "Verify Your Email" : "Create Your Account"}
          </h1>
          <p className="text-sm" style={{ color: c.gray }}>
            {isLogin
              ? "Sign in with your student or administrator credentials"
              : showOtpStep
              ? `We sent a 6-digit verification OTP to ${form.email}`
              : "Start your learning journey in under a minute"}
          </p>
        </div>
        
        <Card>
          {/* Form Mode Toggle Tabs */}
          <div className="flex border-b border-slate-200 mb-5">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setShowOtpStep(false); setFormError(""); setOtpError(""); }}
              className={`flex-1 py-2.5 text-sm font-bold text-center border-b-2 transition-all cursor-pointer ${
                isLogin ? "border-amber-600 text-amber-900 bg-amber-50/50" : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setShowOtpStep(false); setFormError(""); setOtpError(""); }}
              className={`flex-1 py-2.5 text-sm font-bold text-center border-b-2 transition-all cursor-pointer ${
                !isLogin ? "border-amber-600 text-amber-900 bg-amber-50/50" : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Sign Up
            </button>
          </div>



          <form onSubmit={isLogin ? handleLogin : handleSubmit}>
          {isLogin ? (
            <LoginFields form={loginForm} errors={loginErrors} updateForm={updateLoginForm} />
          ) : showOtpStep ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs">
                <div className="flex items-center gap-2 text-blue-900">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="font-semibold">{otpSuccess || `OTP sent to ${form.email}`}</p>
                    <p className="text-[11px] text-blue-700">Sent from support@adhyayanguru.shop</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowOtpStep(false); setOtpError(""); }}
                  className="text-blue-700 font-semibold underline text-[11px] hover:text-blue-900 flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Edit Info
                </button>
              </div>

              <FormField label="Enter 6-Digit Verification Code">
                <Input
                  placeholder="• • • • • •"
                  icon={KeyRound}
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                  className="text-center font-mono text-xl tracking-[0.4em] font-bold"
                  autoFocus
                  required
                />
                {otpError && <p className="text-xs mt-1 font-medium" style={{ color: c.error }}>{otpError}</p>}
              </FormField>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500">Didn't receive the code?</span>
                <button
                  type="button"
                  disabled={resendTimer > 0 || sendingOtp}
                  onClick={handleSendOtp}
                  className={`font-semibold flex items-center gap-1 ${resendTimer > 0 ? "text-slate-400 cursor-not-allowed" : "text-amber-700 hover:underline"}`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${sendingOtp ? "animate-spin" : ""}`} />
                  {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : sendingOtp ? "Sending..." : "Resend OTP"}
                </button>
              </div>

              <PrimaryButton className="w-full mt-3" type="submit" disabled={submitting}>
                {submitting ? "Verifying & Creating Account..." : "Verify & Complete Signup →"}
              </PrimaryButton>
            </div>
          ) : (
            <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Student Name">
            <Input placeholder="Enter your name" icon={User} value={form.name} onChange={updateForm("name")} required />
            {fieldErrors.name && <p className="text-xs mt-1" style={{ color: c.error }}>{fieldErrors.name}</p>}
          </FormField>

          <FormField label="Email">
            <Input placeholder="Enter your email" icon={Mail} type="email" value={form.email} onChange={updateForm("email")} required />
            {fieldErrors.email && <p className="text-xs mt-1" style={{ color: c.error }}>{fieldErrors.email}</p>}
          </FormField>

          <FormField label="Password">
            <PasswordInput placeholder="Create a password" icon={Lock} value={form.password} onChange={updateForm("password")} required />
            {fieldErrors.password && <p className="text-xs mt-1" style={{ color: c.error }}>{fieldErrors.password}</p>}
          </FormField>

          <FormField label="Confirm Password">
            <PasswordInput placeholder="Confirm your password" icon={Lock} value={form.passwordConfirmation} onChange={updateForm("passwordConfirmation")} required />
            {fieldErrors.passwordConfirmation && <p className="text-xs mt-1" style={{ color: c.error }}>{fieldErrors.passwordConfirmation}</p>}
          </FormField>

          <FormField label="School Name">
            <Input placeholder="Enter your school name" icon={School} value={form.schoolName} onChange={updateForm("schoolName")} required />
            {fieldErrors.schoolName && <p className="text-xs mt-1" style={{ color: c.error }}>{fieldErrors.schoolName}</p>}
          </FormField>
          
          <FormField label="Class">
            <Select icon={GraduationCap} disabled={optionsLoading} value={form.classLevel} onChange={updateForm("classLevel")} required>
              <option value="">{optionsLoading ? "Loading classes..." : "Select Class"}</option>
              {classLevels.map((item) => (
                <option key={getOptionValue(item)} value={getOptionValue(item)}>
                  {getOptionLabel(item)}
                </option>
              ))}
            </Select>
            {fieldErrors.classLevel && <p className="text-xs mt-1" style={{ color: c.error }}>{fieldErrors.classLevel}</p>}
          </FormField>
          <FormField label="Board">
            <Select disabled={optionsLoading} value={form.board} onChange={updateForm("board")} required>
              <option value="">{optionsLoading ? "Loading boards..." : "Select Board"}</option>
              {boards.map((item) => (
                <option key={getOptionValue(item)} value={getOptionValue(item)}>
                  {getOptionLabel(item)}
                </option>
              ))}
            </Select>
            {fieldErrors.board && <p className="text-xs mt-1" style={{ color: c.error }}>{fieldErrors.board}</p>}
          </FormField>

          {optionsError && (
            <p className="text-xs mb-4" style={{ color: c.error }}>
              Unable to load classes or boards. Please try again.
            </p>
          )}
          
          <FormField label="Phone Number">
            <Input placeholder="+91 98xxxxxxx0" icon={Phone} type="tel" value={form.phone} onChange={updateForm("phone")} required />
            {fieldErrors.phone && <p className="text-xs mt-1" style={{ color: c.error }}>{fieldErrors.phone}</p>}
          </FormField>
          <FormField label="Preferred Language">
            <Select icon={Globe} value={form.language} onChange={updateForm("language")}>
              <option value="1">Hindi</option>
              <option value="2">English</option>
            </Select>
            {fieldErrors.language && <p className="text-xs mt-1" style={{ color: c.error }}>{fieldErrors.language}</p>}
          </FormField>
          </div>

          {formError && (
            <p className="text-xs mb-4 mt-2" style={{ color: c.error }}>{formError}</p>
          )}
          
          <PrimaryButton className="w-full mt-3" type="button" onClick={handleSendOtp} disabled={sendingOtp}>
            {sendingOtp ? "Sending Verification OTP..." : "Send Verification OTP →"}
          </PrimaryButton>
            </>
          )}
          {isLogin && (
            <>
              {formError && <p className="text-xs mb-4" style={{ color: c.error }}>{formError}</p>}
              <PrimaryButton className="w-full mt-2" type="submit" disabled={submitting}>
                {submitting ? "Logging in..." : "Login"}
              </PrimaryButton>
            </>
          )}
          </form>
          
          <div className="text-center mt-4">
            <p className="text-sm" style={{ color: c.gray }}>
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                className="font-bold underline ml-1 cursor-pointer hover:opacity-80 transition-opacity focus:outline-none"
                style={{ color: c.primary }}
                onClick={() => { 
                  setIsLogin((current) => !current); 
                  setShowOtpStep(false); 
                  setFormError(""); 
                  setOtpError(""); 
                }}
              >
                {isLogin ? "Sign up" : "Log in"}
              </button>
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
