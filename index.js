// ======================================
// SUPREME TELEGRAM BOT - PRO MAX VERSION
// ======================================

require("dotenv").config();
const express = require("express");
const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, set, update, get, push } = require("firebase/database");

// SERVER SETUP
const app = express();
app.get("/", (req, res) => res.send("🤖 Supreme Bot is Online & Guarding! 🔥"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Server running on ${PORT}`));

// FIREBASE CONFIG
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

const bot = new Telegraf(process.env.BOT_TOKEN);
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const memory = {};
const cooldown = {};
const bossData = {};

const models = [
  "openai/gpt-oss-20b:free",
  "google/gemma-2-9b-it:free",
  "microsoft/phi-3-mini-128k-instruct:free",
  "qwen/qwen-2.5-7b-instruct:free"
];

// ======================================
// HELPERS
// ======================================

function getUserName(user) {
  return user.username ? `@${user.username}` : (user.first_name || "Dost");
}

async function isAdmin(ctx) {
  if (ctx.chat.type === 'private') return true;
  try {
    const member = await ctx.getChatMember(ctx.from.id);
    return ["creator", "administrator"].includes(member.status);
  } catch (e) { return false; }
}

// ======================================
// AI MODERATION LOGIC (0 or 1)
// ======================================
async function checkAbuseAI(text) {
  const prompt = `Task: Analyze if the following text contains heavy abuse, slangs (Hindi/English), or toxic language. 
  Reply ONLY '1' if it is abusive, or '0' if it is clean.
  Text: "${text}"`;

  for (const model of models) {
    try {
      const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2
      }, {
        headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" }
      });
      const result = response.data.choices[0].message.content.trim();
      return result === "1" ? 1 : 0;
    } catch (e) { continue; }
  }
  return 0; // Default clean if AI fails
}

// ======================================
// MAIN AI CHAT LOGIC (HINGLISH)
// ======================================
async function askAI(userId, message) {
  if (cooldown[userId] && Date.now() - cooldown[userId] < 1500) return "⏳ Slow bro! 😂";
  cooldown[userId] = Date.now();

  if (!memory[userId]) memory[userId] = [];
  const systemPrompt = "You are 'Supreme Bot', a cool desi friend. Talk in Hinglish with many emojis. Be funny!";
  const messages = [{ role: "system", content: systemPrompt }, ...memory[userId], { role: "user", content: message }];

  for (const model of models) {
    try {
      const res = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
        model, messages, max_tokens: 100
      }, { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` } });
      
      const reply = res.data.choices[0].message.content;
      memory[userId].push({ role: "user", content: message }, { role: "assistant", content: reply });
      if (memory[userId].length > 6) memory[userId].splice(0, 2);
      return reply;
    } catch (e) { continue; }
  }
  return "❌ AI respond nahi kar raha bhai! 😔";
}

// ======================================
// WELCOME / START & MIDDLEWARE
// ======================================

bot.start(async (ctx) => {
  if (ctx.chat.type === 'private') {
    return ctx.replyWithMarkdown(`🔥 *Oye ${ctx.from.first_name}! Swagat Hai!* 😎\n\nMain groups ka king hoon. Niche button daba aur mujhe group mein add kar!`,
      Markup.inlineKeyboard([[Markup.urlButton("➕ Add To Group 🔥", `https://t.me/${ctx.botInfo.username}?startgroup=true`)]]));
  }
});

bot.on("new_chat_members", (ctx) => ctx.reply(`🎉 Welcome ${getUserName(ctx.message.new_chat_members[0])} bhai! 🔥 Enjoy your stay!`));
bot.on("left_chat_member", (ctx) => ctx.reply(`💔 ${ctx.message.left_chat_member.first_name} chala gaya... bye! 👋`));

bot.on("message", async (ctx, next) => {
  if (!ctx.message || !ctx.from || ctx.from.is_bot) return next();
  if (ctx.chat.type === 'private') return next();

  const text = ctx.message.text || "";
  
  // AI Moderation (Har message check hoga)
  if (text.length > 2 && !text.startsWith("/")) {
    const isGanda = await checkAbuseAI(text);
    if (isGanda === 1) {
      try {
        await ctx.deleteMessage();
        const warnRef = ref(db, `groups/${ctx.chat.id}/warnings/${ctx.from.id}`);
        const snap = await get(warnRef);
        let count = (snap.val()?.count || 0) + 1;
        await set(warnRef, { count });

        if (count >= 3) {
          await ctx.banChatMember(ctx.from.id);
          return ctx.reply(`🚫 ${getUserName(ctx.from)} ne 3 bar gandi baat ki! Ban kar diya! 💀🔥`);
        }
        return ctx.reply(`⚠️ Oye ${getUserName(ctx.from)}! Gali mat de! Warning: ${count}/3 😡💥`);
      } catch (e) { console.log("Admin Error"); }
      return;
    }
  }

  // XP System
  const userRef = ref(db, `groups/${ctx.chat.id}/users/${ctx.from.id}`);
  const snap = await get(userRef);
  await update(userRef, { name: ctx.from.first_name, xp: (snap.val()?.xp || 0) + 2, lastMessage: Date.now() });

  return next();
});

// ======================================
// COMMANDS (ALL FIXED)
// ======================================

bot.command("search", async (ctx) => {
  const query = ctx.message.text.split(" ").slice(1).join(" ");
  if (!query) return ctx.reply("Kuch pooch bhai! 😂");
  ctx.sendChatAction("typing");
  ctx.reply(await askAI(ctx.from.id, query));
});

bot.command("level", async (ctx) => {
  const snap = await get(ref(db, `groups/${ctx.chat.id}/users/${ctx.from.id}/xp`));
  ctx.reply(`👑 User: ${getUserName(ctx.from)}\n🔥 XP: ${snap.val() || 0}`);
});

bot.command("mood", (ctx) => ctx.reply(`🎭 Mood: ${["🔥 Full Tabahi", "😴 Soya hua", "😎 Cool"][Math.floor(Math.random()*3)]}`));

bot.command("funny", (ctx) => ctx.reply(["😂 WiFi slow hai tera!", "💀 NPC spotted!", "🔥 System hang!"][Math.floor(Math.random()*3)]));

bot.command("scan", (ctx) => ctx.reply(`📡 SCAN: ${ctx.from.first_name}\n🧠 IQ: ${Math.floor(Math.random()*150)}\n⚠️ Danger: ${Math.floor(Math.random()*100)}%`));

bot.command("match", (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 3) return ctx.reply("Usage: /match @user1 @user2");
  ctx.reply(`💘 Match: ${args[1]} + ${args[2]}\n🔥 Compatibility: ${Math.floor(Math.random()*101)}%`);
});

bot.command("event", (ctx) => {
  bossData[ctx.chat.id] = 200;
  ctx.reply("👹 BOSS EVENT! HP: 200\nMaaro! /hit ⚔️");
});

bot.command("hit", (ctx) => {
  if (!bossData[ctx.chat.id]) return ctx.reply("Boss nahi hai!");
  const dmg = Math.floor(Math.random()*50)+10;
  bossData[ctx.chat.id] -= dmg;
  if (bossData[ctx.chat.id] <= 0) { delete bossData[ctx.chat.id]; return ctx.reply("🏆 BOSS DEFEATED! 🔥"); }
  ctx.reply(`⚔️ -${dmg} | HP: ${bossData[ctx.chat.id]}`);
});

bot.command("kick", async (ctx) => {
  if (!(await isAdmin(ctx)) || !ctx.message.reply_to_message) return;
  const target = ctx.message.reply_to_message.from.id;
  await ctx.telegram.banChatMember(ctx.chat.id, target);
  await ctx.telegram.unbanChatMember(ctx.chat.id, target);
  ctx.reply("👢 Kicked! 😂");
});

bot.command("inactive", async (ctx) => {
  const snap = await get(ref(db, `groups/${ctx.chat.id}/users`));
  let text = "😴 *Inactive Users:*\n";
  for (let id in snap.val()) {
    if (Date.now() - snap.val()[id].lastMessage > 3600000) text += `• ${snap.val()[id].name}\n`;
  }
  ctx.replyWithMarkdown(text);
});

bot.command("call", (ctx) => ctx.reply("📢 Oye sab jaag jao! 😂"));

bot.command("allactive", async (ctx) => {
  if (!(await isAdmin(ctx))) return;
  const snap = await get(ref(db, `groups/${ctx.chat.id}/users`));
  let t = "📢 Tagging All: ";
  for (let id in snap.val()) t += `${getUserName(snap.val()[id])} `;
  ctx.reply(t);
});

bot.command("history", async (ctx) => {
    const snap = await get(ref(db, `groups/${ctx.chat.id}/users`));
    ctx.reply("📜 History check enabled. Data is saved in database.");
});

// START
bot.launch().then(() => console.log("✅ Supreme Bot A2Z Ready! 🔥🚀"));

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);
