import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, ClipboardList, Package, Users, BookOpen,
  Plus, Trash2, TrendingUp, TrendingDown, Wallet,
  ChevronDown, ChevronRight, X, AlertTriangle, RotateCcw
} from 'lucide-react';

const STORAGE_KEY = 'bahi-data-v1';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const todayStr = () => new Date().toISOString().slice(0, 10);
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const fmtDate = (d) => {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const emptyData = () => ({ entries: [], stock: [], parties: [], staff: [] });

export default function App() {
  const [data, setData] = useState(emptyData());
  const [tab, setTab] = useState('dashboard');
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState('loading');
  const loadedRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          setData({ ...emptyData(), ...parsed });
        }
        setStatus('ready');
      } catch (e) {
        setStatus('ready');
      } finally {
        setLoaded(true);
        loadedRef.current = true;
      }
    })();
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    (async () => {
      try {
        await window.storage.set(STORAGE_KEY, JSON.stringify(data), false);
      } catch (e) {
        setStatus('error');
      }
    })();
  }, [data]);

  const resetAll = async () => {
    if (!window.confirm('Clear all shop data on this device? This cannot be undone.')) return;
    setData(emptyData());
    try { await window.storage.set(STORAGE_KEY, JSON.stringify(emptyData()), false); } catch (e) {}
  };

  // ---- derived numbers ----
  const today = todayStr();
  const todayEntries = data.entries.filter((e) => e.date === today);
  const todaySales = todayEntries.filter((e) => e.type === 'sale').reduce((s, e) => s + e.amount, 0);
  const todayExpense = todayEntries.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const todayCashSales = todayEntries.filter((e) => e.type === 'sale' && e.mode === 'cash').reduce((s, e) => s + e.amount, 0);
  const todayOnlineSales = todayEntries.filter((e) => e.type === 'sale' && e.mode === 'online').reduce((s, e) => s + e.amount, 0);

  const allCashSales = data.entries.filter((e) => e.type === 'sale' && e.mode === 'cash').reduce((s, e) => s + e.amount, 0);
  const allCashExpense = data.entries.filter((e) => e.type === 'expense' && e.mode === 'cash').reduce((s, e) => s + e.amount, 0);
  const allStaffCash = data.staff.reduce((s, st) => s + st.txns.reduce((a, t) => a + t.amount, 0), 0);
  const cashInHand = allCashSales - allCashExpense - allStaffCash;

  const lowStockCount = data.stock.filter((s) => Number(s.qty) <= Number(s.lowAt || 0)).length;
  const partyBalance = (p) => p.txns.reduce((s, t) => s + (t.dir === 'owe_us' ? t.amount : -t.amount), 0);
  const totalOwedToUs = data.parties.reduce((s, p) => s + Math.max(partyBalance(p), 0), 0);

  // ---- mutators ----
  const addEntry = (entry) => setData((d) => ({ ...d, entries: [{ ...entry, id: uid(), date: today }, ...d.entries] }));
  const deleteEntry = (id) => setData((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) }));

  const addStock = (item) => setData((d) => ({ ...d, stock: [{ ...item, id: uid() }, ...d.stock] }));
  const deleteStock = (id) => setData((d) => ({ ...d, stock: d.stock.filter((s) => s.id !== id) }));
  const adjustStock = (id, delta) => setData((d) => ({
    ...d,
    stock: d.stock.map((s) => (s.id === id ? { ...s, qty: Math.max(0, Number(s.qty) + delta) } : s)),
  }));

  const addParty = (name) => setData((d) => ({ ...d, parties: [{ id: uid(), name, txns: [] }, ...d.parties] }));
  const deleteParty = (id) => setData((d) => ({ ...d, parties: d.parties.filter((p) => p.id !== id) }));
  const addPartyTxn = (partyId, txn) => setData((d) => ({
    ...d,
    parties: d.parties.map((p) => (p.id === partyId ? { ...p, txns: [{ ...txn, id: uid(), date: today }, ...p.txns] } : p)),
  }));

  const addStaff = (name) => setData((d) => ({ ...d, staff: [{ id: uid(), name, txns: [] }, ...d.staff] }));
  const deleteStaffMember = (id) => setData((d) => ({ ...d, staff: d.staff.filter((s) => s.id !== id) }));
  const addStaffTxn = (staffId, txn) => setData((d) => ({
    ...d,
    staff: d.staff.map((s) => (s.id === staffId ? { ...s, txns: [{ ...txn, id: uid(), date: today }, ...s.txns] } : s)),
  }));

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'entries', label: 'Entries', icon: ClipboardList },
    { id: 'stock', label: 'Stock', icon: Package },
    { id: 'khata', label: 'Khata', icon: BookOpen },
    { id: 'staff', label: 'Staff', icon: Users },
  ];

  return (
    <div className="cashline-root min-h-screen" style={{ background: '#DCD3B4' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Zilla+Slab:wght@500;600;700&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
        .cashline-root { --paper:#EFE6CC; --paper-soft:#F5EFDB; --ink:#241F18; --red:#9A2B1F; --green:#2F5233; --brass:#A9791F; --muted:#6B5D4A;
          font-family:'Public Sans', system-ui, sans-serif; color:var(--ink); }
        .font-display { font-family:'Zilla Slab', serif; }
        .font-ledger { font-family:'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
        .ledger-page { background-color:var(--paper); background-image:
            linear-gradient(to right, transparent 0 27px, rgba(154,43,31,0.42) 27px 28px, transparent 28px),
            repeating-linear-gradient(to bottom, transparent 0 38px, rgba(107,93,74,0.14) 38px 39px); }
        .ledger-row { padding-left:40px; }
        .stamp { display:inline-flex; align-items:center; justify-content:center; border:3px double var(--red); color:var(--red);
          border-radius:9999px; transform:rotate(-4deg); font-family:'Zilla Slab',serif; text-transform:uppercase; letter-spacing:0.06em; }
        .stamp-green { border-color:var(--green); color:var(--green); }
        .pill { border-radius:9999px; padding:8px 14px; font-size:13px; font-weight:600; border:1.5px solid transparent; transition:background .15s,color .15s; }
        .pill-active { background:var(--red); color:var(--paper-soft); }
        .pill-idle { background:transparent; color:var(--muted); border-color:rgba(107,93,74,0.35); }
        .card { background:var(--paper-soft); border:1px solid rgba(107,93,74,0.25); border-radius:10px; }
        .btn-primary { background:var(--red); color:var(--paper-soft); border-radius:8px; font-weight:600; }
        .btn-primary:active { transform:translateY(1px); }
        .icon-btn:focus-visible, .pill:focus-visible, .btn-primary:focus-visible, input:focus-visible { outline:2px solid var(--brass); outline-offset:2px; }
        input[type=text], input[type=number] { background:var(--paper-soft); border:1.5px solid rgba(107,93,74,0.35); border-radius:8px; padding:9px 11px; color:var(--ink); }
        @media (prefers-reduced-motion: reduce) { .fade-in { animation:none !important; } }
        .fade-in { animation:fadeIn .25s ease both; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(4px);} to { opacity:1; transform:translateY(0);} }
      `}</style>

      <div className="max-w-md mx-auto min-h-screen flex flex-col" style={{ background: 'var(--paper)' }}>
        {/* header */}
        <div className="flex items-center justify-between px-5 pt-6 pb-4" style={{ borderBottom: '2px solid rgba(154,43,31,0.3)' }}>
          <div className="flex items-center gap-3">
            <div className="stamp w-11 h-11 text-lg font-bold shrink-0">C</div>
            <div>
              <div className="font-display text-xl font-bold leading-none">Cashline</div>
              <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Dukaan Ledger</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-ledger" style={{ color: 'var(--muted)' }}>
              {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
            <button onClick={resetAll} className="icon-btn text-xs flex items-center gap-1 mt-1 ml-auto" style={{ color: 'var(--muted)' }}>
              <RotateCcw size={12} /> reset
            </button>
          </div>
        </div>

        {/* content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 fade-in" key={tab}>
          {status === 'error' && (
            <div className="text-xs mb-3 px-3 py-2 rounded" style={{ background: 'rgba(154,43,31,0.12)', color: 'var(--red)' }}>
              Could not save last change — check connection.
            </div>
          )}
          {!loaded ? (
            <div className="text-sm" style={{ color: 'var(--muted)' }}>Opening the ledger…</div>
          ) : tab === 'dashboard' ? (
            <Dashboard
              cashInHand={cashInHand} todaySales={todaySales} todayExpense={todayExpense}
              todayCashSales={todayCashSales} todayOnlineSales={todayOnlineSales}
              lowStockCount={lowStockCount} totalOwedToUs={totalOwedToUs}
              recent={data.entries.slice(0, 5)} onGo={setTab}
            />
          ) : tab === 'entries' ? (
            <EntriesTab entries={data.entries} onAdd={addEntry} onDelete={deleteEntry} />
          ) : tab === 'stock' ? (
            <StockTab stock={data.stock} onAdd={addStock} onDelete={deleteStock} onAdjust={adjustStock} />
          ) : tab === 'khata' ? (
            <KhataTab parties={data.parties} onAddParty={addParty} onDeleteParty={deleteParty} onAddTxn={addPartyTxn} balanceOf={partyBalance} />
          ) : (
            <StaffTab staff={data.staff} onAdd={addStaff} onDelete={deleteStaffMember} onAddTxn={addStaffTxn} />
          )}
        </div>

        {/* bottom nav */}
        <div className="flex justify-around items-center px-1 py-2" style={{ borderTop: '2px solid rgba(154,43,31,0.3)', background: 'var(--paper-soft)' }}>
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="icon-btn flex flex-col items-center gap-1 px-2 py-1.5"
                style={{ color: active ? 'var(--red)' : 'var(--muted)', borderTop: active ? '2px solid var(--red)' : '2px solid transparent' }}
              >
                <Icon size={19} strokeWidth={active ? 2.4 : 2} />
                <span className="text-[10px] font-semibold">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="font-display text-lg font-bold mb-3">{children}</h2>;
}

function Dashboard({ cashInHand, todaySales, todayExpense, todayCashSales, todayOnlineSales, lowStockCount, totalOwedToUs, recent, onGo }) {
  return (
    <div>
      <div className="flex justify-center mb-6">
        <div className="stamp w-36 h-36 flex-col text-center px-2">
          <div className="text-[10px] tracking-wide">Cash in Hand</div>
          <div className="font-ledger text-2xl font-bold mt-1">{inr(cashInHand)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card p-3">
          <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--green)' }}>
            <TrendingUp size={15} /><span className="text-xs font-semibold">Today's Sales</span>
          </div>
          <div className="font-ledger text-lg font-semibold">{inr(todaySales)}</div>
        </div>
        <div className="card p-3">
          <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--red)' }}>
            <TrendingDown size={15} /><span className="text-xs font-semibold">Today's Expense</span>
          </div>
          <div className="font-ledger text-lg font-semibold">{inr(todayExpense)}</div>
        </div>
      </div>

      <div className="card p-3 mb-4 flex justify-between text-sm">
        <div><div className="text-xs" style={{ color: 'var(--muted)' }}>Cash sales</div><div className="font-ledger font-semibold">{inr(todayCashSales)}</div></div>
        <div className="text-right"><div className="text-xs" style={{ color: 'var(--muted)' }}>Online sales</div><div className="font-ledger font-semibold">{inr(todayOnlineSales)}</div></div>
      </div>

      {(lowStockCount > 0 || totalOwedToUs > 0) && (
        <div className="card p-3 mb-4">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle size={15} style={{ color: 'var(--brass)' }} /><span className="text-xs font-semibold">Needs attention</span></div>
          {lowStockCount > 0 && (
            <button onClick={() => onGo('stock')} className="w-full text-left text-sm flex justify-between py-1">
              <span>Low stock items</span><span className="font-ledger font-semibold" style={{ color: 'var(--red)' }}>{lowStockCount}</span>
            </button>
          )}
          {totalOwedToUs > 0 && (
            <button onClick={() => onGo('khata')} className="w-full text-left text-sm flex justify-between py-1">
              <span>Total owed to you</span><span className="font-ledger font-semibold" style={{ color: 'var(--green)' }}>{inr(totalOwedToUs)}</span>
            </button>
          )}
        </div>
      )}

      <SectionTitle>Recent activity</SectionTitle>
      {recent.length === 0 ? (
        <EmptyState text="No entries yet. Add your first sale or expense from the Entries tab." />
      ) : (
        <div className="ledger-page rounded-lg overflow-hidden">
          {recent.map((e) => <EntryRow key={e.id} entry={e} onDelete={null} />)}
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="text-sm py-6 text-center" style={{ color: 'var(--muted)' }}>{text}</div>;
}

function EntryRow({ entry, onDelete }) {
  return (
    <div className="ledger-row flex items-center justify-between py-2 pr-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[10px] font-ledger w-11 shrink-0" style={{ color: 'var(--muted)' }}>{fmtDate(entry.date)}</span>
        <span
          className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded shrink-0"
          style={{
            background: entry.type === 'sale' ? 'rgba(47,82,51,0.15)' : 'rgba(154,43,31,0.15)',
            color: entry.type === 'sale' ? 'var(--green)' : 'var(--red)',
          }}
        >
          {entry.type}
        </span>
        <span className="text-xs truncate" style={{ color: 'var(--muted)' }}>{entry.note || entry.mode}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-ledger text-sm font-semibold" style={{ color: entry.type === 'sale' ? 'var(--green)' : 'var(--red)' }}>
          {entry.type === 'sale' ? '+' : '−'}{inr(entry.amount)}
        </span>
        {onDelete && (
          <button onClick={() => onDelete(entry.id)} className="icon-btn" style={{ color: 'var(--muted)' }}><Trash2 size={14} /></button>
        )}
      </div>
    </div>
  );
}

function EntriesTab({ entries, onAdd, onDelete }) {
  const [type, setType] = useState('sale');
  const [mode, setMode] = useState('cash');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const submit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    onAdd({ type, mode, amount: amt, note: note.trim() });
    setAmount(''); setNote('');
  };

  return (
    <div>
      <SectionTitle>Add entry</SectionTitle>
      <div className="card p-4 mb-6">
        <div className="flex gap-2 mb-3">
          <button onClick={() => setType('sale')} className={`pill flex-1 ${type === 'sale' ? 'pill-active' : 'pill-idle'}`}>Sale</button>
          <button onClick={() => setType('expense')} className={`pill flex-1 ${type === 'expense' ? 'pill-active' : 'pill-idle'}`}>Expense</button>
        </div>
        <div className="flex gap-2 mb-3">
          <button onClick={() => setMode('cash')} className={`pill flex-1 ${mode === 'cash' ? 'pill-active' : 'pill-idle'}`}>Cash</button>
          <button onClick={() => setMode('online')} className={`pill flex-1 ${mode === 'online' ? 'pill-active' : 'pill-idle'}`}>Online</button>
        </div>
        <input type="number" inputMode="decimal" placeholder="Amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full mb-2" />
        <input type="text" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="w-full mb-3" />
        <button onClick={submit} className="btn-primary w-full py-2.5 flex items-center justify-center gap-1.5"><Plus size={16} /> Add entry</button>
      </div>

      <SectionTitle>All entries</SectionTitle>
      {entries.length === 0 ? (
        <EmptyState text="Nothing recorded yet. Every sale and expense you add will show up here." />
      ) : (
        <div className="ledger-page rounded-lg overflow-hidden">
          {entries.map((e) => <EntryRow key={e.id} entry={e} onDelete={onDelete} />)}
        </div>
      )}
    </div>
  );
}

function StockTab({ stock, onAdd, onDelete, onAdjust }) {
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [lowAt, setLowAt] = useState('');

  const submit = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), qty: parseFloat(qty) || 0, unit, lowAt: parseFloat(lowAt) || 0 });
    setName(''); setQty(''); setLowAt('');
  };

  return (
    <div>
      <SectionTitle>Add stock item</SectionTitle>
      <div className="card p-4 mb-6">
        <input type="text" placeholder="Item name" value={name} onChange={(e) => setName(e.target.value)} className="w-full mb-2" />
        <div className="flex gap-2 mb-2">
          <input type="number" inputMode="decimal" placeholder="Quantity" value={qty} onChange={(e) => setQty(e.target.value)} className="flex-1" />
          <input type="text" placeholder="Unit (pcs/kg)" value={unit} onChange={(e) => setUnit(e.target.value)} className="w-24" />
        </div>
        <input type="number" inputMode="decimal" placeholder="Low stock alert below" value={lowAt} onChange={(e) => setLowAt(e.target.value)} className="w-full mb-3" />
        <button onClick={submit} className="btn-primary w-full py-2.5 flex items-center justify-center gap-1.5"><Plus size={16} /> Add item</button>
      </div>

      <SectionTitle>Inventory</SectionTitle>
      {stock.length === 0 ? (
        <EmptyState text="No items yet. Add what you stock to start tracking quantity." />
      ) : (
        <div className="space-y-2">
          {stock.map((s) => {
            const low = Number(s.qty) <= Number(s.lowAt || 0);
            return (
              <div key={s.id} className="card p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{s.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-ledger text-sm">{s.qty} {s.unit}</span>
                    {low && <span className="stamp px-2 py-0 text-[9px] leading-4">low</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => onAdjust(s.id, -1)} className="icon-btn w-7 h-7 rounded" style={{ background: 'var(--paper)', border: '1px solid rgba(107,93,74,0.3)' }}>−</button>
                  <button onClick={() => onAdjust(s.id, 1)} className="icon-btn w-7 h-7 rounded" style={{ background: 'var(--paper)', border: '1px solid rgba(107,93,74,0.3)' }}>+</button>
                  <button onClick={() => onDelete(s.id)} className="icon-btn ml-1" style={{ color: 'var(--muted)' }}><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KhataTab({ parties, onAddParty, onDeleteParty, onAddTxn, balanceOf }) {
  const [newName, setNewName] = useState('');
  const [openId, setOpenId] = useState(null);

  const submitParty = () => {
    if (!newName.trim()) return;
    onAddParty(newName.trim());
    setNewName('');
  };

  return (
    <div>
      <SectionTitle>Khata (party ledger)</SectionTitle>
      <div className="card p-3 mb-6 flex gap-2">
        <input type="text" placeholder="Party name" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1" />
        <button onClick={submitParty} className="btn-primary px-4 flex items-center gap-1"><Plus size={16} /> Add</button>
      </div>

      {parties.length === 0 ? (
        <EmptyState text="No parties yet. Add a customer or supplier to track who owes whom." />
      ) : (
        <div className="space-y-2">
          {parties.map((p) => {
            const bal = balanceOf(p);
            const open = openId === p.id;
            return (
              <div key={p.id} className="card overflow-hidden">
                <button onClick={() => setOpenId(open ? null : p.id)} className="w-full flex items-center justify-between p-3">
                  <div className="flex items-center gap-2">
                    {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    <span className="text-sm font-semibold">{p.name}</span>
                  </div>
                  <span className="font-ledger text-sm font-semibold" style={{ color: bal > 0 ? 'var(--green)' : bal < 0 ? 'var(--red)' : 'var(--muted)' }}>
                    {bal === 0 ? '—' : bal > 0 ? `owes you ${inr(bal)}` : `you owe ${inr(-bal)}`}
                  </span>
                </button>
                {open && <PartyDetail party={p} onAddTxn={onAddTxn} onDelete={onDeleteParty} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PartyDetail({ party, onAddTxn, onDelete }) {
  const [dir, setDir] = useState('owe_us');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const submit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    onAddTxn(party.id, { dir, amount: amt, note: note.trim() });
    setAmount(''); setNote('');
  };

  return (
    <div className="px-3 pb-3" style={{ borderTop: '1px solid rgba(107,93,74,0.2)' }}>
      <div className="flex gap-2 my-2">
        <button onClick={() => setDir('owe_us')} className={`pill flex-1 ${dir === 'owe_us' ? 'pill-active' : 'pill-idle'}`}>They owe us</button>
        <button onClick={() => setDir('we_owe')} className={`pill flex-1 ${dir === 'we_owe' ? 'pill-active' : 'pill-idle'}`}>We owe them</button>
      </div>
      <div className="flex gap-2 mb-2">
        <input type="number" inputMode="decimal" placeholder="Amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} className="flex-1" />
        <button onClick={submit} className="btn-primary px-3"><Plus size={16} /></button>
      </div>
      <input type="text" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="w-full mb-3" />

      {party.txns.length === 0 ? (
        <div className="text-xs py-2" style={{ color: 'var(--muted)' }}>No transactions yet.</div>
      ) : (
        <div className="ledger-page rounded-lg overflow-hidden mb-2">
          {party.txns.map((t) => (
            <div key={t.id} className="ledger-row flex items-center justify-between py-1.5 pr-3">
              <span className="text-[10px] font-ledger w-11 shrink-0" style={{ color: 'var(--muted)' }}>{fmtDate(t.date)}</span>
              <span className="text-xs truncate flex-1 px-2" style={{ color: 'var(--muted)' }}>{t.note || (t.dir === 'owe_us' ? 'credit given' : 'payment made')}</span>
              <span className="font-ledger text-sm font-semibold" style={{ color: t.dir === 'owe_us' ? 'var(--green)' : 'var(--red)' }}>{inr(t.amount)}</span>
            </div>
          ))}
        </div>
      )}
      <button onClick={() => onDelete(party.id)} className="text-xs flex items-center gap-1" style={{ color: 'var(--muted)' }}><Trash2 size={12} /> Remove party</button>
    </div>
  );
}

function StaffTab({ staff, onAdd, onDelete, onAddTxn }) {
  const [newName, setNewName] = useState('');
  const [openId, setOpenId] = useState(null);

  const submitStaff = () => {
    if (!newName.trim()) return;
    onAdd(newName.trim());
    setNewName('');
  };

  return (
    <div>
      <SectionTitle>Staff cash</SectionTitle>
      <div className="card p-3 mb-6 flex gap-2">
        <input type="text" placeholder="Staff name" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1" />
        <button onClick={submitStaff} className="btn-primary px-4 flex items-center gap-1"><Plus size={16} /> Add</button>
      </div>

      {staff.length === 0 ? (
        <EmptyState text="No staff added yet. Add someone to track cash they take from the till." />
      ) : (
        <div className="space-y-2">
          {staff.map((s) => {
            const total = s.txns.reduce((a, t) => a + t.amount, 0);
            const open = openId === s.id;
            return (
              <div key={s.id} className="card overflow-hidden">
                <button onClick={() => setOpenId(open ? null : s.id)} className="w-full flex items-center justify-between p-3">
                  <div className="flex items-center gap-2">
                    {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    <span className="text-sm font-semibold">{s.name}</span>
                  </div>
                  <span className="font-ledger text-sm font-semibold" style={{ color: 'var(--red)' }}>{inr(total)} taken</span>
                </button>
                {open && <StaffDetail staffMember={s} onAddTxn={onAddTxn} onDelete={onDelete} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StaffDetail({ staffMember, onAddTxn, onDelete }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const submit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    onAddTxn(staffMember.id, { amount: amt, note: note.trim() });
    setAmount(''); setNote('');
  };

  return (
    <div className="px-3 pb-3" style={{ borderTop: '1px solid rgba(107,93,74,0.2)' }}>
      <div className="flex gap-2 my-2">
        <input type="number" inputMode="decimal" placeholder="Cash taken (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} className="flex-1" />
        <button onClick={submit} className="btn-primary px-3"><Plus size={16} /></button>
      </div>
      <input type="text" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="w-full mb-3" />

      {staffMember.txns.length === 0 ? (
        <div className="text-xs py-2" style={{ color: 'var(--muted)' }}>No cash taken recorded yet.</div>
      ) : (
        <div className="ledger-page rounded-lg overflow-hidden mb-2">
          {staffMember.txns.map((t) => (
            <div key={t.id} className="ledger-row flex items-center justify-between py-1.5 pr-3">
              <span className="text-[10px] font-ledger w-11 shrink-0" style={{ color: 'var(--muted)' }}>{fmtDate(t.date)}</span>
              <span className="text-xs truncate flex-1 px-2" style={{ color: 'var(--muted)' }}>{t.note || 'cash taken'}</span>
              <span className="font-ledger text-sm font-semibold" style={{ color: 'var(--red)' }}>{inr(t.amount)}</span>
            </div>
          ))}
        </div>
      )}
      <button onClick={() => onDelete(staffMember.id)} className="text-xs flex items-center gap-1" style={{ color: 'var(--muted)' }}><Trash2 size={12} /> Remove staff</button>
    </div>
  );
}
