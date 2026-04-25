import { useEffect, useState } from "react";
import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { LogOut, Users, Cpu, AlertCircle, IndianRupee, TrendingUp, Briefcase, Package, FileText, MessageSquare, LayoutDashboard, Lightbulb } from "lucide-react";

const NAV = [
  { to: "/admin", icon: LayoutDashboard, label: "Overview" },
  { to: "/admin/leads", icon: TrendingUp, label: "Leads" },
  { to: "/admin/customers", icon: Users, label: "Customers" },
  { to: "/admin/devices", icon: Cpu, label: "Devices" },
  { to: "/admin/tickets", icon: AlertCircle, label: "Tickets" },
  { to: "/admin/inventory", icon: Package, label: "Inventory" },
  { to: "/admin/invoices", icon: FileText, label: "Invoices" },
  { to: "/admin/chat", icon: MessageSquare, label: "Support" },
];

export default function Admin() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <div className="min-h-screen flex bg-[#050A1F]">
      <aside className="w-64 border-r border-white/5 bg-[#0B132B] sticky top-0 h-screen p-5 hidden lg:flex flex-col">
        <Logo />
        <nav className="mt-10 flex-1 space-y-1">
          {NAV.map(it => (
            <NavLink key={it.to} to={it.to} end data-testid={`admin-nav-${it.label.toLowerCase()}`}
              className={({isActive}) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${isActive ? "bg-gold/15 text-gold" : "text-white/60 hover:bg-white/5 hover:text-white"}`}>
              <it.icon className="w-4 h-4"/>{it.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/5 pt-4 mt-4">
          <div className="text-sm">{user?.name}</div>
          <div className="text-xs text-white/40">{user?.email}</div>
          <Button data-testid="admin-logout" variant="ghost" className="w-full mt-2 justify-start" onClick={()=>{logout(); nav("/");}}><LogOut className="w-4 h-4 mr-2"/>Sign out</Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-6 lg:p-10">
        <div className="lg:hidden flex items-center justify-between mb-6">
          <Logo />
          <Button variant="ghost" size="icon" onClick={()=>{logout(); nav("/");}}><LogOut className="w-4 h-4"/></Button>
        </div>
        <Routes>
          <Route index element={<Overview/>}/>
          <Route path="leads" element={<Leads/>}/>
          <Route path="customers" element={<Customers/>}/>
          <Route path="devices" element={<DevicesMonitor/>}/>
          <Route path="tickets" element={<Tickets/>}/>
          <Route path="inventory" element={<Inventory/>}/>
          <Route path="invoices" element={<Invoices/>}/>
          <Route path="chat" element={<Support/>}/>
        </Routes>
      </main>
    </div>
  );
}

function KPI({ icon: Ic, label, value, sub, testid }) {
  return (
    <Card className="bg-[#0B132B] border-white/5 p-5 rounded-2xl" data-testid={testid}>
      <div className="flex justify-between items-start">
        <div className="label-cap">{label}</div>
        <Ic className="w-4 h-4 text-gold"/>
      </div>
      <div className="font-serif text-3xl mt-2">{value}</div>
      {sub && <div className="text-xs text-white/40 mt-1">{sub}</div>}
    </Card>
  );
}

function Overview() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/analytics/overview").then(r=>setData(r.data)); }, []);
  if (!data) return <div className="text-white/50">Loading...</div>;
  const colors = ["#D4AF37","#5680FF","#22C55E","#A78BFA","#EF4444"];
  return (
    <div className="space-y-6 fade-up">
      <div>
        <div className="label-cap text-gold">Command Center</div>
        <h1 className="font-serif text-4xl mt-1">Operations Overview</h1>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon={Users} label="Customers" value={data.customers} sub="Active accounts" testid="kpi-customers"/>
        <KPI icon={Cpu} label="Devices" value={data.devices} sub={`${data.devices_online} online`} testid="kpi-devices"/>
        <KPI icon={AlertCircle} label="Open Tickets" value={data.open_tickets} sub="Needs attention" testid="kpi-tickets"/>
        <KPI icon={IndianRupee} label="Revenue MTD" value={`₹${(data.revenue_paid/1000).toFixed(0)}k`} sub={`₹${(data.revenue_pending/1000).toFixed(0)}k pending`} testid="kpi-revenue"/>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-[#0B132B] border-white/5 p-6 rounded-2xl">
          <div className="label-cap mb-4">Revenue (last 6 months)</div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.revenue_trend}>
              <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D4AF37" stopOpacity={0.5}/><stop offset="100%" stopColor="#D4AF37" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false}/>
              <XAxis dataKey="month" stroke="#8A95A5" fontSize={11}/>
              <YAxis stroke="#8A95A5" fontSize={11}/>
              <Tooltip contentStyle={{background:"#0B132B", border:"1px solid rgba(212,175,55,0.3)"}}/>
              <Area type="monotone" dataKey="revenue" stroke="#D4AF37" fill="url(#rg)" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="bg-[#0B132B] border-white/5 p-6 rounded-2xl">
          <div className="label-cap mb-4">Leads Pipeline</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.leads_pipeline} dataKey="count" nameKey="stage" innerRadius={60} outerRadius={90} paddingAngle={2}>
                {data.leads_pipeline.map((_,i) => <Cell key={i} fill={colors[i%colors.length]}/>)}
              </Pie>
              <Tooltip contentStyle={{background:"#0B132B", border:"1px solid rgba(212,175,55,0.3)"}}/>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 text-xs">
            {data.leads_pipeline.map((l,i) => (
              <div key={l.stage} className="flex justify-between"><span className="capitalize text-white/60"><span className="inline-block w-2 h-2 rounded-full mr-2" style={{background:colors[i]}}/>{l.stage}</span><span>{l.count}</span></div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function DataTable({ rows, columns, title, testid, action }) {
  return (
    <div className="space-y-4 fade-up">
      <div className="flex justify-between items-center">
        <h1 className="font-serif text-3xl">{title}</h1>
        {action}
      </div>
      <Card className="bg-[#0B132B] border-white/5 rounded-2xl overflow-hidden" data-testid={testid}>
        <Table>
          <TableHeader><TableRow className="border-white/5 hover:bg-transparent">{columns.map(c => <TableHead key={c.k} className="text-white/50 uppercase text-[10px] tracking-widest">{c.label}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {rows.map((r,i) => (
              <TableRow key={i} className="border-white/5 hover:bg-white/5">
                {columns.map(c => <TableCell key={c.k}>{c.render ? c.render(r) : r[c.k]}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function Leads() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/leads").then(r=>setRows(r.data)); }, []);
  const cols = [
    { k: "name", label: "Name" },
    { k: "phone", label: "Phone" },
    { k: "source", label: "Source" },
    { k: "interest", label: "Interest" },
    { k: "value", label: "Value", render: r => `₹${(r.value/1000).toFixed(0)}k` },
    { k: "status", label: "Status", render: r => <Badge className={`${r.status==="won"?"bg-green-500/20 text-green-300":r.status==="lost"?"bg-red-500/20 text-red-300":"bg-gold/20 text-gold"} border-0 capitalize`}>{r.status}</Badge> },
  ];
  return <DataTable rows={rows} columns={cols} title="Lead Management" testid="leads-table"/>;
}

function Customers() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/customers").then(r=>setRows(r.data)); }, []);
  const cols = [
    { k: "name", label: "Name" },
    { k: "email", label: "Email" },
    { k: "phone", label: "Phone" },
    { k: "created_at", label: "Joined", render: r => new Date(r.created_at).toLocaleDateString() },
  ];
  return <DataTable rows={rows} columns={cols} title="Customer Database" testid="customers-table"/>;
}

function DevicesMonitor() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    const load = () => api.get("/devices").then(r=>setRows(r.data));
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);
  const cols = [
    { k: "name", label: "Device" },
    { k: "type", label: "Type", render: r => <span className="capitalize">{r.type}</span> },
    { k: "vendor", label: "Vendor" },
    { k: "firmware", label: "FW" },
    { k: "online", label: "Status", render: r => <span className="flex items-center gap-2 text-xs"><span className={`w-2 h-2 rounded-full ${r.online?"bg-green-400":"bg-red-400"}`}/>{r.online?"Online":"Offline"}</span> },
    { k: "power_w", label: "Power", render: r => `${r.power_w}W` },
    { k: "state", label: "State", render: r => <span className="font-mono text-xs text-white/60">{JSON.stringify(r.state).slice(0,40)}</span> },
  ];
  return <DataTable rows={rows} columns={cols} title="Live Device Monitor" testid="devices-table"/>;
}

function Tickets() {
  const [rows, setRows] = useState([]);
  const load = () => api.get("/tickets").then(r=>setRows(r.data));
  useEffect(() => { load(); }, []);
  const update = async (id, status) => { await api.patch(`/tickets/${id}`, { status }); load(); };
  const cols = [
    { k: "subject", label: "Subject" },
    { k: "user_name", label: "Customer" },
    { k: "priority", label: "Priority", render: r => <Badge className={`${r.priority==="high"?"bg-red-500/20 text-red-300":r.priority==="medium"?"bg-amber-500/20 text-amber-300":"bg-blue-500/20 text-blue-300"} border-0 capitalize`}>{r.priority}</Badge> },
    { k: "status", label: "Status", render: r => <Badge className="bg-white/5 text-white/70 border-0 capitalize">{r.status}</Badge> },
    { k: "actions", label: "", render: r => (
      <div className="flex gap-1">
        {r.status !== "in_progress" && <Button size="sm" variant="ghost" onClick={()=>update(r.id, "in_progress")} data-testid={`assign-${r.id}`}>Assign</Button>}
        {r.status !== "resolved" && <Button size="sm" variant="ghost" onClick={()=>update(r.id, "resolved")} data-testid={`resolve-${r.id}`}>Resolve</Button>}
      </div>
    )},
  ];
  return <DataTable rows={rows} columns={cols} title="Support Tickets" testid="tickets-table"/>;
}

function Inventory() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/inventory").then(r=>setRows(r.data)); }, []);
  const cols = [
    { k: "sku", label: "SKU", render: r => <span className="font-mono text-xs">{r.sku}</span> },
    { k: "name", label: "Product" },
    { k: "category", label: "Category" },
    { k: "stock", label: "Stock", render: r => <span className={r.stock < r.min_stock ? "text-red-400 font-medium" : ""}>{r.stock}</span> },
    { k: "price", label: "Price", render: r => `₹${r.price.toLocaleString()}` },
    { k: "status", label: "Status", render: r => r.stock < r.min_stock ? <Badge className="bg-red-500/20 text-red-300 border-0">Low</Badge> : <Badge className="bg-green-500/20 text-green-300 border-0">OK</Badge> },
  ];
  return <DataTable rows={rows} columns={cols} title="Inventory" testid="inventory-table"/>;
}

function Invoices() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/invoices").then(r=>setRows(r.data)); }, []);
  const cols = [
    { k: "number", label: "Invoice #", render: r => <span className="font-mono text-xs">{r.number}</span> },
    { k: "customer_name", label: "Customer" },
    { k: "description", label: "For" },
    { k: "amount", label: "Amount", render: r => `₹${r.amount.toLocaleString()}` },
    { k: "gst_pct", label: "GST", render: r => `${r.gst_pct}%` },
    { k: "status", label: "Status", render: r => <Badge className={`${r.status==="paid"?"bg-green-500/20 text-green-300":"bg-amber-500/20 text-amber-300"} border-0 capitalize`}>{r.status}</Badge> },
  ];
  return <DataTable rows={rows} columns={cols} title="Invoices" testid="invoices-table"/>;
}

function Support() {
  const [threads, setThreads] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => { api.get("/chat/threads").then(r=>{setThreads(r.data); if (r.data[0]) setActive(r.data[0].thread_id);}); }, []);
  useEffect(() => { if (active) api.get(`/chat/messages?thread_id=${active}`).then(r=>setMessages(r.data)); }, [active]);

  const send = async () => {
    if (!text.trim()) return;
    await api.post("/chat/messages", { thread_id: active, content: text });
    setText("");
    const r = await api.get(`/chat/messages?thread_id=${active}`);
    setMessages(r.data);
  };

  return (
    <div className="space-y-4 fade-up h-[calc(100vh-6rem)] flex flex-col">
      <h1 className="font-serif text-3xl">Live Support</h1>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0">
        <Card className="bg-[#0B132B] border-white/5 rounded-2xl p-3 overflow-y-auto">
          <div className="label-cap mb-3 px-2">Threads</div>
          {threads.map(t => (
            <button key={t.thread_id} data-testid={`thread-${t.thread_id}`} onClick={()=>setActive(t.thread_id)} className={`w-full text-left p-3 rounded-xl transition ${active===t.thread_id?"bg-gold/10":"hover:bg-white/5"}`}>
              <div className="font-medium text-sm">{t.name || "Customer"}</div>
              <div className="text-xs text-white/40 truncate">{t.last}</div>
            </button>
          ))}
          {!threads.length && <div className="text-xs text-white/40 p-3">No threads yet</div>}
        </Card>
        <Card className="md:col-span-2 bg-[#0B132B] border-white/5 rounded-2xl flex flex-col">
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.sender_role==="admin"?"justify-end":"justify-start"}`}>
                <div className={`max-w-md p-3 rounded-2xl text-sm ${m.sender_role==="admin"?"bg-gold text-[#050A1F]":"bg-[#151C33]"}`}>
                  {m.content}
                  <div className="text-[10px] opacity-50 mt-1">{new Date(m.created_at).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
            {!messages.length && <div className="text-center text-white/40 text-sm py-10">Select a thread to view messages</div>}
          </div>
          <div className="p-4 border-t border-white/5 flex gap-2">
            <Input data-testid="chat-input" placeholder="Type a reply..." value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter" && send()} className="bg-[#151C33] border-white/5 rounded-full"/>
            <Button data-testid="chat-send" onClick={send} className="rounded-full bg-gold text-[#050A1F]">Send</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
