// ======================================
// SUPREME TELEGRAM BOT - FULL & FINAL
// ======================================

require("dotenv").config();
const express = require("express");
const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, set, update, get } = require("firebase/database");

// --- CONFIGURATION ---
const OWNER_ID = 8661288342; 
const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Firebase Setup (Your Config)
const firebaseConfig = {
    apiKey: "AIzaSyBsAMJfL825py-6HOgX6scHZFp2Mch47R8",
    authDomain: "bot-dock.firebaseapp.com",
    databaseURL: "https://bot-dock-default-rtdb.firebaseio.com",
    projectId: "bot-dock",
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

const bot = new Telegraf(process.env.BOT_TOKEN);

// Server for keeping it alive
const app = express();
app.get("/", (req, res) => res.send("🤖 Supreme Bot is Online! 🔥"));
app.listen(PORT, () => console.log(`🌐 Server running on ${PORT}`));

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

// --- AI CHAT LOGIC ---
const memory = {};
async function askAI(userId, message) {
    if (!memory[userId]) memory[userId] = [];
    const systemPrompt = "You are 'Supreme Bot', a cool desi friend. Talk in Hinglish with many emojis. Be funny, a bit sarcastic and very friendly!";
    const messages = [{ role: "system", content: systemPrompt }, ...memory[userId], { role: "user", content: message }];

    try {
        const res = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
            model: "google/gemma-2-9b-it:free",
            messages, max_tokens: 150
        }, { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` } });
        
        const reply = res.data.choices[0].message.content;
        memory[userId].push({ role: "user", content: message }, { role: "assistant", content: reply });
        if (memory[userId].length > 6) memory[userId].splice(0, 2);
        return reply;
    } catch (e) { return "❌ AI thoda thak gaya hai bhai! Baad mein try kar. 😔"; }
}

// ======================================
// START COMMAND (Cool Welcome Message)
// ======================================

bot.start(async (ctx) => {
    const botName = ctx.botInfo.first_name;
    let welcome = `🔥 *Oye ${ctx.from.first_name}! Swagat hai ${botName} mein!* 😎\n\n`;
    welcome += `Main is Group ka King hoon aur tumhara best dost bhi! 🤘\n\n`;
    welcome += `🚀 *Mere Mast Features:*\n`;
    welcome += `⚔️ *Admin Power:* Ban, Unban, Mute, Unmute (Reply karke use karein)\n`;
    welcome += `🤖 *AI Advice:* /ask likh kar mujhse kuch bhi pucho\n`;
    welcome += `📊 *XP Level:* Jitni chat utna bada level\n`;
    welcome += `👑 *Owner Special:* Admin banane ki taqat!\n\n`;
    welcome += `Chalo, neeche diye buttons dabao 👇`;

    const buttons = [
        [Markup.urlButton("➕ Add Me To Your Group 🔥", `https://t.me/${ctx.botInfo.username}?startgroup=true`)]
    ];

    if (ctx.from.id === OWNER_ID) {
        buttons.push([Markup.callbackButton("👑 Create Admin (Owner Only)", "select_group")]);
    }

    return ctx.replyWithMarkdown(welcome, Markup.inlineKeyboard(buttons));
});

// ======================================
// OWNER FEATURE: ADMIN PROMOTION
// ======================================

bot.action("select_group", async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return ctx.answerCbQuery("Oye! Ye sirf Malik ke liye hai. ❌");
    
    const groupsSnap = await get(ref(db, `groups`));
    const groups = groupsSnap.val();

    if (!groups) return ctx.reply("Abhi tak main kisi group mein nahi gaya hoon. 😔");

    let keyboard = [];
    for (let id in groups) {
        keyboard.push([Markup.callbackButton(groups[id].title || "Unknown Group", `make_admin_${id}`)]);
    }

    ctx.editMessageText("🎯 *Aap kis group mein admin banna chahte हैं?*", {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard(keyboard)
    });
});

bot.action(/make_admin_(.+)/, async (ctx) => {
    const groupId = ctx.match[1];
    try {
        await ctx.telegram.promoteChatMember(groupId, OWNER_ID, {
            can_manage_chat: true, can_post_messages: true, can_edit_messages: true,
            can_delete_messages: true, can_restrict_members: true, can_promote_members: true,
            can_invite_users: true, can_pin_messages: true
        });
        ctx.answerCbQuery("✅ Done!");
        ctx.reply(`🚀 Badhai ho Malik! Maine aapko us group (ID: ${groupId}) mein Admin bana diya hai! 😎👑`);
    } catch (e) { 
        ctx.reply("❌ Error: Shayad main us group mein admin nahi hoon ya mere paas permission nahi hai."); 
    }
});

// ======================================
// ADMIN COMMANDS (BAN, UNBAN, MUTE, UNMUTE)
// ======================================

// Kick (Nikale ke liye)
bot.command("kick", async (ctx) => {
    if (!(await isAdmin(ctx)) || !ctx.message.reply_to_message) return;
    const target = ctx.message.reply_to_message.from.id;
    await ctx.banChatMember(target);
    await ctx.unbanChatMember(target);
    ctx.reply(`👢 ${getUserName(ctx.message.reply_to_message.from)} ko laat maar ke nikal diya! 😂`);
});

// Ban (Hamesha ke liye bahar)
bot.command("ban", async (ctx) => {
    if (!(await isAdmin(ctx)) || !ctx.message.reply_to_message) return;
    const target = ctx.message.reply_to_message.from.id;
    await ctx.banChatMember(target);
    ctx.reply(`🚫 ${getUserName(ctx.message.reply_to_message.from)} BANNED! Tata bye bye... 💀🔥`);
});

// Unban (Saza khatam)
bot.command("unban", async (ctx) => {
    if (!(await isAdmin(ctx)) || !ctx.message.reply_to_message) return;
    const target = ctx.message.reply_to_message.from.id;
    await ctx.unbanChatMember(target);
    ctx.reply(`🔓 ${getUserName(ctx.message.reply_to_message.from)} ki saza maaf! Wapis aa jao dost. ✨`);
});

// Mute (Chup karane ke liye)
bot.command("mute", async (ctx) => {
    if (!(await isAdmin(ctx)) || !ctx.message.reply_to_message) return;
    const target = ctx.message.reply_to_message.from.id;
    await ctx.restrictChatMember(target, { can_send_messages: false });
    ctx.reply(`🤐 ${getUserName(ctx.message.reply_to_message.from)} ka mu band! Ab sirf suno, bolo mat. 🤫`);
});

// Unmute (Bolne dene ke liye)
bot.command("unmute", async (ctx) => {
    if (!(await isAdmin(ctx)) || !ctx.message.reply_to_message) return;
    const target = ctx.message.reply_to_message.from.id;
    await ctx.restrictChatMember(target, { 
        can_send_messages: true, can_send_media_messages: true, 
        can_send_polls: true, can_send_other_messages: true, 
        can_add_web_page_previews: true 
    });
    ctx.reply(`🔊 ${getUserName(ctx.message.reply_to_message.from)} ki awaaz wapis aa gayi! Bolo ab. 🎤`);
});

// ======================================
// AI & XP SYSTEM
// ======================================

bot.command("ask", async (ctx) => {
    const query = ctx.message.text.split(" ").slice(1).join(" ");
    if (!query) return ctx.reply("Arre bhai, bina kuch puche kaise bataun? 😂");
    ctx.sendChatAction("typing");
    ctx.reply(await askAI(ctx.from.id, query));
});

bot.command("level", async (ctx) => {
    const snap = await get(ref(db, `groups/${ctx.chat.id}/users/${ctx.from.id}/xp`));
    ctx.reply(`👑 *User:* ${getUserName(ctx.from)}\n🔥 *XP Point:* ${snap.val() || 0}`, { parse_mode: "Markdown" });
});

// Message Handling (Tracking & XP)
bot.on("message", async (ctx, next) => {
    if (!ctx.message || !ctx.from || ctx.from.is_bot) return next();

    if (ctx.chat.type !== 'private') {
        // Group list update karna takki Owner ko button mein dikhe
        await update(ref(db, `groups/${ctx.chat.id}`), { title: ctx.chat.title });

        // XP System update
        const userRef = ref(db, `groups/${ctx.chat.id}/users/${ctx.from.id}`);
        const snap = await get(userRef);
        await update(userRef, { 
            name: ctx.from.first_name, 
            xp: (snap.val()?.xp || 0) + 1, 
            lastMessage: Date.now() 
        });
    }

    // Auto-reply examples
    const text = ctx.message.text?.toLowerCase() || "";
    if (text === "hi" || text === "hello") {
        return ctx.reply(`Oye ${ctx.from.first_name}! Kaise ho bhai? ✨`);
    }

    return next();
});

// Welcome New Members
bot.on("new_chat_members", async (ctx) => {
    if (ctx.message.new_chat_members.find(u => u.id === ctx.botInfo.id)) {
        await update(ref(db, `groups/${ctx.chat.id}`), { title: ctx.chat.title });
        ctx.reply("🔥 Supreme Bot aa gaya hai! Ab yahan asali maza aayega. 😎👑");
    } else {
        const name = getUserName(ctx.message.new_chat_members[0]);
        ctx.reply(`🎉 Swagat hai ${name}! Group mein maza karo aur rules mat todna! 🔥`);
    }
});

// Goodbye
bot.on("left_chat_member", (ctx) => {
    ctx.reply(`💔 ${ctx.message.left_chat_member.first_name} chala gaya... khair, hum toh yahin hain! 👋`);
});

bot.launch().then(() => console.log("✅ Supreme Bot is READY with all features! 🔥🚀"));

// Error Handling
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);
