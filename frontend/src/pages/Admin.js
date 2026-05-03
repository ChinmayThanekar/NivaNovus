import { useEffect, useState } from "react";
import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
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
  const load = () => api.get("/leads").then(r=>setRows(r.data));
  useEffect(() => { load(); }, []);
  const updateStatus = async (id, status) => {
    try { await api.patch(`/leads/${id}`, { status }); toast.success("Status updated"); load(); }
    catch { toast.error("Failed"); }
  };
  const STATUSES = ["new","qualified","proposal","won","lost"];
  const cols = [
    { k: "name", label: "Name" },
    { k: "phone", label: "Phone" },
    { k: "email", label: "Email", render: r => <span className="text-white/70 text-xs">{r.email || "—"}</span> },
    { k: "source", label: "Source" },
    { k: "interest", label: "Interest" },
    { k: "value", label: "Value", render: r => r.value ? `₹${(r.value/1000).toFixed(0)}k` : "—" },
    { k: "status", label: "Status", render: r => (
      <Select value={r.status} onValueChange={(v)=>updateStatus(r.id, v)}>
        <SelectTrigger data-testid={`lead-status-${r.id}`} className="w-32 h-8 bg-[#151C33] border-white/10 capitalize text-xs"><SelectValue/></SelectTrigger>
        <SelectContent className="bg-[#0B132B] border-white/10">{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
      </Select>
    )},
  ];
  return <DataTable rows={rows} columns={cols} title="Lead Management" testid="leads-table"/>;
}

function Customers() {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const load = () => api.get("/customers").then(r=>setRows(r.data));
  useEffect(() => { load(); }, []);
  const save = async () => {
    try {
      await api.patch(`/customers/${editing.id}`, { name: editing.name, email: editing.email, phone: editing.phone });
      toast.success("Customer updated"); setEditing(null); load();
    } catch { toast.error("Update failed"); }
  };
  const cols = [
    { k: "name", label: "Name" },
    { k: "email", label: "Email" },
    { k: "phone", label: "Phone" },
    { k: "created_at", label: "Joined", render: r => new Date(r.created_at).toLocaleDateString() },
    { k: "actions", label: "", render: r => (
      <Button data-testid={`edit-customer-${r.id}`} size="sm" variant="ghost" className="text-white/70" onClick={()=>setEditing({...r})}><Pencil className="w-3.5 h-3.5 mr-1"/>Edit</Button>
    )},
  ];
  return (
    <>
      <DataTable rows={rows} columns={cols} title="Customer Database" testid="customers-table"/>
      <Dialog open={!!editing} onOpenChange={(v)=>!v && setEditing(null)}>
        <DialogContent className="bg-[#0B132B] border-white/10">
          <DialogHeader><DialogTitle className="font-serif text-2xl">Edit customer</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><div className="label-cap mb-1">Name</div><Input data-testid="customer-edit-name" value={editing.name||""} onChange={(e)=>setEditing({...editing, name: e.target.value})} className="bg-[#151C33] border-white/5"/></div>
              <div><div className="label-cap mb-1">Email</div><Input data-testid="customer-edit-email" value={editing.email||""} onChange={(e)=>setEditing({...editing, email: e.target.value})} className="bg-[#151C33] border-white/5"/></div>
              <div><div className="label-cap mb-1">Phone</div><Input data-testid="customer-edit-phone" value={editing.phone||""} onChange={(e)=>setEditing({...editing, phone: e.target.value})} className="bg-[#151C33] border-white/5"/></div>
            </div>
          )}
          <DialogFooter><Button data-testid="customer-edit-save" onClick={save} className="rounded-full bg-gold text-[#050A1F]">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
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
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const empty = { sku: "", name: "", category: "", stock: 0, min_stock: 5, price: 0 };
  const [draft, setDraft] = useState(empty);
  const load = () => api.get("/inventory").then(r=>setRows(r.data));
  useEffect(() => { load(); }, []);

  const saveEdit = async () => {
    try {
      await api.patch(`/inventory/${editing.id}`, {
        sku: editing.sku, name: editing.name, category: editing.category,
        stock: editing.stock, min_stock: editing.min_stock, price: editing.price,
      });
      toast.success("Item updated"); setEditing(null); load();
    } catch { toast.error("Update failed"); }
  };
  const saveNew = async () => {
    if (!draft.name) { toast.error("Name required"); return; }
    try { await api.post("/inventory", draft); toast.success("Item added"); setCreating(false); setDraft(empty); load(); }
    catch { toast.error("Failed"); }
  };

  const cols = [
    { k: "sku", label: "SKU", render: r => <span className="font-mono text-xs">{r.sku}</span> },
    { k: "name", label: "Product" },
    { k: "category", label: "Category" },
    { k: "stock", label: "Stock", render: r => <span className={r.stock < r.min_stock ? "text-red-400 font-medium" : ""}>{r.stock}</span> },
    { k: "price", label: "Price", render: r => `₹${(r.price||0).toLocaleString()}` },
    { k: "status", label: "Status", render: r => r.stock < r.min_stock ? <Badge className="bg-red-500/20 text-red-300 border-0">Low</Badge> : <Badge className="bg-green-500/20 text-green-300 border-0">OK</Badge> },
    { k: "actions", label: "", render: r => <Button data-testid={`edit-inventory-${r.id}`} size="sm" variant="ghost" onClick={()=>setEditing({...r})}><Pencil className="w-3.5 h-3.5 mr-1"/>Edit</Button> },
  ];

  const fields = (obj, set) => (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2"><div className="label-cap mb-1">Product Name</div><Input data-testid="inv-name" value={obj.name||""} onChange={(e)=>set({...obj, name: e.target.value})} className="bg-[#151C33] border-white/5"/></div>
      <div><div className="label-cap mb-1">SKU</div><Input data-testid="inv-sku" value={obj.sku||""} onChange={(e)=>set({...obj, sku: e.target.value})} className="bg-[#151C33] border-white/5 font-mono" placeholder="auto-generated if empty"/></div>
      <div><div className="label-cap mb-1">Category</div><Input data-testid="inv-category" value={obj.category||""} onChange={(e)=>set({...obj, category: e.target.value})} className="bg-[#151C33] border-white/5"/></div>
      <div><div className="label-cap mb-1">Stock</div><Input data-testid="inv-stock" type="number" value={obj.stock} onChange={(e)=>set({...obj, stock: e.target.value})} className="bg-[#151C33] border-white/5"/></div>
      <div><div className="label-cap mb-1">Min Stock</div><Input data-testid="inv-min" type="number" value={obj.min_stock} onChange={(e)=>set({...obj, min_stock: e.target.value})} className="bg-[#151C33] border-white/5"/></div>
      <div className="col-span-2"><div className="label-cap mb-1">Price (₹)</div><Input data-testid="inv-price" type="number" value={obj.price} onChange={(e)=>set({...obj, price: e.target.value})} className="bg-[#151C33] border-white/5"/></div>
    </div>
  );

  const action = <Button data-testid="inv-add-btn" onClick={()=>{setDraft(empty); setCreating(true);}} className="rounded-full bg-gold text-[#050A1F]"><Plus className="w-4 h-4 mr-1"/>Add Item</Button>;
  return (
    <>
      <DataTable rows={rows} columns={cols} title="Inventory" testid="inventory-table" action={action}/>
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="bg-[#0B132B] border-white/10">
          <DialogHeader><DialogTitle className="font-serif text-2xl">Add inventory item</DialogTitle></DialogHeader>
          {fields(draft, setDraft)}
          <DialogFooter><Button data-testid="inv-create-save" onClick={saveNew} className="rounded-full bg-gold text-[#050A1F]">Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editing} onOpenChange={(v)=>!v && setEditing(null)}>
        <DialogContent className="bg-[#0B132B] border-white/10">
          <DialogHeader><DialogTitle className="font-serif text-2xl">Edit item</DialogTitle></DialogHeader>
          {editing && fields(editing, setEditing)}
          <DialogFooter><Button data-testid="inv-edit-save" onClick={saveEdit} className="rounded-full bg-gold text-[#050A1F]">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Invoices() {
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const empty = { customer_id: "", customer_name: "", description: "", amount: 0, gst_pct: 18, status: "unpaid" };
  const [draft, setDraft] = useState(empty);
  const load = () => api.get("/invoices").then(r=>setRows(r.data));
  useEffect(() => { load(); api.get("/customers").then(r=>setCustomers(r.data)); }, []);

  const onCustomerSelect = (id, target, set) => {
    const c = customers.find(x => x.id === id);
    set({...target, customer_id: id, customer_name: c?.name || ""});
  };

  const saveNew = async () => {
    if (!draft.customer_id || !draft.amount) { toast.error("Customer & amount required"); return; }
    try { await api.post("/invoices", { ...draft, amount: Number(draft.amount), gst_pct: Number(draft.gst_pct) }); toast.success("Invoice created"); setCreating(false); setDraft(empty); load(); }
    catch { toast.error("Failed"); }
  };
  const saveEdit = async () => {
    try { await api.patch(`/invoices/${editing.id}`, { customer_id: editing.customer_id, customer_name: editing.customer_name, description: editing.description, amount: Number(editing.amount), gst_pct: Number(editing.gst_pct), status: editing.status }); toast.success("Invoice updated"); setEditing(null); load(); }
    catch { toast.error("Update failed"); }
  };

  const cols = [
    { k: "number", label: "Invoice #", render: r => <span className="font-mono text-xs">{r.number}</span> },
    { k: "customer_name", label: "Customer" },
    { k: "description", label: "For" },
    { k: "amount", label: "Amount", render: r => `₹${(r.amount||0).toLocaleString()}` },
    { k: "gst_pct", label: "GST", render: r => `${r.gst_pct}%` },
    { k: "status", label: "Status", render: r => <Badge className={`${r.status==="paid"?"bg-green-500/20 text-green-300":"bg-amber-500/20 text-amber-300"} border-0 capitalize`}>{r.status}</Badge> },
    { k: "actions", label: "", render: r => <Button data-testid={`edit-invoice-${r.id}`} size="sm" variant="ghost" onClick={()=>setEditing({...r})}><Pencil className="w-3.5 h-3.5 mr-1"/>Edit</Button> },
  ];

  const fields = (obj, set) => (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <div className="label-cap mb-1">Customer</div>
        <Select value={obj.customer_id || ""} onValueChange={(v)=>onCustomerSelect(v, obj, set)}>
          <SelectTrigger data-testid="inv-customer" className="bg-[#151C33] border-white/5"><SelectValue placeholder="Select customer"/></SelectTrigger>
          <SelectContent className="bg-[#0B132B] border-white/10">{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name} · {c.phone}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="col-span-2"><div className="label-cap mb-1">Description</div><Input data-testid="inv-desc" value={obj.description||""} onChange={(e)=>set({...obj, description: e.target.value})} className="bg-[#151C33] border-white/5"/></div>
      <div><div className="label-cap mb-1">Amount (₹)</div><Input data-testid="inv-amount" type="number" value={obj.amount} onChange={(e)=>set({...obj, amount: e.target.value})} className="bg-[#151C33] border-white/5"/></div>
      <div><div className="label-cap mb-1">GST %</div><Input data-testid="inv-gst" type="number" value={obj.gst_pct} onChange={(e)=>set({...obj, gst_pct: e.target.value})} className="bg-[#151C33] border-white/5"/></div>
      <div className="col-span-2">
        <div className="label-cap mb-1">Status</div>
        <Select value={obj.status || "unpaid"} onValueChange={(v)=>set({...obj, status: v})}>
          <SelectTrigger data-testid="inv-status" className="bg-[#151C33] border-white/5 capitalize"><SelectValue/></SelectTrigger>
          <SelectContent className="bg-[#0B132B] border-white/10">{["unpaid","paid","cancelled"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
  );

  const action = <Button data-testid="inv-add-invoice" onClick={()=>{setDraft(empty); setCreating(true);}} className="rounded-full bg-gold text-[#050A1F]"><Plus className="w-4 h-4 mr-1"/>New Invoice</Button>;
  return (
    <>
      <DataTable rows={rows} columns={cols} title="Invoices" testid="invoices-table" action={action}/>
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="bg-[#0B132B] border-white/10">
          <DialogHeader><DialogTitle className="font-serif text-2xl">Create invoice</DialogTitle></DialogHeader>
          {fields(draft, setDraft)}
          <DialogFooter><Button data-testid="invoice-create-save" onClick={saveNew} className="rounded-full bg-gold text-[#050A1F]">Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editing} onOpenChange={(v)=>!v && setEditing(null)}>
        <DialogContent className="bg-[#0B132B] border-white/10">
          <DialogHeader><DialogTitle className="font-serif text-2xl">Edit invoice</DialogTitle></DialogHeader>
          {editing && fields(editing, setEditing)}
          <DialogFooter><Button data-testid="invoice-edit-save" onClick={saveEdit} className="rounded-full bg-gold text-[#050A1F]">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
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
