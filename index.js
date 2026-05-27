// ======================================
// SUPREME TELEGRAM BOT - FULLY FIXED
// BUTTONS WORKING + AI REPLY + GAME SYSTEM
// ======================================

require("dotenv").config();

const express = require("express");
const axios = require("axios");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.json());
app.use(express.static("public"));

// ======================================
// CONFIGURATION
// ======================================

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GAME_URL = "https://bot-run-np12.onrender.com"; // Hardcoded game URL
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ======================================
// STORAGE / MEMORY
// ======================================

const memory = {};        // AI chat memory per user
const warnings = {};      // Abuse warnings per user
const cooldown = {};      // Rate limiting for AI
const groups = {};        // Track groups
const gameRooms = {};     // Group-isolated game rooms
const socketPlayers = {}; // Socket.IO player tracking

// ======================================
// AI MODELS (with working free models)
// ======================================

const models = [
  "google/gemma-2-9b-it:free",
  "microsoft/phi-3-mini-128k-instruct:free",
  "qwen/qwen-2.5-7b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free"
];

const SYSTEM_PROMPT = `You are Supreme Telegram Bot, a friendly assistant. Developer: Easy Deplover. 
Reply in Hinglish (Hindi+English mix) in a casual, human style. Keep replies short (1-2 lines max). 
Be helpful and fun. Never abusive. Use emojis occasionally.`;

// ======================================
// TELEGRAM API FUNCTIONS
// ======================================

async function sendMessage(chatId, text, replyId = null, buttons = null) {
  try {
    const data = {
      chat_id: chatId,
      text: text,
      parse_mode: "HTML"
    };
    if (replyId) data.reply_to_message_id = replyId;
    if (buttons && buttons.length > 0) {
      data.reply_markup = { inline_keyboard: buttons };
    }
    
    const response = await axios.post(`${TELEGRAM_API}/sendMessage`, data);
    return response.data;
  } catch (err) {
    console.error("SendMessage Error:", err.response?.data || err.message);
    return null;
  }
}

async function deleteMessage(chatId, messageId) {
  try {
    await axios.post(`${TELEGRAM_API}/deleteMessage`, {
      chat_id: chatId,
      message_id: messageId
    });
  } catch (err) {}
}

async function banUser(chatId, userId) {
  try {
    await axios.post(`${TELEGRAM_API}/banChatMember`, {
      chat_id: chatId,
      user_id: userId
    });
  } catch (err) {}
}

async function sendTyping(chatId) {
  try {
    await axios.post(`${TELEGRAM_API}/sendChatAction`, {
      chat_id: chatId,
      action: "typing"
    });
  } catch (err) {}
}

async function answerCallback(callbackId) {
  try {
    await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
      callback_query_id: callbackId
    });
  } catch (err) {}
}

// ======================================
// UTILITY FUNCTIONS
// ======================================

function generateRoomId() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function getLocalReply(text) {
  const lower = text.toLowerCase();
  if (lower.includes("hi") || lower.includes("hello")) return "Hello bhai! 👋 Kya haal chaal?";
  if (lower.includes("good morning")) return "Good morning! ☀️ Subah subah energy lelo!";
  if (lower.includes("good night")) return "Good night! 🌙 Acchi neend lo, kal milte hain!";
  if (lower.includes("developer") || lower.includes("owner")) return "Mera developer: Easy Deplover ❤️";
  if (lower.includes("thanks") || lower.includes("thank you")) return "Welcome bhai! 😊 Koi aur kaam ho toh batao!";
  if (lower.includes("how are you")) return "Main toh mast hoon! 🚀 Tu bata kaise hai?";
  if (lower.includes("love") || lower.includes("i love you")) return "Love you too bhai! ❤️";
  if (lower.includes("game")) return "Game khelni hai? Type /game ya 'game'! 🎮";
  return null;
}

async function isAbusive(text) {
  const lower = text.toLowerCase();
  const badWords = ["madarchod", "bhosdike", "mc", "bc", "mkc", "randi", "lavda", "gaand", "chutiya", "gandu", "fuck", "bitch", "bsdk", "bhenchod"];
  for (const word of badWords) {
    if (lower.includes(word)) return true;
  }
  return false;
}

// ======================================
// AI CHAT FUNCTION
// ======================================

async function askAI(userId, message) {
  try {
    // Rate limiting
    const now = Date.now();
    if (cooldown[userId] && now - cooldown[userId] < 2000) {
      return "⏰ Thoda slow bhai... 2 second ruk ke baat kar!";
    }
    cooldown[userId] = now;

    // Initialize memory
    if (!memory[userId]) {
      memory[userId] = [];
    }

    // Add user message
    memory[userId].push({ role: "user", content: message });
    
    // Keep last 6 messages for context
    if (memory[userId].length > 6) {
      memory[userId] = memory[userId].slice(-6);
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...memory[userId]
    ];

    // Try each model
    for (const model of models) {
      try {
        const response = await axios.post(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            model: model,
            messages: messages,
            max_tokens: 80,
            temperature: 0.8
          },
          {
            headers: {
              "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
              "Content-Type": "application/json"
            },
            timeout: 15000
          }
        );

        const reply = response.data.choices[0].message.content;
        memory[userId].push({ role: "assistant", content: reply });
        return reply;
      } catch (err) {
        console.log(`Model ${model} failed:`, err.message);
        continue;
      }
    }

    return "🤖 AI thoda busy hai! 2 second baad fir se try karo.";
  } catch (err) {
    console.error("AI Error:", err.message);
    return "⚠️ Server pe load hai! Thodi der baad try karo bhai.";
  }
}

// ======================================
// SOCKET.IO HANDLERS
// ======================================

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  socket.on("join-room", (data) => {
    if (!data || !data.roomId || !data.player || !data.groupId) return;
    
    if (!gameRooms[data.groupId] || !gameRooms[data.groupId][data.roomId]) {
      socket.emit("invalid-room");
      return;
    }

    socket.join(data.roomId);
    socketPlayers[socket.id] = {
      roomId: data.roomId,
      groupId: data.groupId,
      player: data.player
    };
    
    socket.to(data.roomId).emit("player-joined", data.player);
    console.log(`Player ${data.player} joined room ${data.roomId}`);
  });

  socket.on("game-move", (data) => {
    if (data && data.roomId) {
      socket.to(data.roomId).emit("game-move", data);
    }
  });

  socket.on("voice-signal", (data) => {
    if (data && data.roomId) {
      socket.to(data.roomId).emit("voice-signal", data);
    }
  });

  socket.on("disconnect", () => {
    const player = socketPlayers[socket.id];
    if (player) {
      socket.to(player.roomId).emit("player-disconnected");
      delete socketPlayers[socket.id];
      console.log(`Player ${player.player} disconnected from room ${player.roomId}`);
    }
  });
});

// ======================================
// CLEANUP EXPIRED ROOMS (every 10 minutes)
// ======================================

setInterval(() => {
  const now = Date.now();
  const expireTime = 1000 * 60 * 10; // 10 minutes
  
  for (const groupId in gameRooms) {
    for (const roomId in gameRooms[groupId]) {
      const room = gameRooms[groupId][roomId];
      if (now - room.createdAt > expireTime) {
        delete gameRooms[groupId][roomId];
        console.log(`🗑️ Cleaned expired room: ${roomId}`);
      }
    }
  }
}, 60000);

// ======================================
// GOOD MORNING / GOOD NIGHT (optional)
// ======================================

setInterval(async () => {
  const now = new Date();
  if (now.getHours() === 6 && now.getMinutes() === 0) {
    for (const groupId in groups) {
      await sendMessage(groupId, "🌅 Good morning everyone! Have a great day ahead! ☀️");
    }
  }
}, 60000);

setInterval(async () => {
  const now = new Date();
  if (now.getHours() === 22 && now.getMinutes() === 0) {
    for (const groupId in groups) {
      await sendMessage(groupId, "🌙 Good night everyone! Take rest and sweet dreams! 💤");
    }
  }
}, 60000);

// ======================================
// MAIN WEBHOOK HANDLER
// ======================================

app.post("/webhook", async (req, res) => {
  try {
    const update = req.body;
    
    // ======================================
    // HANDLE BUTTON CLICKS (CALLBACK QUERY)
    // ======================================
    if (update.callback_query) {
      const query = update.callback_query;
      const data = query.data;
      const user = query.from;
      const userId = user.id;
      const username = user.first_name || "Player";
      const chatId = String(query.message.chat.id);
      
      // Answer callback to remove loading state
      await answerCallback(query.id);
      
      // Initialize group rooms
      if (!gameRooms[chatId]) {
        gameRooms[chatId] = {};
      }
      
      // ======================================
      // CREATE GAME ROOM
      // ======================================
      if (data === "create_game") {
        const roomId = generateRoomId();
        
        gameRooms[chatId][roomId] = {
          host: userId,
          hostName: username,
          groupId: chatId,
          joined: false,
          createdAt: Date.now()
        };
        
        // Generate URLs exactly as you want
        const p1Url = `${GAME_URL}/?room=${roomId}&player=p1&group=${chatId}`;
        
        await sendMessage(
          chatId,
          `🎮 <b>GAME ROOM CREATED!</b>\n\n👤 Host: <b>${username}</b>\n🎤 Voice Chat: Enabled\n🆔 Room ID: <code>${roomId}</code>\n\n👇 <b>Host:</b> Click below to play as Player 1\n<b>Others:</b> Click JOIN GAME button`,
          null,
          [
            [{ text: "🎮 PLAY AS PLAYER 1", web_app: { url: p1Url } }],
            [{ text: "⚔️ JOIN GAME", callback_data: `join_${roomId}` }]
          ]
        );
        
        return res.sendStatus(200);
      }
      
      // ======================================
      // JOIN GAME ROOM
      // ======================================
      if (data.startsWith("join_")) {
        const roomId = data.replace("join_", "");
        
        if (!gameRooms[chatId] || !gameRooms[chatId][roomId]) {
          await sendMessage(chatId, "❌ Room not found or expired! Create a new one with /game");
          return res.sendStatus(200);
        }
        
        const room = gameRooms[chatId][roomId];
        
        if (room.joined) {
          await sendMessage(chatId, "⚠️ Room is already full! Both players are playing.");
          return res.sendStatus(200);
        }
        
        if (room.host === userId) {
          await sendMessage(chatId, "❌ You cannot join your own room! Use the PLAY AS PLAYER 1 button above.");
          return res.sendStatus(200);
        }
        
        room.joined = true;
        
        // Generate URLs for both players
        const p1Url = `${GAME_URL}/?room=${roomId}&player=p1&group=${chatId}`;
        const p2Url = `${GAME_URL}/?room=${roomId}&player=p2&group=${chatId}`;
        
        await sendMessage(
          chatId,
          `🎮 <b>MATCH FOUND!</b>\n\n👤 Player 1: ${room.hostName}\n👤 Player 2: ${username}\n🎤 Voice Chat Enabled\n\n👇 Tap below to start playing:`,
          null,
          [
            [{ text: "👑 PLAYER 1", web_app: { url: p1Url } }],
            [{ text: "⚡ PLAYER 2", web_app: { url: p2Url } }]
          ]
        );
        
        return res.sendStatus(200);
      }
    }
    
    // ======================================
    // HANDLE REGULAR MESSAGES
    // ======================================
    if (!update.message) {
      return res.sendStatus(200);
    }
    
    const msg = update.message;
    const chatId = String(msg.chat.id);
    const userId = msg.from.id;
    const text = msg.text;
    
    if (!text) {
      return res.sendStatus(200);
    }
    
    // Save group info
    if (msg.chat && (msg.chat.type === "group" || msg.chat.type === "supergroup")) {
      groups[chatId] = {
        id: chatId,
        title: msg.chat.title || "Unknown Group"
      };
    }
    
    // ======================================
    // GAME COMMAND
    // ======================================
    if (text.toLowerCase() === "/game" || text.toLowerCase() === "game") {
      await sendMessage(
        chatId,
        `🎮 <b>STRATEGY LINE - MULTIPLAYER GAME</b>\n\n⚡ Real-time Multiplayer Game with Voice Chat!\n🎤 Talk with your opponent while playing\n🔥 Create a room and invite a friend\n\n👇 Tap below to start:`,
        msg.message_id,
        [[{ text: "🚀 CREATE GAME ROOM", callback_data: "create_game" }]]
      );
      return res.sendStatus(200);
    }
    
    // ======================================
    // ABUSE CHECK
    // ======================================
    const isBad = await isAbusive(text);
    if (isBad) {
      if (!warnings[userId]) warnings[userId] = 0;
      warnings[userId]++;
      await deleteMessage(chatId, msg.message_id);
      
      if (warnings[userId] >= 3) {
        await banUser(chatId, userId);
        await sendMessage(chatId, `🚫 User ${msg.from.first_name} has been banned for abusive behavior.`);
      } else {
        await sendMessage(chatId, `⚠️ Warning ${warnings[userId]}/3 - Please maintain respect!`);
      }
      return res.sendStatus(200);
    }
    
    // ======================================
    // LOCAL SMART REPLY
    // ======================================
    const localReply = getLocalReply(text);
    if (localReply) {
      await sendMessage(chatId, localReply, msg.message_id);
      return res.sendStatus(200);
    }
    
    // ======================================
    // AI REPLY
    // ======================================
    await sendTyping(chatId);
    const aiReply = await askAI(userId, text);
    await sendMessage(chatId, aiReply, msg.message_id);
    
    return res.sendStatus(200);
    
  } catch (err) {
    console.error("Webhook Error:", err.message);
    return res.sendStatus(200); // Always return 200 to avoid Telegram retries
  }
});

// ======================================
// HOME ROUTE
// ======================================

app.get("/", (req, res) => {
  res.json({
    status: "online",
    bot: "Supreme Telegram Bot",
    developer: "Easy Deplover",
    game_url: GAME_URL,
    uptime: process.uptime()
  });
});

// ======================================
// START SERVER
// ======================================

server.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`🚀 Server started on port ${PORT}`);
  console.log(`🤖 Bot: Supreme Telegram Bot`);
  console.log(`🎮 Game URL: ${GAME_URL}`);
  console.log(`✅ Status: ONLINE`);
  console.log(`========================================\n`);
});
