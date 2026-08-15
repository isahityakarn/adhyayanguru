import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Phone, GraduationCap, Globe, Mail, Lock, School } from "lucide-react";
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
  plan: yup.string().required("Please select a plan"),
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
    let active = true;

    async function loadOptions() {
      try {
        const [classResponse, boardResponse, plansResponse] = await Promise.all([
          get("/class-levels"),
          get("/boards"),
          get(import.meta.env.VITE_PLANS_ENDPOINT || "/plans"),
        ]);

        if (active) {
          setClassLevels(getItems(classResponse));
          setBoards(getItems(boardResponse));
          setPlans(getItems(plansResponse));
        }
      } catch (error) {
        if (active) setOptionsError(error.message);
      } finally {
        if (active) setOptionsLoading(false);
      }
    }

    loadOptions();
    return () => { active = false; };
  }, []);

  const updateForm = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setFieldErrors({});
    setSubmitting(true);

    try {
      await loginSchema.validate(form, { abortEarly: false });
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
        plan_id: Number(form.plan),
      });

      const signupToken = getAuthToken(signupResponse);
      if (signupToken) localStorage.setItem("studyyodha_token", signupToken);

      localStorage.setItem("studyyodha_user", JSON.stringify({
        ...signupResponse?.user,
        name: form.name,
        email: form.email,
        phone: form.phone,
        schoolName: form.schoolName,
        plan: form.plan,
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
      if (Object.keys(error.errors || {}).length > 0) {
        setFieldErrors(getApiFieldErrors(error.errors));
      }
      setFormError(error.message);
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
            {isLogin ? "Welcome Back" : "Create Your Account"}
          </h1>
          <p className="text-sm" style={{ color: c.gray }}>
            {isLogin
              ? "Sign in with your student or administrator credentials"
              : "Start your learning journey in under a minute"}
          </p>
        </div>
        
        <Card>
          {isLogin && (
            <div className="mb-4 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-amber-800">Demo Quick-Fill:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLoginForm({ email: "admin@studyyodha.in", password: "admin123" })}
                  className="px-2 py-1 rounded bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700 transition-colors"
                >
                  Admin (admin@studyyodha.in)
                </button>
                <button
                  type="button"
                  onClick={() => setLoginForm({ email: "sanskritikarn@gmail.com", password: "password123" })}
                  className="px-2 py-1 rounded bg-teal-700 text-white font-bold text-[11px] hover:bg-teal-800 transition-colors"
                >
                  Student Demo
                </button>
              </div>
            </div>
          )}

          <form onSubmit={isLogin ? handleLogin : handleSubmit}>
          {isLogin ? (
            <LoginFields form={loginForm} errors={loginErrors} updateForm={updateLoginForm} />
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

          <FormField label="Select Plan">
            <Select value={form.plan} onChange={updateForm("plan")} disabled={optionsLoading} required>
              <option value="">{optionsLoading ? "Loading plans..." : "Choose a plan"}</option>
              {plans.map((item) => (
                <option key={getOptionValue(item)} value={getOptionValue(item)}>
                  {getOptionLabel(item)}
                </option>
              ))}
            </Select>
            {fieldErrors.plan && <p className="text-xs mt-1" style={{ color: c.error }}>{fieldErrors.plan}</p>}
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
              Unable to load classes, boards, or plans. Please try again.
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
            <p className="text-xs mb-4" style={{ color: c.error }}>{formError}</p>
          )}
          
          <PrimaryButton className="w-full mt-2" type="submit" disabled={submitting}>
            {submitting ? "Creating account..." : "Create Account →"}
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
              <span
                className="font-semibold cursor-pointer"
                style={{ color: c.primary }}
                onClick={() => { setIsLogin((current) => !current); setFormError(""); }}
              >
                {isLogin ? "Sign up" : "Log in"}
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
