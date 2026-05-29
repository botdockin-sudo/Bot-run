require("dotenv").config();
const express = require("express");
const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, set, update, get } = require("firebase/database");

// --- CONFIG ---
const OWNER_ID = 8661288342; 
const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const firebaseConfig = {
    apiKey: "AIzaSyBsAMJfL825py-6HOgX6scHZFp2Mch47R8",
    authDomain: "bot-dock.firebaseapp.com",
    databaseURL: "https://bot-dock-default-rtdb.firebaseio.com",
    projectId: "bot-dock",
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();
app.get("/", (req, res) => res.send("🤖 Supreme Bot is Flying! 🔥"));
app.listen(PORT, () => console.log(`🌐 Server active on ${PORT}`));

const memory = {};
const bossData = {};

// --- HELPERS ---
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

async function askAI(userId, message) {
    if (!memory[userId]) memory[userId] = [];
    const systemPrompt = "You are 'Supreme Bot', a cool desi friend. Talk in Hinglish with many emojis. Be funny and friendly!";
    try {
        const res = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
            model: "google/gemma-2-9b-it:free",
            messages: [{ role: "system", content: systemPrompt }, ...memory[userId], { role: "user", content: message }],
            max_tokens: 150
        }, { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` } });
        const reply = res.data.choices[0].message.content;
        memory[userId].push({ role: "user", content: message }, { role: "assistant", content: reply });
        if (memory[userId].length > 6) memory[userId].splice(0, 2);
        return reply;
    } catch (e) { return "❌ AI thoda bimar hai bhai! 😔"; }
}

// --- START COMMAND ---
bot.start(async (ctx) => {
    let welcome = `🔥 *Oye ${ctx.from.first_name}! Swagat hai ${ctx.botInfo.first_name} mein!* 😎\n\n`;
    welcome += `Main is Group ka King hoon. Mere features:\n\n`;
    welcome += `⚔️ *Admin:* /ban, /unban, /mute, /unmute, /kick\n`;
    welcome += `🤖 *AI:* /ask likh ke baatein karo\n`;
    welcome += `🎮 *Games:* /event, /hit, /scan, /match\n`;
    welcome += `📊 *Stats:* /level, /inactive\n\n`;
    welcome += `Niche buttons dabao 👇`;

    const keyboard = [[Markup.button.url("➕ Add Me To Group 🔥", `https://t.me/${ctx.botInfo.username}?startgroup=true`)]];
    if (ctx.from.id === OWNER_ID) {
        keyboard.push([Markup.button.callback("👑 Create Admin (Owner Only)", "select_group")]);
    }
    return ctx.replyWithMarkdown(welcome, Markup.inlineKeyboard(keyboard));
});

// --- OWNER: ADMIN PROMOTION ---
bot.action("select_group", async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return ctx.answerCbQuery("Chal nikal! ❌");
    const snap = await get(ref(db, `groups`));
    const groups = snap.val();
    if (!groups) return ctx.reply("Koi group nahi mila.");
    let buttons = [];
    for (let id in groups) buttons.push([Markup.button.callback(groups[id].title || id, `make_admin_${id}`)]);
    ctx.editMessageText("🎯 *Kahan Admin banna hai?*", { parse_mode: "Markdown", ...Markup.inlineKeyboard(buttons) });
});

bot.action(/make_admin_(.+)/, async (ctx) => {
    try {
        await ctx.telegram.promoteChatMember(ctx.match[1], OWNER_ID, {
            can_manage_chat: true, can_delete_messages: true, can_restrict_members: true,
            can_promote_members: true, can_invite_users: true, can_pin_messages: true
        });
        ctx.reply("🚀 Done! Aap Admin ban gaye. 😎");
    } catch (e) { ctx.reply("❌ Error: Shayad main wahan admin nahi hoon."); }
});

// --- ADMIN TOOLS ---
bot.command("kick", async (ctx) => {
    if (!(await isAdmin(ctx)) || !ctx.message.reply_to_message) return;
    await ctx.banChatMember(ctx.message.reply_to_message.from.id);
    await ctx.unbanChatMember(ctx.message.reply_to_message.from.id);
    ctx.reply("👢 Laat maar ke nikal diya! 😂");
});
bot.command("ban", async (ctx) => {
    if (!(await isAdmin(ctx)) || !ctx.message.reply_to_message) return;
    await ctx.banChatMember(ctx.message.reply_to_message.from.id);
    ctx.reply("🚫 BANNED! Tata bye bye... 💀");
});
bot.command("unban", async (ctx) => {
    if (!(await isAdmin(ctx)) || !ctx.message.reply_to_message) return;
    await ctx.unbanChatMember(ctx.message.reply_to_message.from.id);
    ctx.reply("🔓 Saza maaf! ✨");
});
bot.command("mute", async (ctx) => {
    if (!(await isAdmin(ctx)) || !ctx.message.reply_to_message) return;
    await ctx.restrictChatMember(ctx.message.reply_to_message.from.id, { can_send_messages: false });
    ctx.reply("🤐 Muh band! 🤫");
});
bot.command("unmute", async (ctx) => {
    if (!(await isAdmin(ctx)) || !ctx.message.reply_to_message) return;
    await ctx.restrictChatMember(ctx.message.reply_to_message.from.id, { can_send_messages: true });
    ctx.reply("🔊 Ab tum bol sakte ho. 🎤");
});

// --- FUN COMMANDS (Old + New) ---
bot.command("ask", async (ctx) => {
    const q = ctx.message.text.split(" ").slice(1).join(" ");
    if (!q) return ctx.reply("Pucho toh sahi! 😂");
    ctx.reply(await askAI(ctx.from.id, q));
});
bot.command("mood", (ctx) => ctx.reply(`🎭 Mood: ${["🔥 Tabahi", "😴 Soya hua", "😎 Cool"][Math.floor(Math.random()*3)]}`));
bot.command("funny", (ctx) => ctx.reply(["😂 WiFi slow hai!", "💀 NPC!", "🔥 System hang!"][Math.floor(Math.random()*3)]));
bot.command("scan", (ctx) => ctx.reply(`📡 SCAN: ${ctx.from.first_name}\n🧠 IQ: ${Math.floor(Math.random()*150)}\n⚠️ Danger: ${Math.floor(Math.random()*100)}%`));
bot.command("match", (ctx) => {
    const args = ctx.message.text.split(" ");
    if (args.length < 3) return ctx.reply("Usage: /match @user1 @user2");
    ctx.reply(`💘 Match: ${args[1]} + ${args[2]}\n🔥 Compatibility: ${Math.floor(Math.random()*101)}%`);
});
bot.command("event", (ctx) => { bossData[ctx.chat.id] = 200; ctx.reply("👹 BOSS EVENT! HP: 200\nMaaro! /hit ⚔️"); });
bot.command("hit", (ctx) => {
    if (!bossData[ctx.chat.id]) return ctx.reply("Boss nahi hai!");
    const dmg = Math.floor(Math.random()*50)+10; bossData[ctx.chat.id] -= dmg;
    if (bossData[ctx.chat.id] <= 0) { delete bossData[ctx.chat.id]; return ctx.reply("🏆 BOSS DEFEATED! 🔥"); }
    ctx.reply(`⚔️ -${dmg} | HP: ${bossData[ctx.chat.id]}`);
});
bot.command("call", (ctx) => ctx.reply("📢 Oye sab jaag jao! 😂"));

// --- XP & TRACKING ---
bot.on("message", async (ctx, next) => {
    if (!ctx.message || !ctx.from || ctx.from.is_bot) return next();
    if (ctx.chat.type !== 'private') {
        await update(ref(db, `groups/${ctx.chat.id}`), { title: ctx.chat.title });
        const userRef = ref(db, `groups/${ctx.chat.id}/users/${ctx.from.id}`);
        const snap = await get(userRef);
        await update(userRef, { name: ctx.from.first_name, xp: (snap.val()?.xp || 0) + 1, lastMessage: Date.now() });
    }
    if (ctx.message.text?.toLowerCase() === "hi") ctx.reply("Hi bhai! Kaise ho?");
    return next();
});

bot.command("level", async (ctx) => {
    const snap = await get(ref(db, `groups/${ctx.chat.id}/users/${ctx.from.id}/xp`));
    ctx.reply(`👑 XP: ${snap.val() || 0}`);
});

bot.launch().then(() => console.log("✅ Supreme Bot Ready! 🔥"));

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);
