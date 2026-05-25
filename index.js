require("dotenv").config();

const express = require("express");
const axios = require("axios");

// ======================================
// CONFIG
// ======================================

const app = express();

app.use(express.json());

const PORT =
process.env.PORT || 3000;

// ======================================
// TOKENS
// ======================================

const BOT_TOKEN =
process.env.BOT_TOKEN;

const OPENROUTER_API_KEY =
process.env.OPENROUTER_API_KEY;

// ======================================
// TELEGRAM API
// ======================================

const TELEGRAM_API =
`https://api.telegram.org/bot${BOT_TOKEN}`;

// ======================================
// MEMORY + WARNINGS
// ======================================

const memory = {};
const warnings = {};

// ======================================
// BAD WORDS
// ======================================

const badWords = [
  "mc",
  "bc",
  "madarchod",
  "bhosdike",
  "gandu",
  "chutiya"
];

// ======================================
// SYSTEM PROMPT
// ======================================

const SYSTEM_PROMPT = `
You are 🎸☠︎༒ ✧𝕾𝖚𝖕𝖗𝖊𝖒𝖊✧ ༒☠︎🎸

Developer: Easy Deplover

Behavior:
- Professional Telegram assistant
- Human-like replies
- Hindi + English mix
- Friendly behavior
- Respect everyone
- Keep replies short
- Use emojis sometimes
- Never reveal secrets
- Smart conversation
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

    await axios.post(
      `${TELEGRAM_API}/sendMessage`,
      {
        chat_id: chatId,
        text: text,
        parse_mode: "HTML",
        reply_to_message_id: replyId
      }
    );

  } catch (err) {

    console.log(
      "❌ Send Error:",
      err.response?.data || err.message
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

  } catch (err) {

    console.log(
      "❌ Ban Error:",
      err.response?.data || err.message
    );

  }
}

// ======================================
// AI CHAT
// ======================================

async function askAI(
  userId,
  message
) {

  try {

    if (!memory[userId]) {
      memory[userId] = [];
    }

    // Save user message
    memory[userId].push({
      role: "user",
      content: message
    });

    // Limit memory
    if (memory[userId].length > 10) {
      memory[userId].shift();
    }

    const messages = [

      {
        role: "system",
        content: SYSTEM_PROMPT
      },

      ...memory[userId]

    ];

    const response = await axios.post(

      "https://openrouter.ai/api/v1/chat/completions",

      {
        model:
"deepseek/deepseek-chat-v3-0324:free",

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

    // Save AI reply
    memory[userId].push({
      role: "assistant",
      content: reply
    });

    return reply;

  } catch (err) {

    console.log(
      "❌ AI Error:",
      err.response?.data || err.message
    );

    return "⚠️ AI server busy.";
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
    // NEW USER JOIN
    // ==================================

    if (msg.new_chat_members) {

      for (
        const user of
        msg.new_chat_members
      ) {

        await sendMessage(
          chatId,
`👋 Welcome <b>${user.first_name}</b> to the group 🔥`
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
`😢 <b>${user.first_name}</b> left the group.`
      );

      return res.sendStatus(200);
    }

    // ==================================
    // TEXT CHECK
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

    // Ignore commands
    if (text.startsWith("/")) {
      return res.sendStatus(200);
    }

    // ==================================
    // BAD WORD CHECK
    // ==================================

    const lower =
text.toLowerCase();

    const badFound =
badWords.some(word =>
lower.includes(word)
    );

    if (badFound) {

      if (!warnings[userId]) {
        warnings[userId] = 0;
      }

      warnings[userId]++;

      const remaining =
3 - warnings[userId];

      // Delete bad message
      await deleteMessage(
        chatId,
        msg.message_id
      );

      // Ban after 3 warnings
      if (warnings[userId] >= 3) {

        await banUser(
          chatId,
          userId
        );

        await sendMessage(
          chatId,
`🚫 <b>${username}</b> banned for abusive language.`
        );

        return res.sendStatus(200);
      }

      await sendMessage(
        chatId,
`⚠️ <b>${username}</b>

Warning:
${warnings[userId]}/3

Remaining:
${remaining}`
      );

      return res.sendStatus(200);
    }

    // ==================================
    // AI REPLY
    // ==================================

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
"🚀 🎸☠︎༒ ✧𝕾𝖚𝖕𝖗𝖊𝖒𝖊✧ ༒☠︎🎸 Running"
  );

});

// ======================================
// START SERVER
// ======================================

app.listen(PORT, () => {

  console.log(
"🚀 🎸☠︎༒ ✧𝕾𝖚𝖕𝖗𝖊𝖒𝖊✧ ༒☠︎🎸 Started"
  );

});
