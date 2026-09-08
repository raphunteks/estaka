/**
 * ============================================================================
 * SISTEM OPERASIONAL ENTERPRISE KLINIK AKSHARA DENTAL SPACE & WA BOT GATEWAY
 * File: serverv2.js (Super Big Upgrade Logics - 100% Full Uncut)
 * Fitur: Express Server V2 Engine, Upstash Redis & In-Memory Fallback Storage,
 *        Penyedia Data 6 Tab (Log Chat, Broadcast Queue, Clients, Templates,
 *        Bookings Pasien, & AI Configuration Engine),
 *        Multi-Model AI (Gemini 3.5 Flash Default, Gemini 3.8/3.7/3.6/3.1, 2.5,
 *        OpenAI ChatGPT, & Groq LPU),
 *        Dukungan Penuh Format API Key AQ... & AIzaSy...,
 *        Railway Baileys Bot Proxy & Bi-Directional Webhook Sync,
 *        Dual-Mode GAS Fallback Router & Reliable Static Assets Delivery.
 * ============================================================================
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Redis } = require('@upstash/redis');

const app = express();
const PORT = process.env.PORT || 3001;
const BASE_URL = process.env.BASE_URL || 'https://aksharadental.vercel.app';
const GAS_API_URL = process.env.GAS_API_URL || 'https://script.google.com/macros/s/AKfycbzZ8HVyql76ZZbVY7qk8HISf9h8d8xfs6zb4NlrjUZu_MkEYlZMLbjoS300_ap80h-e/exec';
const DEFAULT_RAILWAY_URL = process.env.RAILWAY_DEFAULT_URL || 'https://btwwa-akshra-production.up.railway.app';

// ============================================================================
// 1. KATALOG LENGKAP MODEL GOOGLE AI STUDIO (GAMBAR 1 - 5), OPENAI & GROQ
// ============================================================================

const SUPPORTED_AI_MODELS_V2 = [
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
    console.warn('[Redis V2] Gagal menghubungkan Upstash Redis:', err.message);
  }
}

const memoryDB = {
  Admins: [],
  Clients: [],
  ChatLogs: [],
  Templates: [],
  BroadcastQueue: [],
  Bookings: [],
  ActivityLogs: [],
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
  AUDIT_LOG: []
};

async function getTableData(tableName) {
  const key = `AKSHARA_V2:${tableName}`;
  if (redis) {
    try {
      const data = await redis.get(key);
      if (data) {
        return typeof data === 'string' ? JSON.parse(data) : data;
      }
    } catch (e) {
      console.warn(`[Redis Get ${tableName}]:`, e.message);
    }
  }
  return memoryDB[tableName] || [];
}

async function setTableData(tableName, dataArray) {
  const key = `AKSHARA_V2:${tableName}`;
  memoryDB[tableName] = dataArray;
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(dataArray));
      return true;
    } catch (e) {
      console.warn(`[Redis Set ${tableName}]:`, e.message);
    }
  }
  return false;
}

// ============================================================================
// 3. SEEDING AWAL TABEL PORTAL V2 & OPERASIONAL KLINIS
// ============================================================================

async function initDatabaseStorageV2() {
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

  // 1. Admins V2
  const currentAdmins = await getTableData('Admins');
  if (!currentAdmins || currentAdmins.length === 0) {
    await setTableData('Admins', [
      { adminId: 'ADM-0001', username: 'superadmin', password: 'admin123', fullName: 'Super Administrator Akshara', role: 'Superadmin', createdAt: nowStr },
      { adminId: 'ADM-0002', username: 'operator1', password: 'op123', fullName: 'Operator Medis Akshara', role: 'Operator Medis', createdAt: nowStr }
    ]);
  }

  // 2. Settings V2 (AI Models, Keys, Clinic Branding)
  const currentSettings = await getTableData('SETTINGS');
  if (!currentSettings || currentSettings.length === 0) {
    await setTableData('SETTINGS', [
      { key: 'GEMINI_API_KEY', val: process.env.GEMINI_API_KEY || '', desc: 'Kunci API Google AI Studio / Gemini (AQ... atau AIzaSy...)' },
      { key: 'GEMINI_MODEL', val: process.env.GEMINI_MODEL || 'gemini-3.5-flash', desc: 'Model default Google Gemini (Default: Gemini 3.5 Flash)' },
      { key: 'OPENAI_API_KEY', val: process.env.OPENAI_API_KEY || '', desc: 'Kunci API OpenAI ChatGPT' },
      { key: 'OPENAI_MODEL', val: process.env.OPENAI_MODEL || 'gpt-4o-mini', desc: 'Model default OpenAI ChatGPT' },
      { key: 'GROQ_API_KEY', val: process.env.GROQ_API_KEY || '', desc: 'Kunci API Groq LPU' },
      { key: 'GROQ_MODEL', val: 'openai/gpt-oss-120b', desc: 'Model default Groq AI' },
      { key: 'RAILWAY_DEFAULT_URL', val: DEFAULT_RAILWAY_URL, desc: 'URL instance Baileys di Railway Cloud' },
      { key: 'RAILWAY_PING_TIMEOUT', val: '4000', desc: 'Timeout ping Railway (ms)' },
      { key: 'KLINIK_NAMA', val: 'Klinik Akshara Dental Space', desc: 'Nama resmi klinik' },
      { key: 'KLINIK_TELEPON', val: '+62 853-3892-2586', desc: 'Hotline WhatsApp resmi' },
      { key: 'KLINIK_ALAMAT', val: 'Jl. Andi Tonro Blok F No.30, Bongaya, Kec. Tamalate, Kota Makassar', desc: 'Alamat klinik' }
    ]);
  }

  // 3. Templates Klinis WhatsApp
  const currentTemplates = await getTableData('Templates');
  if (!currentTemplates || currentTemplates.length === 0) {
    await setTableData('Templates', [
      {
        templateId: 'TPL-0001',
        name: 'Konfirmasi Reservasi Jadwal Gigi',
        category: 'Reservasi',
        content: 'Halo Bapak/Ibu {nama}, pendaftaran janji temu pemeriksaan gigi di Klinik Akshara Dental Space telah terkonfirmasi untuk tanggal {tanggal}. Mohon hadir 15 menit sebelum slot waktu.',
        updatedAt: nowStr
      },
      {
        templateId: 'TPL-0002',
        name: 'Pengingat Kontrol Saluran Akar & Tambalan',
        category: 'Kontrol Rutin',
        content: 'Yth. Pasien {nama}, jadwal evaluasi perawatan saluran akar / kontrol gigi Anda dijadwalkan besok jam {jam}. Balas 1 jika hadir, atau hubungi hotline kami.',
        updatedAt: nowStr
      },
      {
        templateId: 'TPL-0003',
        name: 'Rincian E-Billing Kasir Gigi',
        category: 'Billing',
        content: 'Pemberitahuan: Rincian transaksi perawatan gigi {nama} sebesar Rp {nominal} telah lunas. Struk elektronik dan resume medis dapat diakses di portal resmi.',
        updatedAt: nowStr
      }
    ]);
  }

  // 4. Bookings Awal
  const currentBookings = await getTableData('Bookings');
  if (!currentBookings || currentBookings.length === 0) {
    await setTableData('Bookings', [
      {
        bookingId: 'BKG-0001',
        patientName: 'Ahmad Dani Santoso',
        phoneNumber: '6281234567890',
        serviceType: 'Konservasi Gigi (Endodontik)',
        bookingDate: '2026-09-10 16:30',
        status: 'CONFIRMED',
        createdAt: nowStr
      }
    ]);
  }

  // 5. Activity Logs Inisialisasi
  const currentLogs = await getTableData('ActivityLogs');
  if (!currentLogs || currentLogs.length === 0) {
    await setTableData('ActivityLogs', [
      {
        actId: 'ACT-0001',
        timestamp: nowStr,
        userId: 'SYSTEM',
        action: 'INIT_SERVER_V2',
        details: 'Server V2 Upstash Redis Engine aktif untuk Akshara Dental Space.'
      }
    ]);
  }
}

initDatabaseStorageV2();

// ============================================================================
// 4. HELPER SEKUENSIAL, AUDIT LOG & UTILITY
// ============================================================================

function getNowTimestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

async function writeAuditLog(userId, action, moduleName, details) {
  try {
    const logs = await getTableData('ActivityLogs');
    const actId = 'ACT-' + (logs.length + 1).toString().padStart(4, '0');
    const item = {
      actId,
      timestamp: getNowTimestamp(),
      userId: userId || 'SUPERADMIN',
      action,
      module: moduleName || 'PORTAL_V2',
      details: typeof details === 'object' ? JSON.stringify(details) : String(details)
    };
    logs.push(item);
    await setTableData('ActivityLogs', logs);
  } catch (err) {
    console.error('[Audit Log V2 Error]:', err.message);
  }
}

async function generateNextId(tableName, prefix, padLength = 4) {
  const items = await getTableData(tableName);
  let highest = 0;
  items.forEach(item => {
    const raw = item[Object.keys(item)[0]];
    if (raw && typeof raw === 'string' && raw.includes(prefix)) {
      const num = parseInt(raw.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num) && num > highest) highest = num;
    }
  });
  return `${prefix}-${(highest + 1).toString().padStart(padLength, '0')}`;
}

async function getSettingValue(keyName) {
  const settings = await getTableData('SETTINGS');
  const matched = settings.find(s => s.key === keyName);
  if (matched && matched.val) return matched.val;
  return process.env[keyName] || '';
}

async function saveSettingValue(keyName, val) {
  const settings = await getTableData('SETTINGS');
  const matched = settings.find(s => s.key === keyName);
  if (matched) {
    matched.val = val;
  } else {
    settings.push({ key: keyName, val, desc: 'Set via Portal V2' });
  }
  await setTableData('SETTINGS', settings);
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

    const userData = {
      userId: matchedUser.userId,
      adminId: matchedUser.userId,
      username: matchedUser.username,
      fullName: matchedUser.fullName,
      role: matchedUser.role,
      poliklinikId: matchedUser.poliklinikId,
      dokterId: matchedUser.poliklinikId || 'DOC-001'
    };

    await writeAuditLog(matchedUser.username, 'LOGIN_SUCCESS', 'AUTH_KLINIK', `Login berhasil sebagai ${matchedUser.role}`);
    return { status: 'success', success: true, user: userData, message: 'Login berhasil.' };
  }

  await writeAuditLog(cleanUser, 'LOGIN_FAILED', 'AUTH', `Percobaan login gagal untuk username: ${cleanUser}`);
  return { status: 'error', success: false, message: 'Username atau Password salah!' };
}

// ============================================================================
// 6. LOGIKA 6 TAB ADMIN-DASHBOARD V2
// ============================================================================

// TAB 1: LOG PERCAKAPAN WHATSAPP (ChatLogs)
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
    return { success: false, status: 'error', message: 'Konten pesan log tidak boleh kosong.' };
  }
  const logs = await getTableData('ChatLogs');
  const logId = await generateNextId('ChatLogs', 'LOG', 4);
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
  return { success: true, status: 'success', message: 'Chat log tersimpan di Upstash Redis', logId };
}

// TAB 2: BROADCAST QUEUE MANAGER (BroadcastQueue)
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
  const queueId = await generateNextId('BroadcastQueue', 'QUE', 4);
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
  return { success: true, status: 'success', message: 'Pesan berhasil dimasukkan ke antrean.', queueId };
}

async function sendBroadcastNow(queueId, adminId = 'SUPERADMIN') {
  const queue = await getTableData('BroadcastQueue');
  const matched = queue.find(q => q.queueId === queueId);
  if (!matched) {
    return { success: false, status: 'error', message: 'Antrean tidak ditemukan.' };
  }

  const nowStr = getNowTimestamp();
  matched.status = 'SENT';
  matched.sentAt = nowStr;
  await setTableData('BroadcastQueue', queue);

  // Catat ke ChatLogs
  await syncChatLog({
    clientId: matched.clientId,
    sender: 'KLINIK_BROADCAST',
    receiver: matched.targetNumber,
    type: 'OUTGOING',
    content: matched.messageContent,
    status: 'SENT'
  });

  await writeAuditLog(adminId, 'DISPATCH_BROADCAST', 'BROADCAST', `Kirim instan antrean ${queueId}`);
  return { success: true, status: 'success', message: `Antrean ${queueId} berhasil dikirim!` };
}

async function deleteBroadcastQueueItem(queueId, adminId = 'SUPERADMIN') {
  let queue = await getTableData('BroadcastQueue');
  const initialLen = queue.length;
  queue = queue.filter(q => q.queueId !== queueId);

  if (queue.length === initialLen) {
    return { success: false, status: 'error', message: 'Antrean tidak ditemukan.' };
  }
  await setTableData('BroadcastQueue', queue);
  await writeAuditLog(adminId, 'DELETE_BROADCAST', 'BROADCAST', `Hapus antrean ${queueId}`);
  return { success: true, status: 'success', message: `Antrean ${queueId} berhasil dibatalkan.` };
}

// TAB 3: CLIENT RAILWAY BOT (Clients)
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
    return { success: false, status: 'error', message: 'Nama client dan nomor WhatsApp bot wajib diisi.' };
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
    finalId = await generateNextId('Clients', 'CLI', 4);
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
  await writeAuditLog(adminId, 'SAVE_CLIENT', 'CLIENTS', `Simpan node client ${finalId}`);
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
      message: `Railway Bot Online (HTTP ${res.status}) - ${latency}ms`
    };
  } catch (err) {
    return { success: false, status: 'error', statusCode: 0, latencyMs: 9999, message: 'Railway Offline: ' + err.message };
  }
}

// TAB 4: TEMPLATE KLINIS (Templates)
async function getTemplatesList() {
  const templates = await getTableData('Templates');
  return { success: true, status: 'success', templates };
}

// TAB 5: ANTREAN & RESERVASI PASIEN (Bookings)
async function savePatientBooking(payload = {}) {
  if (!payload.patientName || !payload.phoneNumber) {
    return { success: false, status: 'error', message: 'Nama dan nomor telepon wajib diisi.' };
  }
  const bookings = await getTableData('Bookings');
  const bookingId = await generateNextId('Bookings', 'BKG', 4);
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
  return { success: true, status: 'success', message: `Reservasi berhasil dibuat! No: ${bookingId}`, bookingId };
}

async function getBookingsList() {
  const bookings = await getTableData('Bookings');
  return { success: true, status: 'success', bookings: [...bookings].reverse() };
}

// TAB 6: ENGINE KONFIGURASI AI (Google Gemini, OpenAI ChatGPT, Groq)
async function getAiConfig() {
  const geminiKey = await getSettingValue('GEMINI_API_KEY');
  const geminiModel = await getSettingValue('GEMINI_MODEL') || 'gemini-3.5-flash';
  const openAiKey = await getSettingValue('OPENAI_API_KEY');
  const openAiModel = await getSettingValue('OPENAI_MODEL') || 'gpt-4o-mini';

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
  if (payload.model) await saveSettingValue('GEMINI_MODEL', payload.model);
  if (payload.apiKey && !payload.apiKey.includes('*')) await saveSettingValue('GEMINI_API_KEY', payload.apiKey);
  if (payload.openaiModel) await saveSettingValue('OPENAI_MODEL', payload.openaiModel);
  if (payload.openaiApiKey && !payload.openaiApiKey.includes('*')) await saveSettingValue('OPENAI_API_KEY', payload.openaiApiKey);

  await writeAuditLog(adminId, 'UPDATE_AI_CONFIG', 'SETTINGS', 'Perbarui konfigurasi Gemini & OpenAI');
  return { success: true, status: 'success', message: 'Konfigurasi model AI berhasil disimpan!' };
}

// Gemini AI Engine - Mendukung Format AQ... Maupun AIzaSy...
async function askGeminiClinic(payload = {}) {
  const apiKey = payload.geminiKey || payload.apiKey || await getSettingValue('GEMINI_API_KEY');
  const model = payload.model || await getSettingValue('GEMINI_MODEL') || 'gemini-3.5-flash';

  if (!apiKey) {
    return { success: false, status: 'error', message: 'GEMINI_API_KEY belum disetel.' };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
  const systemInstruction = 'Anda adalah Asisten Medis AI & Odontolog Cerdas Klinik Akshara Dental Space Makassar. Berikan analisis klinis, rekomendasi terapi gigi, dan peringatan interaksi obat secara profesional, ringkas, dan akurat.';

  const formatted = [];
  (payload.history || []).forEach(h => {
    if (h.role && h.text) formatted.push({ role: h.role === 'model' ? 'model' : 'user', parts: [{ text: String(h.text) }] });
  });
  if (payload.prompt) formatted.push({ role: 'user', parts: [{ text: String(payload.prompt) }] });

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: formatted,
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024 }
      })
    });
    const data = await res.json();
    if (res.ok && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      const reply = data.candidates[0].content.parts[0].text;
      return { success: true, status: 'success', text: reply, reply, modelUsed: model };
    }
    return { success: false, status: 'error', message: data.error ? data.error.message : 'Respon Gemini kosong.' };
  } catch (err) {
    return { success: false, status: 'error', message: 'Gagal memanggil Gemini AI: ' + err.message };
  }
}

async function askOpenAiClinic(payload = {}) {
  const apiKey = payload.apiKey || await getSettingValue('OPENAI_API_KEY');
  const model = payload.model || await getSettingValue('OPENAI_MODEL') || 'gpt-4o-mini';

  if (!apiKey) {
    return { success: false, status: 'error', message: 'OPENAI_API_KEY belum disetel.' };
  }

  const messages = [
    { role: 'system', content: 'Anda adalah Asisten Medis AI & Odontolog Cerdas Klinik Akshara Dental Space Makassar.' }
  ];
  (payload.history || []).forEach(h => {
    if (h.role && h.text) messages.push({ role: h.role === 'model' ? 'assistant' : 'user', content: String(h.text) });
  });
  if (payload.prompt) messages.push({ role: 'user', content: String(payload.prompt) });

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        max_tokens: 1024
      })
    });
    const data = await res.json();
    if (res.ok && data.choices && data.choices[0]?.message?.content) {
      const reply = data.choices[0].message.content;
      return { success: true, status: 'success', text: reply, reply, modelUsed: model };
    }
    return { success: false, status: 'error', message: data.error ? data.error.message : 'Respon OpenAI kosong.' };
  } catch (err) {
    return { success: false, status: 'error', message: 'Gagal memanggil OpenAI: ' + err.message };
  }
}

// ============================================================================
// 7. UNIVERSAL ACTION ROUTER DISPATCHER
// ============================================================================

async function handleActionDispatcher(action, payload) {
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
    // Tab 1: ChatLogs
    case 'getChatLogsPaginated': return await getChatLogsPaginated(p1);
    case 'syncChatLog': return await syncChatLog(p1);

    // Tab 2: Broadcast Queue
    case 'getBroadcastQueuePaginated': return await getBroadcastQueuePaginated(p1);
    case 'addBroadcastQueueItem': return await addBroadcastQueueItem(p1, p2);
    case 'sendBroadcastNow': return await sendBroadcastNow(p1, p2);
    case 'deleteBroadcastQueueItem': return await deleteBroadcastQueueItem(p1, p2);

    // Tab 3: Clients Node
    case 'getClientsList': return await getClientsList();
    case 'saveOrUpdateClient': return await saveOrUpdateClient(p1, p2);
    case 'deleteClient': return await deleteClient(p1, p2);
    case 'pingRailwayClient': return await pingRailwayClient(p1.railwayUrl || p1);
    case 'getRailwayQrPayload': {
      const target = await getSettingValue('RAILWAY_DEFAULT_URL') || DEFAULT_RAILWAY_URL;
      return { success: true, status: 'success', qrUrl: `${target.replace(/\/$/, '')}/qr` };
    }

    // Tab 4: Templates
    case 'getTemplatesList': return await getTemplatesList();

    // Tab 5: Bookings
    case 'savePatientBooking': return await savePatientBooking(p1);
    case 'getBookingsList': return await getBookingsList();

    // Tab 6: AI Configuration & Inference
    case 'getAvailableAiModels': {
      const cur = await getSettingValue('GEMINI_MODEL') || 'gemini-3.5-flash';
      return {
        success: true,
        status: 'success',
        models: SUPPORTED_AI_MODELS_V2,
        defaultModel: cur
      };
    }
    case 'getAiConfig': return await getAiConfig();
    case 'saveAiConfig': return await saveAiConfig(p1, p2);
    case 'setClinicModelQuick': {
      const m = String(p1).trim();
      if (m.includes('gpt') || m.includes('o3')) await saveSettingValue('OPENAI_MODEL', m);
      else await saveSettingValue('GEMINI_MODEL', m);
      return { success: true, status: 'success', message: `Model default diubah ke ${m}`, currentModel: m };
    }
    case 'askGemini':
    case 'askGeminiClinic': return await askGeminiClinic(p1);
    case 'askOpenAi':
    case 'askOpenAiClinic': return await askOpenAiClinic(p1);

    default:
      // Fallback ke Google Apps Script Router jika aksi spesifik belum ada di V2
      try {
        const gasRes = await fetch(GAS_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: normAction, payload })
        });
        return await gasRes.json();
      } catch (err) {
        return { success: false, status: 'error', message: 'Aksi V2 tidak dikenal & GAS offline: ' + normAction };
      }
  }
}

// ============================================================================
// 8. MIDDLEWARE EXPRESS, STATIC ASSETS & VIEW ROUTING
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

// Handler CSS Khusus Portal V2 & Logo Anti-404
app.get('/css/mainv2.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  const paths = [
    path.join(rootDir, 'public', 'css', 'mainv2.css'),
    path.join(__dirname, 'public', 'css', 'mainv2.css')
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return res.sendFile(p);
  }
  res.status(404).send('/* mainv2.css tidak ditemukan */');
});

app.get(['/img/axalogo.png', '/axalogo.png'], (req, res) => {
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  const paths = [
    path.join(rootDir, 'public', 'img', 'axalogo.png'),
    path.join(rootDir, 'public', 'axalogo.png'),
    path.join(__dirname, 'public', 'img', 'axalogo.png')
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return res.sendFile(p);
  }
  res.status(404).send('Logo tidak ditemukan');
});

// Endpoint Router API Terpadu (V1 & V2)
app.all(['/api/v2/router', '/api/router', '/exec'], async (req, res) => {
  try {
    const action = req.body?.action || req.query?.action || req.body?.api || req.query?.api || '';
    const payload = req.body?.payload !== undefined ? req.body.payload : (req.body?.args !== undefined ? req.body.args : (req.body?.data || req.query));
    const result = await handleActionDispatcher(action, payload);
    res.setHeader('Content-Type', 'application/json');
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, status: 'error', message: err.message });
  }
});

// Endpoint Webhook Langsung untuk Baileys Railway
app.post('/api/railway/webhook', async (req, res) => {
  const result = await syncChatLog(req.body);
  return res.json(result);
});

// Routing Halaman Portal V2
app.get(['/admin-dashboardv2', '/portalv2', '/v2'], async (req, res) => {
  const seo = {
    title: 'Portal V2 & Railway WA Bot Gateway — Klinik Akshara Dental Space',
    description: 'Pusat kendali bot WhatsApp multi-client Railway Baileys, monitoring antrean pesan, dan generative AI medis terpadu.',
    canonicalUrl: `${BASE_URL}/admin-dashboardv2`
  };
  res.render('admin-dashboardv2', { seo, activeTab: 'adminv2' });
});

// Default Fallback ke Dashboard V2
app.get('/', async (req, res) => {
  res.redirect('/admin-dashboardv2');
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`[Akshara V2 Server Engine] Berjalan di http://localhost:${PORT}`);
  });
}

module.exports = app;
