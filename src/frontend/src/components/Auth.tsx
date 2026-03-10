import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { Eye, EyeOff, Lock, Mail, Phone, User } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { genId, loadFromStorage, saveToStorage } from "../App";
import type { User as UserType } from "../types";

interface AuthProps {
  onLogin: (user: UserType) => void;
}

type Mode = "login" | "register";

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

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #0a0a0a 0%, #1a0010 35%, #2d0020 60%, #120008 80%, #0a0a0a 100%)",
      }}
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
        transition={{ duration: 0.6 }}
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
        transition={{ duration: 0.4, delay: 0.1 }}
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
                    data-ocid="auth.email_input"
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

      <Toaster position="top-center" richColors />
    </div>
  );
}
