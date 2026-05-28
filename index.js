// ======================================
// SUPREME TELEGRAM BOT - FULL A2Z FIXED
// ======================================

require("dotenv").config();
const express = require("express");
const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, set, update, get, push } = require("firebase/database");

// ======================================
// EXPRESS SERVER
// ======================================
const app = express();
app.get("/", (req, res) => res.send("🤖 Supreme Bot is Super Active! 🔥"));
app.listen(process.env.PORT || 3000, () => console.log("🌐 Server is running"));

// ======================================
// FIREBASE CONFIG
// ======================================
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
// BOT CONFIG
// ======================================
const bot = new Telegraf(process.env.BOT_TOKEN);
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const bossData = {};
const cooldown = {};

// AI Personalities
const SYSTEM_PROMPT = `You are 'Supreme Bot', a cool, funny, and desi friend. 
Talk in Hinglish with lots of emojis like 😂, 🔥, 😎, 💀, 💥. 
Be informal, call users 'bhai', 'don' or 'beta'. Keep the vibe high!`;

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

function isAbusive(text) {
  const badWords = ["mc", "bc", "gandu", "bhosdike", "madarchod", "chutiya", "loda", "fuck", "randi", "bkl", "mkl"];
  const lowerText = text.toLowerCase();
  return badWords.some(word => lowerText.includes(word));
}

// ======================================
// 1. WELCOME & LEFT MESSAGE (FIXED)
// ======================================

bot.on("new_chat_members", async (ctx) => {
  for (const user of ctx.message.new_chat_members) {
    await ctx.reply(`🎉 Swagat hai ${user.first_name} bhai! \n🔥 Enjoy karo aur rules follow karo varna system hang kar denge! 😎🚀`);
  }
});

bot.on("left_chat_member", (ctx) => {
  ctx.reply(`💔 ${ctx.message.left_chat_member.first_name} chala gaya... \nBura laga par chalo koi nahi, ek kalesh kam hua! 😂👋`);
});

// ======================================
// 2. PRIVATE CHAT /START (FIXED)
// ======================================

bot.start(async (ctx) => {
  if (ctx.chat.type === 'private') {
    const startMsg = `
🔥 *Oye Hero! Swagat hai Supreme Bot mein!* 😎

Main groups ka asli king hoon! Mere features dekhoge toh fan ho jaoge! 🚀

*Main Kya Kya Kar Sakta Hoon?*
✅ *AI Search:* Mast Hinglish baate (/search)
✅ *Anti-Gaali:* Gali dete hi message delete aur 3-warn ban! 😡
✅ *Games:* Group mein Boss events (/event, /hit)
✅ *Fun:* Scan, Match, Mood, Level aur XP system! 👑
✅ *Welcome:* Naye logo ka swagat aur jaane walo ko bye!

*Niche wale button pe click kar aur mujhe group mein add kar!* 👇`;

    return ctx.replyWithMarkdown(startMsg, 
      Markup.inlineKeyboard([
        [Markup.urlButton("➕ Add Me To Your Group 🔥", `https://t.me/${ctx.botInfo.username}?startgroup=true`)]
      ])
    );
  }
});

// ======================================
// 3. AUTO-MOD & XP (FIXED)
// ======================================

bot.on("message", async (ctx, next) => {
  if (!ctx.message || !ctx.from || ctx.from.is_bot) return next();

  const text = ctx.message.text || "";
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;

  // Private Chat Handling
  if (ctx.chat.type === 'private' && !text.startsWith('/start')) {
    return ctx.reply("Bhai, group mein add kar mujhe tabhi maza aayega! 😂🔥", 
      Markup.inlineKeyboard([[Markup.urlButton("➕ Add To Group 😎", `https://t.me/${ctx.botInfo.username}?startgroup=true`)]])
    );
  }

  if (ctx.chat.type === 'private') return next();

  // A. Gaali Detection & Warning
  if (isAbusive(text) && !text.startsWith("/")) {
    try {
      await ctx.deleteMessage();
      const warnRef = ref(db, `groups/${chatId}/warnings/${userId}`);
      const snap = await get(warnRef);
      let count = (snap.val()?.count || 0) + 1;
      await set(warnRef, { count });

      if (count >= 3) {
        await ctx.banChatMember(userId);
        return ctx.reply(`🚫 ${getUserName(ctx.from)} ne 3 bar gaali di! Tata Bye Bye! 💀🔥`);
      }
      return ctx.reply(`⚠️ Oye ${getUserName(ctx.from)}! Gaali mat de bhai! Warning: ${count}/3 😡💥`);
    } catch (e) { console.log("Admin Rights Missing!"); }
    return;
  }

  // B. XP System
  if (!text.startsWith("/")) {
    const userRef = ref(db, `groups/${chatId}/users/${userId}/xp`);
    const snap = await get(userRef);
    await set(userRef, (snap.val() || 0) + 2);
    // Update basic user info
    await update(ref(db, `groups/${chatId}/users/${userId}`), {
        username: ctx.from.username || "",
        name: ctx.from.first_name,
        lastMessage: Date.now()
    });
  }

  return next();
});

// ======================================
// 4. ALL COMMANDS (A2Z FIXED)
// ======================================

// AI SEARCH
bot.command("search", async (ctx) => {
  if (ctx.chat.type === 'private') return;
  const query = ctx.message.text.split(" ").slice(1).join(" ");
  if (!query) return ctx.reply("Kuch toh pooch bhai! Khali dabba kyu bhej raha? 😂🔥");
  
  ctx.sendChatAction("typing");
  try {
    const res = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
      model: "google/gemma-2-9b-it:free",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: query }]
    }, { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` } });
    ctx.reply(res.data.choices[0].message.content, { reply_to_message_id: ctx.message.message_id });
  } catch (e) { ctx.reply("Dimaag hang ho gaya! 🤯 Baad me try kar."); }
});

// GAMES (BOSS EVENT)
bot.command("event", (ctx) => {
    if (ctx.chat.type === 'private') return;
    bossData[ctx.chat.id] = 200;
    ctx.reply("👹 BOSS APPEARED! 👹\nHP: 200\nMaaro sab milke! Command: /hit ⚔️💥");
});

bot.command("hit", (ctx) => {
    if (ctx.chat.type === 'private' || !bossData[ctx.chat.id]) return;
    const dmg = Math.floor(Math.random() * 45) + 5;
    bossData[ctx.chat.id] -= dmg;
    if (bossData[ctx.chat.id] <= 0) {
        delete bossData[ctx.chat.id];
        return ctx.reply(`🏆 KHATAM! ${getUserName(ctx.from)} ne Boss ki chutti kar di! 🔥😎`);
    }
    ctx.reply(`⚔️ -${dmg} Damage! \n👹 Boss HP: ${bossData[ctx.chat.id]} 💥`);
});

// FUN COMMANDS
bot.command("mood", (ctx) => ctx.reply(`🎭 Group Mood: ${["🔥 Full Tabahi", "😴 Soya hua", "😎 Mast", "💀 Danger Zone"][Math.floor(Math.random()*4)]} 😂`));

bot.command("level", async (ctx) => {
    if (ctx.chat.type === 'private') return;
    const snap = await get(ref(db, `groups/${ctx.chat.id}/users/${ctx.from.id}/xp`));
    ctx.reply(`👑 User: ${getUserName(ctx.from)}\n🔥 Level XP: ${snap.val() || 0}\nLage raho! 🚀`);
});

bot.command("funny", (ctx) => {
    const jokes = ["WiFi bhi tere dimaag se fast hai 😂", "Tu NPC hai kya bhai? 💀", "System hang ho jayega tera rehne de! 🔥"];
    ctx.reply(jokes[Math.floor(Math.random()*jokes.length)]);
});

bot.command("match", (ctx) => {
    const args = ctx.message.text.split(" ");
    if (args.length < 3) return ctx.reply("Oye! /match @user1 @user2 likh! 💘");
    const p = Math.floor(Math.random() * 101);
    ctx.reply(`💘 Match Result: ${args[1]} + ${args[2]}\n🔥 Compatibility: ${p}%\n${p > 80 ? "Sachi Mohabbat! 😍" : "Katne wala hai! 😂"}`);
});

bot.command("scan", (ctx) => {
    ctx.reply(`📡 SCANNING ${ctx.from.first_name}...\n🧠 IQ: ${Math.floor(Math.random()*160)}\n⚠️ Danger: ${Math.floor(Math.random()*100)}% 💀`);
});

// ADMIN COMMANDS
bot.command("warn", async (ctx) => {
    if (!(await isAdmin(ctx)) || !ctx.message.reply_to_message) return ctx.reply("Admin ban ja pehle ya reply kar! 😂");
    const target = ctx.message.reply_to_message.from;
    const warnRef = ref(db, `groups/${ctx.chat.id}/warnings/${target.id}`);
    const snap = await get(warnRef);
    let count = (snap.val()?.count || 0) + 1;
    await set(warnRef, { count });
    ctx.reply(`⚠️ ${getUserName(target)} ko warning de di! (${count}/3) 😡🔥`);
});

bot.command("kick", async (ctx) => {
    if (!(await isAdmin(ctx)) || !ctx.message.reply_to_message) return;
    const target = ctx.message.reply_to_message.from.id;
    await ctx.telegram.banChatMember(ctx.chat.id, target);
    await ctx.telegram.unbanChatMember(ctx.chat.id, target);
    ctx.reply("👢 Laat maar ke nikal diya! 😂 Bye Bye! 🔥");
});

bot.command("allactive", async (ctx) => {
    if (!(await isAdmin(ctx))) return;
    const snap = await get(ref(db, `groups/${ctx.chat.id}/users`));
    const users = snap.val() || {};
    let text = "📢 SAB HA_ZIR HO JAO! 🔥\n\n";
    for (let id in users) text += `${getUserName(users[id])} `;
    ctx.reply(text + "\n\nBakchodi shuru karo! 😂🚀");
});

// ======================================
// BOT START
// ======================================
bot.launch().then(() => console.log("✅ Supreme Bot A2Z Ready! 🔥🚀"));

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);
