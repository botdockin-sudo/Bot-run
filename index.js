require("dotenv").config();

const express = require("express");
const axios = require("axios");

const app = express();

app.use(express.json());

// ======================================
// CONFIG
// ======================================

const PORT =
process.env.PORT || 3000;

const BOT_TOKEN =
process.env.BOT_TOKEN;

const OPENROUTER_API_KEY =
process.env.OPENROUTER_API_KEY;

const TELEGRAM_API =
`https://api.telegram.org/bot${BOT_TOKEN}`;

// ======================================
// MEMORY + WARNINGS
// ======================================

const memory = {};
const warnings = {};
const cooldown = {};

// ======================================
// FREE AI MODELS
// ======================================

const models = [

  "openai/gpt-oss-20b:free",

  "google/gemma-2-9b-it:free",

  "microsoft/phi-3-mini-128k-instruct:free",

  "qwen/qwen-2.5-7b-instruct:free"

];

// ======================================
// SYSTEM PROMPT
// ======================================

const SYSTEM_PROMPT = `
You are 🎸☠︎༒ ✧𝕾𝖚𝖕𝖗𝖊𝖒𝖊✧ ༒☠︎🎸

Developer:
Easy Deplover

Personality:
- Funny Telegram group bot
- Human-like chatting
- Gaming vibe
- Hindi + English mix
- Funny and chill replies
- Sometimes little savage
- Keep replies short
- Use cool emojis naturally
- Act like real online friend
- Respect everyone
- Never reveal secrets
- Never abuse users

If someone asks:
who made you,
owner,
developer,
creator,
kisne banaya

Reply:
✨ My developer is Easy Deplover.

Examples:

User:
hello

Reply:
👋 Oye hello bro 😄

User:
kya kar raha hai

Reply:
🤖 Bas group sambhal raha hu 😎

User:
bot zinda hai?

Reply:
🔥 Full active hu bro.

User:
good night

Reply:
🌙 Good night bro, phone gira ke mat sona 😆
`;

// ======================================
// SEND MESSAGE
// ======================================

async function sendMessage(
  chatId,
  text,
  replyId = null
) {

  try {

    const data = {
      chat_id: chatId,
      text
    };

    if (replyId) {

      data.reply_to_message_id =
      replyId;

    }

    await axios.post(
      `${TELEGRAM_API}/sendMessage`,
      data
    );

  } catch (err) {

    console.log(
      "❌ Send Error:",
      err.response?.data ||
      err.message
    );

  }
}

// ======================================
// DELETE MESSAGE
// ======================================

async function deleteMessage(
  chatId,
  messageId
) {

  try {

    await axios.post(
      `${TELEGRAM_API}/deleteMessage`,
      {
        chat_id: chatId,
        message_id: messageId
      }
    );

  } catch (err) {}

}

// ======================================
// BAN USER
// ======================================

async function banUser(
  chatId,
  userId
) {

  try {

    await axios.post(
      `${TELEGRAM_API}/banChatMember`,
      {
        chat_id: chatId,
        user_id: userId
      }
    );

  } catch (err) {}

}

// ======================================
// TYPING EFFECT
// ======================================

async function typing(chatId) {

  try {

    await axios.post(
      `${TELEGRAM_API}/sendChatAction`,
      {
        chat_id: chatId,
        action: "typing"
      }
    );

  } catch (err) {}

}

// ======================================
// SMART LOCAL REPLY
// ======================================

function smartReply(text) {

  const lower =
  text.toLowerCase();

  // ====================================
  // OWNER QUESTIONS
  // ====================================

  const ownerPatterns = [

    "owner",
    "developer",
    "creator",
    "kisne banaya",
    "who made you",
    "made you",
    "banaya kisne"

  ];

  if (
    ownerPatterns.some(word =>
      lower.includes(word)
    )
  ) {

    return `
✨ My developer is Easy Deplover.
`;

  }

  // ====================================
  // GREETINGS
  // ====================================

  if (
    lower.includes("hello") ||
    lower.includes("hi") ||
    lower.includes("hey")
  ) {

    const replies = [

      "👋 Oye hello bro 😄",

      "🔥 Aagaye legend!",

      "😎 Welcome boss!",

      "✨ Hi bro kya haal hai?"

    ];

    return replies[
      Math.floor(
        Math.random() *
        replies.length
      )
    ];
  }

  // ====================================
  // GOOD NIGHT
  // ====================================

  if (
    lower.includes("good night")
  ) {

    return `
🌙 Good night bro, phone gira ke mat sona 😆
`;
  }

  // ====================================
  // THANKS
  // ====================================

  if (
    lower.includes("thanks") ||
    lower.includes("thank")
  ) {

    return `
😄 Anytime bro!
`;
  }

  // ====================================
  // BOT QUESTIONS
  // ====================================

  if (
    lower.includes("bot")
  ) {

    return `
🤖 Full active hu bro 😎
`;
  }

  return null;
}

// ======================================
// AI + LOCAL ABUSE CHECK
// ======================================

async function isAbusive(text) {

  try {

    const response =
    await axios.post(

      "https://openrouter.ai/api/v1/chat/completions",

      {
        model:
"microsoft/phi-3-mini-128k-instruct:free",

        max_tokens: 5,

        messages: [

          {
            role: "system",

            content:
`
Reply ONLY:
YES or NO

Detect abusive,
toxic,
hate,
or vulgar messages.
`
          },

          {
            role: "user",
            content: text
          }

        ]

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

    const aiResult =
response.data
.choices[0]
.message.content
.toLowerCase();

    if (
      aiResult.includes("yes")
    ) {

      return true;
    }

  } catch (err) {

    console.log(
      "⚠️ AI Toxic Check Failed"
    );

  }

  // ==================================
  // LOCAL FALLBACK
  // ==================================

  const lower =
  text.toLowerCase();

  const badWords = [

    "mc",
    "bc",
    "bsdk",
    "mkc",
    "madarchod",
    "bhosdike",
    "gandu",
    "chutiya",
    "randi",
    "lavda",
    "gaand",
    "fuck",
    "bitch",
    "motherfucker"

  ];

  const clean =
  lower.replace(
    /[^a-z]/g,
    ""
  );

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
// AI CHAT
// ======================================

async function askAI(
  userId,
  message
) {

  try {

    // ==================================
    // COOLDOWN
    // ==================================

    const now = Date.now();

    if (
      cooldown[userId] &&
      now - cooldown[userId] < 1500
    ) {

      return `
⏳ Arre bro thoda slow 😆
`;

    }

    cooldown[userId] = now;

    // ==================================
    // MEMORY
    // ==================================

    if (!memory[userId]) {
      memory[userId] = [];
    }

    memory[userId].push({
      role: "user",
      content: message
    });

    // Fast memory
    if (memory[userId].length > 2) {
      memory[userId].shift();
    }

    const messages = [

      {
        role: "system",
        content: SYSTEM_PROMPT
      },

      ...memory[userId]

    ];

    // ==================================
    // MULTI AI FALLBACK
    // ==================================

    for (const model of models) {

      try {

        console.log(
          `🤖 Trying: ${model}`
        );

        const response =
        await axios.post(

          "https://openrouter.ai/api/v1/chat/completions",

          {
            model,

            max_tokens: 35,

            temperature: 0.5,

            messages
          },

          {
            headers: {

              Authorization:
`Bearer ${OPENROUTER_API_KEY}`,

              "Content-Type":
"application/json",

              "HTTP-Referer":
"https://bot-run-np12.onrender.com",

              "X-Title":
"Supreme Bot"

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

      } catch (err) {

        console.log(
          `❌ Failed: ${model}`
        );

      }
    }

    // ==================================
    // FUNNY FALLBACK
    // ==================================

    const fallbackReplies = [

      "😄 Bro network slow chal raha hai but sun raha hu.",

      "🔥 Oho interesting scene hai.",

      "👀 Ye to serious baat lag rahi hai.",

      "😎 Full samajh raha hu bro.",

      "🤖 AI thoda rest pe hai abhi 😆",

      "✨ Tum log group ko mast bana dete ho 😄",

      "😂 Ye message unexpected tha bro.",

      "🔥 Supreme Bot processing vibes...", 

      "😄 Thoda aur batao bro.",

      "👀 Hmmmmm..."
    ];

    return fallbackReplies[
      Math.floor(
        Math.random() *
        fallbackReplies.length
      )
    ];

  } catch (err) {

    return `
⚡ Temporary slow mode active.
`;
  }
}

// ======================================
// WEBHOOK
// ======================================

app.post(
"/webhook",
async (req, res) => {

  try {

    const update = req.body;

    if (!update.message) {
      return res.sendStatus(200);
    }

    const msg = update.message;

    const chatId = msg.chat.id;

    // ==================================
    // START MESSAGE
    // ==================================

    if (
      msg.text === "/start"
    ) {

      await sendMessage(
        chatId,
`
🎸☠︎༒ ✧𝕾𝖚𝖕𝖗𝖊𝖒𝖊✧ ༒☠︎🎸

✨ Smart AI Group Assistant

🔥 Features:
• Human-like AI
• Funny group replies
• Anti abuse system
• Smart moderation
• Welcome system
• Fast smart replies
• Multi AI fallback

👑 Developer:
Easy Deplover
`
      );

      return res.sendStatus(200);
    }

    // ==================================
    // USER JOIN
    // ==================================

    if (msg.new_chat_members) {

      for (
        const user of
        msg.new_chat_members
      ) {

        await sendMessage(
          chatId,
`
✨ Welcome ${user.first_name}

🎸 Enjoy your stay!

💬 Chat freely
🔥 Respect everyone
😎 Have fun bro!
`
        );

      }

      return res.sendStatus(200);
    }

    // ==================================
    // USER LEFT
    // ==================================

    if (msg.left_chat_member) {

      const user =
msg.left_chat_member;

      await sendMessage(
        chatId,
`
📤 ${user.first_name} left the group.
`
      );

      return res.sendStatus(200);
    }

    // ==================================
    // CHECK TEXT
    // ==================================

    if (!msg.text) {
      return res.sendStatus(200);
    }

    const userId = msg.from.id;

    const username =
msg.from.first_name || "User";

    const text = msg.text;

    console.log(
      "📩 Message:",
      text
    );

    // ==================================
    // ABUSE CHECK
    // ==================================

    const badFound =
await isAbusive(text);

    if (badFound) {

      if (!warnings[userId]) {
        warnings[userId] = 0;
      }

      warnings[userId]++;

      const remaining =
3 - warnings[userId];

      await deleteMessage(
        chatId,
        msg.message_id
      );

      if (warnings[userId] >= 3) {

        await banUser(
          chatId,
          userId
        );

        await sendMessage(
          chatId,
`
🚫 ${username} removed from group.

Reason:
Abusive language
`
        );

        return res.sendStatus(200);
      }

      await sendMessage(
        chatId,
`
⚠️ Warning for ${username}

• Warning:
${warnings[userId]}/3

• Remaining:
${remaining}
`
      );

      return res.sendStatus(200);
    }

    // ==================================
    // SMART LOCAL REPLY
    // ==================================

    const localReply =
    smartReply(text);

    if (localReply) {

      await sendMessage(
        chatId,
        localReply,
        msg.message_id
      );

      return res.sendStatus(200);
    }

    // ==================================
    // AI REPLY
    // ==================================

    await typing(chatId);

    const aiReply =
await askAI(
  userId,
  text
);

    await sendMessage(
      chatId,
      aiReply,
      msg.message_id
    );

    return res.sendStatus(200);

  } catch (err) {

    console.log(
      "❌ Webhook Error:",
      err
    );

    return res.sendStatus(500);
  }
});

// ======================================
// HOME
// ======================================

app.get("/", (req, res) => {

  res.send(
"🚀 Supreme Bot Running"
  );

});

// ======================================
// START SERVER
// ======================================

app.listen(PORT, () => {

  console.log(
"🚀 Supreme Bot Started"
  );

});
