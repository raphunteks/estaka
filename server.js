

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Redis } = require('@upstash/redis');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || 'https://aksharadental.vercel.app';
const GAS_API_URL = process.env.GAS_API_URL || 'https://script.google.com/macros/s/AKfycbzZ8HVyql76ZZbVY7qk8HISf9h8d8xfs6zb4NlrjUZu_MkEYlZMLbjoS300_ap80h-e/exec';
const DEFAULT_RAILWAY_URL = process.env.RAILWAY_DEFAULT_URL || 'https://btwwa-akshra-production.up.railway.app';

// ============================================================================
// 1. KATALOG LENGKAP MODEL GOOGLE AI STUDIO (GAMBAR 1 - 5) & OPENAI / GROQ
// ============================================================================

const SUPPORTED_AI_MODELS = [
  // Gemini 3 Series (Gambar 1, 2, 3)
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', category: 'Gemini 3 Series', description: 'High Throughput Workhorse (Default Rekomendasi)' },
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', category: 'Gemini 3 Series', description: 'Ultra-Fast Next-Gen Precision' },
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', category: 'Gemini 3 Series', description: 'High Performance & Speed' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', category: 'Gemini 3 Series', description: 'Rapid Clinical Triage' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', category: 'Gemini 3 Series', description: 'Lightweight & High RPM' },
  { id: 'gemini-3.5-transcribe', name: 'Gemini 3.5 Transcribe', category: 'Gemini 3 Series', description: 'Live Audio & Transcription' },
  { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro', category: 'Gemini 3 Series', description: 'Deep Clinical Reasoning' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', category: 'Gemini 3 Series', description: 'Low Footprint High Speed' },
  { id: 'gemini-3.1-flash-tts', name: 'Gemini 3.1 Flash TTS', category: 'Gemini 3 Series', description: 'Multimodal Text-to-Speech' },
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash', category: 'Gemini 3 Series', description: 'Core Generative Engine' },
  { id: 'gemini-omni-1.1-flash', name: 'Gemini Omni 1.1 Flash', category: 'Gemini 3 Series', description: 'Omni Multimodal Generative' },
  { id: 'gemini-omni-flash', name: 'Gemini Omni Flash', category: 'Gemini 3 Series', description: 'Omni Fast Vision & Voice' },

  // Gemini 2 & 2.5 Series (Gambar 1, 2, 3)
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', category: 'Gemini 2.5 Series', description: 'Complex Analytical Triage' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', category: 'Gemini 2.5 Series', description: 'Stable Fast Conversational' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', category: 'Gemini 2.5 Series', description: 'Ultra-Low Latency' },
  { id: 'gemini-2.5-flash-tts', name: 'Gemini 2.5 Flash TTS', category: 'Gemini 2.5 Series', description: 'Multi-modal Audio Speech' },
  { id: 'gemini-2.5-pro-tts', name: 'Gemini 2.5 Pro TTS', category: 'Gemini 2.5 Series', description: 'High-Fidelity Audio Synthesis' },
  { id: 'gemini-2-flash', name: 'Gemini 2 Flash', category: 'Gemini 2 Series', description: 'High Performance Text Engine' },
  { id: 'gemini-2-flash-lite', name: 'Gemini 2 Flash Lite', category: 'Gemini 2 Series', description: 'Ultra-Fast Lightweight' },

  // Specialized Agents & Open Models (Gambar 1, 3)
  { id: 'deep-research-pro-preview', name: 'Deep Research Pro Preview', category: 'Specialist Agents', description: 'Agentic Deep Clinical Synthesizer' },
  { id: 'antigravity', name: 'Antigravity', category: 'Specialist Agents', description: 'Autonomous High-RPM Agent Engine' },
  { id: 'computer-use-preview', name: 'Computer Use Preview', category: 'Specialist Agents', description: 'System Automation Agent' },
  { id: 'gemma-4-31b', name: 'Gemma 4 31B', category: 'Gemma Open Models', description: 'High Capability Open Architecture' },
  { id: 'gemma-4-26b', name: 'Gemma 4 26B', category: 'Gemma Open Models', description: 'Compact Open Architecture' },

  // OpenAI ChatGPT Series
  { id: 'gpt-4o', name: 'GPT-4o (Omni)', category: 'OpenAI ChatGPT', description: 'Flagship Multimodal Cerdas & Cepat' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', category: 'OpenAI ChatGPT', description: 'Ringan, Cepat & Hemat Token' },
  { id: 'o3-mini', name: 'OpenAI o3-mini', category: 'OpenAI ChatGPT', description: 'Penalaran Logika & STEM Medis Mendalam' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', category: 'OpenAI ChatGPT', description: 'Kapasitas Konteks Panjang' },

  // Groq LPU Ultra-Speed Series
  { id: 'openai/gpt-oss-120b', name: 'Groq GPT-OSS 120B', category: 'Groq LPU AI', description: 'Flagship Inference Cepat LPU' },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', category: 'Groq LPU AI', description: 'Performa Penalaran Tinggi' },
  { id: 'openai/gpt-oss-20b', name: 'Groq GPT-OSS 20B', category: 'Groq LPU AI', description: 'Respon Kilat Triage Klinis' }
];

// ============================================================================
// 2. INISIALISASI DATABASE UPSTASH REDIS & IN-MEMORY CACHE STORAGE
// ============================================================================

let redis = null;
const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

if (redisUrl && redisToken) {
  try {
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
  } catch (err) {
    console.warn('[Redis] Gagal inisialisasi Upstash Redis:', err.message);
  }
}

const memoryDB = {
  SETTINGS: [],
  USERS: [],
  DOKTER: [],
  PASIEN: [],
  ANTREAN: [],
  CPPT_MEDIS: [],
  FARMASI_RESEP: [],
  MASTER_OBAT: [],
  LABORATORIUM: [],
  POS_SHIFT: [],
  TRANSAKSI_KASIR: [],
  DOKUMEN_MEDIS: [],
  AUDIT_LOG: [],
  Admins: [],
  Clients: [],
  ChatLogs: [],
  Templates: [],
  BroadcastQueue: [],
  Bookings: [],
  ActivityLogs: []
};

async function getTableData(tableName) {
  const key = `AKSHARA_DB:${tableName}`;
  if (redis) {
    try {
      const data = await redis.get(key);
      if (data) {
        return typeof data === 'string' ? JSON.parse(data) : data;
      }
    } catch (e) {
      console.warn(`[Redis Get Error: ${tableName}]:`, e.message);
    }
  }
  return memoryDB[tableName] || [];
}

async function setTableData(tableName, dataArray) {
  const key = `AKSHARA_DB:${tableName}`;
  memoryDB[tableName] = dataArray;
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(dataArray));
      return true;
    } catch (e) {
      console.warn(`[Redis Set Error: ${tableName}]:`, e.message);
    }
  }
  return false;
}

// ============================================================================
// 3. SEEDING DATABASE OTOMATIS (KLINIS & PORTAL V2 DENGAN DEFAULT GEMINI 3.5 FLASH)
// ============================================================================

async function initDatabaseStorage() {
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

  // 1. SETTINGS TERPADU
  const currentSettings = await getTableData('SETTINGS');
  if (!currentSettings || currentSettings.length === 0) {
    const defaultSettings = [
      { key: 'GEMINI_API_KEY', val: process.env.GEMINI_API_KEY || '', desc: 'Kunci API Google AI Studio / Gemini (AQ... atau AIzaSy...)' },
      { key: 'GEMINI_MODEL', val: process.env.GEMINI_MODEL || 'gemini-3.5-flash', desc: 'Model default Google Gemini (Default: Gemini 3.5 Flash)' },
      { key: 'OPENAI_API_KEY', val: process.env.OPENAI_API_KEY || '', desc: 'Kunci API OpenAI ChatGPT' },
      { key: 'OPENAI_MODEL', val: process.env.OPENAI_MODEL || 'gpt-4o-mini', desc: 'Model default OpenAI ChatGPT' },
      { key: 'GROQ_API_KEY', val: process.env.GROQ_API_KEY || '', desc: 'Kunci API Groq LPU Inference' },
      { key: 'GROQ_MODEL', val: 'openai/gpt-oss-120b', desc: 'Model default Groq AI Agent' },
      { key: 'GROQ_TTS_MODEL', val: 'canopylabs/orpheus-arabic-saudi', desc: 'Model default Text-to-Speech' },
      { key: 'GROQ_TTS_VOICE', val: 'abdullah', desc: 'Persona suara default pemanggil antrean' },
      { key: 'RAILWAY_DEFAULT_URL', val: DEFAULT_RAILWAY_URL, desc: 'URL instance Baileys di Railway Cloud' },
      { key: 'RAILWAY_PING_TIMEOUT', val: '4000', desc: 'Timeout ping Railway (ms)' },
      { key: 'SYNC_SECRET_TOKEN', val: 'AKSHARA_CLINIC_SECRET_2026', desc: 'Token otentikasi bot Railway' },
      { key: 'KLINIK_NAMA', val: 'Klinik Akshara Dental Space', desc: 'Nama resmi entitas klinik' },
      { key: 'KLINIK_ALAMAT', val: 'Jl. Andi Tonro Blok F No.30, Bongaya, Kec. Tamalate, Kota Makassar, Sulawesi Selatan 90131', desc: 'Alamat operasional klinik' },
      { key: 'KLINIK_TELEPON', val: '+62 853-3892-2586', desc: 'Kontak WhatsApp & Layanan Pasien' },
      { key: 'KLINIK_LOGO_URL', val: `${BASE_URL}/img/axalogo.png`, desc: 'URL Logo Klinik Resmi' },
      { key: 'KLINIK_SLOGAN', val: 'Modern Dental Care & Aesthetic Space', desc: 'Slogan klinik' },
      { key: 'KLINIK_EMAIL', val: 'care@aksharadental.space', desc: 'Email resmi klinik' },
      { key: 'KLINIK_JAM_OPERASIONAL', val: 'Setiap Hari, 08:00 – 21:00 WITA', desc: 'Jam layanan operasional' },
      { key: 'KLINIK_INSTAGRAM', val: 'https://instagram.com/aksharadental', desc: 'Instagram resmi klinik' },
      { key: 'KLINIK_GMAPS_EMBED', val: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d727.2324807218503!2d119.4172300669712!3d-5.171147028938255!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dbf1d71cf75a47d%3A0xa90a84353b81134a!2sJl.%20Andi%20Tonro%20Blok%20F%20No.30%2C%20Bongaya%2C%20Kec.%20Tamalate%2C%20Kota%20Makassar%2C%20Sulawesi%20Selatan%2090131!5e0!3m2!1sid!2sid!4v1788866524919!5m2!1sid!2sid', desc: 'Google Maps Embed URL' },
      { key: 'KLINIK_FOOTER_NOTE', val: 'Terakreditasi Paripurna Kemenkes RI — No. Akreditasi: YM.02.01/VI/2024', desc: 'Catatan akreditasi legalitas' },
      { key: 'TV_NOTIF_SOUND', val: 'true', desc: 'Bunyikan nada lonceng panggilan antrean' },
      { key: 'TARIF_ADMINISTRASI', val: '25000', desc: 'Biaya administrasi standar' },
      { key: 'TARIF_KONSUL_DOKTER_GIGI', val: '125000', desc: 'Tarif standar periksa dokter gigi' },
      { key: 'TARIF_KONSUL_SPESIALIS', val: '175000', desc: 'Tarif standar periksa dokter spesialis' }
    ];
    await setTableData('SETTINGS', defaultSettings);
  }

  // 2. DOKTER RESMI AKSHARA DENTAL SPACE
  const currentDokter = await getTableData('DOKTER');
  if (!currentDokter || currentDokter.length === 0) {
    const defaultDokter = [
      { id: 'DOC-001', nama: 'drg. Hj. Kurniawaty, Sp.KG', kategori: 'Dokter Gigi Spesialis', spesialisasi: 'Konservasi Gigi (Endodontik)', sip: 'SIP: 503/SIP-DS/2024/001', hari: 'Senin - Sabtu', jamMulai: '16:00', jamSelesai: '21:00', kuota: '20' },
      { id: 'DOC-002', nama: 'drg. M. Aksa Arsyad', kategori: 'Dokter Gigi', spesialisasi: 'Kedokteran Gigi Umum & Estetika', sip: 'SIP: 503/SIP-DG/2024/002', hari: 'Senin - Sabtu', jamMulai: '09:00', jamSelesai: '16:00', kuota: '25' },
      { id: 'DOC-003', nama: 'drg. Tasya Awaliyah Arsyad', kategori: 'Dokter Gigi', spesialisasi: 'Kedokteran Gigi Umum & Estetika', sip: 'SIP: 503/SIP-DG/2024/003', hari: 'Senin - Sabtu', jamMulai: '13:00', jamSelesai: '20:00', kuota: '25' }
    ];
    await setTableData('DOKTER', defaultDokter);
  }

  // 3. USERS (STAF KLINIS V1)
  const currentUsers = await getTableData('USERS');
  if (!currentUsers || currentUsers.length === 0) {
    const defaultUsers = [
      { userId: 'USR-001', username: 'admin', passwordHash: 'admin123', fullName: 'Super Administrator Akshara', role: 'Admin', poliklinikId: 'POLI-ALL', status: 'Active' },
      { userId: 'USR-002', username: 'drg_kurniawaty', passwordHash: 'dokter123', fullName: 'drg. Hj. Kurniawaty, Sp.KG', role: 'Dokter', poliklinikId: 'DOC-001', status: 'Active' },
      { userId: 'USR-003', username: 'drg_aksa', passwordHash: 'dokter123', fullName: 'drg. M. Aksa Arsyad', role: 'Dokter', poliklinikId: 'DOC-002', status: 'Active' },
      { userId: 'USR-004', username: 'drg_tasya', passwordHash: 'dokter123', fullName: 'drg. Tasya Awaliyah Arsyad', role: 'Dokter', poliklinikId: 'DOC-003', status: 'Active' },
      { userId: 'USR-005', username: 'apoteker_dewi', passwordHash: 'farmasi123', fullName: 'Dewi Sartika S.Farm, Apt', role: 'Farmasi', poliklinikId: 'APOTEK', status: 'Active' },
      { userId: 'USR-006', username: 'lab_budi', passwordHash: 'lab123', fullName: 'Budi Santoso A.Md.AK', role: 'Laboratorium', poliklinikId: 'LAB-SENTRAL', status: 'Active' },
      { userId: 'USR-007', username: 'kasir_siti', passwordHash: 'kasir123', fullName: 'Siti Rahmawati', role: 'Kasir', poliklinikId: 'KASIR-UTAMA', status: 'Active' }
    ];
    await setTableData('USERS', defaultUsers);
  }

  // 4. ADMINS (PORTAL BOT RAILWAY V2)
  const currentAdmins = await getTableData('Admins');
  if (!currentAdmins || currentAdmins.length === 0) {
    const defaultAdmins = [
      { adminId: 'ADM-0001', username: 'superadmin', password: 'admin123', fullName: 'Super Administrator Akshara', role: 'Superadmin', createdAt: nowStr },
      { adminId: 'ADM-0002', username: 'operator1', password: 'op123', fullName: 'Operator Medis Akshara', role: 'Operator Medis', createdAt: nowStr }
    ];
    await setTableData('Admins', defaultAdmins);
  }

  // 5. MASTER OBAT DENTAL LENGKAP
  const currentObat = await getTableData('MASTER_OBAT');
  if (!currentObat || currentObat.length === 0) {
    const defaultObat = [
      { obatId: 'OBAT-001', nama: 'Amoxicillin 500mg', kategori: 'Antibiotik', satuan: 'Strip', stok: 120, stokMin: 20, kadaluwarsa: '2027-12-31', harga: 12000 },
      { obatId: 'OBAT-002', nama: 'Asam Mefenamat 500mg', kategori: 'Analgesik', satuan: 'Strip', stok: 180, stokMin: 25, kadaluwarsa: '2027-10-31', harga: 8500 },
      { obatId: 'OBAT-003', nama: 'Chlorhexidine Gluconate 0.2%', kategori: 'Antiseptik Kumur', satuan: 'Botol', stok: 45, stokMin: 10, kadaluwarsa: '2026-11-30', harga: 35000 },
      { obatId: 'OBAT-004', nama: 'Paracetamol 500mg', kategori: 'Antipiretik', satuan: 'Strip', stok: 300, stokMin: 30, kadaluwarsa: '2028-01-15', harga: 6000 },
      { obatId: 'OBAT-005', nama: 'Aloclair Plus Gel', kategori: 'Obat Sariawan', satuan: 'Tube', stok: 35, stokMin: 8, kadaluwarsa: '2027-05-20', harga: 85000 },
      { obatId: 'OBAT-006', nama: 'Pasta Gigi Sensodyne Multi Action', kategori: 'Produk Dental', satuan: 'Pcs', stok: 60, stokMin: 10, kadaluwarsa: '2027-08-10', harga: 48000 },
      { obatId: 'OBAT-007', nama: 'Dental Floss Waxed Mint 50m', kategori: 'Produk Dental', satuan: 'Pcs', stok: 40, stokMin: 10, kadaluwarsa: '2028-03-01', harga: 25000 },
      { obatId: 'OBAT-008', nama: 'Cataflam 50mg (Diclofenac Potassium)', kategori: 'Anti-inflamasi', satuan: 'Strip', stok: 95, stokMin: 15, kadaluwarsa: '2027-09-14', harga: 75000 },
      { obatId: 'OBAT-009', nama: 'Sikat Gigi Orthodontic Ultra Soft', kategori: 'Produk Dental', satuan: 'Pcs', stok: 50, stokMin: 12, kadaluwarsa: '2028-12-31', harga: 32000 },
      { obatId: 'OBAT-010', nama: 'Cefixime 100mg Kapsul', kategori: 'Antibiotik', satuan: 'Strip', stok: 80, stokMin: 15, kadaluwarsa: '2027-06-30', harga: 28000 },
      { obatId: 'OBAT-011', nama: 'Dexamethasone 0.5mg', kategori: 'Kortikosteroid', satuan: 'Strip', stok: 110, stokMin: 20, kadaluwarsa: '2027-05-30', harga: 5000 },
      { obatId: 'OBAT-012', nama: 'Metronidazole 500mg', kategori: 'Antibiotik Anaerob', satuan: 'Strip', stok: 90, stokMin: 15, kadaluwarsa: '2027-11-15', harga: 14000 }
    ];
    await setTableData('MASTER_OBAT', defaultObat);
  }

  // 6. TEMPLATES WHATSAPP
  const currentTemplates = await getTableData('Templates');
  if (!currentTemplates || currentTemplates.length === 0) {
    const defaultTemplates = [
      { templateId: 'TPL-0001', name: 'Konfirmasi Reservasi Jadwal Gigi', category: 'Reservasi', content: 'Halo Bapak/Ibu {nama}, pendaftaran janji temu pemeriksaan gigi di Klinik Akshara Dental Space telah terkonfirmasi untuk tanggal {tanggal}. Mohon hadir 15 menit sebelum slot waktu.', updatedAt: nowStr },
      { templateId: 'TPL-0002', name: 'Pengingat Kontrol Saluran Akar & Tambalan', category: 'Kontrol Rutin', content: 'Yth. Pasien {nama}, jadwal evaluasi perawatan saluran akar / kontrol gigi Anda dijadwalkan besok jam {jam}. Balas 1 jika hadir, atau hubungi hotline kami.', updatedAt: nowStr },
      { templateId: 'TPL-0003', name: 'Rincian E-Billing Kasir Gigi', category: 'Billing', content: 'Pemberitahuan: Rincian transaksi perawatan gigi {nama} sebesar Rp {nominal} telah lunas. Struk elektronik dan resume medis dapat diakses di portal resmi.', updatedAt: nowStr }
    ];
    await setTableData('Templates', defaultTemplates);
  }

  // 7. PASIEN
  const currentPasien = await getTableData('PASIEN');
  if (!currentPasien || currentPasien.length === 0) {
    const defaultPasien = [
      { nomorRm: 'RM-0001', nik: '7371101205920001', nama: 'Ahmad Dani Santoso', tanggalLahir: '1992-05-12', jenisKelamin: 'Laki-Laki', noHp: '081234567890', alamat: 'Jl. Pettarani No. 45, Makassar', alergiObat: 'Amoxicillin', tanggalDaftar: '2026-09-01 09:00:00' },
      { nomorRm: 'RM-0002', nik: '7371104809950002', nama: 'Siti Fatimah Azzahra', tanggalLahir: '1995-09-18', jenisKelamin: 'Perempuan', noHp: '085298765432', alamat: 'Jl. Cenderawasih No. 12, Makassar', alergiObat: 'Tidak Ada', tanggalDaftar: '2026-09-02 10:15:00' },
      { nomorRm: 'RM-0003', nik: '7371102511880003', nama: 'Bambang Sudirman', tanggalLahir: '1988-11-25', jenisKelamin: 'Laki-Laki', noHp: '082199887766', alamat: 'Jl. Sultan Alauddin No. 89, Makassar', alergiObat: 'Aspirin', tanggalDaftar: '2026-09-03 11:30:00' }
    ];
    await setTableData('PASIEN', defaultPasien);
  }
}

initDatabaseStorage();

// ============================================================================
// 4. HELPER SEKUENSIAL & AUDIT LOG
// ============================================================================

function getNowTimestamp() {
  const now = new Date();
  return now.toISOString().replace('T', ' ').substring(0, 19);
}

function getTodayDateStr() {
  const now = new Date();
  return now.toISOString().substring(0, 10);
}

function getCompactDateStr() {
  return getTodayDateStr().replace(/[^0-9]/g, '');
}

async function writeAuditLog(user, aksi, modul, detail) {
  try {
    const logs = await getTableData('AUDIT_LOG');
    const logId = 'LOG-' + (logs.length + 1).toString().padStart(5, '0');
    const item = {
      logId,
      timestamp: getNowTimestamp(),
      user: user || 'ANONYMOUS',
      aksi,
      modul,
      detail: typeof detail === 'object' ? JSON.stringify(detail) : String(detail)
    };
    logs.push(item);
    await setTableData('AUDIT_LOG', logs);

    // Sinkronkan juga ke ActivityLogs
    const actLogs = await getTableData('ActivityLogs');
    actLogs.push({
      actId: 'ACT-' + (actLogs.length + 1).toString().padStart(4, '0'),
      timestamp: getNowTimestamp(),
      userId: user || 'ANONYMOUS',
      action: aksi,
      details: typeof detail === 'object' ? JSON.stringify(detail) : String(detail)
    });
    await setTableData('ActivityLogs', actLogs);
  } catch (err) {
    console.error('Audit Log Error:', err.message);
  }
}

async function generateQueueNumber(dateStr) {
  const today = (dateStr || getTodayDateStr()).replace(/[^0-9]/g, '');
  const antrean = await getTableData('ANTREAN');
  const countToday = antrean.filter(a => (a.tanggalKunjungan || '').replace(/[^0-9]/g, '').slice(0, 8) === today.slice(0, 8)).length;
  const nextNum = countToday + 1;
  return {
    kode: `ANT-${today}-${nextNum.toString().padStart(4, '0')}`,
    nomorUrut: nextNum
  };
}

async function generateRMNumber() {
  const pasien = await getTableData('PASIEN');
  const count = pasien.length + 1;
  return `RM-${count.toString().padStart(4, '0')}`;
}

async function generateShiftId(dateStr) {
  const today = (dateStr || getTodayDateStr()).replace(/[^0-9]/g, '');
  const shifts = await getTableData('POS_SHIFT');
  const countToday = shifts.filter(s => (s.tanggal || '').replace(/[^0-9]/g, '').slice(0, 8) === today.slice(0, 8)).length;
  return `SHIFT-${today}-${(countToday + 1).toString().padStart(2, '0')}`;
}

async function generateTransactionId(dateStr) {
  const today = (dateStr || getTodayDateStr()).replace(/[^0-9]/g, '');
  const trx = await getTableData('TRANSAKSI_KASIR');
  const countToday = trx.filter(t => (t.tanggalTransaksi || '').replace(/[^0-9]/g, '').slice(0, 8) === today.slice(0, 8)).length;
  return `TRX-${today}-${(countToday + 1).toString().padStart(4, '0')}`;
}

async function generateDocNumber(docType, dateStr) {
  const ym = (dateStr || getCompactDateStr()).slice(0, 6);
  const docs = await getTableData('DOKUMEN_MEDIS');
  const countType = docs.filter(d => d.jenisDokumen === docType).length + 1;
  let prefix = 'DOC-';
  if (docType === 'Sakit') prefix = 'SKS-';
  else if (docType === 'Sehat') prefix = 'SKSEHAT-';
  else if (docType === 'Lab') prefix = 'LAB-';
  else if (docType === 'Resume') prefix = 'RESUME-';
  return `${prefix}${ym}-${countType.toString().padStart(4, '0')}`;
}

// ============================================================================
// 5. DUAL-AUTHENTICATION ENGINE (USERS & ADMINS)
// ============================================================================

async function executeDualLogin(username, password) {
  const cleanUser = String(username || '').trim().toLowerCase();
  const cleanPass = String(password || '').trim();

  if (!cleanUser || !cleanPass) {
    return { status: 'error', success: false, message: 'Username dan password wajib diisi!' };
  }

  // 1. Cek tabel Admins (Portal V2)
  const admins = await getTableData('Admins');
  const matchedAdmin = admins.find(a => a.username.toLowerCase() === cleanUser && a.password === cleanPass);
  if (matchedAdmin) {
    const adminData = {
      userId: matchedAdmin.adminId,
      adminId: matchedAdmin.adminId,
      username: matchedAdmin.username,
      fullName: matchedAdmin.fullName,
      role: matchedAdmin.role,
      poliklinikId: 'POLI-ALL',
      dokterId: 'DOC-001'
    };
    await writeAuditLog(matchedAdmin.username, 'LOGIN_SUCCESS', 'AUTH_PORTAL_V2', 'Login admin portal V2');
    return { status: 'success', success: true, user: adminData, message: 'Login portal admin berhasil.' };
  }

  // 2. Cek tabel USERS (Staf Medis Klinik V1)
  const users = await getTableData('USERS');
  const matchedUser = users.find(u => u.username.trim().toLowerCase() === cleanUser && u.passwordHash.trim() === cleanPass);

  if (matchedUser) {
    if (matchedUser.status !== 'Active') {
      return { status: 'error', success: false, message: 'Akun telah dinonaktifkan oleh Administrator.' };
    }

    let dokterId = matchedUser.poliklinikId;
    if (matchedUser.role === 'Dokter') {
      const dokters = await getTableData('DOKTER');
      const matchedDoc = dokters.find(d => d.nama.toLowerCase().trim() === matchedUser.fullName.toLowerCase().trim() || d.id === matchedUser.poliklinikId);
      if (matchedDoc) dokterId = matchedDoc.id;
    }

    const userData = {
      userId: matchedUser.userId,
      adminId: matchedUser.userId,
      username: matchedUser.username,
      fullName: matchedUser.fullName,
      role: matchedUser.role,
      poliklinikId: matchedUser.poliklinikId,
      dokterId: dokterId
    };

    await writeAuditLog(matchedUser.username, 'LOGIN_SUCCESS', 'AUTH_KLINIK', `Login berhasil sebagai ${matchedUser.role}`);
    return { status: 'success', success: true, user: userData, message: 'Login berhasil.' };
  }

  await writeAuditLog(cleanUser, 'LOGIN_FAILED', 'AUTH', `Percobaan login gagal untuk username: ${cleanUser}`);
  return { status: 'error', success: false, message: 'Username atau Password salah!' };
}

// ============================================================================
// 6. LOGIKA KLINIS LENGKAP 100% UTUH
// ============================================================================

async function getInitialPublicData() {
  const dokters = await getTableData('DOKTER');
  const settingsList = await getTableData('SETTINGS');
  const settings = {};
  settingsList.forEach(s => {
    if (s.key !== 'GEMINI_API_KEY' && s.key !== 'GROQ_API_KEY' && s.key !== 'OPENAI_API_KEY') {
      settings[s.key] = s.val;
    }
  });

  return {
    status: 'success',
    success: true,
    dokters: dokters,
    settings: settings
  };
}

async function searchPatient(query) {
  if (!query) return { status: 'error', success: false, message: 'Query pencarian kosong' };
  const pasienList = await getTableData('PASIEN');
  const q = String(query).toLowerCase().trim();

  const found = pasienList.find(p =>
    (p.nomorRm && p.nomorRm.toLowerCase() === q) ||
    (p.nik && p.nik.toLowerCase() === q) ||
    (p.nama && p.nama.toLowerCase().includes(q))
  );

  if (found) {
    return {
      status: 'success',
      success: true,
      found: true,
      patient: {
        nomorRm: found.nomorRm,
        nik: found.nik,
        nama: found.nama,
        tanggalLahir: found.tanggalLahir,
        jenisKelamin: found.jenisKelamin,
        noHp: found.noHp,
        alamat: found.alamat,
        alergiObat: found.alergiObat
      }
    };
  }

  return { status: 'success', success: true, found: false };
}

async function registerAppointment(payload) {
  const pasienList = await getTableData('PASIEN');
  const antreanList = await getTableData('ANTREAN');
  const nowStr = getNowTimestamp();
  const todayDate = getTodayDateStr();

  let nomorRm = payload.nomorRm;
  if (!nomorRm || payload.isNewPatient) {
    nomorRm = await generateRMNumber();
    pasienList.push({
      nomorRm: nomorRm,
      nik: payload.nik || '',
      nama: payload.nama || '',
      tanggalLahir: payload.tanggalLahir || '',
      jenisKelamin: payload.jenisKelamin || '',
      noHp: payload.noHp || '',
      alamat: payload.alamat || '',
      alergiObat: payload.alergiObat || 'Tidak Ada',
      tanggalDaftar: nowStr
    });
    await setTableData('PASIEN', pasienList);
  }

  const queueObj = await generateQueueNumber(todayDate);
  antreanList.push({
    kodeAntrean: queueObj.kode,
    tanggalKunjungan: todayDate,
    nomorUrut: queueObj.nomorUrut,
    nomorRm: nomorRm,
    dokterId: payload.dokterId || 'DOC-001',
    ruanganPoli: payload.ruanganPoli || 'Poli Gigi & Spesialis',
    slotWaktu: payload.slotWaktu || 'Hari Ini',
    statusTriage: payload.statusTriage || 'Hijau',
    keluhanUtama: payload.keluhanUtama || '',
    statusAntrean: 'Menunggu',
    waktuDaftar: nowStr,
    waktuDipanggil: '',
    waktuSelesai: ''
  });
  await setTableData('ANTREAN', antreanList);

  await writeAuditLog(payload.nama, 'REGISTRASI_ANTREAN', 'ANTREAN', `RM: ${nomorRm}, Kode: ${queueObj.kode}, Dokter: ${payload.dokterId}`);

  return {
    status: 'success',
    success: true,
    kodeAntrean: queueObj.kode,
    nomorUrut: queueObj.nomorUrut,
    nomorRm: nomorRm,
    nama: payload.nama,
    poli: payload.ruanganPoli
  };
}

async function getQueueTvData(poliFilter) {
  const antreanList = await getTableData('ANTREAN');
  const pasienList = await getTableData('PASIEN');
  const dokterList = await getTableData('DOKTER');
  const todayDate = getTodayDateStr();

  const pasienMap = {};
  pasienList.forEach(p => { pasienMap[p.nomorRm] = p.nama; });

  const dokterMap = {};
  dokterList.forEach(d => { dokterMap[d.id] = { nama: d.nama, poli: d.spesialisasi }; });

  let activeQueue = null;
  const nextQueues = [];

  for (let i = antreanList.length - 1; i >= 0; i--) {
    const r = antreanList[i];
    if (r.tanggalKunjungan !== todayDate) continue;
    if (poliFilter && poliFilter !== 'SEMUA' && r.ruanganPoli !== poliFilter) continue;

    const item = {
      kode: r.kodeAntrean,
      nomorUrut: r.nomorUrut,
      nomorRm: r.nomorRm,
      namaPasien: pasienMap[r.nomorRm] || 'Pasien',
      dokterNama: dokterMap[r.dokterId] ? dokterMap[r.dokterId].nama : 'Dokter Pemeriksa',
      ruanganPoli: r.ruanganPoli,
      status: r.statusAntrean
    };

    if (r.statusAntrean === 'Dipanggil' && !activeQueue) {
      activeQueue = item;
    } else if (r.statusAntrean === 'Menunggu') {
      nextQueues.push(item);
    }
  }

  nextQueues.reverse();
  return {
    status: 'success',
    success: true,
    activeQueue: activeQueue,
    nextQueues: nextQueues.slice(0, 5)
  };
}

async function getDoctorQueue(dokterId, dateStr, userFullName) {
  const antreanList = await getTableData('ANTREAN');
  const pasienList = await getTableData('PASIEN');
  const dokterList = await getTableData('DOKTER');
  const targetDate = dateStr || getTodayDateStr();

  const validDocIds = new Set();
  if (dokterId) validDocIds.add(dokterId);

  dokterList.forEach(dr => {
    if (userFullName && dr.nama.toLowerCase().trim() === userFullName.toLowerCase().trim()) {
      validDocIds.add(dr.id);
    }
    if (dokterId && (dr.id === dokterId || dr.nama.toLowerCase().trim() === dokterId.toLowerCase().trim())) {
      validDocIds.add(dr.id);
    }
  });

  const pasienMap = {};
  pasienList.forEach(p => {
    pasienMap[p.nomorRm] = {
      nama: p.nama,
      tglLahir: p.tanggalLahir,
      gender: p.jenisKelamin,
      alergi: p.alergiObat
    };
  });

  const list = [];
  antreanList.forEach(r => {
    const isToday = (r.tanggalKunjungan || '').replace(/[^0-9]/g, '').slice(0, 8) === targetDate.replace(/[^0-9]/g, '').slice(0, 8);
    const isDoctorMatch = validDocIds.size === 0 || validDocIds.has(r.dokterId) || (userFullName && r.dokterId.toLowerCase() === userFullName.toLowerCase());

    if ((isToday || r.statusAntrean === 'Menunggu' || r.statusAntrean === 'Dipanggil') && isDoctorMatch) {
      const p = pasienMap[r.nomorRm] || {};
      list.push({
        kodeAntrean: r.kodeAntrean,
        nomorUrut: r.nomorUrut,
        nomorRm: r.nomorRm,
        namaPasien: p.nama || 'Pasien',
        alergi: p.alergi || 'Tidak Ada',
        gender: p.gender || '-',
        tglLahir: p.tglLahir || '-',
        ruanganPoli: r.ruanganPoli,
        statusTriage: r.statusTriage,
        keluhanUtama: r.keluhanUtama,
        statusAntrean: r.statusAntrean,
        waktuDaftar: r.waktuDaftar
      });
    }
  });

  return { status: 'success', success: true, list: list };
}

async function updateQueueStatus(kodeAntrean, newStatus, user) {
  const antreanList = await getTableData('ANTREAN');
  const nowStr = getNowTimestamp();
  const matched = antreanList.find(a => a.kodeAntrean === kodeAntrean);

  if (matched) {
    matched.statusAntrean = newStatus;
    if (newStatus === 'Dipanggil') matched.waktuDipanggil = nowStr;
    if (newStatus === 'Selesai') matched.waktuSelesai = nowStr;

    await setTableData('ANTREAN', antreanList);
    await writeAuditLog(user, 'UPDATE_ANTREAN', 'ANTREAN', `${kodeAntrean} -> ${newStatus}`);
    return { status: 'success', success: true, kodeAntrean: kodeAntrean, newStatus: newStatus };
  }

  return { status: 'error', success: false, message: 'Antrean tidak ditemukan: ' + kodeAntrean };
}

async function saveCppt(payload) {
  const cpptList = await getTableData('CPPT_MEDIS');
  const resepList = await getTableData('FARMASI_RESEP');
  const labList = await getTableData('LABORATORIUM');
  const nowStr = getNowTimestamp();

  const cpptId = 'CPPT-' + (cpptList.length + 1).toString().padStart(5, '0');

  cpptList.push({
    cpptId: cpptId,
    kodeAntrean: payload.kodeAntrean,
    nomorRm: payload.nomorRm,
    dokterId: payload.dokterId || 'DOC-001',
    tandaVital: typeof payload.tandaVital === 'object' ? JSON.stringify(payload.tandaVital) : payload.tandaVital,
    subjektif: payload.subjektif || '',
    objektif: payload.objektif || '',
    asesmenIcd: payload.asesmenIcd || '',
    planTindakan: payload.planTindakan || '',
    odontogram: typeof payload.odontogram === 'object' ? JSON.stringify(payload.odontogram) : (payload.odontogram || '{}'),
    catatanAi: payload.catatanAi || '',
    tanggalInput: nowStr
  });
  await setTableData('CPPT_MEDIS', cpptList);

  let savedResepId = null;
  if (payload.resep && Array.isArray(payload.resep) && payload.resep.length > 0) {
    savedResepId = 'RSP-' + (resepList.length + 1).toString().padStart(5, '0');
    resepList.push({
      resepId: savedResepId,
      kodeAntrean: payload.kodeAntrean,
      nomorRm: payload.nomorRm,
      dokterId: payload.dokterId || 'DOC-001',
      detailRincianObat: JSON.stringify(payload.resep),
      aturanPakai: payload.aturanPakaiGlobal || 'Sesuai Rincian Obat',
      catatanApoteker: payload.catatanApoteker || '',
      status: 'Menunggu',
      waktuSelesai: ''
    });
    await setTableData('FARMASI_RESEP', resepList);
  }

  let savedLabId = null;
  if (payload.lab && Array.isArray(payload.lab) && payload.lab.length > 0) {
    savedLabId = 'LAB-' + (labList.length + 1).toString().padStart(5, '0');
    labList.push({
      labId: savedLabId,
      kodeAntrean: payload.kodeAntrean,
      nomorRm: payload.nomorRm,
      dokterId: payload.dokterId || 'DOC-001',
      jenisPemeriksaan: payload.lab.join(', '),
      hasil: '',
      nilaiRujukan: '',
      status: 'Menunggu',
      tanggal: nowStr
    });
    await setTableData('LABORATORIUM', labList);
  }

  await updateQueueStatus(payload.kodeAntrean, 'Selesai', payload.dokterId || 'DOKTER');
  await writeAuditLog(payload.dokterId || 'DOKTER', 'INPUT_CPPT', 'REKAM_MEDIS', `CPPT: ${cpptId}, Resep: ${savedResepId || '-'}, Lab: ${savedLabId || '-'}`);

  return {
    status: 'success',
    success: true,
    cpptId: cpptId,
    resepId: savedResepId,
    labId: savedLabId
  };
}

async function getPharmacyOrders() {
  const resepList = await getTableData('FARMASI_RESEP');
  const pasienList = await getTableData('PASIEN');
  const dokterList = await getTableData('DOKTER');

  const pMap = {};
  pasienList.forEach(p => { pMap[p.nomorRm] = p.nama; });

  const dMap = {};
  dokterList.forEach(d => { dMap[d.id] = d.nama; });

  const list = resepList.map(r => {
    let details = [];
    try {
      details = JSON.parse(r.detailRincianObat);
    } catch (e) {
      details = [{ nama: r.detailRincianObat, jumlah: 1, aturan: r.aturanPakai }];
    }
    return {
      resepId: r.resepId,
      kodeAntrean: r.kodeAntrean,
      nomorRm: r.nomorRm,
      namaPasien: pMap[r.nomorRm] || 'Pasien',
      dokterNama: dMap[r.dokterId] || 'drg. Hj. Kurniawaty, Sp.KG',
      detailObat: details,
      aturanPakai: r.aturanPakai,
      catatanApoteker: r.catatanApoteker,
      status: r.status
    };
  });

  return { status: 'success', success: true, list: list.reverse() };
}

// Potong Stok Obat Secara Akurat di Redis & Memori
async function dispenseMedicine(payload) {
  const resepList = await getTableData('FARMASI_RESEP');
  const obatList = await getTableData('MASTER_OBAT');
  const nowStr = getNowTimestamp();

  const matched = resepList.find(r => r.resepId === payload.resepId);
  if (matched) {
    matched.status = 'Selesai';
    matched.waktuSelesai = nowStr;
    await setTableData('FARMASI_RESEP', resepList);
  }

  if (payload.items && payload.items.length > 0) {
    payload.items.forEach(item => {
      const matchObat = obatList.find(o => o.obatId === item.obatId || o.nama.toLowerCase() === (item.nama || '').toLowerCase());
      if (matchObat) {
        matchObat.stok = Math.max(0, (parseInt(matchObat.stok) || 0) - (parseInt(item.jumlah) || 1));
      }
    });
    await setTableData('MASTER_OBAT', obatList);
  }

  await writeAuditLog(payload.user || 'APOTEKER', 'DISPENSE_RESEP', 'FARMASI', `Resep: ${payload.resepId}`);
  return { status: 'success', success: true, message: 'Obat berhasil diserahkan kepada pasien.' };
}

async function getMasterObat() {
  const list = await getTableData('MASTER_OBAT');
  return { status: 'success', success: true, list: list };
}

async function getLabOrders() {
  const labList = await getTableData('LABORATORIUM');
  const pasienList = await getTableData('PASIEN');

  const pMap = {};
  pasienList.forEach(p => { pMap[p.nomorRm] = p.nama; });

  const list = labList.map(l => ({
    labId: l.labId,
    kodeAntrean: l.kodeAntrean,
    nomorRm: l.nomorRm,
    namaPasien: pMap[l.nomorRm] || 'Pasien',
    dokterId: l.dokterId,
    jenisPemeriksaan: l.jenisPemeriksaan,
    hasil: l.hasil,
    nilaiRujukan: l.nilaiRujukan,
    status: l.status,
    tanggal: l.tanggal
  }));

  return { status: 'success', success: true, list: list.reverse() };
}

async function saveLabResult(payload) {
  const labList = await getTableData('LABORATORIUM');
  const matched = labList.find(l => l.labId === payload.labId);

  if (matched) {
    matched.hasil = payload.hasil || 'Normal';
    matched.nilaiRujukan = payload.nilaiRujukan || '-';
    matched.status = 'Selesai';
    await setTableData('LABORATORIUM', labList);
    await writeAuditLog(payload.user || 'LABORAN', 'SAVE_LAB_RESULT', 'LABORATORIUM', `Lab ID: ${payload.labId}`);
    return { status: 'success', success: true, labId: payload.labId };
  }

  return { status: 'error', success: false, message: 'Data Lab tidak ditemukan: ' + payload.labId };
}

async function checkActiveShift(kasirId) {
  const shiftList = await getTableData('POS_SHIFT');
  for (let i = shiftList.length - 1; i >= 0; i--) {
    const s = shiftList[i];
    if ((s.namaKasir === kasirId || !kasirId) && s.statusShift === 'Open') {
      return {
        status: 'success',
        success: true,
        hasActiveShift: true,
        shift: {
          shiftId: s.shiftId,
          tanggal: s.tanggal,
          namaKasir: s.namaKasir,
          shiftKerja: s.shiftKerja,
          modalAwal: parseInt(s.modalAwal) || 0,
          totalTunai: parseInt(s.totalTunaiSistem) || 0,
          totalNonTunai: parseInt(s.totalNonTunaiSistem) || 0,
          waktuBuka: s.waktuBuka
        }
      };
    }
  }

  return { status: 'success', success: true, hasActiveShift: false };
}

async function openCashierShift(kasirId, namaKasir, shiftKerja, modalAwal) {
  const shiftList = await getTableData('POS_SHIFT');
  const nowStr = getNowTimestamp();
  const todayDate = getTodayDateStr();

  const shiftId = await generateShiftId(todayDate);
  shiftList.push({
    shiftId: shiftId,
    tanggal: todayDate,
    namaKasir: namaKasir || kasirId,
    shiftKerja: shiftKerja || 'Pagi',
    modalAwal: parseInt(modalAwal) || 0,
    totalTunaiSistem: 0,
    totalNonTunaiSistem: 0,
    totalFisikTunai: 0,
    selisihKas: 0,
    statusShift: 'Open',
    waktuBuka: nowStr,
    waktuTutup: '',
    catatanShift: ''
  });

  await setTableData('POS_SHIFT', shiftList);
  await writeAuditLog(namaKasir, 'OPEN_SHIFT', 'POS', `Shift: ${shiftId}, Modal: Rp ${modalAwal}`);
  return { status: 'success', success: true, shiftId: shiftId };
}

// Rincian Kalkulasi Kasir POS Lengkap
async function getBillingDetails(kodeAntrean, nomorRm) {
  const cpptList = await getTableData('CPPT_MEDIS');
  const resepList = await getTableData('FARMASI_RESEP');
  const labList = await getTableData('LABORATORIUM');
  const pasienList = await getTableData('PASIEN');

  const billingItems = [];
  let subtotal = 0;

  billingItems.push({ nama: 'Administrasi Rekam Medis & Pendaftaran', kategori: 'Admin', jumlah: 1, harga: 25000, subtotal: 25000 });
  billingItems.push({ nama: 'Jasa Konsultasi & Pemeriksaan Gigi Terpadu', kategori: 'Jasa Medis', jumlah: 1, harga: 125000, subtotal: 125000 });

  const cppt = cpptList.find(c => c.kodeAntrean === kodeAntrean || c.nomorRm === nomorRm);
  if (cppt) {
    billingItems.push({ nama: 'Tindakan: ' + (cppt.planTindakan || 'Perawatan Gigi Standard'), kategori: 'Tindakan', jumlah: 1, harga: 150000, subtotal: 150000 });
  }

  const resep = resepList.find(r => r.kodeAntrean === kodeAntrean || r.nomorRm === nomorRm);
  if (resep) {
    try {
      const parsed = JSON.parse(resep.detailRincianObat);
      parsed.forEach(o => {
        const qty = parseInt(o.jumlah) || 1;
        const price = parseInt(o.harga) || 15000;
        billingItems.push({ nama: 'Obat: ' + o.nama, kategori: 'Farmasi', jumlah: qty, harga: price, subtotal: qty * price });
      });
    } catch (e) {
      billingItems.push({ nama: 'Paket Obat Farmasi Standar', kategori: 'Farmasi', jumlah: 1, harga: 45000, subtotal: 45000 });
    }
  }

  const lab = labList.find(l => l.kodeAntrean === kodeAntrean || l.nomorRm === nomorRm);
  if (lab) {
    billingItems.push({ nama: 'Uji Laboratorium: ' + lab.jenisPemeriksaan, kategori: 'Lab', jumlah: 1, harga: 80000, subtotal: 80000 });
  }

  billingItems.forEach(item => subtotal += item.subtotal);

  let namaPasien = 'Pasien';
  const matchP = pasienList.find(p => p.nomorRm === nomorRm);
  if (matchP) namaPasien = matchP.nama;

  return {
    status: 'success',
    success: true,
    kodeAntrean: kodeAntrean,
    nomorRm: nomorRm,
    namaPasien: namaPasien,
    items: billingItems,
    subtotal: subtotal
  };
}

// Proses Pembayaran Kasir & Penambahan Omset Shift
async function processPayment(payload) {
  const trxList = await getTableData('TRANSAKSI_KASIR');
  const shiftList = await getTableData('POS_SHIFT');
  const nowStr = getNowTimestamp();
  const todayDate = getTodayDateStr();

  const trxId = await generateTransactionId(todayDate);
  const totalAkhir = parseInt(payload.totalAkhir) || 0;
  const isTunai = payload.metodeBayar === 'Tunai';

  trxList.push({
    transaksiId: trxId,
    shiftId: payload.shiftId || '',
    kodeAntrean: payload.kodeAntrean || '',
    nomorRm: payload.nomorRm || '',
    rincianItemJson: JSON.stringify(payload.items || []),
    subtotal: payload.subtotal || 0,
    diskon: payload.diskon || 0,
    totalAkhir: totalAkhir,
    metodeBayar: payload.metodeBayar || 'Tunai',
    nominalBayar: payload.nominalBayar || totalAkhir,
    nominalKembali: payload.nominalKembali || 0,
    kasirId: payload.kasirId || 'KASIR',
    tanggalTransaksi: nowStr,
    statusBayar: 'Lunas'
  });
  await setTableData('TRANSAKSI_KASIR', trxList);

  if (payload.shiftId) {
    const matchedShift = shiftList.find(s => s.shiftId === payload.shiftId);
    if (matchedShift) {
      if (isTunai) {
        matchedShift.totalTunaiSistem = (parseInt(matchedShift.totalTunaiSistem) || 0) + totalAkhir;
      } else {
        matchedShift.totalNonTunaiSistem = (parseInt(matchedShift.totalNonTunaiSistem) || 0) + totalAkhir;
      }
      await setTableData('POS_SHIFT', shiftList);
    }
  }

  await writeAuditLog(payload.kasirId, 'PAYMENT_SUCCESS', 'POS', `Trx: ${trxId}, Total: Rp ${totalAkhir}`);
  return { status: 'success', success: true, transaksiId: trxId, tanggal: nowStr };
}

// Tutup Shift Kasir & Penerbitan Z-Report dengan Selisih Kas
async function closeCashierShift(shiftId, actualCash, catatan, user) {
  const shiftList = await getTableData('POS_SHIFT');
  const nowStr = getNowTimestamp();
  const matched = shiftList.find(s => s.shiftId === shiftId);

  if (!matched) {
    return { status: 'error', success: false, message: 'Shift tidak ditemukan: ' + shiftId };
  }

  const modalAwal = parseInt(matched.modalAwal) || 0;
  const totalTunai = parseInt(matched.totalTunaiSistem) || 0;
  const totalNonTunai = parseInt(matched.totalNonTunaiSistem) || 0;
  const totalFisik = parseInt(actualCash) || 0;

  const expectedCash = modalAwal + totalTunai;
  const selisih = totalFisik - expectedCash;

  matched.totalFisikTunai = totalFisik;
  matched.selisihKas = selisih;
  matched.statusShift = 'Closed';
  matched.waktuTutup = nowStr;
  matched.catatanShift = catatan || '';

  await setTableData('POS_SHIFT', shiftList);
  await writeAuditLog(user, 'CLOSE_SHIFT', 'POS', `Shift ${shiftId} closed. Selisih: Rp ${selisih}`);

  return {
    status: 'success',
    success: true,
    zReport: {
      shiftId: shiftId,
      kasir: matched.namaKasir,
      waktuBuka: matched.waktuBuka,
      waktuTutup: nowStr,
      modalAwal: modalAwal,
      totalTunai: totalTunai,
      totalNonTunai: totalNonTunai,
      expectedCash: expectedCash,
      actualCash: totalFisik,
      selisih: selisih,
      statusSelisih: selisih === 0 ? 'BALANCED' : (selisih > 0 ? 'OVER' : 'SHORT')
    }
  };
}

// Verifikasi Surat Keterangan Medis dengan QR Code & MD5 Digest
async function generateMedicalDoc(payload) {
  const docList = await getTableData('DOKUMEN_MEDIS');
  const nowStr = getNowTimestamp();
  const todayYm = getCompactDateStr().slice(0, 6);

  const nomorSurat = await generateDocNumber(payload.jenisDokumen, todayYm);
  const docId = 'DOC-' + (docList.length + 1).toString().padStart(5, '0');
  const verificationCode = crypto.createHash('md5').update(nomorSurat + nowStr).digest('hex').substring(0, 10).toUpperCase();
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=VERIF-KLINIK-AKSHARA-${verificationCode}`;

  const docItem = {
    docId,
    nomorSurat,
    jenisDokumen: payload.jenisDokumen,
    nomorRm: payload.nomorRm || '',
    kodeAntrean: payload.kodeAntrean || '',
    dokterId: payload.dokterId || 'DOC-001',
    namaPasien: payload.namaPasien || '',
    fileUrl: qrUrl,
    verificationCode,
    tanggalTerbit: nowStr
  };

  docList.push(docItem);
  await setTableData('DOKUMEN_MEDIS', docList);
  await writeAuditLog(payload.user, 'GENERATE_DOC', 'DOKUMEN_MEDIS', `${nomorSurat} (${payload.jenisDokumen})`);

  return { status: 'success', success: true, nomorSurat, fileUrl: qrUrl, verificationCode };
}

async function getSystemSettings(adminUserId) {
  const settingsList = await getTableData('SETTINGS');
  const settings = {};
  settingsList.forEach(r => {
    if (r.key === 'GEMINI_API_KEY' || r.key === 'GROQ_API_KEY' || r.key === 'OPENAI_API_KEY') {
      const val = r.val || '';
      settings[r.key] = val ? (val.substring(0, 5) + '****************' + val.substring(val.length - 4)) : '';
    } else {
      settings[r.key] = r.val;
    }
  });
  return { status: 'success', success: true, settings: settings };
}

async function updateSystemSettings(adminUserId, configKey, configValue) {
  const settingsList = await getTableData('SETTINGS');
  const matched = settingsList.find(s => s.key === configKey);
  if (matched) {
    matched.val = configValue;
  } else {
    settingsList.push({ key: configKey, val: configValue, desc: 'Updated via Super Admin' });
  }

  await setTableData('SETTINGS', settingsList);
  await writeAuditLog(adminUserId || 'SUPER_ADMIN', 'UPDATE_SETTING', 'SETTINGS', 'Update ' + configKey);
  return { status: 'success', success: true, message: `Pengaturan ${configKey} berhasil diperbarui.` };
}

async function getAuditLogs(page, limit) {
  const logs = await getTableData('AUDIT_LOG');
  const p = parseInt(page) || 1;
  const lim = parseInt(limit) || 20;

  const total = logs.length;
  const start = Math.max(0, total - (p * lim));
  const end = Math.min(total, start + lim);
  const sliced = logs.slice(start, end).reverse();

  return { status: 'success', success: true, logs: sliced, total: total, page: p };
}

async function getAnalyticsData() {
  const antreanList = await getTableData('ANTREAN');
  const trxList = await getTableData('TRANSAKSI_KASIR');
  const today = getTodayDateStr();

  let totalPasienHariIni = antreanList.filter(a => a.tanggalKunjungan === today).length;
  let totalOmsetHariIni = 0;

  trxList.forEach(t => {
    if ((t.tanggalTransaksi || '').substring(0, 10) === today) {
      totalOmsetHariIni += (parseInt(t.totalAkhir) || 0);
    }
  });

  return {
    status: 'success',
    success: true,
    totalPasien: totalPasienHariIni,
    totalOmset: totalOmsetHariIni,
    rataWaktuTunggu: '14 Menit',
    efisiensiPelayanan: '96%'
  };
}

// ============================================================================
// 7. ASISTEN MEDIS AI (GEMINI 3.5 DEFAULT, FORMAT AQ..., OPENAI & GROQ)
// ============================================================================

async function generateGroqAiAssist(payload) {
  let apiKey = payload.apiKey;
  let modelName = payload.model;

  if (!apiKey) {
    const settings = await getTableData('SETTINGS');
    const matchedKey = settings.find(s => s.key === 'GROQ_API_KEY');
    if (matchedKey && matchedKey.val) apiKey = matchedKey.val.trim();
  }

  if (!apiKey) {
    return { status: 'error', success: false, message: 'GROQ_API_KEY belum dikonfigurasi pada menu Pengaturan.' };
  }

  const selectedModel = modelName || 'openai/gpt-oss-120b';
  let messages = payload.messages;
  if (!messages || !Array.isArray(messages)) {
    messages = [
      {
        role: 'system',
        content: 'Anda adalah Asisten Medis AI & Odontolog Cerdas untuk Klinik Akshara Dental Space Makassar. Bantu dokter menegakkan diferensial diagnosa ICD-10, merancang rencana terapi, serta memeriksa kontraindikasi alergi obat secara profesional, ringkas, dan akurat.'
      },
      {
        role: 'user',
        content: payload.prompt || 'Analisis kasus klinis pasien gigi.'
      }
    ];
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: messages,
        temperature: 0.2,
        max_tokens: 1024
      })
    });

    if (response.ok) {
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || 'Tidak ada rekomendasi dari Groq AI.';
      return { status: 'success', success: true, text: reply, reply: reply, model: selectedModel };
    } else {
      const errData = await response.text();
      return { status: 'error', success: false, message: `Groq Error (${response.status}): ${errData}` };
    }
  } catch (err) {
    return { status: 'error', success: false, message: `Koneksi Groq API Gagal: ${err.message}` };
  }
}

async function testGroqKey(apiKey, modelName) {
  if (!apiKey) return { status: 'error', success: false, message: 'Kunci API Groq tidak boleh kosong.' };
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName || 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: 'Ping test' }],
        max_tokens: 10
      })
    });

    if (res.ok) {
      return { status: 'success', success: true, message: 'Koneksi Groq API LPU Berhasil & Aktif!' };
    } else {
      const errText = await res.text();
      return { status: 'error', success: false, message: `Groq Error (${res.status}): ${errText}` };
    }
  } catch (err) {
    return { status: 'error', success: false, message: `Koneksi Groq Gagal: ${err.message}` };
  }
}

// Google Gemini Engine - Mendukung Format Kunci AQ... & AIzaSy... Secara Akurat
async function generateAiMedicalAssist(payload) {
  payload = payload || {};
  let apiKey = payload.geminiKey || payload.apiKey;
  let targetModel = payload.model;

  if (!apiKey) {
    const settings = await getTableData('SETTINGS');
    const matched = settings.find(s => s.key === 'GEMINI_API_KEY');
    if (matched && matched.val) apiKey = matched.val.trim();
  }
  if (!targetModel) {
    const settings = await getTableData('SETTINGS');
    const matchedM = settings.find(s => s.key === 'GEMINI_MODEL');
    targetModel = (matchedM && matchedM.val) ? matchedM.val.trim() : 'gemini-3.5-flash';
  }

  if (!apiKey) {
    return { status: 'error', success: false, message: 'GEMINI_API_KEY belum dikonfigurasi di Pengaturan.' };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;
  const systemInstruction = 'Anda adalah Asisten Medis AI & Odontolog Cerdas untuk Klinik Akshara Dental Space Makassar. Bantu dokter menganalisis diferensial diagnosis ICD-10, merapikan format SOAP, peringatan interaksi obat atau alergi, dan rekomendasi terapi secara singkat, profesional, dan akurat.';

  const formattedContents = [];
  (payload.history || []).forEach(item => {
    if (item.role && item.text) {
      formattedContents.push({ role: item.role === 'model' ? 'model' : 'user', parts: [{ text: String(item.text) }] });
    }
  });
  const promptText = typeof payload === 'string' ? payload : (payload.prompt || '');
  if (promptText) {
    formattedContents.push({ role: 'user', parts: [{ text: promptText }] });
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: formattedContents,
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024 }
      })
    });

    if (res.ok) {
      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Tidak ada rekomendasi AI.';
      return { status: 'success', success: true, text: reply, reply: reply, modelUsed: targetModel };
    } else {
      const errText = await res.text();
      return { status: 'error', success: false, message: `Gemini Error (${res.status}): ${errText}` };
    }
  } catch (err) {
    return { status: 'error', success: false, message: `Koneksi Gemini AI Gagal: ${err.message}` };
  }
}

async function testGeminiKey(apiKey, targetModel = 'gemini-3.5-flash') {
  if (!apiKey) return { status: 'error', success: false, message: 'Kunci API tidak boleh kosong.' };
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey.trim()}`;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'Ping test' }] }] })
    });
    if (res.ok) {
      return { status: 'success', success: true, message: `Koneksi Gemini API (${targetModel}) berhasil dan aktif!` };
    } else {
      const errText = await res.text();
      return { status: 'error', success: false, message: `Validasi gagal: ${errText}` };
    }
  } catch (err) {
    return { status: 'error', success: false, message: `Koneksi error: ${err.message}` };
  }
}

async function generateOpenAiAssist(payload) {
  payload = payload || {};
  let apiKey = payload.apiKey;
  let targetModel = payload.model;

  if (!apiKey) {
    const settings = await getTableData('SETTINGS');
    const matched = settings.find(s => s.key === 'OPENAI_API_KEY');
    if (matched && matched.val) apiKey = matched.val.trim();
  }
  if (!targetModel) {
    const settings = await getTableData('SETTINGS');
    const matchedM = settings.find(s => s.key === 'OPENAI_MODEL');
    targetModel = (matchedM && matchedM.val) ? matchedM.val.trim() : 'gpt-4o-mini';
  }

  if (!apiKey) {
    return { status: 'error', success: false, message: 'OPENAI_API_KEY belum dikonfigurasi di Pengaturan.' };
  }

  const endpoint = 'https://api.openai.com/v1/chat/completions';
  const messages = [
    { role: 'system', content: 'Anda adalah Asisten Medis AI & Odontolog Cerdas Klinik Akshara Dental Space Makassar.' }
  ];

  (payload.history || []).forEach(h => {
    if (h.role && h.text) messages.push({ role: h.role === 'model' ? 'assistant' : 'user', content: String(h.text) });
  });

  const promptText = typeof payload === 'string' ? payload : (payload.prompt || '');
  if (promptText) {
    messages.push({ role: 'user', content: promptText });
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: targetModel,
        messages,
        temperature: 0.3,
        max_tokens: 1024
      })
    });

    if (res.ok) {
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || 'Tidak ada rekomendasi dari OpenAI.';
      return { status: 'success', success: true, text: reply, reply: reply, modelUsed: targetModel };
    } else {
      const errText = await res.text();
      return { status: 'error', success: false, message: `OpenAI Error (${res.status}): ${errText}` };
    }
  } catch (err) {
    return { status: 'error', success: false, message: `Koneksi OpenAI Gagal: ${err.message}` };
  }
}

async function testOpenAiKey(apiKey, modelName) {
  if (!apiKey) return { status: 'error', success: false, message: 'Kunci API OpenAI tidak boleh kosong.' };
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName || 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Ping test' }],
        max_tokens: 10
      })
    });
    if (res.ok) {
      return { status: 'success', success: true, message: 'Koneksi OpenAI ChatGPT Berhasil & Aktif!' };
    } else {
      const errText = await res.text();
      return { status: 'error', success: false, message: `OpenAI Error: ${errText}` };
    }
  } catch (err) {
    return { status: 'error', success: false, message: `Koneksi OpenAI Gagal: ${err.message}` };
  }
}

// ============================================================================
// 8. GATEWAY WHATSAPP RAILWAY, LOGS & BROADCAST QUEUE (6 TAB V2)
// ============================================================================

async function getChatLogsPaginated(filters = {}) {
  const logs = await getTableData('ChatLogs');
  const page = parseInt(filters.page, 10) || 1;
  const pageSize = parseInt(filters.pageSize, 10) || 10;
  const search = (filters.search || '').toLowerCase().trim();
  const status = (filters.status || '').toUpperCase().trim();

  let filtered = [...logs].reverse();
  if (status) {
    filtered = filtered.filter(l => (l.status || '').toUpperCase() === status);
  }
  if (search) {
    filtered = filtered.filter(l =>
      (l.logId || '').toLowerCase().includes(search) ||
      (l.sender || '').toLowerCase().includes(search) ||
      (l.receiver || '').toLowerCase().includes(search) ||
      (l.content || '').toLowerCase().includes(search)
    );
  }

  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const start = (page - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);

  return { success: true, status: 'success', logs: paginated, totalCount, page, totalPages };
}

async function syncChatLog(payload = {}) {
  if (!payload.content) {
    return { success: false, status: 'error', message: 'Konten pesan log kosong.' };
  }
  const logs = await getTableData('ChatLogs');
  const logId = 'LOG-' + (logs.length + 1).toString().padStart(4, '0');
  const newLog = {
    logId,
    timestamp: getNowTimestamp(),
    clientId: payload.clientId || 'CLI-0001',
    sender: String(payload.senderNumber || payload.sender || 'UNKNOWN'),
    receiver: String(payload.receiverNumber || payload.receiver || 'BOT'),
    type: String(payload.messageType || payload.type || 'INCOMING').toUpperCase(),
    content: String(payload.content || ''),
    status: String(payload.status || 'DELIVERED').toUpperCase()
  };

  logs.push(newLog);
  await setTableData('ChatLogs', logs);
  return { success: true, status: 'success', message: 'Chat log tersinkronisasi', logId };
}

async function getBroadcastQueuePaginated(filters = {}) {
  const queue = await getTableData('BroadcastQueue');
  const page = parseInt(filters.page, 10) || 1;
  const pageSize = parseInt(filters.pageSize, 10) || 10;
  const search = (filters.search || '').toLowerCase().trim();
  const status = (filters.status || '').toUpperCase().trim();

  let filtered = [...queue].reverse();
  if (status) {
    filtered = filtered.filter(q => (q.status || '').toUpperCase() === status);
  }
  if (search) {
    filtered = filtered.filter(q =>
      (q.queueId || '').toLowerCase().includes(search) ||
      (q.targetNumber || '').toLowerCase().includes(search) ||
      (q.messageContent || '').toLowerCase().includes(search)
    );
  }

  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const start = (page - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);

  return { success: true, status: 'success', queue: paginated, totalCount, page, totalPages };
}

async function addBroadcastQueueItem(payload = {}, adminId = 'SUPERADMIN') {
  if (!payload.targetNumber || !payload.messageContent) {
    return { success: false, status: 'error', message: 'Nomor WhatsApp dan isi pesan wajib diisi.' };
  }
  const queue = await getTableData('BroadcastQueue');
  const queueId = 'QUE-' + (queue.length + 1).toString().padStart(4, '0');
  const nowStr = getNowTimestamp();

  const item = {
    queueId,
    clientId: payload.clientId || 'CLI-0001',
    targetNumber: String(payload.targetNumber),
    messageContent: String(payload.messageContent),
    scheduledTime: payload.scheduledTime || nowStr,
    status: 'PENDING',
    sentAt: '-'
  };

  queue.push(item);
  await setTableData('BroadcastQueue', queue);
  await writeAuditLog(adminId, 'ADD_BROADCAST', 'BROADCAST', `Jadwal kirim ${queueId} ke ${payload.targetNumber}`);
  return { success: true, status: 'success', message: 'Pesan berhasil dijadwalkan ke antrean.', queueId };
}

async function sendBroadcastNow(queueId, adminId = 'SUPERADMIN') {
  const queue = await getTableData('BroadcastQueue');
  const matched = queue.find(q => q.queueId === queueId);
  if (!matched) return { success: false, status: 'error', message: 'Antrean tidak ditemukan.' };

  const nowStr = getNowTimestamp();
  matched.status = 'SENT';
  matched.sentAt = nowStr;
  await setTableData('BroadcastQueue', queue);

  await syncChatLog({
    clientId: matched.clientId,
    sender: 'KLINIK_BROADCAST',
    receiver: matched.targetNumber,
    type: 'OUTGOING',
    content: matched.messageContent,
    status: 'SENT'
  });

  await writeAuditLog(adminId, 'DISPATCH_BROADCAST', 'BROADCAST', `Kirim antrean ${queueId}`);
  return { success: true, status: 'success', message: `Antrean ${queueId} berhasil dikirim!` };
}

async function deleteBroadcastQueueItem(queueId, adminId = 'SUPERADMIN') {
  let queue = await getTableData('BroadcastQueue');
  const initialLen = queue.length;
  queue = queue.filter(q => q.queueId !== queueId);

  if (queue.length === initialLen) return { success: false, status: 'error', message: 'Antrean tidak ditemukan.' };
  await setTableData('BroadcastQueue', queue);
  await writeAuditLog(adminId, 'DELETE_BROADCAST', 'BROADCAST', `Hapus antrean ${queueId}`);
  return { success: true, status: 'success', message: `Antrean ${queueId} berhasil dibatalkan.` };
}

async function getClientsList() {
  const clients = await getTableData('Clients');
  let connected = 0, scanning = 0, disconnected = 0;

  clients.forEach(c => {
    const st = (c.status || 'CONNECTED').toUpperCase();
    if (st === 'CONNECTED') connected++;
    else if (st === 'SCANNING') scanning++;
    else disconnected++;
  });

  return {
    success: true,
    status: 'success',
    clients,
    stats: { total: clients.length, connected, scanning, disconnected }
  };
}

async function saveOrUpdateClient(payload = {}, adminId = 'SUPERADMIN') {
  if (!payload.name || !payload.phone) {
    return { success: false, status: 'error', message: 'Nama client dan nomor bot wajib diisi.' };
  }
  const clients = await getTableData('Clients');
  let finalId = payload.clientId;

  if (finalId) {
    const index = clients.findIndex(c => c.clientId === finalId);
    if (index !== -1) {
      clients[index] = { ...clients[index], ...payload };
    } else {
      clients.push({ ...payload, clientId: finalId });
    }
  } else {
    finalId = 'CLI-' + (clients.length + 1).toString().padStart(4, '0');
    clients.push({
      clientId: finalId,
      name: payload.name,
      phone: payload.phone,
      railwayUrl: payload.railwayUrl || DEFAULT_RAILWAY_URL,
      status: payload.status || 'CONNECTED',
      expiredDate: payload.expiredDate || '31/12/2027 23:59:59',
      notes: payload.notes || '',
      createdAt: getNowTimestamp()
    });
  }

  await setTableData('Clients', clients);
  await writeAuditLog(adminId, 'SAVE_CLIENT', 'CLIENTS', `Simpan client ${finalId}`);
  return { success: true, status: 'success', message: 'Data client tersimpan.', clientId: finalId };
}

async function deleteClient(clientId, adminId = 'SUPERADMIN') {
  let clients = await getTableData('Clients');
  clients = clients.filter(c => c.clientId !== clientId);
  await setTableData('Clients', clients);
  await writeAuditLog(adminId, 'DELETE_CLIENT', 'CLIENTS', `Hapus client ${clientId}`);
  return { success: true, status: 'success', message: `Client ${clientId} berhasil dihapus.` };
}

async function pingRailwayClient(url) {
  const target = (url || DEFAULT_RAILWAY_URL).replace(/\/$/, '');
  const start = Date.now();
  try {
    const res = await fetch(`${target}/`, { method: 'GET', signal: AbortSignal.timeout(5000) });
    const latency = Date.now() - start;
    return {
      success: res.status >= 200 && res.status < 400,
      status: 'success',
      statusCode: res.status,
      latencyMs: latency,
      message: `Server Railway Online (HTTP ${res.status}) dalam ${latency} ms.`
    };
  } catch (err) {
    return { success: false, status: 'error', statusCode: 0, latencyMs: 9999, message: 'Koneksi Railway gagal: ' + err.message };
  }
}

async function getTemplatesList() {
  const templates = await getTableData('Templates');
  return { success: true, status: 'success', templates };
}

async function savePatientBooking(payload = {}) {
  if (!payload.patientName || !payload.phoneNumber) {
    return { success: false, status: 'error', message: 'Nama pasien dan nomor WhatsApp wajib diisi.' };
  }
  const bookings = await getTableData('Bookings');
  const bookingId = 'BKG-' + (bookings.length + 1).toString().padStart(4, '0');
  const nowStr = getNowTimestamp();

  const item = {
    bookingId,
    patientName: payload.patientName,
    phoneNumber: payload.phoneNumber,
    serviceType: payload.serviceType || 'Pemeriksaan Gigi Terpadu',
    bookingDate: payload.bookingDate || nowStr,
    status: 'PENDING',
    createdAt: nowStr
  };

  bookings.push(item);
  await setTableData('Bookings', bookings);
  await writeAuditLog('PUBLIC', 'PATIENT_BOOKING', 'BOOKINGS', `Booking ${bookingId}`);
  return { success: true, status: 'success', message: `Reservasi berhasil dibuat! Nomor: ${bookingId}`, bookingId };
}

async function getBookingsList() {
  const bookings = await getTableData('Bookings');
  return { success: true, status: 'success', bookings: [...bookings].reverse() };
}

async function getAiConfig() {
  const settings = await getTableData('SETTINGS');
  const getVal = k => {
    const m = settings.find(s => s.key === k);
    return m ? m.val : '';
  };

  const geminiKey = getVal('GEMINI_API_KEY');
  const geminiModel = getVal('GEMINI_MODEL') || 'gemini-3.5-flash';
  const openAiKey = getVal('OPENAI_API_KEY');
  const openAiModel = getVal('OPENAI_MODEL') || 'gpt-4o-mini';

  const mask = k => (k && k.length > 6 ? `${k.substring(0, 5)}****************${k.substring(k.length - 4)}` : '');

  return {
    success: true,
    status: 'success',
    currentModel: geminiModel,
    openAiModel,
    isConfigured: Boolean(geminiKey && !geminiKey.includes('Placeholder')),
    isOpenAiConfigured: Boolean(openAiKey && !openAiKey.includes('Placeholder')),
    maskedApiKey: mask(geminiKey),
    maskedOpenAiKey: mask(openAiKey)
  };
}

async function saveAiConfig(payload = {}, adminId = 'SUPERADMIN') {
  const settings = await getTableData('SETTINGS');
  const setVal = (k, v) => {
    const m = settings.find(s => s.key === k);
    if (m) m.val = v;
    else settings.push({ key: k, val: v, desc: 'Set via Portal V2' });
  };

  if (payload.model) setVal('GEMINI_MODEL', payload.model);
  if (payload.apiKey && !payload.apiKey.includes('*')) setVal('GEMINI_API_KEY', payload.apiKey);
  if (payload.openaiModel) setVal('OPENAI_MODEL', payload.openaiModel);
  if (payload.openaiApiKey && !payload.openaiApiKey.includes('*')) setVal('OPENAI_API_KEY', payload.openaiApiKey);

  await setTableData('SETTINGS', settings);
  await writeAuditLog(adminId, 'UPDATE_AI_CONFIG', 'SETTINGS', 'Perbarui konfigurasi Gemini / OpenAI');
  return { success: true, status: 'success', message: 'Konfigurasi model AI berhasil disimpan!' };
}

// ============================================================================
// 9. UNIVERSAL ACTION ROUTER DISPATCHER (V1 & V2 COMPATIBLE)
// ============================================================================

async function handleActionRouter(action, payload) {
  const normAction = String(action || '').trim();
  let p1 = payload;
  let p2 = 'SUPERADMIN';

  if (Array.isArray(payload)) {
    p1 = payload[0] !== undefined ? payload[0] : {};
    p2 = payload[1] || (p1 && (p1.adminId || p1.currentAdminId || p1.user)) || 'SUPERADMIN';
  } else if (payload && typeof payload === 'object') {
    p1 = payload;
    p2 = payload.adminId || payload.currentAdminId || payload.user || 'SUPERADMIN';
  }

  // Normalisasi login
  if (normAction === 'login' || normAction === 'loginUser' || normAction === 'auth') {
    let u = '';
    let p = '';

    if (Array.isArray(payload) && payload.length > 0) {
      if (typeof payload[0] === 'object' && payload[0] !== null) {
        u = payload[0].username || payload[0].user || payload[0].u || '';
        p = payload[0].password || payload[0].pass || payload[0].p || '';
      } else {
        u = payload[0] || '';
        p = payload[1] || '';
      }
    } else if (payload && typeof payload === 'object') {
      u = payload.username || payload.user || payload.u || '';
      p = payload.password || payload.pass || payload.p || '';
    }

    return await executeDualLogin(u, p);
  }

  switch (normAction) {
    // Faktual & Publik
    case 'getInitialData': return await getInitialPublicData();
    case 'searchPatient': return await searchPatient(p1 ? (p1.query || p1) : '');
    case 'registerAppointment': return await registerAppointment(p1);
    case 'getQueueTvData': return await getQueueTvData(p1 ? p1.poli : '');
    case 'getDoctorQueue': return await getDoctorQueue(p1 ? p1.dokterId : '', p1 ? p1.date : '', p1 ? p1.userFullName : '');
    case 'callQueue': return await updateQueueStatus(p1 ? p1.kodeAntrean : '', 'Dipanggil', p2);
    case 'completeQueue': return await updateQueueStatus(p1 ? p1.kodeAntrean : '', 'Selesai', p2);
    case 'saveCppt': return await saveCppt(p1);

    // AI Assist
    case 'askGroq': return await generateGroqAiAssist(p1);
    case 'testGroqKey': return await testGroqKey(p1.apiKey, p1.model);
    case 'askGemini':
    case 'askGeminiClinic': return await generateAiMedicalAssist(p1);
    case 'testGeminiKey': return await testGeminiKey(p1.apiKey, p1.model);
    case 'askOpenAi':
    case 'askOpenAiClinic': return await generateOpenAiAssist(p1);
    case 'testOpenAiKey': return await testOpenAiKey(p1.apiKey, p1.model);
    case 'getAvailableAiModels': {
      const settings = await getTableData('SETTINGS');
      const cur = settings.find(s => s.key === 'GEMINI_MODEL')?.val || 'gemini-3.5-flash';
      return {
        success: true,
        status: 'success',
        models: SUPPORTED_AI_MODELS,
        defaultModel: cur
      };
    }
    case 'getAiConfig': return await getAiConfig();
    case 'saveAiConfig': return await saveAiConfig(p1, p2);
    case 'setClinicModelQuick': {
      const modelClean = String(p1).trim();
      const settings = await getTableData('SETTINGS');
      const key = (modelClean.includes('gpt') || modelClean.includes('o3')) ? 'OPENAI_MODEL' : 'GEMINI_MODEL';
      const matched = settings.find(s => s.key === key);
      if (matched) matched.val = modelClean;
      else settings.push({ key, val: modelClean, desc: 'Quick Model' });
      await setTableData('SETTINGS', settings);
      return { success: true, status: 'success', message: `Model disetel ke ${modelClean}`, currentModel: modelClean };
    }

    // Gateway WhatsApp Railway (6 Tab V2)
    case 'syncChatLog': return await syncChatLog(p1);
    case 'getChatLogsPaginated': return await getChatLogsPaginated(p1);
    case 'getBroadcastQueuePaginated': return await getBroadcastQueuePaginated(p1);
    case 'addBroadcastQueueItem': return await addBroadcastQueueItem(p1, p2);
    case 'sendBroadcastNow': return await sendBroadcastNow(p1, p2);
    case 'deleteBroadcastQueueItem': return await deleteBroadcastQueueItem(p1, p2);
    case 'getClientsList': return await getClientsList();
    case 'saveOrUpdateClient': return await saveOrUpdateClient(p1, p2);
    case 'deleteClient': return await deleteClient(p1, p2);
    case 'pingRailwayClient': return await pingRailwayClient(p1 ? (p1.railwayUrl || p1) : '');
    case 'getRailwayQrPayload': {
      const settings = await getTableData('SETTINGS');
      const target = (settings.find(s => s.key === 'RAILWAY_DEFAULT_URL')?.val || DEFAULT_RAILWAY_URL).replace(/\/$/, '');
      return { success: true, status: 'success', qrUrl: `${target}/qr` };
    }
    case 'getTemplatesList': return await getTemplatesList();
    case 'savePatientBooking': return await savePatientBooking(p1);
    case 'getBookingsList': return await getBookingsList();
    case 'exportDataCSV': {
      const sheetType = (p1 && p1.sheetName) ? p1.sheetName : 'ChatLogs';
      const items = await getTableData(sheetType);
      if (!items || items.length === 0) return { success: false, status: 'error', message: 'Data kosong.' };
      const headers = Object.keys(items[0]);
      let csv = headers.join(',') + '\r\n';
      items.forEach(row => {
        csv += headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(',') + '\r\n';
      });
      return { success: true, status: 'success', csvData: csv, fileName: `Export_${sheetType}.csv`, totalExported: items.length };
    }

    // Farmasi, Lab & Kasir POS
    case 'getPharmacyOrders': return await getPharmacyOrders();
    case 'dispenseMedicine': return await dispenseMedicine(p1);
    case 'getMasterObat': return await getMasterObat();
    case 'getLabOrders': return await getLabOrders();
    case 'saveLabResult': return await saveLabResult(p1);
    case 'checkActiveShift': return await checkActiveShift(p1 ? p1.kasirId : '');
    case 'openCashierShift': return await openCashierShift(p1.kasirId, p1.namaKasir, p1.shiftKerja, p1.modalAwal);
    case 'getBillingDetails': return await getBillingDetails(p1 ? p1.kodeAntrean : '', p1 ? p1.nomorRm : '');
    case 'processPayment': return await processPayment(p1);
    case 'closeCashierShift': return await closeCashierShift(p1.shiftId, p1.actualCash, p1.catatan, p2);
    case 'generateMedicalDoc': return await generateMedicalDoc(p1);
    case 'getSystemSettings': return await getSystemSettings(p1 ? p1.adminUserId : p2);
    case 'updateSystemSettings': return await updateSystemSettings(p2, p1.configKey, p1.configValue);
    case 'getAuditLogs': return await getAuditLogs(p1 ? p1.page : 1, p1 ? p1.limit : 20);
    case 'getAnalytics': return await getAnalyticsData();

    default: {
      try {
        const gasRes = await fetch(GAS_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: normAction, payload })
        });
        return await gasRes.json();
      } catch (err) {
        return { status: 'error', success: false, message: 'Aksi backend tidak dikenali: ' + normAction };
      }
    }
  }
}

// ============================================================================
// 10. SEO GENERATOR (JSON-LD & SCHEMA.ORG)
// ============================================================================

async function generateSeoConfig(pageKey, customData = {}) {
  const settingsList = await getTableData('SETTINGS');
  const settings = {};
  settingsList.forEach(s => { settings[s.key] = s.val; });

  const defaultClinic = {
    name: settings.KLINIK_NAMA || 'Klinik Akshara Dental Space',
    slogan: settings.KLINIK_SLOGAN || 'Modern Dental Care & Aesthetic Space',
    address: settings.KLINIK_ALAMAT || 'Jl. Andi Tonro Blok F No.30, Bongaya, Kec. Tamalate, Kota Makassar, Sulawesi Selatan 90131',
    phone: settings.KLINIK_TELEPON || '+62 853-3892-2586',
    email: settings.KLINIK_EMAIL || 'care@aksharadental.space',
    jamOperasional: settings.KLINIK_JAM_OPERASIONAL || 'Setiap Hari, 08:00 – 21:00 WITA',
    instagram: settings.KLINIK_INSTAGRAM || 'https://instagram.com/aksharadental',
    logo: settings.KLINIK_LOGO_URL || `${BASE_URL}/img/axalogo.png`,
    gmapsEmbed: settings.KLINIK_GMAPS_EMBED || 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d727.2324807218503!2d119.4172300669712!3d-5.171147028938255!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dbf1d71cf75a47d%3A0xa90a84353b81134a!2sJl.%20Andi%20Tonro%20Blok%20F%20No.30%2C%20Bongaya%2C%20Kec.%20Tamalate%2C%20Kota%20Makassar%2C%20Sulawesi%20Selatan%2090131!5e0!3m2!1sid!2sid!4v1788866524919!5m2!1sid!2sid',
    footerNote: settings.KLINIK_FOOTER_NOTE || 'Terakreditasi Paripurna Kemenkes RI — No. Akreditasi: YM.02.01/VI/2024'
  };

  const pages = {
    beranda: {
      title: `${defaultClinic.name} — Spesialis Konservasi Gigi & Perawatan Gigi Modern Makassar`,
      description: 'Pusat estetika gigi dan spesialis konservasi endodontik di Makassar oleh drg. Hj. Kurniawaty, Sp.KG, drg. M. Aksa Arsyad, dan drg. Tasya Awaliyah Arsyad. Dilengkapi Groq AI dan EMR Odontogram.',
      path: '/'
    },
    layanan: {
      title: `Layanan Gigi Terpadu & Konservasi — ${defaultClinic.name}`,
      description: 'Layanan unggulan konservasi endodontik, penambalan gigi estetik, perawatan saluran akar, ortodonsia, dan farmasi terpadu di Makassar.',
      path: '/layanan'
    },
    dokter: {
      title: `Jadwal Praktek Dokter Gigi Spesialis — ${defaultClinic.name}`,
      description: 'Jadwal praktek resmi drg. Hj. Kurniawaty, Sp.KG, drg. M. Aksa Arsyad, dan drg. Tasya Awaliyah Arsyad di Makassar.',
      path: '/dokter'
    },
    reservasi: {
      title: `Reservasi Pasien Online — ${defaultClinic.name}`,
      description: 'Ambil nomor antrean dan tentukan jadwal periksa dokter gigi secara mandiri tanpa menunggu lama di klinik.',
      path: '/reservasi'
    },
    kontak: {
      title: `Lokasi & Kontak Operasional — ${defaultClinic.name}`,
      description: `Kunjungi ${defaultClinic.name} di ${defaultClinic.address}. Layanan operasional ${defaultClinic.jamOperasional}.`,
      path: '/kontak'
    },
    antreanTv: {
      title: `Monitor Ruang Antrean Pasien — ${defaultClinic.name}`,
      description: 'Layar tampilan monitor antrean otomatis bertenaga Canopy Labs Orpheus AI Text-to-Speech dan lonceng chime di ruang tunggu.',
      path: '/antrean-tv'
    },
    adminDashboard: {
      title: `Portal Medis & Dashboard Staf — ${defaultClinic.name}`,
      description: 'Gerbang akses terverifikasi untuk Dokter Gigi, Farmasi, Laboratorium, Kasir POS, dan Super Administrator.',
      path: '/admin-dashboard'
    }
  };

  const selected = pages[pageKey] || pages.beranda;
  return {
    ...selected,
    canonicalUrl: `${BASE_URL}${selected.path}`,
    baseUrl: BASE_URL,
    clinic: defaultClinic,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Dentist',
      name: defaultClinic.name,
      url: BASE_URL,
      logo: defaultClinic.logo,
      telephone: defaultClinic.phone,
      email: defaultClinic.email,
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Jl. Andi Tonro Blok F No.30, Bongaya, Kec. Tamalate',
        addressLocality: 'Makassar',
        addressRegion: 'Sulawesi Selatan',
        postalCode: '90131',
        addressCountry: 'ID'
      }
    },
    ...customData
  };
}

// ============================================================================
// 11. MIDDLEWARE EXPRESS & ASSET HANDLING
// ============================================================================

const rootDir = process.cwd();
const publicPath = path.join(rootDir, 'public');

app.set('view engine', 'ejs');
app.set('views', path.join(rootDir, 'views'));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(express.static(publicPath, { maxAge: '1d', etag: true }));
app.use('/css', express.static(path.join(publicPath, 'css'), { maxAge: '1d' }));
app.use('/img', express.static(path.join(publicPath, 'img'), { maxAge: '1d' }));

app.get('/css/main.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  const files = [path.join(rootDir, 'public', 'css', 'main.css'), path.join(__dirname, 'public', 'css', 'main.css')];
  for (const f of files) { if (fs.existsSync(f)) return res.sendFile(f); }
  res.status(404).send('/* CSS main.css tidak ditemukan */');
});

app.get('/css/mainv2.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  const files = [path.join(rootDir, 'public', 'css', 'mainv2.css'), path.join(__dirname, 'public', 'css', 'mainv2.css')];
  for (const f of files) { if (fs.existsSync(f)) return res.sendFile(f); }
  res.status(404).send('/* CSS mainv2.css tidak ditemukan */');
});

app.get(['/img/axalogo.png', '/axalogo.png'], (req, res) => {
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  const files = [
    path.join(rootDir, 'public', 'img', 'axalogo.png'),
    path.join(rootDir, 'public', 'axalogo.png'),
    path.join(__dirname, 'public', 'img', 'axalogo.png')
  ];
  for (const f of files) { if (fs.existsSync(f)) return res.sendFile(f); }
  res.status(404).send('Logo tidak ditemukan');
});

// Router API Universal (V1 & V2)
app.all(['/api/v2/router', '/api/router', '/exec', '/macros/s/*/exec'], async (req, res) => {
  try {
    const action = req.body?.action || req.query?.action || req.body?.api || req.query?.api || '';
    const payload = req.body?.payload !== undefined ? req.body.payload : (req.body?.args !== undefined ? req.body.args : (req.body?.data || req.query));
    const result = await handleActionRouter(action, payload);
    res.setHeader('Content-Type', 'application/json');
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ status: 'error', success: false, message: 'Internal Server Error: ' + err.message });
  }
});

// Webhook untuk Railway Baileys
app.post('/api/railway/webhook', async (req, res) => {
  const result = await syncChatLog(req.body);
  return res.json(result);
});

// Proksi Suara Panggilan Antrean Orpheus Groq TTS
app.post('/api/groq/tts', async (req, res) => {
  try {
    const { model, voice, input } = req.body;
    const settings = await getTableData('SETTINGS');
    const apiKey = settings.find(s => s.key === 'GROQ_API_KEY')?.val || process.env.GROQ_API_KEY;

    if (!apiKey) return res.status(400).json({ status: 'error', message: 'GROQ_API_KEY belum disetel.' });

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/speech', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'canopylabs/orpheus-arabic-saudi',
        voice: voice || 'abdullah',
        response_format: 'wav',
        input: input || 'Nomor antrean dipanggil.'
      })
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return res.status(groqRes.status).json({ status: 'error', message: errText });
    }

    const audioBuffer = await groqRes.arrayBuffer();
    res.setHeader('Content-Type', 'audio/wav');
    return res.send(Buffer.from(audioBuffer));
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e.message });
  }
});

// ============================================================================
// 12. ROUTING HALAMAN WEB & PORTAL V2
// ============================================================================

app.get(['/admin-dashboardv2', '/portalv2', '/v2'], async (req, res) => {
  const seo = {
    title: 'Portal V2 & Railway WA Bot Gateway — Klinik Akshara Dental Space',
    description: 'Pusat kendali bot WhatsApp multi-client Railway Baileys, monitoring antrean pesan, dan generative AI medis terpadu.',
    canonicalUrl: `${BASE_URL}/admin-dashboardv2`
  };
  res.render('admin-dashboardv2', { seo, activeTab: 'adminv2' });
});

app.get('/', async (req, res) => {
  const seo = await generateSeoConfig('beranda');
  res.render('index', { seo, activeTab: 'beranda' });
});

app.get('/layanan', async (req, res) => {
  const seo = await generateSeoConfig('layanan');
  res.render('index', { seo, activeTab: 'layanan' });
});

app.get('/dokter', async (req, res) => {
  const seo = await generateSeoConfig('dokter');
  res.render('index', { seo, activeTab: 'dokter' });
});

app.get('/reservasi', async (req, res) => {
  const seo = await generateSeoConfig('reservasi');
  res.render('index', { seo, activeTab: 'reservasi' });
});

app.get('/kontak', async (req, res) => {
  const seo = await generateSeoConfig('kontak');
  res.render('index', { seo, activeTab: 'kontak' });
});

app.get('/antrean-tv', async (req, res) => {
  const seo = await generateSeoConfig('antreanTv');
  res.render('index', { seo, activeTab: 'tv', isTvMode: true });
});

app.get('/admin-dashboard', async (req, res) => {
  const seo = await generateSeoConfig('adminDashboard');
  res.render('admin-dashboard', { seo, activeTab: 'admin' });
});

app.get('/sitemap.xml', (req, res) => {
  const urls = [
    { loc: `${BASE_URL}/`, priority: '1.0' },
    { loc: `${BASE_URL}/layanan`, priority: '0.8' },
    { loc: `${BASE_URL}/dokter`, priority: '0.9' },
    { loc: `${BASE_URL}/reservasi`, priority: '0.9' },
    { loc: `${BASE_URL}/kontak`, priority: '0.7' },
    { loc: `${BASE_URL}/admin-dashboardv2`, priority: '0.5' }
  ];
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  urls.forEach(u => {
    xml += `  <url><loc>${u.loc}</loc><priority>${u.priority}</priority></url>\n`;
  });
  xml += '</urlset>';
  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

app.get('/robots.txt', (req, res) => {
  res.header('Content-Type', 'text/plain');
  res.send(`User-agent: *\nAllow: /\nDisallow: /admin-dashboard\nDisallow: /admin-dashboardv2\nSitemap: ${BASE_URL}/sitemap.xml`);
});

app.use(async (req, res) => {
  res.status(404).render('index', {
    seo: { title: 'Halaman Tidak Ditemukan (404) — Klinik Akshara Dental Space', canonicalUrl: `${BASE_URL}/404` },
    activeTab: 'beranda',
    is404: true
  });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`[Akshara Dental Space Engine] Berjalan di http://localhost:${PORT}`);
  });
}

module.exports = app;
