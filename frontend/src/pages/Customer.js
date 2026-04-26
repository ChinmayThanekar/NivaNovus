import { useEffect, useState } from "react";
import { Routes, Route, NavLink, useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { Home, Lightbulb, Wind, Snowflake, Lock, Camera, Bell, Zap, Sparkles, LogOut, Settings, MessageCircle, Calendar, CreditCard, Wrench, Sun, Moon, Film, Shield, Plug, Tv, Flame, Droplets, ArrowRight, Plus } from "lucide-react";

const iconFor = (type) => ({ light: Lightbulb, fan: Wind, ac: Snowflake, lock: Lock, cctv: Camera, doorbell: Bell, plug: Plug, curtain: Tv, geyser: Flame, smoke: Flame, gas: Droplets }[type] || Plug);
const sceneIcon = (n) => ({ "Good Morning": Sun, "Movie Mode": Film, "Sleep Mode": Moon, "Away Mode": Shield }[n] || Sparkles);

export default function Customer() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <div className="min-h-screen pb-24 max-w-md mx-auto bg-[#050A1F]">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#050A1F]/80 border-b border-white/5 px-5 py-4 flex items-center justify-between">
        <Logo size={32} />
        <div className="flex items-center gap-2">
          <Button data-testid="logout-btn" size="icon" variant="ghost" className="rounded-full hover:bg-white/5" onClick={()=>{logout(); nav("/");}}><LogOut className="w-4 h-4 text-white/60"/></Button>
        </div>
      </header>
      <Routes>
        <Route index element={<Dashboard user={user} />} />
        <Route path="scenes" element={<Scenes />} />
        <Route path="energy" element={<Energy />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="profile" element={<Profile user={user} logout={()=>{logout(); nav("/");}} />} />
        <Route path="billing" element={<Billing />} />
        <Route path="service" element={<Service />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

function BottomNav() {
  const items = [
    { to: "/app", icon: Home, label: "Home" },
    { to: "/app/scenes", icon: Sparkles, label: "Scenes" },
    { to: "/app/energy", icon: Zap, label: "Energy" },
    { to: "/app/alerts", icon: Bell, label: "Alerts" },
    { to: "/app/profile", icon: Settings, label: "Me" },
  ];
  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-1 backdrop-blur-2xl bg-[#0B132B]/80 border border-white/10 rounded-full p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      {items.map((it) => (
        <NavLink key={it.to} to={it.to} end data-testid={`nav-${it.label.toLowerCase()}`}
          className={({isActive}) => `flex flex-col items-center justify-center px-4 py-2 rounded-full text-[10px] transition ${isActive ? "bg-gold text-[#050A1F]" : "text-white/60 hover:text-white"}`}>
          <it.icon className="w-4 h-4 mb-0.5" />
          {it.label}
        </NavLink>
      ))}
    </nav>
  );
}

function Dashboard({ user }) {
  const [rooms, setRooms] = useState([]);
  const [devices, setDevices] = useState([]);
  const [scenes, setScenes] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);

  const load = async () => {
    const [r, d, s] = await Promise.all([api.get("/rooms"), api.get("/devices"), api.get("/scenes")]);
    setRooms(r.data); setDevices(d.data); setScenes(s.data);
    if (r.data.length && !activeRoom) setActiveRoom(r.data[0].id);
  };
  useEffect(() => { load(); }, [[load]]);

  const filtered = activeRoom ? devices.filter(d => d.room_id === activeRoom) : devices;
  const onlineCount = devices.filter(d => d.online).length;

  const command = async (id, state) => {
    try {
      const r = await api.post(`/devices/${id}/command`, { state });
      setDevices(prev => prev.map(d => d.id === id ? { ...d, state: r.data.state } : d));
    } catch { toast.error("Command failed"); }
  };

  const runScene = async (s) => {
    try { await api.post(`/scenes/${s.id}/execute`); toast.success(`${s.name} activated`); await load(); }
    catch { toast.error("Scene failed"); }
  };

  return (
    <div className="px-5 pt-4 space-y-6 fade-up">
      <div>
        <div className="label-cap text-gold">Welcome</div>
        <h1 className="font-serif text-3xl mt-1">Hello, {(user?.name || "").split(" ")[0] || "Guest"}</h1>
        <div className="text-white/50 text-sm mt-1">{onlineCount} of {devices.length} devices online</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-[#0B132B] border-white/5 p-4 rounded-2xl">
          <div className="label-cap mb-1">Power Now</div>
          <div className="font-serif text-2xl text-gold">{(devices.filter(d=>d.state?.on).reduce((s,d)=>s+(d.power_w||0),0)/1000).toFixed(2)} kW</div>
        </Card>
        <Card className="bg-[#0B132B] border-white/5 p-4 rounded-2xl">
          <div className="label-cap mb-1">Active Scenes</div>
          <div className="font-serif text-2xl text-gold">{scenes.length}</div>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="label-cap text-gold">Quick Scenes</div>
          <Link to="/app/scenes" className="text-xs text-white/50">All →</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5">
          {scenes.slice(0,4).map(s => {
            const Ic = sceneIcon(s.name);
            return (
              <button key={s.id} data-testid={`scene-${s.name.replace(/\s/g,'-').toLowerCase()}`} onClick={()=>runScene(s)} className="min-w-[140px] bg-[#0B132B] border border-white/5 rounded-2xl p-4 text-left hover-lift">
                <div className="w-10 h-10 rounded-xl bg-gold/10 grid place-items-center mb-3">
                  <Ic className="w-5 h-5 text-gold" />
                </div>
                <div className="font-serif text-lg">{s.name}</div>
                <div className="text-xs text-white/50 mt-1">{s.actions.length} actions</div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="label-cap text-gold">Rooms</div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {rooms.map(r => (
            <button key={r.id} data-testid={`room-${r.name.replace(/\s/g,'-').toLowerCase()}`} onClick={()=>setActiveRoom(r.id)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap border transition ${activeRoom===r.id ? "bg-gold text-[#050A1F] border-gold" : "border-white/10 text-white/70"}`}>
              {r.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {filtered.map(d => <DeviceCard key={d.id} device={d} onCommand={command} />)}
      </div>
    </div>
  );
}

function DeviceCard({ device, onCommand }) {
  const Ic = iconFor(device.type);
  const isOn = device.type === "lock" ? device.state?.locked : (device.state?.on ?? false);
  const toggleable = ["light","fan","ac","plug","geyser","cctv","doorbell"].includes(device.type);
  const handleToggle = (v) => {
    if (device.type === "lock") onCommand(device.id, { locked: v });
    else onCommand(device.id, { on: v });
  };
  return (
    <div data-testid={`device-${device.id}`} className={`rounded-2xl p-4 transition border ${isOn ? "bg-[#151C33] border-gold/40 glow-gold" : "bg-[#0B132B] border-white/5"}`}>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl grid place-items-center ${isOn ? "bg-gold text-[#050A1F]" : "bg-white/5 text-white/60"}`}>
          <Ic className="w-4 h-4" />
        </div>
        {toggleable || device.type === "lock" ? (
          <Switch data-testid={`switch-${device.id}`} checked={!!isOn} onCheckedChange={handleToggle} />
        ) : (
          <Badge variant="outline" className={device.state?.alert ? "border-red-500 text-red-400" : "border-white/10 text-white/50"}>
            {device.state?.alert ? "ALERT" : "OK"}
          </Badge>
        )}
      </div>
      <div className="mt-4">
        <div className="text-sm font-medium">{device.name}</div>
        <div className="text-xs text-white/40 mt-0.5 flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${device.online ? "bg-green-400 pulse-dot" : "bg-white/20"}`}/>
          {device.online ? "Online" : "Offline"}
          {device.state?.brightness !== undefined && isOn && ` · ${device.state.brightness}%`}
          {device.state?.temp !== undefined && device.type==="ac" && ` · ${device.state.temp}°C`}
          {device.state?.speed !== undefined && device.type==="fan" && ` · S${device.state.speed}`}
        </div>
      </div>
      {isOn && device.type === "light" && (
        <div className="mt-3"><Slider data-testid={`brightness-${device.id}`} value={[device.state?.brightness ?? 70]} max={100} step={5} onValueChange={(v)=>onCommand(device.id, { brightness: v[0] })}/></div>
      )}
      {isOn && device.type === "ac" && (
        <div className="mt-3 flex items-center justify-between text-xs">
          <button data-testid={`ac-down-${device.id}`} onClick={()=>onCommand(device.id, { temp: Math.max(16, (device.state?.temp ?? 24)-1) })} className="w-7 h-7 rounded-full bg-white/5">−</button>
          <span className="text-gold font-mono">{device.state?.temp ?? 24}°C</span>
          <button data-testid={`ac-up-${device.id}`} onClick={()=>onCommand(device.id, { temp: Math.min(30, (device.state?.temp ?? 24)+1) })} className="w-7 h-7 rounded-full bg-white/5">+</button>
        </div>
      )}
    </div>
  );
}

function Scenes() {
  const [scenes, setScenes] = useState([]);
  useEffect(() => { api.get("/scenes").then(r => setScenes(r.data)); }, []);
  const run = async (s) => { try { await api.post(`/scenes/${s.id}/execute`); toast.success(`${s.name} activated`); } catch { toast.error("Failed"); } };
  return (
    <div className="px-5 pt-4 space-y-5 fade-up">
      <h1 className="font-serif text-3xl">Scenes</h1>
      <div className="grid grid-cols-1 gap-4">
        {scenes.map(s => {
          const Ic = sceneIcon(s.name);
          return (
            <Card key={s.id} className="bg-[#0B132B] border-white/5 p-5 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gold/10 grid place-items-center"><Ic className="w-5 h-5 text-gold" /></div>
                <div>
                  <div className="font-serif text-xl">{s.name}</div>
                  <div className="text-xs text-white/50">{s.actions.length} actions</div>
                </div>
              </div>
              <Button data-testid={`run-scene-${s.id}`} onClick={()=>run(s)} className="rounded-full bg-gold hover:bg-[#F3E5AB] text-[#050A1F]">Activate</Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Energy() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/energy/summary").then(r => setData(r.data)); }, []);
  if (!data) return <div className="px-5 pt-6 text-white/50">Loading...</div>;
  return (
    <div className="px-5 pt-4 space-y-5 fade-up">
      <h1 className="font-serif text-3xl">Energy</h1>
      <Card className="bg-[#0B132B] border-white/5 p-5 rounded-2xl">
        <div className="label-cap mb-1">Today</div>
        <div className="font-serif text-4xl text-gold">{data.today_kwh} kWh</div>
        <div className="text-xs text-green-400 mt-1">↓ {data.savings_pct}% saved this week</div>
      </Card>
      <Card className="bg-[#0B132B] border-white/5 p-5 rounded-2xl">
        <div className="label-cap mb-3">Last 7 Days</div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data.week}>
            <defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D4AF37" stopOpacity={0.6}/><stop offset="100%" stopColor="#D4AF37" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false}/>
            <XAxis dataKey="day" stroke="#8A95A5" fontSize={11}/>
            <YAxis stroke="#8A95A5" fontSize={11}/>
            <Tooltip contentStyle={{background:"#0B132B", border:"1px solid rgba(212,175,55,0.3)", borderRadius:8}}/>
            <Area type="monotone" dataKey="kwh" stroke="#D4AF37" strokeWidth={2} fill="url(#g2)"/>
          </AreaChart>
        </ResponsiveContainer>
      </Card>
      <Card className="bg-[#0B132B] border-white/5 p-5 rounded-2xl">
        <div className="label-cap mb-3">By Room</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.by_room}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false}/>
            <XAxis dataKey="room" stroke="#8A95A5" fontSize={11}/>
            <YAxis stroke="#8A95A5" fontSize={11}/>
            <Tooltip contentStyle={{background:"#0B132B", border:"1px solid rgba(212,175,55,0.3)", borderRadius:8}}/>
            <Bar dataKey="kwh" fill="#D4AF37" radius={[8,8,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

function Alerts() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/notifications").then(r => setItems(r.data)); }, []);
  const mark = async (id) => { await api.post(`/notifications/${id}/read`); setItems(prev => prev.map(n => n.id===id ? {...n, read:true}:n)); };
  return (
    <div className="px-5 pt-4 space-y-4 fade-up">
      <h1 className="font-serif text-3xl">Alerts</h1>
      {items.map(n => (
        <Card key={n.id} data-testid={`notif-${n.id}`} className={`p-4 rounded-2xl bg-[#0B132B] border-white/5 ${!n.read ? "border-gold/30":""}`} onClick={()=>mark(n.id)}>
          <div className="flex items-start gap-3">
            <div className={`w-2 h-2 rounded-full mt-2 ${!n.read ? "bg-gold pulse-dot":"bg-white/20"}`}/>
            <div className="flex-1">
              <div className="font-medium">{n.title}</div>
              <div className="text-xs text-white/60 mt-0.5">{n.body}</div>
              <div className="text-[10px] text-white/30 mt-1.5 uppercase tracking-widest">{n.type}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Profile({ user, logout }) {
  return (
    <div className="px-5 pt-4 space-y-4 fade-up">
      <h1 className="font-serif text-3xl">My Account</h1>
      <Card className="bg-[#0B132B] border-white/5 p-5 rounded-2xl">
        <div className="font-serif text-2xl">{user?.name}</div>
        <div className="text-sm text-white/50">{user?.email} · {user?.phone}</div>
      </Card>
      <Link to="/app/billing" data-testid="link-billing"><Card className="bg-[#0B132B] border-white/5 p-4 rounded-2xl flex items-center justify-between hover-lift"><div className="flex items-center gap-3"><CreditCard className="w-5 h-5 text-gold"/><span>Billing & AMC</span></div><ArrowRight className="w-4 h-4 text-white/40"/></Card></Link>
      <Link to="/app/service" data-testid="link-service"><Card className="bg-[#0B132B] border-white/5 p-4 rounded-2xl flex items-center justify-between hover-lift"><div className="flex items-center gap-3"><Wrench className="w-5 h-5 text-gold"/><span>Service & Support</span></div><ArrowRight className="w-4 h-4 text-white/40"/></Card></Link>
      <Card className="bg-[#0B132B] border-white/5 p-4 rounded-2xl flex items-center justify-between"><div className="flex items-center gap-3"><Sparkles className="w-5 h-5 text-gold"/><span>Alexa & Google Home</span></div><Switch defaultChecked/></Card>
      <Button data-testid="profile-logout-btn" variant="outline" onClick={logout} className="w-full border-white/10 rounded-full"><LogOut className="w-4 h-4 mr-2"/>Sign Out</Button>
    </div>
  );
}

function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [amc, setAmc] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [i, a] = await Promise.all([api.get("/invoices"), api.get("/amc")]);
    setInvoices(i.data); setAmc(a.data);
  };
  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session_id");
    if (sid) {
      poll(sid, 0);
      window.history.replaceState({}, "", "/app/billing");
    }
  }, [poll]);

  const poll = async (sid, attempts) => {
    if (attempts >= 8) return;
    try {
      const r = await api.get(`/payments/checkout/status/${sid}`);
      if (r.data.payment_status === "paid") { toast.success("Payment successful!"); load(); return; }
      if (r.data.status === "expired") { toast.error("Payment expired"); return; }
      setTimeout(()=>poll(sid, attempts+1), 2000);
    } catch { setTimeout(()=>poll(sid, attempts+1), 2000); }
  };

  const checkout = async (body) => {
    setBusy(true);
    try {
      const origin = window.location.origin;
      const r = await api.post("/payments/checkout/session", { ...body, origin_url: `${origin}/app` });
      window.location.href = r.data.url;
    } catch (e) { toast.error("Checkout failed"); setBusy(false); }
  };

  return (
    <div className="px-5 pt-4 space-y-5 fade-up">
      <h1 className="font-serif text-3xl">Billing</h1>
      <div>
        <div className="label-cap mb-3">Annual Maintenance Contract</div>
        <div className="grid gap-3">
          {[{id:"amc_basic",name:"Basic",price:"₹2,999",f:["Phone support","2 service visits"]},{id:"amc_premium",name:"Premium",price:"₹5,999",f:["Priority support","5 visits","Free firmware"]},{id:"amc_elite",name:"Elite",price:"₹9,999",f:["24/7 dedicated","Unlimited visits","Hardware replacement"]}].map(p => (
            <Card key={p.id} className="bg-[#0B132B] border-white/5 p-4 rounded-2xl">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-serif text-xl">{p.name} <span className="text-gold">{p.price}</span></div>
                  <div className="text-xs text-white/50 mt-1">{p.f.join(" · ")}</div>
                </div>
                <Button data-testid={`subscribe-${p.id}`} disabled={busy} onClick={()=>checkout({package_id:p.id})} className="rounded-full bg-gold text-[#050A1F]">Subscribe</Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
      <div>
        <div className="label-cap mb-3">Active Plan</div>
        {amc.length ? amc.map(a => (
          <Card key={a.id} className="bg-[#0B132B] border-gold/30 p-4 rounded-2xl">
            <div className="font-serif text-lg">{a.plan.toUpperCase()}</div>
            <div className="text-xs text-white/50">Expires {new Date(a.end_date).toLocaleDateString()}</div>
          </Card>
        )) : <div className="text-white/40 text-sm">No active plan</div>}
      </div>
      <div>
        <div className="label-cap mb-3">Invoices</div>
        {invoices.map(i => (
          <Card key={i.id} className="bg-[#0B132B] border-white/5 p-4 rounded-2xl mb-2 flex justify-between items-center">
            <div>
              <div className="text-sm font-mono">{i.number}</div>
              <div className="text-xs text-white/50">{i.description}</div>
              <div className="text-gold font-serif text-lg">₹{i.amount.toLocaleString()}</div>
            </div>
            {i.status === "paid" ? <Badge className="bg-green-500/20 text-green-400 border-0">Paid</Badge> :
              <Button data-testid={`pay-${i.id}`} onClick={()=>checkout({invoice_id:i.id})} disabled={busy} className="rounded-full bg-gold text-[#050A1F]">Pay Now</Button>}
          </Card>
        ))}
      </div>
    </div>
  );
}

function Service() {
  const [tickets, setTickets] = useState([]);
  const [open, setOpen] = useState(false);
  const [subj, setSubj] = useState(""); const [desc, setDesc] = useState(""); const [pri, setPri] = useState("medium");

  const load = () => api.get("/tickets").then(r=>setTickets(r.data));
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!subj) return;
    await api.post("/tickets", { subject: subj, description: desc, priority: pri });
    toast.success("Ticket raised"); setOpen(false); setSubj(""); setDesc(""); load();
  };

  return (
    <div className="px-5 pt-4 space-y-5 fade-up">
      <div className="flex justify-between items-center">
        <h1 className="font-serif text-3xl">Service</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="new-ticket-btn" className="rounded-full bg-gold text-[#050A1F]"><Plus className="w-4 h-4 mr-1"/>New</Button></DialogTrigger>
          <DialogContent className="bg-[#0B132B] border-white/10">
            <DialogHeader><DialogTitle className="font-serif text-2xl">Raise a ticket</DialogTitle></DialogHeader>
            <Input data-testid="ticket-subject" placeholder="Subject" value={subj} onChange={e=>setSubj(e.target.value)} className="bg-[#151C33] border-white/5"/>
            <Textarea data-testid="ticket-desc" placeholder="Describe the issue..." value={desc} onChange={e=>setDesc(e.target.value)} className="bg-[#151C33] border-white/5"/>
            <Select value={pri} onValueChange={setPri}>
              <SelectTrigger className="bg-[#151C33] border-white/5"><SelectValue/></SelectTrigger>
              <SelectContent className="bg-[#0B132B] border-white/10"><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent>
            </Select>
            <DialogFooter><Button data-testid="ticket-submit" onClick={submit} className="rounded-full bg-gold text-[#050A1F]">Submit</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-3">
        {tickets.map(t => (
          <Card key={t.id} className="bg-[#0B132B] border-white/5 p-4 rounded-2xl">
            <div className="flex justify-between">
              <div className="font-medium">{t.subject}</div>
              <Badge className={`${t.status==="open"?"bg-amber-500/20 text-amber-300":t.status==="resolved"?"bg-green-500/20 text-green-300":"bg-blue-500/20 text-blue-300"} border-0`}>{t.status}</Badge>
            </div>
            <div className="text-xs text-white/50 mt-1">{t.description}</div>
            <div className="text-[10px] text-white/30 mt-2 uppercase tracking-widest">{t.priority} · {new Date(t.created_at).toLocaleDateString()}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
