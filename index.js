// ======================================
// SUPREME TELEGRAM BOT
// FULL A2Z FIXED VERSION (ORIGINAL STYLE)
// ======================================

require("dotenv").config();

const express = require("express");
const { Telegraf } = require("telegraf");
const axios = require("axios");

// ======================================
// EXPRESS
// ======================================

const app = express();

app.get("/", (req, res) => {
  res.send("🤖 Supreme Bot Running - Full Active Mode 🔥");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🌐 Server running on ${PORT}`);
});

// ======================================
// FIREBASE
// ======================================

const { initializeApp } = require("firebase/app");
const {
  getDatabase,
  ref,
  set,
  update,
  get,
  push
} = require("firebase/database");

const firebaseConfig = {
  apiKey: "AIzaSyBsAMJfL825py-6HOgX6scHZFp2Mch47R8",
  authDomain: "bot-dock.firebaseapp.com",
  databaseURL: "https://bot-dock-default-rtdb.firebaseio.com",
  projectId: "bot-dock",
  storageBucket: "bot-dock.firebasestorage.app",
  messagingSenderId: "757972411636",
  appId: "1:757972411636:web:61328d1730c2521e316aa1"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

// ======================================
// BOT
// ======================================

const bot = new Telegraf(process.env.BOT_TOKEN);
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// ======================================
// MEMORY
// ======================================

const memory = {};
const cooldown = {};
const sentToday = {};
const bossData = {};

// ======================================
// HELPERS
// ======================================

function getUserName(user) {
  if (user.username) return `@${user.username}`;
  if (user.first_name) return user.first_name;
  return "Unknown User";
}

async function replyMsg(ctx, text) {
  return ctx.reply(text, {
      reply_to_message_id: ctx.message.message_id
  });
}

const models = [
  "openai/gpt-3.5-turbo", 
  "google/gemma-2-9b-it:free",
  "qwen/qwen-2.5-7b-instruct:free"
];

// ======================================
// ADMIN CHECK
// ======================================

async function isAdmin(ctx) {
  if (ctx.chat.type === 'private') return true;
  const admins = await ctx.getChatAdministrators();
  return admins.some(admin => admin.user.id === ctx.from.id);
}

// ======================================
// BAD WORD CHECK (FIXED)
// ======================================

function isAbusive(text) {
  const badWords = ["mc", "bc", "gandu", "bhosdike", "madarchod", "chutiya", "loda", "fuck", "randi"];
  const lower = text.toLowerCase();
  return badWords.some(word => lower.includes(word));
}

// ======================================
// AI (MAST EMOJI VERSION)
// ======================================

async function askAI(userId, message) {
  try {
    const now = Date.now();
    if (cooldown[userId] && now - cooldown[userId] < 1500) return "⏳ Oye, thoda aaram se! 😆🔥";
    cooldown[userId] = now;

    if (!memory[userId]) memory[userId] = [];
    
    // Injected System Prompt for "Mast Style"
    const systemMsg = { 
        role: "system", 
        content: "You are Supreme Bot. Talk like a cool desi friend in Hinglish. Use many emojis like 😂, 🔥, 😎, 💀, 💥. Be very funny and chatty!" 
    };

    const userMsg = { role: "user", content: message };
    
    const messagesToSend = [systemMsg, ...memory[userId], userMsg];

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: models[1], // Using Gemma for free and fast replies
        messages: messagesToSend,
        max_tokens: 150,
        temperature: 0.9
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = response.data.choices[0].message.content;
    
    memory[userId].push(userMsg);
    memory[userId].push({ role: "assistant", content: reply });
    if (memory[userId].length > 6) memory[userId].shift();

    return reply;
  } catch (err) {
    return "❌ AI dimaag kha gaya mera! 😂 Baad me try kar!";
  }
}

// ======================================
// AUTO MODERATION & SAVE DATA
// ======================================

bot.on("message", async (ctx, next) => {
  if (!ctx.message || !ctx.from) return next();

  const text = ctx.message.text || "";
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;

  // 1. GAALI CHECK
  if (isAbusive(text) && !text.startsWith("/")) {
    try {
      await ctx.deleteMessage();
      const warnRef = ref(db, `groups/${chatId}/warnings/${userId}`);
      const snap = await get(warnRef);
      let warns = (snap.val()?.warnings || 0) + 1;
      await set(warnRef, { warnings: warns });

      if (warns >= 3) {
        await ctx.banChatMember(userId);
        return ctx.reply(`🚫 ${getUserName(ctx.from)} ko 3 warnings mil gayi! Tata Bye Bye! 💀🔥`);
      }
      return ctx.reply(`⚠️ Oye ${getUserName(ctx.from)}! Gaali mat de! Warning: ${warns}/3 😡💥`);
    } catch (e) { console.log("Admin Rights Needed"); }
    return;
  }

  // 2. SAVE DATA & XP
  const userRef = ref(db, `groups/${chatId}/users/${userId}`);
  const userSnap = await get(userRef);
  const oldXP = userSnap.exists() ? (userSnap.val().xp || 0) : 0;

  await update(userRef, {
    id: userId,
    username: ctx.from.username || "",
    name: ctx.from.first_name,
    lastMessage: Date.now(),
    xp: oldXP + 2
  });

  await update(ref(db, `groups/${chatId}/info`), { id: chatId, title: ctx.chat.title || "Group", updatedAt: Date.now() });

  return next();
});

// ======================================
// COMMANDS (ALL PURANE COMMANDS)
// ======================================

bot.command("search", async (ctx) => {
  const query = ctx.message.text.replace(/\/search(@\w+)?/, "").trim();
  if (!query) return replyMsg(ctx, "❌ Kuch toh bol bhai! 😂");
  ctx.sendChatAction("typing");
  const reply = await askAI(ctx.from.id, query);
  replyMsg(ctx, reply);
});

bot.command("mood", (ctx) => {
  const line = ["🔥 Full Form Me!", "😴 Bore ho raha hoon", "😎 Chill vibes", "💀 Danger Zone"];
  replyMsg(ctx, `🎭 Group Mood: ${line[Math.floor(Math.random() * line.length)]} 😂`);
});

bot.command("level", async (ctx) => {
  const snap = await get(ref(db, `groups/${ctx.chat.id}/users/${ctx.from.id}/xp`));
  replyMsg(ctx, `👑 ${ctx.from.first_name}\n🔥 XP: ${snap.val() || 0} 🚀`);
});

bot.command("funny", (ctx) => {
  const lines = ["😂 WiFi se slow tera dimaag hai", "💀 NPC spotted!", "🔥 System phad denge!", "😭 Bhai rehne de, tujhse na ho payega"];
  replyMsg(ctx, lines[Math.floor(Math.random() * lines.length)]);
});

bot.command("call", (ctx) => {
    replyMsg(ctx, "📢 Oye sab kaha mar gaye? 😂 Aao jaldi bakchodi karte hai! 🔥💥");
});

bot.command("inactive", async (ctx) => {
  const snap = await get(ref(db, `groups/${ctx.chat.id}/users`));
  const users = snap.val() || {};
  let text = "😴 Inactive Users:\n";
  let found = false;
  for (const id in users) {
    if (Date.now() - users[id].lastMessage > 3600000) {
      text += `${getUserName(users[id])}\n`;
      found = true;
    }
  }
  replyMsg(ctx, found ? text : "🔥 Sab active hai don! 😎");
});

bot.command("allactive", async (ctx) => {
  if (!(await isAdmin(ctx))) return replyMsg(ctx, "❌ Sirf Admin ke liye!");
  const snap = await get(ref(db, `groups/${ctx.chat.id}/users`));
  let text = "📢 Summoning Everyone! 🔥\n\n";
  for (const id in snap.val()) text += `${getUserName(snap.val()[id])} `;
  replyMsg(ctx, text + "\n\nJaldi aao! 😂🚀");
});

bot.command("scan", (ctx) => {
  replyMsg(ctx, `📡 SCANNING ${ctx.from.first_name}...\n🧠 IQ: ${Math.floor(Math.random()*150)}\n⚠️ Danger: ${Math.floor(Math.random()*100)}% 💀`);
});

bot.command("match", (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 3) return replyMsg(ctx, "Usage: /match @user1 @user2 💘");
  const p = Math.floor(Math.random() * 40) + 60;
  replyMsg(ctx, `💘 Match Result: ${args[1]} ❤️ ${args[2]}\n📊 Compatibility: ${p}%\n${p > 85 ? "🔥 Perfect!" : "😂 Theek thaak"}`);
});

bot.command("event", (ctx) => {
  bossData[ctx.chat.id] = 100;
  replyMsg(ctx, "👹 BOSS EVENT START! 👹\nHP: 100\nMaaro isse! /hit ⚔️");
});

bot.command("hit", (ctx) => {
  if (!bossData[ctx.chat.id]) return replyMsg(ctx, "❌ Koi boss nahi hai!");
  const dmg = Math.floor(Math.random() * 30) + 5;
  bossData[ctx.chat.id] -= dmg;
  if (bossData[ctx.chat.id] <= 0) {
    delete bossData[ctx.chat.id];
    return replyMsg(ctx, `🏆 Boss Defeated! Final hit by ${ctx.from.first_name}! 🔥`);
  }
  replyMsg(ctx, `⚔️ Hit: -${dmg}\n👹 Boss HP: ${bossData[ctx.chat.id]} 💥`);
});

// ======================================
// ADMIN TOOLS
// ======================================

bot.command("warn", async (ctx) => {
    if (!(await isAdmin(ctx)) || !ctx.message.reply_to_message) return;
    const target = ctx.message.reply_to_message.from;
    const warnRef = ref(db, `groups/${ctx.chat.id}/warnings/${target.id}`);
    const snap = await get(warnRef);
    let count = (snap.val()?.warnings || 0) + 1;
    await set(warnRef, { warnings: count });
    replyMsg(ctx, `⚠️ ${getUserName(target)} warned! (${count}/3) 😡`);
});

bot.command("kick", async (ctx) => {
    if (!(await isAdmin(ctx)) || !ctx.message.reply_to_message) return;
    await ctx.telegram.banChatMember(ctx.chat.id, ctx.message.reply_to_message.from.id);
    await ctx.telegram.unbanChatMember(ctx.chat.id, ctx.message.reply_to_message.from.id);
    replyMsg(ctx, "👢 Laat maar ke nikaal diya! 😂");
});

// ======================================
// SCHEDULER (INDIA TIME)
// ======================================

setInterval(async () => {
    const now = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    const h = now.getHours(), m = now.getMinutes(), d = now.toDateString();
    
    if (h === 8 && m === 0) { // Morning 8 AM
        const snap = await get(ref(db, "groups"));
        for (const id in snap.val()) {
            if (!sentToday[`gm-${id}-${d}`]) {
                bot.telegram.sendMessage(id, "🌅 Good Morning Legends! 🔥 Din shuru karo bakchodi se! 😎");
                sentToday[`gm-${id}-${d}`] = true;
            }
        }
    }
}, 60000);

// ======================================
// START
// ======================================

bot.launch().then(() => console.log("🤖 Supreme Bot Fixed & Running! 🔥"));

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);
