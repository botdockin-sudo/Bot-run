require("dotenv").config();

const express = require("express");
const { Telegraf } = require("telegraf");
const axios = require("axios");

// ======================================
// EXPRESS
// ======================================

const app = express();

// ======================================
// FIREBASE
// ======================================

const { initializeApp } =
require("firebase/app");

const {
  getDatabase,
  ref,
  set,
  update,
  get
} = require("firebase/database");

const firebaseConfig = {

  apiKey:
  "AIzaSyBsAMJfL825py-6HOgX6scHZFp2Mch47R8",

  authDomain:
  "bot-dock.firebaseapp.com",

  databaseURL:
  "https://bot-dock-default-rtdb.firebaseio.com",

  projectId:
  "bot-dock",

  storageBucket:
  "bot-dock.firebasestorage.app",

  messagingSenderId:
  "757972411636",

  appId:
  "1:757972411636:web:61328d1730c2521e316aa1"

};

const firebaseApp =
initializeApp(firebaseConfig);

const db =
getDatabase(firebaseApp);

// ======================================
// BOT
// ======================================

const bot =
new Telegraf(
  process.env.BOT_TOKEN
);

const OPENROUTER_API_KEY =
process.env.OPENROUTER_API_KEY;

// ======================================
// MEMORY
// ======================================

const memory = {};
const cooldown = {};
const sentToday = {};

let bossHP = 100;

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
// REPLY SYSTEM
// ======================================

async function replyMsg(
ctx,
text
) {

  return ctx.reply(

    text,

    {
      reply_to_message_id:
      ctx.message.message_id
    }

  );

}

// ======================================
// COMMAND MENU
// ======================================

bot.telegram.setMyCommands([

{
  command: "search",
  description: "AI search"
},

{
  command: "mood",
  description: "Group mood"
},

{
  command: "level",
  description: "XP level"
},

{
  command: "funny",
  description: "Funny reply"
},

{
  command: "call",
  description: "Call users"
},

{
  command: "inactive",
  description: "Inactive users"
},

{
  command: "allactive",
  description: "Tag inactive users"
},

{
  command: "scan",
  description: "User scan"
},

{
  command: "history",
  description: "Group history"
},

{
  command: "match",
  description: "User match"
},

{
  command: "event",
  description: "Boss event"
},

{
  command: "hit",
  description: "Attack boss"
},

{
  command: "warn",
  description: "Warn user"
},

{
  command: "kick",
  description: "Kick user"
},

{
  command: "ban",
  description: "Ban user"
},

{
  command: "mute",
  description: "Mute user"
}

]);

// ======================================
// SAVE GROUP
// ======================================

async function saveGroup(ctx) {

  const chatId =
  ctx.chat.id;

  await update(

    ref(
      db,
      `groups/${chatId}/info`
    ),

    {

      id: chatId,

      title:
      ctx.chat.title ||
      "Unknown Group",

      createdAt:
      Date.now()

    }

  );

}

// ======================================
// SAVE USER
// ======================================

async function saveUser(ctx) {

  const chatId =
  ctx.chat.id;

  const userId =
  ctx.from.id;

  const userRef =
  ref(
    db,
    `groups/${chatId}/users/${userId}`
  );

  const snap =
  await get(userRef);

  const oldData =
  snap.val() || {};

  await update(

    userRef,

    {

      id: userId,

      username:
      ctx.from.username ||
      "",

      name:
      ctx.from.first_name ||
      "User",

      lastMessage:
      Date.now(),

      xp:
      oldData.xp || 0

    }

  );

}

// ======================================
// XP
// ======================================

async function addXP(
chatId,
userId
) {

  const xpRef =
  ref(
    db,
    `groups/${chatId}/users/${userId}/xp`
  );

  const snap =
  await get(xpRef);

  const oldXP =
  snap.val() || 0;

  await set(
    xpRef,
    oldXP + 2
  );

}

// ======================================
// WARN
// ======================================

async function addWarning(
chatId,
userId
) {

  const warnRef =
  ref(
    db,
    `groups/${chatId}/warnings/${userId}`
  );

  const snap =
  await get(warnRef);

  let warnings = 0;

  if (snap.exists()) {

    warnings =
    snap.val().warnings || 0;

  }

  warnings++;

  await set(

    warnRef,

    {
      warnings
    }

  );

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
    admin.user.id ===
    ctx.from.id

  );

}

// ======================================
// BAD WORD CHECK
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
    "gandu",
    "bhosdike",
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

  return false;

}

// ======================================
// AI
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

      return "⏳ Slow bro 😆";

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

    for (let i = 0; i < 5; i++) {

      for (const model of models) {

        try {

          const response =
          await axios.post(

            "https://openrouter.ai/api/v1/chat/completions",

            {

              model,

              messages:
              memory[userId],

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

          return response.data
          .choices[0]
          .message.content;

        } catch (err) {}

      }

    }

    return "❌ AI not responding 😔";

  } catch (err) {

    return "⚡ AI error";

  }

}

// ======================================
// JOIN
// ======================================

bot.on(
"new_chat_members",

async (ctx) => {

  await saveGroup(ctx);

  for (
    const user of
    ctx.message.new_chat_members
  ) {

    await set(

      ref(
        db,
        `groups/${ctx.chat.id}/history/${Date.now()}`
      ),

      {
        text:
        `👤 ${user.first_name} joined`
      }

    );

    replyMsg(
      ctx,
`
🎉 Welcome ${user.first_name}

🔥 Enjoy your stay 😎
`
    );

  }

});

// ======================================
// LEFT
// ======================================

bot.on(
"left_chat_member",

async (ctx) => {

  await set(

    ref(
      db,
      `groups/${ctx.chat.id}/history/${Date.now()}`
    ),

    {
      text:
      `💔 ${ctx.message.left_chat_member.first_name} left`
    }

  );

  replyMsg(
    ctx,
`
💔 ${ctx.message.left_chat_member.first_name}
left the group 😔
`
  );

});

// ======================================
// SAVE USER AUTO
// ======================================

bot.on(
"message",

async (ctx, next) => {

  if (!ctx.from)
  return next();

  await saveGroup(ctx);

  await saveUser(ctx);

  if (
    !ctx.message.text?.startsWith("/")
  ) {

    await addXP(
      ctx.chat.id,
      ctx.from.id
    );

  }

  next();

});

// ======================================
// AUTO WARN
// ======================================

bot.on(
"text",

async (ctx, next) => {

  const text =
  ctx.message.text;

  if (
    text.startsWith("/")
  ) {
    return next();
  }

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

    await ctx.telegram.banChatMember(
      ctx.chat.id,
      ctx.from.id
    );

    return replyMsg(
      ctx,
      `🚫 @${ctx.from.username} removed`
    );

  }

  replyMsg(
    ctx,
    `⚠️ Warning ${warnings}/3`
  );

});

// ======================================
// SEARCH
// ======================================

bot.command(
"search",

async (ctx) => {

  const query =
  ctx.message.text
  .replace(/\/search(@\w+)?/,"")
  .trim();

  if (!query) {

    return replyMsg(
      ctx,
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

  replyMsg(ctx, reply);

});

// ======================================
// MOOD
// ======================================

bot.command(
"mood",

(ctx) => {

  const hour =
  new Date().getHours();

  let mood = "";

  if (hour < 6) {

    mood =
    "😴 Sleep mode";

  } else if (hour < 12) {

    mood =
    "☀️ Morning vibes";

  } else if (hour < 18) {

    mood =
    "🔥 Full active";

  } else {

    mood =
    "🌙 Night chill";

  }

  replyMsg(
    ctx,
`
🎭 Group Mood

${mood}
`
  );

});

// ======================================
// LEVEL
// ======================================

bot.command(
"level",

async (ctx) => {

  const snap =
  await get(

    ref(
      db,
      `groups/${ctx.chat.id}/users/${ctx.from.id}/xp`
    )

  );

  const xp =
  snap.val() || 0;

  replyMsg(
    ctx,
`
👑 ${ctx.from.first_name}

XP:
${xp}
`
  );

});

// ======================================
// FUNNY
// ======================================

bot.command(
"funny",

(ctx) => {

  const lines = [

    "😂 WiFi bhi tumse fast hai",

    "💀 NPC detected",

    "🔥 Meme machine",

    "😭 System hang ho gaya"

  ];

  const random =
  lines[
    Math.floor(
      Math.random() *
      lines.length
    )
  ];

  replyMsg(
    ctx,
    random
  );

});

// ======================================
// CALL
// ======================================

bot.command(
"call",

(ctx) => {

  const lines = [

    "📢 Oye sab kaha mar gaye 😂",

    "🔥 Group dead kyu hai 😭",

    "😎 Aao bakchodi karte hai",

    "👀 Admin checking activity"

  ];

  const random =
  lines[
    Math.floor(
      Math.random() *
      lines.length
    )
  ];

  replyMsg(
    ctx,
    random
  );

});

// ======================================
// INACTIVE
// ======================================

bot.command(
"inactive",

async (ctx) => {

  const snap =
  await get(
    ref(
      db,
      `groups/${ctx.chat.id}/users`
    )
  );

  const users =
  snap.val() || {};

  const ONE_HOUR =
  60 * 60 * 1000;

  let text =
  "😴 Inactive Users\n\n";

  let found = false;

  for (const id in users) {

    const user =
    users[id];

    if (

      Date.now() -
      user.lastMessage >

      ONE_HOUR

    ) {

      found = true;

      text +=
      `${
        user.username
        ? `@${user.username}`
        : user.name
      }\n`;

    }

  }

  if (!found) {

    return replyMsg(
      ctx,
      "🔥 Sab active hai 😎"
    );

  }

  text +=
  "\n📢 Jaldi active ho jao 😂";

  replyMsg(ctx, text);

});

// ======================================
// MATCH
// ======================================

bot.command(
"match",

async (ctx) => {

  const args =
  ctx.message.text.split(" ");

  if (
    args.length < 3
  ) {

    return replyMsg(
      ctx,
`
💘 Match System

Use:
/match @user1 @user2
`
    );

  }

  const user1 =
  args[1];

  const user2 =
  args[2];

  const percent =
  Math.floor(
    Math.random() * 41
  ) + 60;

  replyMsg(
    ctx,
`
💘 Match Result

${user1}
❤️
${user2}

📊 Compatibility:
${percent}%
`
  );

});

// ======================================
// GOOD MORNING / NIGHT
// ======================================

setInterval(async () => {

  try {

    const indiaTime =
    new Date().toLocaleString(
      "en-US",
      {
        timeZone:
        "Asia/Kolkata"
      }
    );

    const now =
    new Date(indiaTime);

    const hour =
    now.getHours();

    const minute =
    now.getMinutes();

    const today =
    now.toDateString();

    const snap =
    await get(
      ref(db, "groups")
    );

    const groups =
    snap.val() || {};

    // GOOD MORNING

    if (
      hour === 6 &&
      minute <= 5
    ) {

      for (const id in groups) {

        const key =
        `${id}-gm-${today}`;

        if (
          sentToday[key]
        ) continue;

        sentToday[key] =
        true;

        await bot.telegram.sendMessage(
          id,
          "🌅 Good Morning legends 😎"
        );

      }

    }

    // GOOD NIGHT

    if (
      hour === 17 &&
      minute <= 5
    ) {

      for (const id in groups) {

        const key =
        `${id}-gn-${today}`;

        if (
          sentToday[key]
        ) continue;

        sentToday[key] =
        true;

        await bot.telegram.sendMessage(
          id,
          "🌃 Good Night dosto 😴"
        );

      }

    }

  } catch (err) {

    console.log(err);

  }

}, 30000);

// ======================================
// EXPRESS
// ======================================

app.get("/", (req, res) => {

  res.send(
    "🤖 Supreme Bot Running"
  );

});

const PORT =
process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(
    `🌐 Server running on ${PORT}`
  );

});

// ======================================
// START BOT
// ======================================

bot.launch();

console.log(
  "🤖 Bot Running..."
);

// ======================================
// CRASH FIX
// ======================================

process.on(
"unhandledRejection",
console.error
);

process.on(
"uncaughtException",
console.error
);
