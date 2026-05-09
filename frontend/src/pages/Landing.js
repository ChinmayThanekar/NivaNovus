import { Link } from "react-router-dom";
import { useState } from "react";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ArrowRight, Home, Shield, Zap, Sparkles, Smartphone, Cpu, Mail, Phone, MapPin } from "lucide-react";

const features = [
  { icon: Home, title: "Whole-home control", desc: "Lights, AC, curtains, geyser — every room, one tap." },
  { icon: Shield, title: "Security suite", desc: "Smart locks, cameras, doorbell, gas & smoke sensors." },
  { icon: Zap, title: "Energy intelligence", desc: "Real-time usage, savings tips and automation." },
  { icon: Sparkles, title: "Cinematic scenes", desc: "Good Morning, Movie, Sleep & Away — instantly." },
  { icon: Smartphone, title: "Voice & app", desc: "Alexa, Google Home, iOS & Android PWA." },
  { icon: Cpu, title: "Tuya / Zigbee / WiFi", desc: "Works with the protocols you already trust." },
];

export default function Landing() {
  return (
    <div className="min-h-screen hero-grad text-white">
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-[#050A1F]/70 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <a href="#features" className="hover:text-gold transition" data-testid="nav-features">Features</a>
            <a href="#products" className="hover:text-gold transition" data-testid="nav-products">Products</a>
            <a href="#contact" className="hover:text-gold transition" data-testid="nav-contact">Contact</a>
          </nav>
          <Link to="/login">
            <Button data-testid="hero-login-btn" className="rounded-full bg-gold hover:bg-[#F3E5AB] text-[#050A1F] font-semibold px-6">
              Sign In <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </header>

      <section className="pt-40 pb-24 px-6 md:px-10 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-8 fade-up">
            <div className="label-cap text-gold">Premium Smart Home </div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight">
              Your home, <em className="text-gold">curated</em><br />
              by intelligence.
            </h1>
            <p className="text-lg text-white/70 max-w-xl leading-relaxed">
              Niva Novus is a premium smart-home automation platform — from white-glove installation
              to a control experience worthy of your home.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link to="/login">
                <Button data-testid="hero-cta-btn" size="lg" className="rounded-full bg-gold hover:bg-[#F3E5AB] text-[#050A1F] font-semibold px-8 h-12">
                  Open the App <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="outline" size="lg" className="rounded-full border-white/20 hover:border-gold/60 bg-transparent text-white h-12 px-8">
                  Explore Features
                </Button>
              </a>
            </div>
            <div className="grid grid-cols-3 gap-6 pt-8 max-w-md">
              <Stat n="2Yrs" l="Warranty" />
              <Stat n="50%" l="Pocket Friendly" />
              <Stat n="24/7" l="Support" />
            </div>
          </div>
          <div className="lg:col-span-5 fade-up fade-up-2">
            <div className="relative rounded-3xl overflow-hidden border border-white/10 glow-soft">
              <img src="https://images.pexels.com/photos/13722886/pexels-photo-13722886.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=720&w=940" alt="" className="w-full h-[520px] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050A1F] via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 surface-elev p-4 backdrop-blur-xl bg-[#0B132B]/70">
                <div className="label-cap text-gold mb-1">Living Room • Live</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-serif text-2xl">Movie Mode</div>
                    <div className="text-xs text-white/60">5 devices • 0.42 kWh</div>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-gold/20 grid place-items-center">
                    <Sparkles className="text-gold w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="px-6 md:px-10 max-w-7xl mx-auto py-20">
        <div className="mb-12">
          <div className="label-cap text-gold">Capabilities</div>
          <h2 className="font-serif text-4xl md:text-5xl mt-2">Everything, beautifully orchestrated.</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="surface p-7 hover-lift" data-testid={`feature-${i}`}>
              <div className="w-12 h-12 rounded-xl bg-gold/10 grid place-items-center mb-5">
                <f.icon className="text-gold w-5 h-5" />
              </div>
              <div className="font-serif text-2xl mb-2">{f.title}</div>
              <p className="text-white/60 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="px-6 md:px-10 max-w-7xl mx-auto py-20">
        <div className="grid lg:grid-cols-2 gap-10 items-stretch">
          <div className="surface p-8 md:p-12 flex flex-col justify-between">
            <div>
              <div className="label-cap text-gold">Get in touch</div>
              <h2 className="font-serif text-4xl md:text-5xl mt-3 mb-5">Let's design<br/>your home.</h2>
              <p className="text-white/60 max-w-md mb-10">Drop us a line. Our concierge team will reach out within 24 hours with a tailored consultation.</p>
            </div>
            <div className="space-y-4 text-white/70 text-sm">
              <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-gold"/>+91 9359156648</div>
              <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-gold"/>chinmaythanekar48@gmail.com</div>
              <div className="flex items-center gap-3"><MapPin className="w-4 h-4 text-gold"/>Nagpur · Pune </div>
            </div>
          </div>
          <EnquiryForm />
        </div>
      </section>

      <footer className="border-t border-white/5 py-10 px-6 md:px-10 max-w-7xl mx-auto text-white/40 text-sm flex flex-col md:flex-row justify-between gap-4">
        <div>© 2026 Niva Novus. All rights reserved.</div>
        <div className="flex gap-6"><span>Privacy</span><span>Terms</span><span> </span></div>
      </footer>
    </div>
  );
}

function Stat({ n, l }) {
  return (
    <div>
      <div className="font-serif text-3xl text-gold">{n}</div>
      <div className="label-cap mt-1">{l}</div>
    </div>
  );
}

function EnquiryForm() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) { toast.error("Name and phone are required"); return; }
    setBusy(true);
    try {
      await api.post("/leads/enquiry", form);
      toast.success("Enquiry received — we'll be in touch shortly");
      setDone(true);
      setForm({ name: "", phone: "", email: "", message: "" });
    } catch {
      toast.error("Could not submit. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  if (done) {
    return (
      <div className="surface p-8 md:p-12 flex flex-col items-center justify-center text-center" data-testid="enquiry-success">
        <div className="w-16 h-16 rounded-full bg-gold/15 grid place-items-center mb-5"><Sparkles className="w-7 h-7 text-gold"/></div>
        <h3 className="font-serif text-3xl mb-2">Thank you</h3>
        <p className="text-white/60 max-w-sm">Your enquiry has been received. A Niva Novus consultant will reach out within 24 hours.</p>
        <Button data-testid="enquiry-another-btn" variant="outline" onClick={()=>setDone(false)} className="rounded-full border-white/15 mt-8">Send another</Button>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="surface p-8 md:p-10 space-y-4" data-testid="enquiry-form">
      <div>
        <div className="label-cap text-gold mb-1">Enquiry</div>
        <h3 className="font-serif text-2xl">Request a consultation</h3>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label className="label-cap">Full name *</Label>
          <Input data-testid="enquiry-name" value={form.name} onChange={set("name")} placeholder="Your name" className="mt-2 bg-[#151C33] border-white/5 h-11 rounded-xl"/>
        </div>
        <div>
          <Label className="label-cap">Phone *</Label>
          <Input data-testid="enquiry-phone" value={form.phone} onChange={set("phone")} placeholder="+91 ..." className="mt-2 bg-[#151C33] border-white/5 h-11 rounded-xl"/>
        </div>
      </div>
      <div>
        <Label className="label-cap">Email</Label>
        <Input data-testid="enquiry-email" value={form.email} onChange={set("email")} placeholder="you@email.com" className="mt-2 bg-[#151C33] border-white/5 h-11 rounded-xl"/>
      </div>
      <div>
        <Label className="label-cap">Tell us about your home</Label>
        <Textarea data-testid="enquiry-message" value={form.message} onChange={set("message")} placeholder="3BHK in Mumbai — interested in lighting, AC & security..." className="mt-2 bg-[#151C33] border-white/5 rounded-xl"/>
      </div>
      <Button data-testid="enquiry-submit" type="submit" disabled={busy} className="w-full rounded-full bg-gold hover:bg-[#F3E5AB] text-[#050A1F] font-semibold h-12">
        {busy ? "Sending..." : "Submit enquiry"} <ArrowRight className="ml-2 w-4 h-4"/>
      </Button>
      <p className="text-[11px] text-white/40 text-center">By submitting, you agree to our privacy policy. No spam, ever.</p>
    </form>
  );
}
