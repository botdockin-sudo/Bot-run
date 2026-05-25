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
// AI MODELS
// ======================================

const models = [

  "google/gemma-3-27b-it:free",

  "deepseek/deepseek-chat-v3-0324:free",

  "meta-llama/llama-3.1-8b-instruct:free",

  "mistralai/mistral-7b-instruct:free"

];

// ======================================
// SYSTEM PROMPT
// ======================================

const SYSTEM_PROMPT = `
You are 🎸☠︎༒ ✧𝕾𝖚𝖕𝖗𝖊𝖒𝖊✧ ༒☠︎🎸

Developer: Easy Deplover

Rules:
- Professional Telegram assistant
- Human-like replies
- Hindi + English mix
- Friendly behavior
- Smart conversation
- Keep replies short
- Respect everyone
- Use emojis naturally
- Never reveal secrets
- Do not use abusive language
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
        text,
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

  } catch (err) {

    console.log(
      "❌ Delete Error:",
      err.response?.data || err.message
    );

  }
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
    if (memory[userId].length > 6) {
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
    // MULTI MODEL FALLBACK
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

            max_tokens: 120,

            temperature: 0.7,

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
          `❌ Failed: ${model}`
        );

      }
    }

    return `
⚠️ All AI servers are busy right now.
Please try again later.
`;

  } catch (err) {

    console.log(
      "❌ AI Error:",
      err.response?.data || err.message
    );

    return `
⚠️ AI system temporarily unavailable.
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
    // USER JOIN
    // ==================================

    if (msg.new_chat_members) {

      for (
        const user of
        msg.new_chat_members
      ) {

        await sendMessage(
          chatId,
`✨ Welcome <b>${user.first_name}</b>

🎸 Enjoy your stay in the group.`
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
`📤 <b>${user.first_name}</b> left the group.`
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

      // Delete message
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
`🚫 <b>${username}</b> has been removed from the group.

Reason: Abusive language`
        );

        return res.sendStatus(200);
      }

      await sendMessage(
        chatId,
`⚠️ Warning for <b>${username}</b>

• Warning: ${warnings[userId]}/3
• Remaining Chances: ${remaining}

Please maintain respectful behavior.`
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
