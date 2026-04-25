import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Logo from "@/components/Logo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ArrowRight, Smartphone, Mail, Wrench, ShieldCheck } from "lucide-react";

export default function Login() {
  return (
    <div className="min-h-screen hero-grad grid lg:grid-cols-2">
      <div className="hidden lg:block relative">
        <img src="https://images.pexels.com/photos/12306417/pexels-photo-12306417.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=940" alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#050A1F] via-[#050A1F]/60 to-transparent" />
        <div className="relative h-full flex flex-col justify-between p-12">
          <Link to="/"><Logo size={44} /></Link>
          <div>
            <div className="label-cap text-gold mb-3">Welcome back</div>
            <h2 className="font-serif text-5xl leading-tight">A more refined<br/>way to live.</h2>
            <p className="mt-6 text-white/60 max-w-md">Sign in to control your home, manage installations or run the company.</p>
          </div>
          <div className="text-white/30 text-sm">© 2026 Niva Novus</div>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md surface p-8 fade-up">
          <div className="lg:hidden mb-8 flex justify-center"><Logo /></div>
          <div className="label-cap text-gold mb-2">Sign In</div>
          <h1 className="font-serif text-3xl mb-1">Choose your portal</h1>
          <p className="text-white/50 text-sm mb-6">Three apps in one. Pick your role.</p>
          <Tabs defaultValue="customer" className="w-full">
            <TabsList className="grid grid-cols-3 mb-6 bg-[#151C33] border border-white/5">
              <TabsTrigger value="customer" data-testid="tab-customer"><Smartphone className="w-4 h-4 mr-1.5"/>Customer</TabsTrigger>
              <TabsTrigger value="tech" data-testid="tab-technician"><Wrench className="w-4 h-4 mr-1.5"/>Tech</TabsTrigger>
              <TabsTrigger value="admin" data-testid="tab-admin"><ShieldCheck className="w-4 h-4 mr-1.5"/>Admin</TabsTrigger>
            </TabsList>
            <TabsContent value="customer"><CustomerLogin /></TabsContent>
            <TabsContent value="tech"><EmailLogin role="technician" demoEmail="tech@nivanovus.com" demoPw="tech123" testid="tech" /></TabsContent>
            <TabsContent value="admin"><EmailLogin role="admin" demoEmail="admin@nivanovus.com" demoPw="admin123" testid="admin" /></TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function CustomerLogin() {
  const { sendOtp, verifyOtp } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("+919999900001");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    try { await sendOtp(phone); toast.success("OTP sent — use 123456 for demo"); setStep(2); }
    catch (e) { toast.error("Failed to send OTP"); } finally { setBusy(false); }
  };

  const verify = async () => {
    setBusy(true);
    try { await verifyOtp(phone, otp); toast.success("Welcome to Niva Novus"); nav("/app"); }
    catch (e) { toast.error("Invalid OTP"); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="label-cap">Mobile Number</Label>
        <Input data-testid="customer-phone-input" value={phone} onChange={(e)=>setPhone(e.target.value)} disabled={step===2} className="mt-2 bg-[#151C33] border-white/5 h-12 rounded-xl" placeholder="+91 99999 00001" />
      </div>
      {step === 2 && (
        <div className="fade-up">
          <Label className="label-cap">OTP Code <span className="text-gold normal-case tracking-normal ml-2">(use 123456)</span></Label>
          <Input data-testid="customer-otp-input" value={otp} onChange={(e)=>setOtp(e.target.value)} className="mt-2 bg-[#151C33] border-white/5 h-12 rounded-xl tracking-[0.5em] text-center text-lg" placeholder="••••••" maxLength={6}/>
        </div>
      )}
      {step === 1 ? (
        <Button data-testid="customer-send-otp-btn" onClick={send} disabled={busy} className="w-full bg-gold hover:bg-[#F3E5AB] text-[#050A1F] font-semibold h-12 rounded-full">
          {busy ? "Sending..." : "Send OTP"} <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      ) : (
        <Button data-testid="customer-verify-otp-btn" onClick={verify} disabled={busy || otp.length<6} className="w-full bg-gold hover:bg-[#F3E5AB] text-[#050A1F] font-semibold h-12 rounded-full">
          {busy ? "Verifying..." : "Verify & Sign In"} <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      )}
      <div className="text-center text-xs text-white/40">Demo: phone <span className="text-gold">+919999900001</span> · OTP <span className="text-gold">123456</span></div>
    </div>
  );
}

function EmailLogin({ role, demoEmail, demoPw, testid }) {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState(demoEmail);
  const [pw, setPw] = useState(demoPw);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(email, pw);
      if (u.role !== role) { toast.error(`Not a ${role} account`); return; }
      toast.success(`Welcome ${u.name}`);
      nav(role === "admin" ? "/admin" : "/tech");
    } catch (err) { toast.error("Invalid credentials"); }
    finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label className="label-cap">Email</Label>
        <Input data-testid={`${testid}-email-input`} value={email} onChange={(e)=>setEmail(e.target.value)} className="mt-2 bg-[#151C33] border-white/5 h-12 rounded-xl" />
      </div>
      <div>
        <Label className="label-cap">Password</Label>
        <Input data-testid={`${testid}-password-input`} type="password" value={pw} onChange={(e)=>setPw(e.target.value)} className="mt-2 bg-[#151C33] border-white/5 h-12 rounded-xl" />
      </div>
      <Button data-testid={`${testid}-submit-btn`} type="submit" disabled={busy} className="w-full bg-gold hover:bg-[#F3E5AB] text-[#050A1F] font-semibold h-12 rounded-full">
        {busy ? "Signing in..." : "Sign In"} <ArrowRight className="ml-2 w-4 h-4" />
      </Button>
      <div className="text-center text-xs text-white/40"><Mail className="inline w-3 h-3 mr-1"/>{demoEmail} · {demoPw}</div>
    </form>
  );
}
