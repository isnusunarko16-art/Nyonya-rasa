// Persentase dalam angka biasa (40 = 40%).
const U: Record<string, [string, number]> = {
  mg: ['massa', 0.001], g: ['massa', 1], kg: ['massa', 1000],
  ml: ['vol', 1], l: ['vol', 1000], sdt: ['vol', 5], sdm: ['vol', 15],
  pcs: ['pcs', 1], butir: ['pcs', 1], lusin: ['pcs', 12], pak: ['pak', 1], bungkus: ['bungkus', 1] }
export const SATUAN = Object.keys(U)
export function konversi(q: number, dari: string, ke: string): number {
  const a = U[dari], b = U[ke]
  if (!a || !b || a[0] !== b[0]) return NaN
  return (q * a[1]) / b[1]
}
export const hppPerUnit = (totalBiaya: number, hasil: number) => (hasil > 0 ? totalBiaya / hasil : 0)
export const hargaMarkup = (hpp: number, markup: number) => hpp * (1 + markup / 100)
export const hargaMargin = (hpp: number, margin: number) => (margin < 100 ? hpp / (1 - margin / 100) : NaN)
export const marginDari = (harga: number, hpp: number) => (harga > 0 ? ((harga - hpp) / harga) * 100 : 0)
export const markupDari = (harga: number, hpp: number) => (hpp > 0 ? ((harga - hpp) / hpp) * 100 : 0)
export const labaKotor = (omzet: number, hppJual: number) => omzet - hppJual
export const labaBersih = (kotor: number, biayaOperasional: number) => kotor - biayaOperasional
export const rupiah = (n: number) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')
