require("dotenv").config();

const { Telegraf } = require("telegraf");
const axios = require("axios");
const admin = require("firebase-admin");

// ======================================
// FIREBASE
// ======================================

const serviceAccount =
require("./firebase.json");

admin.initializeApp({

  credential:
  admin.credential.cert(serviceAccount),

  databaseURL:
  "https://bot-dock-default-rtdb.firebaseio.com"

});

const db =
admin.database();

// ======================================
// BOT
// ======================================

const bot =
new Telegraf(process.env.BOT_TOKEN);

// ======================================
// CONFIG
// ======================================

const OPENROUTER_API_KEY =
process.env.OPENROUTER_API_KEY;

const BOT_USERNAME =
process.env.BOT_USERNAME;

// ======================================
// MEMORY
// ======================================

const memory = {};
const cooldown = {};

// ======================================
// MODELS
// ======================================

const models = [

"openai/gpt-oss-20b:free",

"google/gemma-2-9b-it:free",

"microsoft/phi-3-mini-128k-instruct:free",

"qwen/qwen-2.5-7b-instruct:free"

];

// ======================================
// COMMAND MENU
// ======================================

bot.telegram.setMyCommands([

{ command: "search", description: "AI search" },

{ command: "inactive", description: "Inactive users" },

{ command: "call", description: "Call inactive users" },

{ command: "mood", description: "Group mood" },

{ command: "scan", description: "Scan user" },

{ command: "history", description: "Group history" },

{ command: "match", description: "User match" },

{ command: "event", description: "Group event" },

{ command: "level", description: "User level" },

{ command: "funny", description: "Funny reply" },

{ command: "ban", description: "Ban member" },

{ command: "kick", description: "Kick member" },

{ command: "mute", description: "Mute member" },

{ command: "warn", description: "Warn member" },

{ command: "allactive", description: "Tag inactive users" }

]);

// ======================================
// SYSTEM PROMPT
// ======================================

const SYSTEM_PROMPT = `
You are Supreme Telegram Bot.

Developer:
Easy Deplover

Rules:
- Funny Telegram bot
- Hindi + English mix
- Human style chatting
- Short replies
- Friendly replies
- Never abusive
- Cool emojis

If user asks:
developer
owner
creator
who made you

Reply:
✨ My developer is Easy Deplover.
`;

// ======================================
// SAVE GROUP
// ======================================

async function saveGroup(ctx) {

  const chatId =
  ctx.chat.id;

  await db.ref(
    `groups/${chatId}/info`
  ).set({

    id: chatId,

    title:
    ctx.chat.title ||

    "Unknown Group",

    createdAt:
    Date.now()

  });

}

// ======================================
// SAVE USER
// ======================================

async function saveUser(ctx) {

  const chatId =
  ctx.chat.id;

  const userId =
  ctx.from.id;

  await db.ref(
    `groups/${chatId}/users/${userId}`
  ).update({

    id: userId,

    username:
    ctx.from.username ||

    "no_username",

    name:
    ctx.from.first_name ||

    "User",

    lastMessage:
    Date.now()

  });

}

// ======================================
// XP
// ======================================

async function addXP(
chatId,
userId
) {

  const ref =
  db.ref(
    `groups/${chatId}/users/${userId}/xp`
  );

  const snap =
  await ref.once("value");

  const oldXP =
  snap.val() || 0;

  await ref.set(
    oldXP + 2
  );

}

// ======================================
// WARNING
// ======================================

async function addWarning(
chatId,
userId
) {

  const ref =
  db.ref(
    `groups/${chatId}/warnings/${userId}`
  );

  const snap =
  await ref.once("value");

  let warnings = 0;

  if (snap.exists()) {

    warnings =
    snap.val().warnings || 0;

  }

  warnings++;

  await ref.set({

    warnings

  });

  return warnings;

}

// ======================================
// ADMIN CHECK
// ======================================

async function isAdmin(ctx) {

  const admins =
  await ctx.getChatAdministrators();

  return admins.some(
    admin =>
    admin.user.id === ctx.from.id
  );

}

// ======================================
// ABUSE CHECK
// ======================================

async function isAbusive(text) {

  const lower =
  text.toLowerCase();

  const clean =
  lower.replace(
    /[^a-z]/g,
    ""
  );

  const badWords = [

    "madarchod",
    "mc",
    "bc",
    "mkc",
    "bhosdike",
    "gandu",
    "gaand",
    "randi",
    "fuck",
    "bitch"

  ];

  for (const word of badWords) {

    if (
      clean.includes(word)
    ) {

      return true;

    }

  }

  // ======================================
  // AI ABUSE CHECK
  // ======================================

  try {

    const response =
    await axios.post(

      "https://openrouter.ai/api/v1/chat/completions",

      {

        model:
        "google/gemma-2-9b-it:free",

        messages: [

          {

            role: "system",

            content:
            "Reply only YES or NO. Is this abusive?"

          },

          {

            role: "user",

            content: text

          }

        ],

        max_tokens: 5

      },

      {

        headers: {

          Authorization:
          `Bearer ${OPENROUTER_API_KEY}`,

          "Content-Type":
          "application/json"

        }

      }

    );

    const reply =
    response.data
    .choices[0]
    .message.content
    .toLowerCase();

    if (
      reply.includes("yes")
    ) {

      return true;

    }

  } catch (err) {}

  return false;

}

// ======================================
// AI CHAT
// ======================================

async function askAI(
userId,
message
) {

  try {

    const now =
    Date.now();

    if (
      cooldown[userId] &&

      now -
      cooldown[userId] < 1500
    ) {

      return `
⏳ Slow bro 😆
`;

    }

    cooldown[userId] =
    now;

    if (!memory[userId]) {

      memory[userId] = [];

    }

    memory[userId].push({

      role: "user",

      content: message

    });

    if (
      memory[userId].length > 6
    ) {

      memory[userId].shift();

    }

    const messages = [

      {

        role: "system",

        content:
        SYSTEM_PROMPT

      },

      ...memory[userId]

    ];

    // ======================================
    // 5 TIMES RETRY
    // ======================================

    for (let i = 0; i < 5; i++) {

      for (const model of models) {

        try {

          const response =
          await axios.post(

            "https://openrouter.ai/api/v1/chat/completions",

            {

              model,

              messages,

              max_tokens: 80,

              temperature: 0.8

            },

            {

              headers: {

                Authorization:
                `Bearer ${OPENROUTER_API_KEY}`,

                "Content-Type":
                "application/json"

              }

            }

          );

          const reply =
          response.data
          .choices[0]
          .message.content;

          memory[userId].push({

            role: "assistant",

            content: reply

          });

          return reply;

        } catch (err) {}

      }

    }

    return `
❌ Sorry...
AI not responding 😔
`;

  } catch (err) {

    return `
⚡ AI slow mode
`;

  }

}

// ======================================
// WELCOME
// ======================================

bot.on(
"new_chat_members",

async (ctx) => {

  await saveGroup(ctx);

  for (
    const user of
    ctx.message.new_chat_members
  ) {

    ctx.reply(`
🎉 Welcome ${user.first_name}

🔥 Enjoy your stay
😎 Chill and fun only
😂 No spam please
`);
  }

});

// ======================================
// LEFT
// ======================================

bot.on(
"left_chat_member",

async (ctx) => {

  ctx.reply(`
💔 ${ctx.message.left_chat_member.first_name}
left the group...

Another soldier lost 😔
`);

});

// ======================================
// SAVE USER
// ======================================

bot.on(
"message",

async (ctx, next) => {

  if (!ctx.from)
  return next();

  await saveGroup(ctx);

  await saveUser(ctx);

  await addXP(
    ctx.chat.id,
    ctx.from.id
  );

  next();

});

// ======================================
// WARN SYSTEM
// ======================================

bot.on(
"text",

async (ctx, next) => {

  const text =
  ctx.message.text;

  const bad =
  await isAbusive(text);

  if (!bad)
  return next();

  const warnings =
  await addWarning(
    ctx.chat.id,
    ctx.from.id
  );

  await ctx.deleteMessage();

  if (
    warnings >= 3
  ) {

    await ctx.banChatMember(
      ctx.from.id
    );

    return ctx.reply(`
🚫 @${ctx.from.username}
removed from group

Reason:
Abusive language
`);
  }

  ctx.reply(`
⚠️ Warning:
${warnings}/3
`);

});

// ======================================
// SEARCH
// ======================================

bot.command(
"search",

async (ctx) => {

  const query =
  ctx.message.text
  .replace("/search", "")
  .trim();

  if (!query) {

    return ctx.reply(
      "❌ Write something"
    );

  }

  await ctx.sendChatAction(
    "typing"
  );

  const reply =
  await askAI(
    ctx.from.id,
    query
  );

  ctx.reply(reply);

});

// ======================================
// ALLACTIVE
// ======================================

bot.command(
"allactive",

async (ctx) => {

  if (
    !(await isAdmin(ctx))
  ) {

    return ctx.reply(
      "❌ Admin only"
    );

  }

  const snap =
  await db.ref(
    `groups/${ctx.chat.id}/users`
  ).once("value");

  const users =
  snap.val();

  const ONE_HOUR =
  60 * 60 * 1000;

  let text =
  "📢 Inactive users\n\n";

  for (const id in users) {

    const user =
    users[id];

    if (
      Date.now() -
      user.lastMessage >

      ONE_HOUR
    ) {

      text +=
      `@${user.username}\n`;

    }

  }

  text +=
  "\nBhai log aao 😂🔥";

  ctx.reply(text);

});

// ======================================
// MOOD
// ======================================

bot.command(
"mood",

(ctx) => {

  const moods = [

    "🔥 Group active hai",

    "😂 Meme energy high",

    "💀 Chaos level dangerous",

    "😴 Sab so rahe hai"

  ];

  const random =
  moods[
    Math.floor(
      Math.random() *
      moods.length
    )
  ];

  ctx.reply(random);

});

// ======================================
// CALL
// ======================================

bot.command(
"call",

(ctx) => {

  ctx.reply(`
📢 Kaha ho bhai log 😭

🔥 Aao group me
maze karte hai 😎
`);

});

// ======================================
// LEVEL
// ======================================

bot.command(
"level",

async (ctx) => {

  const snap =
  await db.ref(
    `groups/${ctx.chat.id}/users/${ctx.from.id}/xp`
  ).once("value");

  const xp =
  snap.val() || 0;

  ctx.reply(`
👑 ${ctx.from.first_name}

XP:
${xp}
`);

});

// ======================================
// FUNNY
// ======================================

bot.command(
"funny",

(ctx) => {

  const lines = [

    "😂 Tumhara WiFi bhi tumse fast bhaagta hai",

    "💀 NPC detected",

    "🔥 Certified meme material"

  ];

  const random =
  lines[
    Math.floor(
      Math.random() *
      lines.length
    )
  ];

  ctx.reply(random);

});

// ======================================
// SCAN
// ======================================

bot.command(
"scan",

(ctx) => {

  ctx.reply(`
📡 User Scan

👤 ${ctx.from.first_name}
🔥 Energy: High
😂 Meme Level: 92%
😴 Sleep: Destroyed
`);

});

// ======================================
// HISTORY
// ======================================

bot.command(
"history",

(ctx) => {

  ctx.reply(`
📜 Group History

🔥 Meme war happened
😂 Rahul got roasted
💀 Chaos detected
`);

});

// ======================================
// MATCH
// ======================================

bot.command(
"match",

(ctx) => {

  const percent =
  Math.floor(
    Math.random() * 100
  );

  ctx.reply(`
💘 Compatibility:
${percent}%
`);

});

// ======================================
// EVENT
// ======================================

bot.command(
"event",

(ctx) => {

  ctx.reply(`
👹 Boss Event Started

Use:
/hit
`);

});

// ======================================
// INACTIVE
// ======================================

bot.command(
"inactive",

(ctx) => {

  ctx.reply(`
😴 Inactive users detected

📢 Aao bhai log 😂
`);

});

// ======================================
// ADMIN COMMANDS
// ======================================

bot.command(
"ban",

async (ctx) => {

  if (
    !(await isAdmin(ctx))
  ) {

    return ctx.reply(
      "❌ Admin only"
    );

  }

  ctx.reply(
    "✅ Ban command accepted"
  );

});

bot.command(
"kick",

async (ctx) => {

  if (
    !(await isAdmin(ctx))
  ) {

    return ctx.reply(
      "❌ Admin only"
    );

  }

  ctx.reply(
    "✅ Kick command accepted"
  );

});

bot.command(
"mute",

async (ctx) => {

  if (
    !(await isAdmin(ctx))
  ) {

    return ctx.reply(
      "❌ Admin only"
    );

  }

  ctx.reply(
    "✅ Mute command accepted"
  );

});

// ======================================
// AUTO MORNING / NIGHT
// ======================================

const morningMessages = [

"🌅 Good Morning legends 😎",

"☀️ Utho bhai log 😂",

"🔥 New day new bakchodi"

];

const nightMessages = [

"🌃 Good Night dosto 😴",

"🌙 Sleep mode ON",

"💤 Kal fir maze karenge"

];

setInterval(async () => {

  const now =
  new Date();

  const hour =
  now.getHours();

  const minute =
  now.getMinutes();

  const snap =
  await db.ref(
    "groups"
  ).once("value");

  const groups =
  snap.val();

  if (!groups)
  return;

  for (const id in groups) {

    if (
      hour === 6 &&
      minute === 0
    ) {

      const msg =
      morningMessages[
        Math.floor(
          Math.random() *
          morningMessages.length
        )
      ];

      await bot.telegram
      .sendMessage(id, msg);

    }

    if (
      hour === 17 &&
      minute === 0
    ) {

      const msg =
      nightMessages[
        Math.floor(
          Math.random() *
          nightMessages.length
        )
      ];

      await bot.telegram
      .sendMessage(id, msg);

    }

  }

}, 60000);

// ======================================
// MENTION AI
// ======================================

bot.on(
"text",

async (ctx, next) => {

  const text =
  ctx.message.text;

  if (

    !text.includes(
      `@${BOT_USERNAME}`
    )

  ) {

    return next();

  }

  await ctx.sendChatAction(
    "typing"
  );

  const reply =
  await askAI(
    ctx.from.id,
    text
  );

  ctx.reply(reply);

});

// ======================================
// START
// ======================================

bot.launch();

console.log(
"🤖 Supreme Bot Running..."
);
