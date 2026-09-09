/**
 * ============================================================================
 * SISTEM OPERASIONAL ENTERPRISE KLINIK ESTAKA DENTAL CLINIC & WA BOT GATEWAY
 * File: serverv2.js (Tahap 6: Dedicated WA Bot Gateway & Portal V2 Engine)
 * ============================================================================
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Redis } = require('@upstash/redis');

const app = express();
const PORT = process.env.PORT || 3001;
const PORT_CLINICAL = process.env.PORT_CLINICAL || 3000;
const BASE_URL = process.env.BASE_URL || 'https://estakadentalclinic.vercel.app';
const GAS_API_URL = process.env.GAS_API_URL || 'https://script.google.com/macros/s/AKfycbzZ8HVyql76ZZbVY7qk8HISf9h8d8xfs6zb4NlrjUZu_MkEYlZMLbjoS300_ap80h-e/exec';
const DEFAULT_RAILWAY_URL = process.env.RAILWAY_DEFAULT_URL || 'https://btwwa-akshra-production.up.railway.app';
const SYNC_SECRET_TOKEN = process.env.SYNC_SECRET_TOKEN || 'ESTAKA_CLINIC_SECRET_2026';

// Cache Deduplikasi Notifikasi WhatsApp di Memory V2 (Cooldown Anti-Spam)
const recentV2Dispatches = new Map();
const V2_DEDUPE_TTL_MS = 30000; // 30 detik cooldown deduplikasi

// Mapping Baku Nomor WhatsApp Dokter Resmi Estaka Dental Clinic
const OFFICIAL_DOCTOR_PHONES = {
  'DOC-001': '6282291675363', // drg. Hj. Kurniawaty, Sp.KG
  'DOC-002': '6285256739684', // drg. M. Aksa Arsyad
  'DOC-003': '6281243647654'  // drg. Tasya Awaliyah Arsyad
};

// ============================================================================
// 1. KATALOG LENGKAP MODEL GOOGLE AI STUDIO, OPENAI & GROQ
// ============================================================================

const SUPPORTED_AI_MODELS_V2 = [
  // Gemini 3 Series (Default: Gemini 3.5 Flash)
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

  // Gemini 2 & 2.5 Series
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', category: 'Gemini 2.5 Series', description: 'Complex Analytical Triage' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', category: 'Gemini 2.5 Series', description: 'Stable Fast Conversational' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', category: 'Gemini 2.5 Series', description: 'Ultra-Low Latency' },
  { id: 'gemini-2.5-flash-tts', name: 'Gemini 2.5 Flash TTS', category: 'Gemini 2.5 Series', description: 'Multi-modal Audio Speech' },
  { id: 'gemini-2.5-pro-tts', name: 'Gemini 2.5 Pro TTS', category: 'Gemini 2.5 Series', description: 'High-Fidelity Audio Synthesis' },
  { id: 'gemini-2-flash', name: 'Gemini 2 Flash', category: 'Gemini 2 Series', description: 'High Performance Text Engine' },
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2 Flash Lite', category: 'Gemini 2 Series', description: 'Ultra-Fast Lightweight' },

  // Specialized Agents & Open Models
  { id: 'deep-research-pro-preview', name: 'Deep Research Pro Preview', category: 'Specialist Agents', description: 'Agentic Deep Clinical Synthesizer' },
  { id: 'antigravity', name: 'Antigravity', category: 'Specialist Agents', description: 'Autonomous High-RPM Agent Engine' },
  { id: 'computer-use-preview', name: 'Computer Use Preview', category: 'Specialist Agents', description: 'System Automation Agent' },
  { id: 'gemma-4-31b', name: 'Gemma 4 31B', category: 'Gemma Open Models', description: 'High Capability Open Architecture' },
  { id: 'gemma-4-26b', name: 'Gemma 4 26B', category: 'Gemma Open Models', description: 'Compact Open Architecture' },

  // OpenAI ChatGPT Series
  { id: 'gpt-4o', name: 'GPT-4o (Omni)', category: 'OpenAI ChatGPT', description: 'Flagship Multimodal Cerdas & Cepat' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', category: 'OpenAI ChatGPT', description: 'Ringan, Cepat & Hemat Token' },
  { id: 'o3-mini', name: 'OpenAI o3-mini', category: 'OpenAI Reasoning', description: 'Penalaran Logika & STEM Medis Mendalam' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', category: 'OpenAI ChatGPT', description: 'Kapasitas Konteks Panjang' },

  // Groq LPU Ultra-Speed Series
  { id: 'openai/gpt-oss-120b', name: 'Groq GPT-OSS 120B', category: 'Groq LPU AI', description: 'Flagship Inference Cepat LPU' },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', category: 'Groq LPU AI', description: 'Performa Penalaran Tinggi' },
  { id: 'openai/gpt-oss-20b', name: 'Groq GPT-OSS 20B', category: 'Groq LPU AI', description: 'Respon Kilat Triage Klinis' }
];

// ============================================================================
// 2. BASIS DATA UPSTASH REDIS (MURNI TABEL PORTAL V2, BOT GATEWAY & PROMPTS)
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
  CustomPrompts: [],
  ActivityLogs: [],
  SETTINGS: []
};

async function getTableData(tableName) {
  const primaryKey = `ESTAKA_V2:${tableName}`;
  const legacyKey = `AKSHARA_V2:${tableName}`;
  if (redis) {
    try {
      let data = await redis.get(primaryKey);
      if (!data) data = await redis.get(legacyKey);
      if (data) return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (e) {
      console.warn(`[Redis Get ${tableName}]:`, e.message);
    }
  }
  return memoryDB[tableName] || [];
}

async function setTableData(tableName, dataArray) {
  const primaryKey = `ESTAKA_V2:${tableName}`;
  memoryDB[tableName] = dataArray;
  if (redis) {
    try {
      await redis.set(primaryKey, JSON.stringify(dataArray));
      return true;
    } catch (e) {
      console.warn(`[Redis Set ${tableName}]:`, e.message);
    }
  }
  return false;
}

// ============================================================================
// 3. HYBRID CLOUD DATA BRIDGE & HELPER TELEPON
// ============================================================================

async function fetchFromGAS(action, payload = {}) {
  try {
    const res = await fetch(GAS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload, args: [payload] }),
      signal: AbortSignal.timeout(8000)
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn(`[Cloud Data Bridge Warning: ${action}]:`, err.message);
  }
  return null;
}

function sanitizePhoneNumberE164(rawNumber) {
  if (!rawNumber) return '';
  let cleaned = String(rawNumber).replace(/@s\.whatsapp\.net$/i, '').replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  } else if (!cleaned.startsWith('62') && cleaned.length >= 8) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

function resolveDoctorPhoneLocal(dokterId, dokterNama) {
  if (dokterId && OFFICIAL_DOCTOR_PHONES[dokterId]) {
    return OFFICIAL_DOCTOR_PHONES[dokterId];
  }
  if (dokterNama) {
    const dn = String(dokterNama).toLowerCase();
    if (dn.includes('kurniawaty')) return OFFICIAL_DOCTOR_PHONES['DOC-001'];
    if (dn.includes('aksa')) return OFFICIAL_DOCTOR_PHONES['DOC-002'];
    if (dn.includes('tasya')) return OFFICIAL_DOCTOR_PHONES['DOC-003'];
  }
  return OFFICIAL_DOCTOR_PHONES['DOC-001'];
}

async function initStorageV2() {
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const currentSettings = await getTableData('SETTINGS');
  if (!currentSettings || currentSettings.length === 0) {
    await setTableData('SETTINGS', [
      { key: 'GEMINI_API_KEY', val: process.env.GEMINI_API_KEY || '', desc: 'Kunci API Google AI Studio / Gemini (AQ... atau AIzaSy...)' },
      { key: 'GEMINI_MODEL', val: process.env.GEMINI_MODEL || 'gemini-3.5-flash', desc: 'Default Gemini Model: Gemini 3.5 Flash' },
      { key: 'OPENAI_API_KEY', val: process.env.OPENAI_API_KEY || '', desc: 'Kunci API OpenAI' },
      { key: 'OPENAI_MODEL', val: process.env.OPENAI_MODEL || 'gpt-4o-mini', desc: 'Model default OpenAI' },
      { key: 'RAILWAY_DEFAULT_URL', val: DEFAULT_RAILWAY_URL, desc: 'URL instance Baileys di Railway Cloud' },
      { key: 'SYNC_SECRET_TOKEN', val: 'ESTAKA_CLINIC_SECRET_2026', desc: 'Token otentikasi webhook bot Railway' },
      { key: 'KLINIK_NAMA', val: 'Estaka Dental Clinic', desc: 'Nama resmi klinik' },
      { key: 'KLINIK_TELEPON', val: '+62 853-3892-2586', desc: 'Hotline WhatsApp resmi' },
      { key: 'KLINIK_EMAIL', val: 'estakadentalclinic@gmail.com', desc: 'Email resmi klinik' },
      { key: 'KLINIK_LOGO_URL', val: `${BASE_URL}/img/estakalogo.png`, desc: 'URL Favicon Logo Resmi' }
    ]);
  }

  const currentAdmins = await getTableData('Admins');
  if (!currentAdmins || currentAdmins.length === 0) {
    await setTableData('Admins', [
      { adminId: 'ADM-0001', username: 'superadmin', password: 'admin123', fullName: 'Super Administrator Estaka', role: 'Superadmin', createdAt: nowStr },
      { adminId: 'ADM-0002', username: 'operator1', password: 'op123', fullName: 'Operator Medis Estaka', role: 'Operator Medis', createdAt: nowStr }
    ]);
  }

  const currentClients = await getTableData('Clients');
  if (!currentClients || currentClients.length === 0) {
    await setTableData('Clients', [
      {
        clientId: 'CLI-0001',
        name: 'Estaka Core Bot (Railway)',
        phone: '6285338922586',
        railwayUrl: DEFAULT_RAILWAY_URL,
        status: 'CONNECTED',
        expiredDate: '31/12/2027 23:59:59',
        notes: 'Production Baileys Node Primary'
      }
    ]);
  }

  const currentPrompts = await getTableData('CustomPrompts');
  if (!currentPrompts || currentPrompts.length === 0) {
    await setTableData('CustomPrompts', [
      {
        promptId: 'PRM-0001',
        title: 'Estaka Dental Clinical Assistant (Default)',
        targetModel: 'Gemini',
        systemPrompt: 'Anda adalah Asisten Medis AI & Odontolog Cerdas Resmi Estaka Dental Clinic Makassar. Karakter: Sangat cerdas, santun, hangat, empatik, berbasis kedokteran gigi klinis terpercaya. Berikan penjelasan terstruktur, to-the-point, jangan biarkan kalimat menggantung, dan tekankan protokol darurat dental jika ada gejala berat.',
        isActive: true,
        updatedAt: nowStr
      },
      {
        promptId: 'PRM-0002',
        title: 'OpenAI Medical Reasoning Triage',
        targetModel: 'OpenAI',
        systemPrompt: 'Anda adalah Senior Dental Consultant AI untuk Estaka Dental Clinic. Analisis diferensial diagnosis karies, endodontik, dan periodonsia dengan standar klasifikasi ICD-10 medis internasional secara sistematis.',
        isActive: true,
        updatedAt: nowStr
      }
    ]);
  }
}

initStorageV2();

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

  // 1. Cek tabel Admins di Redis V2
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

  // 2. Delegasikan pengecekan ke server.js klinis (port 3000)
  try {
    const clinicalRes = await fetch(`http://127.0.0.1:${PORT_CLINICAL}/api/router`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'loginUser', payload: { username: cleanUser, password: cleanPass } }),
      signal: AbortSignal.timeout(3000)
    });
    if (clinicalRes.ok) {
      const data = await clinicalRes.json();
      if (data && (data.success || data.status === 'success')) return data;
    }
  } catch (e) {}

  // 3. Fallback cek ke Google Apps Script
  const gasAuth = await fetchFromGAS('loginUser', { username: cleanUser, password: cleanPass });
  if (gasAuth && (gasAuth.success || gasAuth.status === 'success') && gasAuth.user) {
    return { status: 'success', success: true, user: gasAuth.user, message: 'Login berhasil via Cloud Bridge.' };
  }

  await writeAuditLog(cleanUser, 'LOGIN_FAILED', 'AUTH', `Percobaan login gagal untuk username: ${cleanUser}`);
  return { status: 'error', success: false, message: 'Username atau Password salah!' };
}

// ============================================================================
// 6. LOGIKA 7 TAB DENGAN CLOUD DATA BRIDGE, TELEMETRI & PROMPTS
// ============================================================================

// TAB 1: LOG PERCAKAPAN WHATSAPP
async function getChatLogsPaginated(filters = {}) {
  let logs = await getTableData('ChatLogs');

  if (!logs || logs.length === 0 || filters.refresh) {
    const gasRes = await fetchFromGAS('getChatLogsPaginated', filters);
    let rawList = (gasRes && (gasRes.logs || gasRes.data || gasRes.list)) ? (gasRes.logs || gasRes.data || gasRes.list) : (Array.isArray(gasRes) ? gasRes : []);

    if (rawList && rawList.length > 0) {
      logs = rawList.map((item, idx) => {
        if (Array.isArray(item)) {
          return {
            logId: item[0] || `LOG-${(idx + 1).toString().padStart(4, '0')}`,
            timestamp: item[1] || getNowTimestamp(),
            clientId: item[2] || 'CLI-0001',
            sender: item[3] || '-',
            receiver: item[4] || '-',
            type: item[5] || 'INCOMING',
            content: item[6] || '',
            status: item[7] || 'DELIVERED'
          };
        }
        return {
          logId: item.logId || item.Log_ID || `LOG-${(idx + 1).toString().padStart(4, '0')}`,
          timestamp: item.timestamp || item.Timestamp || getNowTimestamp(),
          clientId: item.clientId || item.Client_ID || 'CLI-0001',
          sender: item.sender || item.senderNumber || item.Sender_Number || '-',
          receiver: item.receiver || item.receiverNumber || item.Receiver_Number || '-',
          type: item.type || item.messageType || item.Message_Type || 'INCOMING',
          content: item.content || item.messageContent || item.Message_Content || '',
          status: item.status || item.Status || 'DELIVERED'
        };
      });
      await setTableData('ChatLogs', logs);
    }
  }

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
  const content = payload.content || payload.messageContent || payload.text;
  if (!content) {
    return { success: false, status: 'error', message: 'Konten pesan log tidak boleh kosong.' };
  }

  const logs = await getTableData('ChatLogs');
  const logId = await generateNextId('ChatLogs', 'LOG', 4);
  const formattedSender = sanitizePhoneNumberE164(payload.senderNumber || payload.sender || 'UNKNOWN');
  const formattedReceiver = sanitizePhoneNumberE164(payload.receiverNumber || payload.receiver || 'BOT');

  const newLog = {
    logId,
    timestamp: getNowTimestamp(),
    clientId: payload.clientId || 'CLI-0001',
    sender: formattedSender || String(payload.senderNumber || payload.sender || 'UNKNOWN'),
    receiver: formattedReceiver || String(payload.receiverNumber || payload.receiver || 'BOT'),
    type: String(payload.messageType || payload.type || 'INCOMING').toUpperCase(),
    content: String(content),
    status: String(payload.status || 'DELIVERED').toUpperCase()
  };

  logs.push(newLog);
  await setTableData('ChatLogs', logs);

  fetchFromGAS('syncChatLog', payload).catch(() => {});
  return { success: true, status: 'success', message: 'Chat log tersimpan dan disinkronkan', logId };
}

// TAB 2: BROADCAST QUEUE MANAGER
async function getBroadcastQueuePaginated(filters = {}) {
  let queue = await getTableData('BroadcastQueue');

  if (!queue || queue.length === 0 || filters.refresh) {
    const gasRes = await fetchFromGAS('getBroadcastQueuePaginated', filters);
    let rawList = (gasRes && (gasRes.queue || gasRes.data || gasRes.list)) ? (gasRes.queue || gasRes.data || gasRes.list) : (Array.isArray(gasRes) ? gasRes : []);

    if (rawList && rawList.length > 0) {
      queue = rawList.map((item, idx) => {
        if (Array.isArray(item)) {
          return {
            queueId: item[0] || `QUE-${(idx + 1).toString().padStart(4, '0')}`,
            clientId: item[1] || 'CLI-0001',
            targetNumber: sanitizePhoneNumberE164(item[2]) || item[2] || '-',
            messageContent: item[3] || '',
            scheduledTime: item[4] || getNowTimestamp(),
            status: item[5] || 'PENDING',
            sentAt: item[6] || '-'
          };
        }
        return {
          queueId: item.queueId || item.Queue_ID || `QUE-${(idx + 1).toString().padStart(4, '0')}`,
          clientId: item.clientId || item.Client_ID || 'CLI-0001',
          targetNumber: sanitizePhoneNumberE164(item.targetNumber || item.Target_Number) || item.targetNumber || '-',
          messageContent: item.messageContent || item.Message_Content || '',
          scheduledTime: item.scheduledTime || item.Scheduled_Time || getNowTimestamp(),
          status: item.status || item.Status || 'PENDING',
          sentAt: item.sentAt || item.Sent_At || '-'
        };
      });
      await setTableData('BroadcastQueue', queue);
    }
  }

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
  const targetNumber = sanitizePhoneNumberE164(payload.targetNumber || payload.target);
  const messageContent = payload.messageContent || payload.message || payload.content;

  if (!targetNumber || !messageContent) {
    return { success: false, status: 'error', message: 'Nomor WhatsApp dan isi pesan wajib diisi.' };
  }

  const queue = await getTableData('BroadcastQueue');
  const queueId = await generateNextId('BroadcastQueue', 'QUE', 4);
  const nowStr = getNowTimestamp();

  const item = {
    queueId,
    clientId: payload.clientId || 'CLI-0001',
    targetNumber: String(targetNumber),
    messageContent: String(messageContent),
    scheduledTime: payload.scheduledTime || nowStr,
    status: 'PENDING',
    sentAt: '-'
  };

  queue.push(item);
  await setTableData('BroadcastQueue', queue);

  fetchFromGAS('addBroadcastQueueItem', { ...payload, targetNumber }).catch(() => {});
  await writeAuditLog(adminId, 'ADD_BROADCAST', 'BROADCAST', `Jadwal kirim ${queueId} ke ${targetNumber}`);

  return { success: true, status: 'success', message: 'Pesan berhasil dimasukkan ke antrean.', queueId };
}

// Multi-token sender helper ke Railway Baileys
async function postToRailwaySendMessage(railwayUrl, targetPhone, messageContent) {
  const endpoint = `${railwayUrl.replace(/\/$/, '')}/api/send-message`;
  const configuredToken = await getSettingValue('SYNC_SECRET_TOKEN') || SYNC_SECRET_TOKEN;
  
  const candidateTokens = [
    configuredToken,
    'ESTAKA_CLINIC_SECRET_2026',
    'ZETTBOS_CLINIC_SECRET_2026',
    'AKSHARA_CLINIC_SECRET_2026',
    'AKSHARA_DENTAL_SECRET_2026'
  ];
  const uniqueTokens = [...new Set(candidateTokens.filter(Boolean))];

  for (const curToken of uniqueTokens) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${curToken}`,
          'x-sync-token': curToken
        },
        body: JSON.stringify({
          target: targetPhone,
          message: messageContent
        }),
        signal: AbortSignal.timeout(7000)
      });

      if (response.ok) {
        const body = await response.json().catch(() => ({}));
        return { success: true, code: response.status, body, tokenUsed: curToken };
      } else if (response.status === 401) {
        continue;
      } else {
        const errText = await response.text().catch(() => '');
        return { success: false, code: response.status, body: errText };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  return { success: false, code: 401, body: 'Otentikasi token ditolak oleh Railway.' };
}

async function sendBroadcastNow(queueId, adminId = 'SUPERADMIN') {
  const queue = await getTableData('BroadcastQueue');
  const matched = queue.find(q => q.queueId === queueId);
  if (!matched) {
    return { success: false, status: 'error', message: 'Antrean tidak ditemukan.' };
  }

  const railwayUrl = await getSettingValue('RAILWAY_DEFAULT_URL') || DEFAULT_RAILWAY_URL;
  const dispatchResult = await postToRailwaySendMessage(railwayUrl, matched.targetNumber, matched.messageContent);

  const nowStr = getNowTimestamp();
  matched.status = dispatchResult.success ? 'SENT' : 'FAILED';
  matched.sentAt = nowStr;
  await setTableData('BroadcastQueue', queue);

  await syncChatLog({
    clientId: matched.clientId,
    sender: 'KLINIK_BROADCAST',
    receiver: matched.targetNumber,
    type: 'OUTGOING',
    content: matched.messageContent,
    status: dispatchResult.success ? 'SENT' : 'FAILED'
  });

  fetchFromGAS('sendBroadcastNow', { queueId }).catch(() => {});
  await writeAuditLog(adminId, 'DISPATCH_BROADCAST', 'BROADCAST', `Kirim antrean ${queueId} (Status: ${matched.status})`);

  if (dispatchResult.success) {
    return { success: true, status: 'success', message: `Antrean ${queueId} berhasil dikirim ke WhatsApp!`, directSend: true };
  } else {
    return { success: false, status: 'error', message: `Gagal mengirim ke bot WhatsApp: ${dispatchResult.body || dispatchResult.error || 'Bot belum terhubung'}` };
  }
}

async function deleteBroadcastQueueItem(queueId, adminId = 'SUPERADMIN') {
  let queue = await getTableData('BroadcastQueue');
  const initialLen = queue.length;
  queue = queue.filter(q => q.queueId !== queueId);

  if (queue.length === initialLen) {
    return { success: false, status: 'error', message: 'Antrean tidak ditemukan.' };
  }
  await setTableData('BroadcastQueue', queue);
  fetchFromGAS('deleteBroadcastQueueItem', { queueId }).catch(() => {});
  await writeAuditLog(adminId, 'DELETE_BROADCAST', 'BROADCAST', `Hapus antrean ${queueId}`);

  return { success: true, status: 'success', message: `Antrean ${queueId} berhasil dibatalkan.` };
}

// TAB 3: CLIENT RAILWAY BOT (Live Telemetry & Status Monitoring)
async function getClientsList() {
  let clients = await getTableData('Clients');

  if (!clients || clients.length === 0) {
    const gasRes = await fetchFromGAS('getClientsList', {});
    let rawClients = (gasRes && (gasRes.clients || gasRes.data || gasRes.list)) ? (gasRes.clients || gasRes.data || gasRes.list) : (Array.isArray(gasRes) ? gasRes : []);

    if (rawClients && rawClients.length > 0) {
      clients = rawClients.map((item, idx) => {
        if (Array.isArray(item)) {
          return {
            clientId: item[0] || `CLI-${(idx + 1).toString().padStart(4, '0')}`,
            name: item[1] || 'Estaka Bot Node',
            phone: sanitizePhoneNumberE164(item[2]) || item[2] || '-',
            railwayUrl: item[3] || DEFAULT_RAILWAY_URL,
            status: item[4] || 'CONNECTED',
            expiredDate: item[5] || '31/12/2027 23:59:59',
            notes: item[6] || ''
          };
        }
        return {
          clientId: item.clientId || item.Client_ID || `CLI-${(idx + 1).toString().padStart(4, '0')}`,
          name: item.name || item.Client_Name || 'Estaka Bot Node',
          phone: sanitizePhoneNumberE164(item.phone || item.Phone_Number) || '-',
          railwayUrl: item.railwayUrl || item.Railway_Base_URL || DEFAULT_RAILWAY_URL,
          status: item.status || item.Bot_Status || 'CONNECTED',
          expiredDate: item.expiredDate || item.Expired_Date || '31/12/2027 23:59:59',
          notes: item.notes || item.Notes || ''
        };
      });
      await setTableData('Clients', clients);
    }
  }

  if (!clients || clients.length === 0) {
    clients = [{
      clientId: 'CLI-0001',
      name: 'Estaka Core Bot (Railway)',
      phone: '6285338922586',
      railwayUrl: DEFAULT_RAILWAY_URL,
      status: 'CONNECTED',
      expiredDate: '31/12/2027 23:59:59',
      notes: 'Production Baileys Node Primary'
    }];
    await setTableData('Clients', clients);
  }

  // Pengecekan status live (CONNECTED, SCANNING, DISCONNECTED) ke Railway bot
  for (let i = 0; i < clients.length; i++) {
    const c = clients[i];
    try {
      const pingUrl = (c.railwayUrl || DEFAULT_RAILWAY_URL).replace(/\/$/, '') + '/';
      const pingRes = await fetch(pingUrl, { method: 'GET', signal: AbortSignal.timeout(3500) });
      if (pingRes.ok) {
        const pingData = await pingRes.json().catch(() => ({}));
        if (pingData && pingData.botStatus) {
          c.status = String(pingData.botStatus).toUpperCase();
        } else if (pingData && (pingData.qr || pingData.qrDataUrl || pingData.hasActiveQr)) {
          c.status = 'SCANNING';
        } else {
          c.status = 'CONNECTED';
        }
      } else {
        c.status = 'DISCONNECTED';
      }
    } catch (e) {
      c.status = 'DISCONNECTED';
    }
  }

  let connected = 0, scanning = 0, disconnected = 0;
  clients.forEach(c => {
    const st = (c.status || 'CONNECTED').toUpperCase();
    if (st === 'CONNECTED') connected++;
    else if (st === 'SCANNING' || st === 'SCAN_QR') scanning++;
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
  const formattedPhone = sanitizePhoneNumberE164(payload.phone);

  if (finalId) {
    const index = clients.findIndex(c => c.clientId === finalId);
    if (index !== -1) {
      clients[index] = { ...clients[index], ...payload, phone: formattedPhone };
    } else {
      clients.push({ ...payload, clientId: finalId, phone: formattedPhone });
    }
  } else {
    finalId = await generateNextId('Clients', 'CLI', 4);
    clients.push({
      clientId: finalId,
      name: payload.name,
      phone: formattedPhone,
      railwayUrl: payload.railwayUrl || DEFAULT_RAILWAY_URL,
      status: payload.status || 'CONNECTED',
      expiredDate: payload.expiredDate || '31/12/2027 23:59:59',
      notes: payload.notes || '',
      createdAt: getNowTimestamp()
    });
  }

  await setTableData('Clients', clients);
  fetchFromGAS('saveOrUpdateClient', { ...payload, phone: formattedPhone }).catch(() => {});
  await writeAuditLog(adminId, 'SAVE_CLIENT', 'CLIENTS', `Simpan node client ${finalId}`);

  return { success: true, status: 'success', message: 'Data client tersimpan.', clientId: finalId };
}

async function updateClientBotStatus(payload = {}) {
  const clientId = payload.clientId || 'CLI-0001';
  const newStatus = String(payload.status || payload.botStatus || 'CONNECTED').toUpperCase().trim();
  const phone = payload.phone || payload.phoneNumber || '';
  const notes = payload.notes || '';

  const clients = await getTableData('Clients');
  const matched = clients.find(c => c.clientId === clientId);

  if (matched) {
    matched.status = newStatus;
    if (phone) matched.phone = sanitizePhoneNumberE164(phone);
    if (notes) matched.notes = notes;
  } else {
    clients.push({
      clientId,
      name: payload.name || 'Estaka Core Bot (Railway)',
      phone: sanitizePhoneNumberE164(phone || '6285338922586'),
      railwayUrl: payload.railwayUrl || DEFAULT_RAILWAY_URL,
      status: newStatus,
      expiredDate: '31/12/2027 23:59:59',
      notes: notes || 'Live Bot Node',
      createdAt: getNowTimestamp()
    });
  }

  await setTableData('Clients', clients);
  fetchFromGAS('updateClientBotStatus', payload).catch(() => {});
  await writeAuditLog(clientId, 'UPDATE_BOT_STATUS', 'CLIENTS', `Status bot diubah ke: ${newStatus}`);

  return { success: true, status: 'success', message: `Status bot ${clientId} diperbarui ke ${newStatus}` };
}

async function deleteClient(clientId, adminId = 'SUPERADMIN') {
  let clients = await getTableData('Clients');
  clients = clients.filter(c => c.clientId !== clientId);
  await setTableData('Clients', clients);
  fetchFromGAS('deleteClient', { clientId }).catch(() => {});
  await writeAuditLog(adminId, 'DELETE_CLIENT', 'CLIENTS', `Hapus client ${clientId}`);

  return { success: true, status: 'success', message: `Client ${clientId} berhasil dihapus.` };
}

async function pingRailwayClient(url) {
  const target = (url || DEFAULT_RAILWAY_URL).replace(/\/$/, '');
  const start = Date.now();
  try {
    const res = await fetch(`${target}/`, { method: 'GET', signal: AbortSignal.timeout(5000) });
    const latency = Date.now() - start;
    let botStatus = 'CONNECTED';
    try {
      const data = await res.json();
      if (data && data.botStatus) botStatus = data.botStatus.toUpperCase();
    } catch (e) {}

    return {
      success: res.status >= 200 && res.status < 400,
      status: 'success',
      botStatus: botStatus,
      statusCode: res.status,
      latencyMs: latency,
      message: `Railway Bot ${botStatus} (HTTP ${res.status}) - ${latency}ms`
    };
  } catch (err) {
    return { success: false, statusCode: 0, botStatus: 'DISCONNECTED', latencyMs: 9999, message: 'Railway Offline: ' + err.message };
  }
}

// TAB 4: TEMPLATE KLINIS (8 Template Lengkap)
async function getTemplatesList() {
  let templates = await getTableData('Templates');
  if (!templates || templates.length === 0) {
    const gasRes = await fetchFromGAS('getTemplatesList', {});
    let rawTemplates = (gasRes && (gasRes.templates || gasRes.data || gasRes.list)) ? (gasRes.templates || gasRes.data || gasRes.list) : (Array.isArray(gasRes) ? gasRes : []);

    if (rawTemplates && rawTemplates.length > 0) {
      templates = rawTemplates.map((item, idx) => {
        if (Array.isArray(item)) {
          return {
            templateId: item[0] || `TPL-${(idx + 1).toString().padStart(4, '0')}`,
            name: item[1] || 'Template Pesan',
            category: item[2] || 'UMUM',
            content: item[3] || ''
          };
        }
        return {
          templateId: item.templateId || item.Template_ID || `TPL-${(idx + 1).toString().padStart(4, '0')}`,
          name: item.name || item.Template_Name || 'Template Pesan',
          category: item.category || item.Category || 'UMUM',
          content: item.content || item.Content || ''
        };
      });
      await setTableData('Templates', templates);
    }
  }

  if (!templates || templates.length === 0) {
    templates = [
      { templateId: 'TPL-0001', name: 'Konfirmasi Reservasi Jadwal Gigi', category: 'Reservasi', content: 'Halo Bapak/Ibu {nama}, pendaftaran janji temu pemeriksaan gigi di Estaka Dental Clinic telah terkonfirmasi untuk tanggal {tanggal}. Mohon hadir 15 menit sebelum slot waktu.' },
      { templateId: 'TPL-0002', name: 'Pengingat Kontrol Saluran Akar & Tambalan', category: 'Kontrol Rutin', content: 'Yth. Pasien {nama}, jadwal evaluasi perawatan saluran akar / kontrol gigi Anda di Estaka Dental Clinic dijadwalkan besok jam {jam}. Balas 1 jika hadir, atau hubungi hotline kami.' },
      { templateId: 'TPL-0003', name: 'Pembersihan Karang Gigi (Scaling Berkala)', category: 'Preventif', content: 'Halo {nama}, sudah 6 bulan sejak pembersihan karang gigi terakhir Anda. Saatnya jadwalkan scaling gigi berkala demi mencegah gusi berdarah dan bau mulut.' },
      { templateId: 'TPL-0004', name: 'Jadwal Kontrol Behel / Ortodonsia', category: 'Ortodonsia', content: 'Yth. {nama}, saatnya kontrol kawat gigi/bracket rutin bulan ini di Estaka Dental Clinic. Silakan konfirmasi slot waktu Anda bersama drg. spesialis ortodonsia.' },
      { templateId: 'TPL-0005', name: 'Instruksi Pasca Pencabutan Gigi / Bedah Minor', category: 'Post-Op', content: 'Petunjuk Pasca Cabut Gigi Pasien {nama}: Gigit tampon kasa selama 1 jam, hindari berkumur terlalu keras, jangan merokok, dan minum obat sesuai anjuran resep dokter.' },
      { templateId: 'TPL-0006', name: 'Rincian E-Billing Kasir Gigi Transparan', category: 'Billing', content: 'Pemberitahuan: Rincian transaksi kasir perawatan gigi {nama} sebesar Rp {nominal} telah lunas. Struk elektronik dan resume medis dapat diakses di portal resmi Estaka Dental Clinic.' },
      { templateId: 'TPL-0007', name: 'Hasil Rontgen Dental Panoramik / Lab', category: 'Laboratorium', content: 'Halo {nama}, foto rontgen dental panoramik/periapikal Anda telah selesai dibaca dan dianalisis oleh dokter pemeriksa. Dokumen digital dapat dilihat pada portal rekam medis.' },
      { templateId: 'TPL-0008', name: 'Perawatan Gigi Sensitif & Pemutihan (Bleaching)', category: 'Estetika', content: 'Halo {nama}, nikmati senyum cerah percaya diri dengan paket Teeth Whitening & Desensitisasi gigi modern di Estaka Dental Clinic Makassar.' }
    ];
    await setTableData('Templates', templates);
  }

  return { success: true, status: 'success', templates };
}

// TAB 5: ANTREAN & RESERVASI PASIEN (DENGAN IDEMPOTENSI & ANTI-SPAM GUARD)
async function savePatientBooking(payload = {}) {
  const patientName = payload.patientName || payload.nama;
  const rawPhone = payload.phoneNumber || payload.noHp;

  if (!patientName || !rawPhone) {
    return { success: false, status: 'error', message: 'Nama dan nomor WhatsApp wajib diisi.' };
  }

  const formattedPhone = sanitizePhoneNumberE164(rawPhone);
  const bookings = await getTableData('Bookings');
  const nowStr = getNowTimestamp();
  const rencanaWaktu = payload.rencanaWaktuKunjungan || payload.bookingDate || nowStr;
  const cleanNik = String(payload.nik || '').trim();

  // =========================================================================
  // 1. IDEMPOTENSI TABEL BOOKINGS (Mencegah Baris Dobel RM-0004 & RM-0005)
  // =========================================================================
  const existingBookingIndex = bookings.findIndex(b =>
    (payload.bookingId && b.bookingId === payload.bookingId) ||
    (payload.nomorRm && b.nomorRm === payload.nomorRm && b.rencanaWaktuKunjungan === rencanaWaktu) ||
    (cleanNik && b.nik === cleanNik && b.rencanaWaktuKunjungan === rencanaWaktu) ||
    (b.phoneNumber === formattedPhone && b.rencanaWaktuKunjungan === rencanaWaktu)
  );

  let bookingId;
  if (existingBookingIndex !== -1) {
    bookingId = bookings[existingBookingIndex].bookingId;
  } else {
    bookingId = payload.bookingId || await generateNextId('Bookings', 'BKG', 4);
  }

  const item = {
    bookingId,
    nomorRm: payload.nomorRm || bookingId,
    nik: cleanNik,
    patientName: String(patientName),
    nama: String(patientName),
    tanggalLahir: payload.tanggalLahir || '',
    jenisKelamin: payload.jenisKelamin || '',
    phoneNumber: formattedPhone,
    noHp: formattedPhone,
    alamat: payload.alamat || '',
    serviceType: payload.serviceType || payload.ruanganPoli || 'Poli Gigi & Spesialis',
    ruanganPoli: payload.serviceType || payload.ruanganPoli || 'Poli Gigi & Spesialis',
    dokterId: payload.dokterId || 'DOC-001',
    dokterNama: payload.dokterNama || 'Dokter Gigi Jaga',
    rencanaWaktuKunjungan: rencanaWaktu,
    bookingDate: rencanaWaktu,
    alergiObat: payload.alergiObat || 'Tidak Ada',
    keluhanUtama: payload.keluhanUtama || '',
    status: payload.status || 'CONFIRMED',
    createdAt: nowStr
  };

  if (existingBookingIndex !== -1) {
    bookings[existingBookingIndex] = { ...bookings[existingBookingIndex], ...item };
  } else {
    bookings.push(item);
  }
  await setTableData('Bookings', bookings);

  // =========================================================================
  // 2. KONTROL NOTIFIKASI: HANYA KIRIM JIKA BUKAN DARI FORWARD (skipNotification)
  // =========================================================================
  const isSilent = payload.skipNotification === true || payload.skipNotification === 'true';

  if (!isSilent && existingBookingIndex === -1) {
    const now = Date.now();
    const dedupeKey = `${formattedPhone}:${item.nomorRm}:${rencanaWaktu}`;

    if (recentV2Dispatches.has(dedupeKey) && (now - recentV2Dispatches.get(dedupeKey) < V2_DEDUPE_TTL_MS)) {
      console.log(`[Anti-Spam serverv2.js]: Notifikasi ${dedupeKey} dilewati.`);
    } else {
      recentV2Dispatches.set(dedupeKey, now);

      try {
        const railwayUrl = await getSettingValue('RAILWAY_DEFAULT_URL') || DEFAULT_RAILWAY_URL;

        // 1. Pesan untuk Pasien
        const patientMsg = 
          '🦷 *ESTAKA DENTAL CLINIC — BUKTI PENDAFTARAN PASIEN*\n\n' +
          'Halo Bapak/Ibu *' + patientName + '*,\n' +
          'Pendaftaran janji temu pemeriksaan gigi Anda telah berhasil tercatat dalam sistem:\n\n' +
          '• *Nomor RM / Tiket*: ' + item.nomorRm + '\n' +
          '• *NIK KTP*: ' + (item.nik || '-') + '\n' +
          '• *Nama Lengkap*: ' + patientName + '\n' +
          '• *Tanggal Lahir*: ' + (item.tanggalLahir || '-') + '\n' +
          '• *Jenis Kelamin*: ' + (item.jenisKelamin || '-') + '\n' +
          '• *Dokter Pemeriksa*: ' + item.dokterNama + '\n' +
          '• *Layanan / Poli*: ' + item.serviceType + '\n' +
          '• *Rencana Waktu Kunjungan*: ' + rencanaWaktu + '\n' +
          '• *Nomor WhatsApp*: ' + formattedPhone + '\n' +
          '• *Alamat Domisili*: ' + (item.alamat || '-') + '\n' +
          '• *Riwayat Alergi*: ' + item.alergiObat + '\n' +
          '• *Keluhan Utama*: ' + (item.keluhanUtama || '-') + '\n\n' +
          '_Mohon hadir 15 menit sebelum slot waktu konsultasi. Tunjukkan bukti pendaftaran ini kepada staf registrasi kami._\n\n' +
          '📍 *Alamat Klinik*: Jl. Andi Tonro Blok F No.30, Bongaya, Kec. Tamalate, Kota Makassar\n' +
          '📞 *Hotline WhatsApp*: +62 853-3892-2586\n' +
          '📧 *Email*: estakadentalclinic@gmail.com\n' +
          '🌐 *Website*: https://estakadentalclinic.vercel.app/\n' +
          'Salam Senyum Sehat, *Estaka Dental Clinic* ✨';

        const patientDispatch = await postToRailwaySendMessage(railwayUrl, formattedPhone, patientMsg);

        if (patientDispatch.success) {
          await syncChatLog({
            clientId: 'CLI-0001',
            senderNumber: 'SYSTEM_BOT',
            receiverNumber: formattedPhone,
            messageType: 'OUTGOING',
            content: patientMsg,
            status: 'SENT'
          });
          await writeAuditLog('SYSTEM_BOT', 'DISPATCH_WA_PATIENT', 'WHATSAPP', `Pesan terkirim ke pasien: ${formattedPhone}`);
        } else {
          await addBroadcastQueueItem({
            clientId: 'CLI-0001',
            targetNumber: formattedPhone,
            messageContent: patientMsg,
            scheduledTime: nowStr
          }, 'AUTO_RECOVERY');
        }

        // 2. Pesan untuk Dokter Pemeriksa Terkait
        const doctorPhone = resolveDoctorPhoneLocal(item.dokterId, item.dokterNama);
        if (doctorPhone) {
          const doctorMsg = 
            '🦷 *ESTAKA DENTAL CLINIC — NOTIFIKASI JADWAL PASIEN BARU*\n\n' +
            'Yth. Dokter *' + item.dokterNama + '*,\n' +
            'Terdapat pendaftaran pasien baru untuk jadwal pemeriksaan Anda:\n\n' +
            '• *Nomor RM / Tiket*: ' + item.nomorRm + '\n' +
            '• *Nama Pasien*: ' + patientName + '\n' +
            '• *Rencana Waktu Kunjungan*: ' + rencanaWaktu + '\n' +
            '• *Nomor WA Pasien*: ' + formattedPhone + '\n' +
            '• *Riwayat Alergi*: ' + item.alergiObat + '\n' +
            '• *Keluhan Utama*: ' + (item.keluhanUtama || '-') + '\n\n' +
            '_Data rekam medis telah diperbarui pada sistem EMR Estaka Dental Clinic._';

          const doctorDispatch = await postToRailwaySendMessage(railwayUrl, doctorPhone, doctorMsg);

          if (doctorDispatch.success) {
            await syncChatLog({
              clientId: 'CLI-0001',
              senderNumber: 'SYSTEM_BOT',
              receiverNumber: doctorPhone,
              messageType: 'OUTGOING',
              content: doctorMsg,
              status: 'SENT'
            });
            await writeAuditLog('SYSTEM_BOT', 'DISPATCH_WA_DOCTOR', 'WHATSAPP', `Notifikasi terkirim ke dokter: ${doctorPhone}`);
          } else {
            await addBroadcastQueueItem({
              clientId: 'CLI-0001',
              targetNumber: doctorPhone,
              messageContent: doctorMsg,
              scheduledTime: nowStr
            }, 'AUTO_RECOVERY');
          }
        }
      } catch (err) {
        console.warn('[V2 WA Dispatch Warning]:', err.message);
      }
    }
  }

  // Sinkronkan ke GAS dengan menyematkan skipNotification agar GAS tidak spam ulang
  fetchFromGAS('registerAppointment', { ...item, skipNotification: true }).catch(() => {});
  await writeAuditLog('PUBLIC', 'PATIENT_BOOKING', 'BOOKINGS', `Booking ${bookingId}`);

  return { success: true, status: 'success', message: `Reservasi berhasil disimpan! No: ${bookingId}`, bookingId, item };
}

async function getBookingsList() {
  let bookings = await getTableData('Bookings');

  if (!bookings || bookings.length === 0) {
    const gasRes = await fetchFromGAS('getBookingsList', {});
    let rawBookings = (gasRes && (gasRes.bookings || gasRes.data || gasRes.list)) ? (gasRes.bookings || gasRes.data || gasRes.list) : (Array.isArray(gasRes) ? gasRes : []);

    if (rawBookings && rawBookings.length > 0) {
      bookings = rawBookings.map((item, idx) => {
        if (Array.isArray(item)) {
          return {
            bookingId: item[0] || `BKG-${(idx + 1).toString().padStart(4, '0')}`,
            nomorRm: item[1] || '-',
            nik: item[2] || '-',
            patientName: item[3] || item[1] || '-',
            namaPasien: item[3] || item[1] || '-',
            tanggalLahir: item[4] || '-',
            jenisKelamin: item[5] || '-',
            phoneNumber: sanitizePhoneNumberE164(item[6]) || item[6] || '-',
            noHp: sanitizePhoneNumberE164(item[6]) || item[6] || '-',
            alamat: item[7] || '-',
            serviceType: item[8] || 'Pemeriksaan Gigi',
            ruanganPoli: item[8] || 'Pemeriksaan Gigi',
            dokterId: item[9] || 'DOC-001',
            bookingDate: item[10] || '-',
            rencanaWaktuKunjungan: item[10] || '-',
            alergiObat: item[11] || 'Tidak Ada',
            keluhanUtama: item[12] || '-',
            status: item[13] || 'CONFIRMED',
            createdAt: item[14] || getNowTimestamp()
          };
        }
        return {
          bookingId: item.bookingId || item.Booking_ID || `BKG-${(idx + 1).toString().padStart(4, '0')}`,
          nomorRm: item.nomorRm || item.Nomor_RM || '-',
          nik: item.nik || item.NIK || '-',
          patientName: item.patientName || item.Nama_Pasien || item.nama || '-',
          namaPasien: item.patientName || item.Nama_Pasien || item.nama || '-',
          tanggalLahir: item.tanggalLahir || item.Tanggal_Lahir || '-',
          jenisKelamin: item.jenisKelamin || item.Jenis_Kelamin || '-',
          phoneNumber: sanitizePhoneNumberE164(item.phoneNumber || item.noHp || item.Phone_Number) || '-',
          noHp: sanitizePhoneNumberE164(item.phoneNumber || item.noHp || item.Phone_Number) || '-',
          alamat: item.alamat || item.Alamat || '-',
          serviceType: item.serviceType || item.ruanganPoli || item.Service_Type || 'Pemeriksaan Gigi',
          ruanganPoli: item.serviceType || item.ruanganPoli || item.Service_Type || 'Pemeriksaan Gigi',
          dokterId: item.dokterId || 'DOC-001',
          bookingDate: item.bookingDate || item.rencanaWaktuKunjungan || item.Rencana_Waktu_Kunjungan || '-',
          rencanaWaktuKunjungan: item.rencanaWaktuKunjungan || item.bookingDate || '-',
          alergiObat: item.alergiObat || item.Alergi_Obat || 'Tidak Ada',
          keluhanUtama: item.keluhanUtama || item.Keluhan_Utama || '-',
          status: item.status || item.Status || 'CONFIRMED',
          createdAt: item.createdAt || item.Created_At || getNowTimestamp()
        };
      });
      await setTableData('Bookings', bookings);
    }
  }

  return { success: true, status: 'success', bookings: [...bookings].reverse() };
}

// TAB 6: ENGINE KONFIGURASI AI
async function getAiConfig() {
  const settings = await getTableData('SETTINGS');
  const getVal = k => settings.find(s => s.key === k)?.val || process.env[k] || '';

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
  if (payload.model) await saveSettingValue('GEMINI_MODEL', payload.model);
  if (payload.apiKey && !payload.apiKey.includes('*')) await saveSettingValue('GEMINI_API_KEY', payload.apiKey);
  if (payload.openaiModel) await saveSettingValue('OPENAI_MODEL', payload.openaiModel);
  if (payload.openaiApiKey && !payload.openaiApiKey.includes('*')) await saveSettingValue('OPENAI_API_KEY', payload.openaiApiKey);

  fetchFromGAS('saveAiConfig', payload).catch(() => {});
  await writeAuditLog(adminId, 'UPDATE_AI_CONFIG', 'SETTINGS', 'Perbarui konfigurasi Gemini & OpenAI');

  return { success: true, status: 'success', message: 'Konfigurasi model AI berhasil disimpan!' };
}

// TAB 7: CRUD CUSTOM AI SYSTEM PROMPTS (GEMINI & CHATGPT)
async function getCustomAiPrompts() {
  let prompts = await getTableData('CustomPrompts');

  if (!prompts || prompts.length === 0) {
    const gasRes = await fetchFromGAS('getCustomAiPrompts', {});
    if (gasRes && gasRes.prompts && gasRes.prompts.length > 0) {
      prompts = gasRes.prompts;
      await setTableData('CustomPrompts', prompts);
    }
  }

  return { success: true, status: 'success', prompts: prompts || [] };
}

async function saveCustomAiPrompt(payload = {}, adminId = 'SUPERADMIN') {
  if (!payload.title || !payload.systemPrompt) {
    return { success: false, status: 'error', message: 'Judul dan isi instruksi sistem prompt wajib diisi.' };
  }

  const prompts = await getTableData('CustomPrompts');
  let finalId = payload.promptId;
  const nowStr = getNowTimestamp();

  if (payload.isActive) {
    prompts.forEach(p => {
      if ((p.targetModel || '').toLowerCase() === (payload.targetModel || 'all').toLowerCase()) {
        p.isActive = false;
      }
    });
  }

  if (finalId) {
    const idx = prompts.findIndex(p => p.promptId === finalId);
    if (idx !== -1) {
      prompts[idx] = { ...prompts[idx], ...payload, updatedAt: nowStr };
    } else {
      prompts.push({ ...payload, promptId: finalId, updatedAt: nowStr });
    }
  } else {
    finalId = await generateNextId('CustomPrompts', 'PRM', 4);
    prompts.push({
      promptId: finalId,
      title: String(payload.title),
      targetModel: String(payload.targetModel || 'Gemini'),
      systemPrompt: String(payload.systemPrompt),
      isActive: Boolean(payload.isActive !== false),
      updatedAt: nowStr
    });
  }

  await setTableData('CustomPrompts', prompts);
  fetchFromGAS('saveCustomAiPrompt', payload).catch(() => {});
  await writeAuditLog(adminId, 'SAVE_CUSTOM_PROMPT', 'AI_PROMPTS', `Simpan prompt ${finalId}`);

  return { success: true, status: 'success', message: 'Custom prompt AI berhasil disimpan!', promptId: finalId };
}

async function deleteCustomAiPrompt(promptId, adminId = 'SUPERADMIN') {
  let prompts = await getTableData('CustomPrompts');
  const initialLen = prompts.length;
  prompts = prompts.filter(p => p.promptId !== promptId);

  if (prompts.length === initialLen) {
    return { success: false, status: 'error', message: 'Prompt tidak ditemukan.' };
  }

  await setTableData('CustomPrompts', prompts);
  fetchFromGAS('deleteCustomAiPrompt', { promptId }).catch(() => {});
  await writeAuditLog(adminId, 'DELETE_CUSTOM_PROMPT', 'AI_PROMPTS', `Hapus prompt ${promptId}`);

  return { success: true, status: 'success', message: 'Custom prompt AI berhasil dihapus.' };
}

async function setActiveAiPrompt(promptId, adminId = 'SUPERADMIN') {
  const prompts = await getTableData('CustomPrompts');
  const target = prompts.find(p => p.promptId === promptId);
  if (!target) return { success: false, status: 'error', message: 'Prompt tidak ditemukan.' };

  const targetModel = (target.targetModel || '').toLowerCase();
  prompts.forEach(p => {
    if ((p.targetModel || '').toLowerCase() === targetModel || targetModel === 'all') {
      p.isActive = (p.promptId === promptId);
    }
  });

  await setTableData('CustomPrompts', prompts);
  fetchFromGAS('setActiveAiPrompt', { promptId }).catch(() => {});
  await writeAuditLog(adminId, 'SET_ACTIVE_PROMPT', 'AI_PROMPTS', `Aktifkan prompt ${promptId}`);

  return { success: true, status: 'success', message: `Prompt "${target.title}" diaktifkan sebagai instruksi AI bot resmi!` };
}

async function getActiveSystemPrompt(modelType = 'Gemini') {
  const prompts = await getTableData('CustomPrompts');
  const matched = prompts.find(p => p.isActive && (p.targetModel.toLowerCase() === modelType.toLowerCase() || p.targetModel.toLowerCase() === 'all'));
  if (matched && matched.systemPrompt) return matched.systemPrompt;

  return 'Anda adalah Asisten Medis AI & Odontolog Cerdas Resmi Estaka Dental Clinic. Berikan analisis klinis, rekomendasi terapi gigi, dan edukasi pencegahan secara profesional, ringkas, empatik, dan akurat.';
}

// Gemini AI Engine
async function askGeminiClinic(payload = {}) {
  const settings = await getTableData('SETTINGS');
  const getVal = k => settings.find(s => s.key === k)?.val || process.env[k] || '';

  const apiKey = payload.geminiKey || payload.apiKey || getVal('GEMINI_API_KEY');
  const model = payload.model || getVal('GEMINI_MODEL') || 'gemini-3.5-flash';

  if (!apiKey) {
    return { success: false, status: 'error', message: 'GEMINI_API_KEY belum disetel.' };
  }

  const systemInstruction = await getActiveSystemPrompt('Gemini');
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;

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
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
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
  const settings = await getTableData('SETTINGS');
  const getVal = k => settings.find(s => s.key === k)?.val || process.env[k] || '';

  const apiKey = payload.apiKey || getVal('OPENAI_API_KEY');
  const model = payload.model || getVal('OPENAI_MODEL') || 'gpt-4o-mini';

  if (!apiKey) {
    return { success: false, status: 'error', message: 'OPENAI_API_KEY belum disetel.' };
  }

  const systemInstruction = await getActiveSystemPrompt('OpenAI');
  const messages = [
    { role: 'system', content: systemInstruction }
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
// 7. UNIVERSAL ACTION ROUTER DISPATCHER V2
// ============================================================================

async function handleActionDispatcher(action, payload) {
  const normAction = String(action || '').trim();
  let p1 = Array.isArray(payload) ? (payload[0] || {}) : (payload || {});

  // Login Portal V2
  if (normAction === 'login' || normAction === 'loginUser' || normAction === 'auth') {
    const u = String(p1.username || p1.user || '').trim();
    const p = String(p1.password || p1.pass || '').trim();
    return await executeDualLogin(u, p);
  }

  switch (normAction) {
    case 'askGemini':
    case 'askGeminiClinic': return await askGeminiClinic(p1);
    case 'askOpenAi':
    case 'askOpenAiClinic': return await askOpenAiClinic(p1);

    case 'getAvailableAiModels': {
      const settings = await getTableData('SETTINGS');
      const cur = settings.find(s => s.key === 'GEMINI_MODEL')?.val || 'gemini-3.5-flash';
      return {
        success: true,
        status: 'success',
        models: SUPPORTED_AI_MODELS_V2,
        defaultModel: cur
      };
    }

    case 'getAiConfig': return await getAiConfig();
    case 'saveAiConfig': return await saveAiConfig(p1, 'SUPERADMIN');

    case 'setClinicModelQuick': {
      const model = String(p1).trim();
      const settings = await getTableData('SETTINGS');
      const key = (model.includes('gpt') || model.includes('o3')) ? 'OPENAI_MODEL' : 'GEMINI_MODEL';
      const m = settings.find(s => s.key === key);
      if (m) m.val = model;
      else settings.push({ key, val: model, desc: 'Quick Model' });
      await setTableData('SETTINGS', settings);
      return { success: true, status: 'success', message: `Model default diubah ke ${model}`, currentModel: model };
    }

    // Tab 7: Custom AI System Prompts (Gemini & ChatGPT)
    case 'getCustomAiPrompts': return await getCustomAiPrompts();
    case 'saveCustomAiPrompt': return await saveCustomAiPrompt(p1, 'SUPERADMIN');
    case 'deleteCustomAiPrompt': return await deleteCustomAiPrompt(p1.promptId || p1, 'SUPERADMIN');
    case 'setActiveAiPrompt': return await setActiveAiPrompt(p1.promptId || p1, 'SUPERADMIN');

    // Tab 1: ChatLogs
    case 'getChatLogsPaginated': return await getChatLogsPaginated(p1);
    case 'syncChatLog': return await syncChatLog(p1);

    // Tab 2: Broadcast Queue
    case 'getBroadcastQueuePaginated': return await getBroadcastQueuePaginated(p1);
    case 'addBroadcastQueueItem': return await addBroadcastQueueItem(p1, 'SUPERADMIN');
    case 'sendBroadcastNow': return await sendBroadcastNow(p1.queueId || p1, 'SUPERADMIN');
    case 'deleteBroadcastQueueItem': return await deleteBroadcastQueueItem(p1.queueId || p1, 'SUPERADMIN');

    // Tab 3: Clients Node (Railway Bot & Status Telemetri)
    case 'getClientsList': return await getClientsList();
    case 'saveOrUpdateClient': return await saveOrUpdateClient(p1, 'SUPERADMIN');
    case 'updateClientBotStatus':
    case 'updateBotStatus': return await updateClientBotStatus(p1);
    case 'deleteClient': return await deleteClient(p1.clientId || p1, 'SUPERADMIN');
    case 'pingRailwayClient': return await pingRailwayClient(p1.railwayUrl || p1);
    case 'getRailwayQrPayload': {
      const target = await getSettingValue('RAILWAY_DEFAULT_URL') || DEFAULT_RAILWAY_URL;
      return { success: true, status: 'success', qrUrl: `${target.replace(/\/$/, '')}/qr` };
    }

    // Tab 4: Templates
    case 'getTemplatesList': return await getTemplatesList();

    // Tab 5: Bookings Pasien (Idempotent & Anti-Spam Control)
    case 'savePatientBooking': return await savePatientBooking(p1);
    case 'getBookingsList': return await getBookingsList();

    default: {
      // Delegasikan ke server.js klinis (port 3000)
      try {
        const clinicalRes = await fetch(`http://127.0.0.1:${PORT_CLINICAL}/api/router`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: normAction, payload }),
          signal: AbortSignal.timeout(3000)
        });
        if (clinicalRes.ok) return await clinicalRes.json();
      } catch (e) {}

      // Fallback ke Google Apps Script
      try {
        const gasRes = await fetch(GAS_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: normAction, payload, args: [payload] })
        });
        return await gasRes.json();
      } catch (err) {
        return { success: false, status: 'error', message: 'Aksi V2 tidak dikenal: ' + normAction };
      }
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

// Penanganan Favicon estakalogo.png
app.get(['/img/estakalogo.png', '/estakalogo.png'], (req, res) => {
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  const paths = [
    path.join(rootDir, 'public', 'img', 'estakalogo.png'),
    path.join(rootDir, 'public', 'estakalogo.png'),
    path.join(__dirname, 'public', 'img', 'estakalogo.png'),
    path.join(rootDir, 'public', 'img', 'etakalogo.png'),
    path.join(rootDir, 'public', 'img', 'axalogo.png')
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return res.sendFile(p);
  }
  res.status(404).send('Logo estakalogo.png tidak ditemukan');
});

// Backward-Compatibility Favicon etakalogo.png & axalogo.png
app.get(['/img/etakalogo.png', '/etakalogo.png', '/img/axalogo.png', '/axalogo.png'], (req, res) => {
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  const paths = [
    path.join(rootDir, 'public', 'img', 'estakalogo.png'),
    path.join(rootDir, 'public', 'img', 'etakalogo.png'),
    path.join(rootDir, 'public', 'img', 'axalogo.png'),
    path.join(rootDir, 'public', 'axalogo.png'),
    path.join(__dirname, 'public', 'img', 'axalogo.png')
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return res.sendFile(p);
  }
  res.status(404).send('Logo tidak ditemukan');
});

// Endpoint Router API Terpadu V2
app.all(['/api/v2/router', '/api/router', '/exec'], async (req, res) => {
  try {
    const action = req.body?.action || req.query?.action || '';
    let payload = req.body?.payload;
    if (payload === undefined || payload === null || (typeof payload === 'object' && Object.keys(payload).length === 0)) {
      payload = req.body?.args !== undefined ? req.body.args : (Object.keys(req.body || {}).length > 1 ? req.body : req.query);
    }

    const result = await handleActionDispatcher(action, payload);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, status: 'error', message: err.message });
  }
});

// Endpoint Webhook Dua Arah untuk Baileys Railway
app.post('/api/railway/webhook', async (req, res) => {
  const result = await syncChatLog(req.body);
  fetchFromGAS('syncChatLog', req.body).catch(() => {});
  return res.json(result);
});

// Routing Halaman Portal V2
app.get(['/admin-dashboardv2', '/portalv2', '/v2'], async (req, res) => {
  const seo = {
    title: 'Portal V2 & Railway WA Bot Gateway — Estaka Dental Clinic',
    description: 'Pusat kendali bot WhatsApp multi-client Railway Baileys, monitoring antrean pesan, dan generative AI medis terpadu.',
    canonicalUrl: `${BASE_URL}/admin-dashboardv2`
  };
  res.render('admin-dashboardv2', { seo, activeTab: 'adminv2' });
});

app.get('/', async (req, res) => {
  res.redirect('/admin-dashboardv2');
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`[Estaka V2 Server Engine] Berjalan di http://localhost:${PORT}`);
  });
}

module.exports = app;
