import { useEffect, useState, useCallback, FormEvent } from 'react'
import { supabase } from './lib/supabase'
import { rupiah, hargaMarkup, hargaMargin, hppPerUnit, konversi, marginDari, SATUAN } from './lib/calc'

type R = Record<string, any>
const inp = 'w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-400'
const btn = 'rounded-xl bg-gradient-to-r from-teal-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow active:scale-95 transition disabled:opacity-50'
const card = 'rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur'
const num = (v: any) => Number(v) || 0
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10)
let notify = (_: string) => {}

function useRows(t: string) {
  const [r, setR] = useState<R[] | null>(null)
  const load = useCallback(async () => {
    const { data, error } = await supabase.from(t).select('*').order('created_at', { ascending: false })
    if (error) notify(error.message)
    setR(data ?? [])
  }, [t])
  useEffect(() => { load() }, [load])
  return [r, load] as const
}
async function run(p: PromiseLike<{ error: any }>, ok: string, after?: () => void) {
  const { error } = await p
  if (error) notify('Gagal: ' + error.message)
  else { notify(ok); after?.() }
}
const Empty = ({ t }: { t: string }) => <p className="py-6 text-center text-sm text-slate-400">{t}</p>
const Load = () => <p className="py-6 text-center text-sm text-slate-400 animate-pulse">Memuat…</p>

function Auth() {
  const [e, setE] = useState(''), [p, setP] = useState(''), [daftar, setD] = useState(false), [b, setB] = useState(false)
  async function go(ev: FormEvent) {
    ev.preventDefault(); setB(true)
    const r = daftar ? await supabase.auth.signUp({ email: e, password: p }) : await supabase.auth.signInWithPassword({ email: e, password: p })
    setB(false)
    if (r.error) notify(r.error.message); else if (daftar && !r.data.session) notify('Akun dibuat. Cek email untuk konfirmasi, lalu masuk.')
  }
  return (
    <form onSubmit={go} className={card + ' mx-auto mt-24 max-w-sm space-y-3'}>
      <h1 className="bg-gradient-to-r from-teal-500 to-indigo-500 bg-clip-text text-2xl font-bold text-transparent">UMKM Kita</h1>
      <p className="text-sm text-slate-500">{daftar ? 'Buat akun pemilik usaha' : 'Masuk ke akun usahamu'}</p>
      <input className={inp} type="email" placeholder="Email" value={e} onChange={x => setE(x.target.value)} required />
      <input className={inp} type="password" placeholder="Kata sandi (min. 6 karakter)" value={p} onChange={x => setP(x.target.value)} minLength={6} required />
      <button className={btn + ' w-full'} disabled={b}>{b ? 'Memproses…' : daftar ? 'Daftar' : 'Masuk'}</button>
      <button type="button" className="w-full text-sm text-teal-600" onClick={() => setD(!daftar)}>{daftar ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar'}</button>
    </form>)
}

function Beranda() {
  const [d, setD] = useState(7), [x, setX] = useState<R | null>(null)
  useEffect(() => { (async () => {
    const [s, e, b, i] = await Promise.all([
      supabase.from('penjualan').select('total,hpp_total,tanggal'), supabase.from('pengeluaran').select('jumlah,tanggal'),
      supabase.from('pembelian').select('total_harga'), supabase.from('penjualan_item').select('qty,created_at,produk(nama)')])
    setX({ s: s.data ?? [], e: e.data ?? [], b: b.data ?? [], i: i.data ?? [] })
  })() }, [])
  if (!x) return <Load />
  const from = new Date(Date.now() - (d - 1) * 864e5).toISOString().slice(0, 10)
  const f = (a: R[], k = 'tanggal') => a.filter(r => String(r[k]).slice(0, 10) >= (d === 0 ? '0' : from))
  const sum = (a: R[], k: string) => a.reduce((t, r) => t + num(r[k]), 0)
  const S = f(x.s), omzet = sum(S, 'total'), hpp = sum(S, 'hpp_total'), biaya = sum(f(x.e), 'jumlah')
  const kas = sum(x.s, 'total') - sum(x.e, 'jumlah') - sum(x.b, 'total_harga')
  const top: Record<string, number> = {}
  f(x.i, 'created_at').forEach((r: R) => { const n = r.produk?.nama ?? '—'; top[n] = (top[n] ?? 0) + num(r.qty) })
  const tl = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5), mx = tl[0]?.[1] || 1
  const stat = (l: string, v: number, c = '') => <div className={card}><p className="text-xs text-slate-500">{l}</p><p className={'text-lg font-bold ' + c}>{rupiah(v)}</p></div>
  return (<div className="space-y-3">
    <div className="flex gap-2">{[[1, 'Hari ini'], [7, '7 hari'], [30, '30 hari'], [0, 'Semua']].map(([v, l]) =>
      <button key={v} onClick={() => setD(v as number)} className={'rounded-full px-3 py-1 text-xs ' + (d === v ? 'bg-teal-500 text-white' : 'bg-white/80 text-slate-600')}>{l}</button>)}</div>
    <div className="grid grid-cols-2 gap-3">{stat('Omzet', omzet)}{stat('HPP penjualan', hpp)}{stat('Laba kotor', omzet - hpp)}{stat('Pengeluaran', biaya)}
      {stat('Laba bersih', omzet - hpp - biaya, omzet - hpp - biaya < 0 ? 'text-red-500' : 'text-teal-600')}{stat('Saldo kas', kas)}</div>
    <div className={card}><p className="mb-2 text-sm font-semibold">Produk terlaris</p>
      {tl.length ? tl.map(([n, q]) => <div key={n} className="mb-2"><div className="flex justify-between text-xs"><span>{n}</span><span>{q}</span></div>
        <div className="h-2 rounded bg-slate-100"><div className="h-2 rounded bg-gradient-to-r from-teal-400 to-indigo-400" style={{ width: (q / mx) * 100 + '%' }} /></div></div>) : <Empty t="Belum ada penjualan" />}</div>
  </div>)
}

function Bahan() {
  const [r, load] = useRows('bahan')
  const [n, setN] = useState(''), [u, setU] = useState('g'), [m, setM] = useState('0')
  const [bid, setB] = useState(''), [q, setQ] = useState(''), [bu, setBu] = useState(''), [tot, setT] = useState('')
  const add = (e: FormEvent) => { e.preventDefault(); run(supabase.from('bahan').insert({ nama: n, satuan: u, stok_min: num(m) }), 'Bahan ditambahkan', () => { setN(''); load() }) }
  const beli = (e: FormEvent) => {
    e.preventDefault(); const b = r!.find(x => x.id === bid); if (!b) return
    const qty = konversi(num(q), bu || b.satuan, b.satuan)
    if (isNaN(qty)) return notify('Satuan tidak cocok dengan satuan bahan (' + b.satuan + ')')
    run(supabase.from('pembelian').insert({ bahan_id: bid, qty, total_harga: num(tot), tanggal: today() }), 'Pembelian tercatat, stok diperbarui', () => { setQ(''); setT(''); load() })
  }
  return (<div className="space-y-3">
    <form onSubmit={add} className={card + ' space-y-2'}><p className="text-sm font-semibold">Bahan baru</p>
      <input className={inp} placeholder="Nama bahan" value={n} onChange={e => setN(e.target.value)} required />
      <div className="flex gap-2"><select className={inp} value={u} onChange={e => setU(e.target.value)}>{SATUAN.map(s => <option key={s}>{s}</option>)}</select>
        <input className={inp} type="number" placeholder="Stok minimum" value={m} onChange={e => setM(e.target.value)} /></div><button className={btn}>Tambah</button></form>
    <form onSubmit={beli} className={card + ' space-y-2'}><p className="text-sm font-semibold">Catat pembelian</p>
      <select className={inp} value={bid} onChange={e => setB(e.target.value)} required><option value="">Pilih bahan</option>{r?.map(b => <option key={b.id} value={b.id}>{b.nama} ({b.satuan})</option>)}</select>
      <div className="flex gap-2"><input className={inp} type="number" step="any" placeholder="Jumlah" value={q} onChange={e => setQ(e.target.value)} required />
        <select className={inp} value={bu} onChange={e => setBu(e.target.value)}><option value="">satuan bahan</option>{SATUAN.map(s => <option key={s}>{s}</option>)}</select></div>
      <input className={inp} type="number" placeholder="Total harga (Rp)" value={tot} onChange={e => setT(e.target.value)} required /><button className={btn}>Simpan pembelian</button></form>
    <div className={card}>{!r ? <Load /> : !r.length ? <Empty t="Belum ada bahan" /> : r.map(b => <div key={b.id} className="flex justify-between border-b border-slate-100 py-2 text-sm last:border-0">
      <div><p className="font-medium">{b.nama}</p><p className="text-xs text-slate-500">{rupiah(b.harga_per_satuan)} / {b.satuan}</p></div>
      <p className={num(b.stok) <= num(b.stok_min) ? 'font-semibold text-red-500' : ''}>{+num(b.stok).toFixed(2)} {b.satuan}{num(b.stok) <= num(b.stok_min) && ' ⚠ menipis'}</p></div>)}</div></div>)
}

function Produk() {
  const [r, load] = useRows('produk'), [n, setN] = useState(''), [h, setH] = useState(''), [pid, setP] = useState(''), [bt, setBt] = useState('1')
  const add = (e: FormEvent) => { e.preventDefault(); run(supabase.from('produk').insert({ nama: n, harga_jual: num(h) }), 'Produk ditambahkan', () => { setN(''); setH(''); load() }) }
  const prod = (e: FormEvent) => { e.preventDefault(); run(supabase.rpc('catat_produksi', { p_produk: pid, p_batch: num(bt), p_tanggal: today() }), 'Produksi dicatat: bahan berkurang, stok produk bertambah', load) }
  return (<div className="space-y-3">
    <form onSubmit={add} className={card + ' space-y-2'}><p className="text-sm font-semibold">Produk baru</p>
      <input className={inp} placeholder="Nama produk" value={n} onChange={e => setN(e.target.value)} required />
      <input className={inp} type="number" placeholder="Harga jual (Rp)" value={h} onChange={e => setH(e.target.value)} required /><button className={btn}>Tambah</button></form>
    <form onSubmit={prod} className={card + ' space-y-2'}><p className="text-sm font-semibold">Catat produksi (butuh resep dari tab Kalkulator)</p>
      <select className={inp} value={pid} onChange={e => setP(e.target.value)} required><option value="">Pilih produk</option>{r?.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}</select>
      <input className={inp} type="number" step="any" placeholder="Jumlah batch" value={bt} onChange={e => setBt(e.target.value)} required /><button className={btn}>Produksi</button></form>
    <div className={card}>{!r ? <Load /> : !r.length ? <Empty t="Belum ada produk" /> : r.map(p => <div key={p.id} className="flex justify-between border-b border-slate-100 py-2 text-sm last:border-0">
      <div><p className="font-medium">{p.nama}</p><p className="text-xs text-slate-500">HPP {rupiah(p.hpp)} · margin {marginDari(num(p.harga_jual), num(p.hpp)).toFixed(1)}%</p></div>
      <div className="text-right"><p>{rupiah(p.harga_jual)}</p><p className="text-xs text-slate-500">stok {+num(p.stok).toFixed(2)}</p></div></div>)}</div></div>)
}

function Kalkulator() {
  const [bahan] = useRows('bahan'), [produk] = useRows('produk')
  const [it, setIt] = useState<R[]>([{ bahan_id: '', qty: '', unit: '' }])
  const [tn, setTn] = useState('0'), [oh, setOh] = useState('0'), [pk, setPk] = useState('0'), [hs, setHs] = useState('1')
  const [mg, setMg] = useState('40'), [mk, setMk] = useState('50'), [ds, setDs] = useState('10'), [pid, setP] = useState('')
  const upd = (i: number, k: string, v: string) => setIt(it.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
  const biayaBahan = it.reduce((t, x) => { const b = bahan?.find(y => y.id === x.bahan_id); if (!b) return t; const q = konversi(num(x.qty), x.unit || b.satuan, b.satuan); return t + (isNaN(q) ? 0 : q * num(b.harga_per_satuan)) }, 0)
  const batch = biayaBahan + num(tn) + num(oh) + num(pk), hpp = hppPerUnit(batch, num(hs))
  const hM = hargaMargin(hpp, num(mg)), hK = hargaMarkup(hpp, num(mk)), promo = hM * (1 - num(ds) / 100)
  async function simpan() {
    const items = it.filter(x => x.bahan_id && num(x.qty) > 0).map(x => { const b = bahan!.find(y => y.id === x.bahan_id)!; return { bahan_id: x.bahan_id, qty: konversi(num(x.qty), x.unit || b.satuan, b.satuan) } })
    if (!pid || !items.length || items.some(i => isNaN(i.qty))) return notify('Pilih produk, isi bahan dengan satuan yang cocok')
    const { data, error } = await supabase.from('resep').upsert({ produk_id: pid, hasil_batch: num(hs), biaya_tenaga: num(tn), biaya_overhead: num(oh), biaya_packaging: num(pk) }, { onConflict: 'produk_id' }).select().single()
    if (error) return notify('Gagal: ' + error.message)
    await supabase.from('resep_item').delete().eq('resep_id', data.id)
    run(supabase.from('resep_item').insert(items.map(i => ({ ...i, resep_id: data.id }))), 'Resep disimpan')
  }
  const row = (l: string, v: string) => <div className="flex justify-between text-sm"><span className="text-slate-500">{l}</span><span className="font-semibold">{v}</span></div>
  return (<div className="space-y-3">
    <div className={card + ' space-y-2'}><p className="text-sm font-semibold">Resep & HPP per batch</p>
      {it.map((x, i) => <div key={i} className="flex gap-1"><select className={inp} value={x.bahan_id} onChange={e => upd(i, 'bahan_id', e.target.value)}><option value="">Bahan</option>{bahan?.map(b => <option key={b.id} value={b.id}>{b.nama}</option>)}</select>
        <input className={inp + ' !w-20'} type="number" step="any" placeholder="Qty" value={x.qty} onChange={e => upd(i, 'qty', e.target.value)} />
        <select className={inp + ' !w-20'} value={x.unit} onChange={e => upd(i, 'unit', e.target.value)}><option value="">asli</option>{SATUAN.map(s => <option key={s}>{s}</option>)}</select></div>)}
      <button className="text-sm text-teal-600" onClick={() => setIt([...it, { bahan_id: '', qty: '', unit: '' }])}>+ Tambah bahan</button>
      {[['Tenaga kerja / batch', tn, setTn], ['Overhead / batch', oh, setOh], ['Packaging / batch', pk, setPk], ['Hasil (unit) / batch', hs, setHs]].map(([l, v, s]: any) =>
        <label key={l} className="block text-xs text-slate-500">{l}<input className={inp} type="number" step="any" value={v} onChange={e => s(e.target.value)} /></label>)}
      <div className="flex gap-2"><select className={inp} value={pid} onChange={e => setP(e.target.value)}><option value="">Simpan ke produk…</option>{produk?.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}</select><button className={btn} onClick={simpan}>Simpan</button></div></div>
    <div className={card + ' space-y-1'}>{row('Biaya bahan', rupiah(biayaBahan))}{row('Total biaya / batch', rupiah(batch))}{row('HPP / unit', rupiah(hpp))}</div>
    <div className={card + ' space-y-2'}><p className="text-sm font-semibold">Harga jual</p>
      <div className="flex gap-2"><label className="text-xs text-slate-500">Target margin %<input className={inp} type="number" value={mg} onChange={e => setMg(e.target.value)} /></label>
        <label className="text-xs text-slate-500">Markup %<input className={inp} type="number" value={mk} onChange={e => setMk(e.target.value)} /></label>
        <label className="text-xs text-slate-500">Diskon %<input className={inp} type="number" value={ds} onChange={e => setDs(e.target.value)} /></label></div>
      {row('Harga (margin ' + mg + '%) = HPP/(1−m)', rupiah(hM))}{row('Laba / unit', rupiah(hM - hpp))}
      {row('Harga (markup ' + mk + '%) = HPP×(1+k)', rupiah(hK))}{row('Laba / unit', rupiah(hK - hpp))}
      {row('Promo diskon ' + ds + '% dari harga margin', rupiah(promo))}{row('Laba promo / unit · margin', rupiah(promo - hpp) + ' · ' + marginDari(promo, hpp).toFixed(1) + '%')}</div></div>)
}

function Jual() {
  const [produk, load] = useRows('produk'), [pj] = useRows('penjualan')
  const [pid, setP] = useState(''), [q, setQ] = useState('1'), [cart, setC] = useState<R[]>([]), [ds, setDs] = useState('0'), [mt, setMt] = useState('Tunai')
  const harga = (id: string) => num(produk?.find(p => p.id === id)?.harga_jual)
  const total = cart.reduce((t, c) => t + c.qty * harga(c.produk_id), 0) - num(ds)
  const add = () => { if (!pid || num(q) <= 0) return; setC([...cart, { produk_id: pid, qty: num(q) }]); setQ('1') }
  const simpan = () => run(supabase.rpc('catat_penjualan', { p_items: cart, p_diskon: num(ds), p_metode: mt, p_tanggal: today() }), 'Penjualan tersimpan', () => { setC([]); setDs('0'); load() })
  return (<div className="space-y-3">
    <div className={card + ' space-y-2'}><p className="text-sm font-semibold">Transaksi baru</p>
      <div className="flex gap-2"><select className={inp} value={pid} onChange={e => setP(e.target.value)}><option value="">Pilih produk</option>{produk?.map(p => <option key={p.id} value={p.id}>{p.nama} · {rupiah(p.harga_jual)} · stok {+num(p.stok).toFixed(1)}</option>)}</select>
        <input className={inp + ' !w-20'} type="number" value={q} onChange={e => setQ(e.target.value)} /><button className={btn} onClick={add}>+</button></div>
      {cart.map((c, i) => <div key={i} className="flex justify-between text-sm"><span>{produk?.find(p => p.id === c.produk_id)?.nama} × {c.qty}</span><button className="text-red-400" onClick={() => setC(cart.filter((_, j) => j !== i))}>hapus</button></div>)}
      <div className="flex gap-2"><input className={inp} type="number" placeholder="Diskon (Rp)" value={ds} onChange={e => setDs(e.target.value)} />
        <select className={inp} value={mt} onChange={e => setMt(e.target.value)}>{['Tunai', 'QRIS', 'Transfer'].map(m => <option key={m}>{m}</option>)}</select></div>
      <p className="text-right text-lg font-bold">{rupiah(total)}</p><button className={btn + ' w-full'} disabled={!cart.length} onClick={simpan}>Simpan penjualan</button></div>
    <div className={card}><p className="mb-1 text-sm font-semibold">Riwayat</p>{!pj ? <Load /> : !pj.length ? <Empty t="Belum ada transaksi" /> : pj.slice(0, 30).map(s => <div key={s.id} className="flex justify-between border-b border-slate-100 py-2 text-sm last:border-0">
      <div><p>{s.tanggal} · {s.metode}</p><p className="text-xs text-teal-600">laba {rupiah(s.laba)}</p></div><p className="font-semibold">{rupiah(s.total)}</p></div>)}</div></div>)
}

function Biaya() {
  const [r, load] = useRows('pengeluaran'), [k, setK] = useState('Listrik'), [j, setJ] = useState(''), [c, setC] = useState('')
  const kat = ['Listrik', 'Gas', 'Transportasi', 'Packaging', 'Gaji', 'Sewa', 'Lainnya']
  const add = (e: FormEvent) => { e.preventDefault(); run(supabase.from('pengeluaran').insert({ kategori: k, jumlah: num(j), catatan: c, tanggal: today() }), 'Pengeluaran tercatat', () => { setJ(''); setC(''); load() }) }
  return (<div className="space-y-3"><form onSubmit={add} className={card + ' space-y-2'}><p className="text-sm font-semibold">Pengeluaran operasional</p>
    <select className={inp} value={k} onChange={e => setK(e.target.value)}>{kat.map(x => <option key={x}>{x}</option>)}</select>
    <input className={inp} type="number" placeholder="Jumlah (Rp)" value={j} onChange={e => setJ(e.target.value)} required />
    <input className={inp} placeholder="Catatan" value={c} onChange={e => setC(e.target.value)} /><button className={btn}>Simpan</button>
    <p className="text-xs text-slate-400">Pembelian bahan baku dicatat di tab Bahan (sudah masuk HPP, jangan dicatat dua kali).</p></form>
    <div className={card}>{!r ? <Load /> : !r.length ? <Empty t="Belum ada pengeluaran" /> : r.map(x => <div key={x.id} className="flex justify-between border-b border-slate-100 py-2 text-sm last:border-0">
      <div><p>{x.kategori}</p><p className="text-xs text-slate-500">{x.tanggal} {x.catatan}</p></div><p className="font-semibold">{rupiah(x.jumlah)}</p></div>)}</div></div>)
}

const TABS: [string, string, () => JSX.Element][] = [['Beranda', '🏠', Beranda], ['Bahan', '🧂', Bahan], ['Jual', '＋', Jual], ['Produk', '📦', Produk], ['Kalkulator', '🧮', Kalkulator], ['Biaya', '💸', Biaya]]

export default function App() {
  const [ses, setSes] = useState<any>(undefined), [tab, setTab] = useState(0), [msg, setMsg] = useState('')
  notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }
  useEffect(() => { supabase.auth.getSession().then(({ data }) => setSes(data.session)); const { data } = supabase.auth.onAuthStateChange((_, s) => setSes(s)); return () => data.subscription.unsubscribe() }, [])
  if (ses === undefined) return <Load />
  const Page = TABS[tab][2]
  return (<div className="mx-auto max-w-2xl p-4 pb-28">
    {msg && <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-slate-800 px-4 py-2 text-sm text-white shadow-lg">{msg}</div>}
    {!ses ? <Auth /> : <>
      <header className="mb-4 flex items-center justify-between"><h1 className="bg-gradient-to-r from-teal-500 to-indigo-500 bg-clip-text text-xl font-bold text-transparent">{TABS[tab][0]}</h1>
        <button className="text-xs text-slate-400" onClick={() => supabase.auth.signOut()}>Keluar</button></header>
      <Page key={tab} />
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-2xl justify-around border-t border-white/70 bg-white/80 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        {TABS.map(([l, i], n) => <button key={l} onClick={() => setTab(n)} className={'flex flex-col items-center px-2 py-2 text-[11px] ' + (tab === n ? 'text-teal-600' : 'text-slate-400')}>
          <span className={n === 2 ? '-mt-6 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-teal-500 to-indigo-500 text-2xl text-white shadow-lg' : 'text-lg'}>{i}</span>{l}</button>)}
      </nav></>}
  </div>)
}
