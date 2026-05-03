import { useEffect, useState, useCallback } from "react";
import { Routes, Route, Link, useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { LogOut, MapPin, Phone, ChevronRight, Camera, CheckCircle2, Wifi, ArrowLeft, FileSignature } from "lucide-react";

export default function Technician() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <div className="min-h-screen max-w-2xl mx-auto bg-[#050A1F]">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#050A1F]/80 border-b border-white/5 px-5 py-4 flex items-center justify-between">
        <Logo size={32} />
        <div className="flex items-center gap-3">
          <div className="text-right text-xs"><div className="text-white/80">{user?.name}</div><div className="label-cap">Technician</div></div>
          <Button data-testid="tech-logout" size="icon" variant="ghost" className="rounded-full" onClick={()=>{logout(); nav("/");}}><LogOut className="w-4 h-4 text-white/60"/></Button>
        </div>
      </header>
      <Routes>
        <Route index element={<JobList />} />
        <Route path="job/:id" element={<JobDetail />} />
      </Routes>
    </div>
  );
}

function JobList() {
  const [jobs, setJobs] = useState([]);
  useEffect(() => { api.get("/jobs").then(r=>setJobs(r.data)); }, []);
  const grouped = { scheduled: [], in_progress: [], completed: [] };
  jobs.forEach(j => { (grouped[j.status] || grouped.scheduled).push(j); });
  return (
    <div className="px-5 pt-5 pb-12 space-y-6 fade-up">
      <div>
        <div className="label-cap text-gold">Field Operations</div>
        <h1 className="font-serif text-3xl mt-1">Today's Jobs</h1>
        <div className="text-white/50 text-sm mt-1">{grouped.scheduled.length} scheduled · {grouped.in_progress.length} in progress</div>
      </div>
      {Object.entries(grouped).map(([k, list]) => list.length ? (
        <div key={k}>
          <div className="label-cap mb-3">{k.replace("_"," ")}</div>
          <div className="space-y-3">
            {list.map(j => (
              <Link key={j.id} to={`/tech/job/${j.id}`} data-testid={`job-${j.id}`}>
                <Card className="bg-[#0B132B] border-white/5 p-4 rounded-2xl hover-lift mt-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-serif text-xl">{j.customer_name}</div>
                      <div className="text-xs text-white/60 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3"/>{j.address}</div>
                      <div className="text-xs text-white/50 mt-1 flex items-center gap-1"><Phone className="w-3 h-3"/>{j.phone}</div>
                    </div>
                    <div className="text-right">
                      <Badge className={`${j.status==="completed"?"bg-green-500/20 text-green-300":j.status==="in_progress"?"bg-amber-500/20 text-amber-300":"bg-blue-500/20 text-blue-300"} border-0 capitalize`}>{j.status}</Badge>
                      <div className="text-[10px] text-white/40 mt-2 uppercase tracking-widest">{j.type}</div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ) : null)}
    </div>
  );
}

function JobDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [job, setJob] = useState(null);
  const [signature, setSignature] = useState("");
  const [report, setReport] = useState("");

  useEffect(() => { 
    api.get(`/jobs/${id}`).then(r => setJob(r.data)); 
  }, [id]);

  if (!job) return <div className="px-5 pt-6 text-white/50">Loading...</div>;

  const toggleItem = async (cid) => {
    const cl = job.checklist.map(c => c.id===cid ? {...c, done:!c.done} : c);
    setJob({...job, checklist: cl});
    await api.patch(`/jobs/${id}`, { checklist: cl });
  };

  const start = async () => { 
    await api.patch(`/jobs/${id}`, { status: "in_progress" }); 
    api.get(`/jobs/${id}`).then(r => setJob(r.data));
    toast.success("Job started"); 
  };

  const close = async () => {
    if (!signature) { toast.error("Customer signature required"); return; }
    await api.patch(`/jobs/${id}`, { status: "completed", signature, report, completed_at: new Date().toISOString() });
    toast.success("Job closed & service report generated");
    nav("/tech");
  };

  const addPhoto = async () => {
    const photos = [...(job.photos||[]), `https://picsum.photos/seed/${Date.now()}/400/300`];
    await api.patch(`/jobs/${id}`, { photos });
    setJob({...job, photos});
    toast.success("Photo uploaded");
  };

  const mapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${job.lat},${job.lng}&zoom=14&size=600x220&markers=${job.lat},${job.lng},red-pushpin`;
  const pct = Math.round((job.checklist.filter(c=>c.done).length / Math.max(1, job.checklist.length)) * 100);

  return (
    <div className="px-5 pt-4 pb-12 space-y-5 fade-up">
      <Link to="/tech" className="text-white/60 text-sm flex items-center gap-1" data-testid="back-jobs"><ArrowLeft className="w-4 h-4"/>Back to jobs</Link>
      <div>
        <Badge className="bg-gold/20 text-gold border-0 capitalize">{job.type}</Badge>
        <h1 className="font-serif text-3xl mt-2">{job.customer_name}</h1>
        <div className="text-sm text-white/60 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3"/>{job.address}</div>
      </div>
      <Card className="bg-[#0B132B] border-white/5 p-0 rounded-2xl overflow-hidden">
        <img src={mapUrl} alt="map" className="w-full h-44 object-cover" onError={(e)=>{e.target.style.display="none";}} />
        <div className="p-4 flex gap-3">
          <Button variant="outline" className="rounded-full border-white/10" asChild><a href={`tel:${job.phone}`} data-testid="call-customer"><Phone className="w-3 h-3 mr-1"/>Call</a></Button>
          <Button variant="outline" className="rounded-full border-white/10" asChild><a target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${job.lat},${job.lng}`} data-testid="open-maps"><MapPin className="w-3 h-3 mr-1"/>Directions</a></Button>
        </div>
      </Card>

      <Card className="bg-[#0B132B] border-white/5 p-5 rounded-2xl">
        <div className="flex justify-between items-center mb-3">
          <div className="label-cap">Checklist</div>
          <div className="font-serif text-2xl text-gold">{pct}%</div>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-4"><div className="h-full bg-gold" style={{width:`${pct}%`}}/></div>
        <div className="space-y-2">
          {job.checklist.map(c => (
            <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
              <Checkbox data-testid={`check-${c.id}`} checked={c.done} onCheckedChange={()=>toggleItem(c.id)} />
              <span className={c.done ? "line-through text-white/40" : ""}>{c.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="bg-[#0B132B] border-white/5 p-5 rounded-2xl">
        <div className="label-cap mb-3">Device Pairing & WiFi Test</div>
        <div className="grid grid-cols-2 gap-3">
          <Button data-testid="pair-devices" variant="outline" className="rounded-xl border-white/10 h-auto py-3 flex-col gap-2"><Wifi className="w-5 h-5 text-gold"/>Pair Devices</Button>
          <Button data-testid="test-switches" variant="outline" className="rounded-xl border-white/10 h-auto py-3 flex-col gap-2"><CheckCircle2 className="w-5 h-5 text-gold"/>Run Tests</Button>
        </div>
      </Card>

      <Card className="bg-[#0B132B] border-white/5 p-5 rounded-2xl">
        <div className="flex justify-between items-center mb-3">
          <div className="label-cap">Site Photos</div>
          <Button size="sm" variant="outline" className="rounded-full border-white/10" onClick={addPhoto} data-testid="add-photo"><Camera className="w-4 h-4 mr-1"/>Upload</Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(job.photos||[]).map((p,i) => <img key={i} src={p} alt="" className="w-full h-20 object-cover rounded-lg"/>)}
          {!(job.photos||[]).length && <div className="col-span-3 text-xs text-white/40 text-center py-6">No photos yet</div>}
        </div>
      </Card>

      <Card className="bg-[#0B132B] border-white/5 p-5 rounded-2xl">
        <div className="label-cap mb-2">Service Report</div>
        <Textarea data-testid="service-report" placeholder="Notes, parts replaced, warranty..." value={report} onChange={e=>setReport(e.target.value)} className="bg-[#151C33] border-white/5"/>
        <div className="label-cap mb-2 mt-4 flex items-center gap-2"><FileSignature className="w-4 h-4 text-gold"/>Customer Signature</div>
        <Input data-testid="customer-signature" placeholder="Type customer name to sign" value={signature} onChange={e=>setSignature(e.target.value)} className="bg-[#151C33] border-white/5 font-serif"/>
      </Card>

      <div className="flex gap-3">
        {job.status === "scheduled" && <Button data-testid="start-job" onClick={start} className="flex-1 rounded-full bg-gold text-[#050A1F] h-12">Start Job</Button>}
        {job.status !== "completed" && <Button data-testid="close-job" onClick={close} className="flex-1 rounded-full bg-gold text-[#050A1F] h-12">Close Job & Generate Report</Button>}
      </div>
    </div>
  );
}
