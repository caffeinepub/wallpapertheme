import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import {
  Eye,
  EyeOff,
  Globe,
  Lock,
  Mail,
  Mic,
  MicOff,
  Phone,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { genId, loadFromStorage, saveToStorage } from "../App";
import type { User as UserType } from "../types";

interface AuthProps {
  onLogin: (user: UserType) => void;
}

type Mode = "login" | "register";
type LangCode = "en" | "hi" | "gu" | "hinglish";

const LANG_LABELS: Record<LangCode, string> = {
  en: "English",
  hi: "हिंदी",
  gu: "ગુજરાતી",
  hinglish: "Hinglish",
};

export default function Auth({ onLogin }: AuthProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [loginId, setLoginId] = useState("");
  const [loginPass, setLoginPass] = useState("");

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("+91 ");
  const [regPass, setRegPass] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  // Translation widget state
  const [showTranslate, setShowTranslate] = useState(false);
  const [translateLang, setTranslateLang] = useState<LangCode>("hi");
  const [translateInput, setTranslateInput] = useState("");
  const [translateResult, setTranslateResult] = useState("");
  const [translating, setTranslating] = useState(false);
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !loginPass.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const users = loadFromStorage<UserType[]>("reckon_users", []);
      const user = users.find(
        (u) =>
          (u.email.toLowerCase() === loginId.toLowerCase() ||
            u.phone.replace(/\s/g, "") === loginId.replace(/\s/g, "")) &&
          u.password === loginPass,
      );
      if (!user) {
        toast.error("Invalid credentials. Check email/phone and password.");
        return;
      }
      toast.success(`Welcome back, ${user.name}! 🎉`);
      onLogin(user);
    }, 600);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !regName.trim() ||
      !regEmail.trim() ||
      !regPhone.trim() ||
      !regPass.trim()
    ) {
      toast.error("Please fill in all fields");
      return;
    }
    if (!regEmail.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    if (
      !regPhone.startsWith("+91") ||
      regPhone.replace(/\s/g, "").length < 12
    ) {
      toast.error("Enter a valid phone number with +91");
      return;
    }
    if (regPass.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (regPass !== regConfirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const users = loadFromStorage<UserType[]>("reckon_users", []);
      const exists = users.find(
        (u) =>
          u.email.toLowerCase() === regEmail.toLowerCase() ||
          u.phone.replace(/\s/g, "") === regPhone.replace(/\s/g, ""),
      );
      if (exists) {
        toast.error("Email or phone already registered");
        return;
      }
      const newUser: UserType = {
        id: genId(),
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        phone: regPhone.trim(),
        password: regPass,
        city: "",
        createdAt: Date.now(),
      };
      saveToStorage("reckon_users", [...users, newUser]);
      toast.success(`Account created! Welcome, ${newUser.name}! 🚀`);
      onLogin(newUser);
    }, 600);
  };

  const handleTranslate = async () => {
    if (!translateInput.trim()) return;
    setTranslating(true);
    setTranslateResult("");
    try {
      const from = "en";
      const to = translateLang === "hinglish" ? "hi" : translateLang;
      const url = `https://api.mymemory.translated.web/get?q=${encodeURIComponent(translateInput)}&langpair=${from}|${to}`;
      const res = await fetch(url);
      const data = await res.json();
      let result = data.responseData?.translatedText || "Translation failed";
      if (translateLang === "hinglish") {
        result = `${result} (Hinglish)`;
      }
      setTranslateResult(result);
    } catch {
      setTranslateResult("Translation error. Try again.");
    } finally {
      setTranslating(false);
    }
  };

  const toggleMic = () => {
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast.error("Microphone not supported in this browser");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new SpeechRecognitionAPI() as any;
    recognition.lang =
      translateLang === "hi" || translateLang === "hinglish"
        ? "hi-IN"
        : translateLang === "gu"
          ? "gu-IN"
          : "en-US";
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript || "";
      setTranslateInput(transcript);
      setRecording(false);
    };
    recognition.onerror = () => {
      setRecording(false);
      toast.error("Microphone error. Try again.");
    };
    recognition.onend = () => setRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #0a0a0a 0%, #1a0010 35%, #2d0020 60%, #120008 80%, #0a0a0a 100%)",
      }}
      initial={{ scale: 1.15, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 1.4, ease: "easeOut" }}
    >
      {/* Pink glow orbs */}
      <div
        className="absolute top-0 left-1/3 w-96 h-96 rounded-full pointer-events-none blur-3xl opacity-30"
        style={{
          background:
            "radial-gradient(circle, #ff0066 0%, #cc0055 50%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-0 right-1/3 w-80 h-80 rounded-full pointer-events-none blur-3xl opacity-20"
        style={{
          background:
            "radial-gradient(circle, #ff3399 0%, #aa0044 50%, transparent 70%)",
        }}
      />
      <div
        className="absolute top-1/2 left-0 w-64 h-64 rounded-full pointer-events-none blur-3xl opacity-15"
        style={{
          background: "radial-gradient(circle, #ff0080 0%, transparent 70%)",
        }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,0,100,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,100,0.3) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Logo */}
      <motion.div
        className="mb-8 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <img
          src="/assets/uploads/Reckon-Messenger-Log-1.png"
          alt="Reckon"
          className="h-20 object-contain mx-auto mb-3"
          style={{ filter: "drop-shadow(0 0 20px rgba(255,0,100,0.6))" }}
        />
        <p
          className="text-sm tracking-widest uppercase font-mono"
          style={{ color: "rgba(255,100,150,0.8)" }}
        >
          Connect. Communicate. Conquer.
        </p>
      </motion.div>

      {/* Card */}
      <motion.div
        className="w-full max-w-md rounded-2xl p-8 relative"
        style={{
          background: "rgba(10, 0, 6, 0.85)",
          border: "1px solid rgba(255, 0, 100, 0.3)",
          boxShadow:
            "0 0 40px rgba(255, 0, 100, 0.15), inset 0 0 40px rgba(255, 0, 100, 0.05)",
          backdropFilter: "blur(20px)",
        }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        {/* Tabs */}
        <div
          className="flex rounded-xl overflow-hidden mb-6"
          style={{ background: "rgba(255,0,100,0.08)" }}
        >
          <button
            type="button"
            data-ocid="auth.switch_to_login_link"
            className="flex-1 py-2.5 text-sm font-medium transition-all duration-200"
            style={
              mode === "login"
                ? {
                    background: "linear-gradient(135deg, #cc0044, #ff0066)",
                    color: "white",
                    borderRadius: "10px",
                    boxShadow: "0 0 15px rgba(255,0,100,0.4)",
                  }
                : { color: "rgba(255,100,150,0.6)" }
            }
            onClick={() => setMode("login")}
          >
            Sign In
          </button>
          <button
            type="button"
            data-ocid="auth.switch_to_register_link"
            className="flex-1 py-2.5 text-sm font-medium transition-all duration-200"
            style={
              mode === "register"
                ? {
                    background: "linear-gradient(135deg, #cc0044, #ff0066)",
                    color: "white",
                    borderRadius: "10px",
                    boxShadow: "0 0 15px rgba(255,0,100,0.4)",
                  }
                : { color: "rgba(255,100,150,0.6)" }
            }
            onClick={() => setMode("register")}
          >
            Create Account
          </button>
        </div>

        <AnimatePresence mode="wait">
          {mode === "login" ? (
            <motion.form
              key="login"
              onSubmit={handleLogin}
              className="space-y-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="space-y-1.5">
                <Label
                  className="text-sm"
                  style={{ color: "rgba(255,150,180,0.8)" }}
                >
                  Email or Phone
                </Label>
                <div className="relative">
                  <Mail
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: "rgba(255,0,80,0.6)" }}
                  />
                  <Input
                    data-ocid="auth.email_input"
                    placeholder="email@example.com or +91 xxxxx"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    className="pl-9"
                    style={{
                      background: "rgba(255,0,60,0.08)",
                      border: "1px solid rgba(255,0,100,0.25)",
                      color: "white",
                    }}
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label
                  className="text-sm"
                  style={{ color: "rgba(255,150,180,0.8)" }}
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: "rgba(255,0,80,0.6)" }}
                  />
                  <Input
                    data-ocid="auth.password_input"
                    type={showPass ? "text" : "password"}
                    placeholder="Enter your password"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    className="pl-9 pr-10"
                    style={{
                      background: "rgba(255,0,60,0.08)",
                      border: "1px solid rgba(255,0,100,0.25)",
                      color: "white",
                    }}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: "rgba(255,100,150,0.6)" }}
                    onClick={() => setShowPass((p) => !p)}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <Button
                data-ocid="auth.signin_button"
                type="submit"
                className="w-full font-semibold"
                style={{
                  background: "linear-gradient(135deg, #cc0044, #ff0066)",
                  boxShadow: "0 0 20px rgba(255,0,100,0.3)",
                }}
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
              <p
                className="text-xs text-center"
                style={{ color: "rgba(255,100,150,0.5)" }}
              >
                Demo: alice@demo.com / demo123
              </p>
            </motion.form>
          ) : (
            <motion.form
              key="register"
              onSubmit={handleRegister}
              className="space-y-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="space-y-1.5">
                <Label
                  className="text-sm"
                  style={{ color: "rgba(255,150,180,0.8)" }}
                >
                  Full Name
                </Label>
                <div className="relative">
                  <User
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: "rgba(255,0,80,0.6)" }}
                  />
                  <Input
                    data-ocid="auth.name_input"
                    placeholder="Your full name"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="pl-9"
                    style={{
                      background: "rgba(255,0,60,0.08)",
                      border: "1px solid rgba(255,0,100,0.25)",
                      color: "white",
                    }}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label
                  className="text-sm"
                  style={{ color: "rgba(255,150,180,0.8)" }}
                >
                  Email
                </Label>
                <div className="relative">
                  <Mail
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: "rgba(255,0,80,0.6)" }}
                  />
                  <Input
                    data-ocid="auth.reg_email_input"
                    type="email"
                    placeholder="email@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="pl-9"
                    style={{
                      background: "rgba(255,0,60,0.08)",
                      border: "1px solid rgba(255,0,100,0.25)",
                      color: "white",
                    }}
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label
                  className="text-sm"
                  style={{ color: "rgba(255,150,180,0.8)" }}
                >
                  Phone (+91)
                </Label>
                <div className="relative">
                  <Phone
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: "rgba(255,0,80,0.6)" }}
                  />
                  <Input
                    data-ocid="auth.phone_input"
                    placeholder="+91 98765 43210"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="pl-9"
                    style={{
                      background: "rgba(255,0,60,0.08)",
                      border: "1px solid rgba(255,0,100,0.25)",
                      color: "white",
                    }}
                    autoComplete="tel"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label
                  className="text-sm"
                  style={{ color: "rgba(255,150,180,0.8)" }}
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: "rgba(255,0,80,0.6)" }}
                  />
                  <Input
                    data-ocid="auth.password_input"
                    type={showPass ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    value={regPass}
                    onChange={(e) => setRegPass(e.target.value)}
                    className="pl-9 pr-10"
                    style={{
                      background: "rgba(255,0,60,0.08)",
                      border: "1px solid rgba(255,0,100,0.25)",
                      color: "white",
                    }}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: "rgba(255,100,150,0.6)" }}
                    onClick={() => setShowPass((p) => !p)}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label
                  className="text-sm"
                  style={{ color: "rgba(255,150,180,0.8)" }}
                >
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: "rgba(255,0,80,0.6)" }}
                  />
                  <Input
                    type={showPass ? "text" : "password"}
                    placeholder="Repeat password"
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    className="pl-9"
                    style={{
                      background: "rgba(255,0,60,0.08)",
                      border: "1px solid rgba(255,0,100,0.25)",
                      color: "white",
                    }}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <Button
                data-ocid="auth.signup_button"
                type="submit"
                className="w-full font-semibold"
                style={{
                  background: "linear-gradient(135deg, #cc0044, #ff0066)",
                  boxShadow: "0 0 20px rgba(255,0,100,0.3)",
                }}
                disabled={loading}
              >
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>

      {/* WhatsApp Support Button - fixed bottom right */}
      <a
        href="https://wa.me/918511525411"
        target="_blank"
        rel="noopener noreferrer"
        data-ocid="auth.whatsapp_button"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl z-50 transition-transform hover:scale-110 active:scale-95"
        style={{
          background: "#25D366",
          boxShadow: "0 0 20px rgba(37,211,102,0.5)",
        }}
        aria-label="WhatsApp Support"
      >
        <span className="sr-only">WhatsApp Support</span>
        <svg
          viewBox="0 0 24 24"
          fill="white"
          className="w-7 h-7"
          aria-hidden="true"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>

      {/* Language Translation Widget - fixed bottom left */}
      <div className="fixed bottom-6 left-6 z-50">
        <AnimatePresence>
          {showTranslate && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="mb-3 w-72 rounded-2xl p-4 shadow-2xl"
              style={{
                background: "rgba(10,0,6,0.92)",
                border: "1px solid rgba(255,0,100,0.35)",
                backdropFilter: "blur(20px)",
                boxShadow: "0 0 30px rgba(255,0,100,0.2)",
              }}
            >
              <p
                className="text-xs font-semibold mb-2"
                style={{ color: "rgba(255,150,180,0.9)" }}
              >
                🌐 Translate to:
              </p>
              {/* Language selector */}
              <div className="flex gap-1 mb-3 flex-wrap">
                {(Object.keys(LANG_LABELS) as LangCode[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setTranslateLang(lang)}
                    className="px-2 py-1 rounded-lg text-xs font-medium transition-all"
                    style={
                      translateLang === lang
                        ? {
                            background:
                              "linear-gradient(135deg, #cc0044, #ff0066)",
                            color: "white",
                            boxShadow: "0 0 8px rgba(255,0,100,0.4)",
                          }
                        : {
                            background: "rgba(255,0,100,0.1)",
                            color: "rgba(255,150,180,0.7)",
                            border: "1px solid rgba(255,0,100,0.2)",
                          }
                    }
                  >
                    {LANG_LABELS[lang]}
                  </button>
                ))}
              </div>
              {/* Input area */}
              <div className="relative mb-2">
                <textarea
                  className="w-full rounded-xl p-3 pr-10 text-sm resize-none outline-none"
                  style={{
                    background: "rgba(255,0,60,0.08)",
                    border: "1px solid rgba(255,0,100,0.25)",
                    color: "white",
                    minHeight: "70px",
                  }}
                  placeholder="Type text to translate..."
                  value={translateInput}
                  onChange={(e) => setTranslateInput(e.target.value)}
                />
                <button
                  type="button"
                  onClick={toggleMic}
                  className="absolute right-2 top-2 w-7 h-7 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: recording
                      ? "rgba(255,0,0,0.7)"
                      : "rgba(255,0,100,0.2)",
                    border: "1px solid rgba(255,0,100,0.3)",
                  }}
                  title={recording ? "Stop recording" : "Speak to translate"}
                >
                  {recording ? (
                    <MicOff size={13} style={{ color: "white" }} />
                  ) : (
                    <Mic size={13} style={{ color: "rgba(255,150,180,0.8)" }} />
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={handleTranslate}
                disabled={translating || !translateInput.trim()}
                className="w-full py-2 rounded-xl text-xs font-semibold transition-all mb-2"
                style={{
                  background: translating
                    ? "rgba(255,0,100,0.3)"
                    : "linear-gradient(135deg, #cc0044, #ff0066)",
                  color: "white",
                  opacity: !translateInput.trim() ? 0.5 : 1,
                }}
              >
                {translating ? "Translating..." : "Translate"}
              </button>
              {translateResult && (
                <div
                  className="rounded-xl p-3 text-xs"
                  style={{
                    background: "rgba(255,0,100,0.06)",
                    border: "1px solid rgba(255,0,100,0.15)",
                    color: "rgba(255,220,230,0.9)",
                  }}
                >
                  {translateResult}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle button */}
        <button
          type="button"
          data-ocid="auth.translate_toggle"
          onClick={() => setShowTranslate((p) => !p)}
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95"
          style={{
            background: showTranslate
              ? "linear-gradient(135deg, #cc0044, #ff0066)"
              : "rgba(20,0,10,0.9)",
            border: "2px solid rgba(255,0,100,0.5)",
            boxShadow: "0 0 20px rgba(255,0,100,0.3)",
          }}
          aria-label="Language Translation"
        >
          <Globe
            size={22}
            style={{ color: showTranslate ? "white" : "rgba(255,100,150,0.9)" }}
          />
        </button>
      </div>

      <Toaster position="top-center" richColors />
    </motion.div>
  );
}
