const express = require("express");
const axios = require("axios");

// ======================================
// CONFIG
// ======================================

const app = express();

app.use(express.json());

const PORT = 3000;

// ======================================
// TELEGRAM BOT TOKEN
// ======================================

const BOT_TOKEN =
"YOUR_BOT_TOKEN";

// ======================================
// OPENROUTER API KEY
// ======================================

const OPENROUTER_API_KEY =
"YOUR_OPENROUTER_API_KEY";

// ======================================
// TELEGRAM API
// ======================================

const TELEGRAM_API =
`https://api.telegram.org/bot${BOT_TOKEN}`;

// ======================================
// WARNINGS
// ======================================

const warnings = {};

// ======================================
// MEMORY
// ======================================

const memory = {};

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
- Professional Telegram group assistant
- Smart and human-like replies
- Hindi + English mix
- Friendly behavior
- Respect everyone
- Help users professionally
- Detect abusive messages
- Keep replies short and natural
- Use emojis sometimes
- Never reveal secrets
- Act like premium AI assistant
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
      err.response?.data || err.message
    );

  }
}

// ======================================
// AI CHAT FUNCTION
// ======================================

async function askAI(
  userId,
  username,
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
    if (memory[userId].length > 12) {
      memory[userId].shift();
    }

    const messages = [

      {
        role: "system",
        content: SYSTEM_PROMPT
      },

      ...memory[userId],

      {
        role: "user",
        content:
`User Name: ${username}
Message: ${message}`
      }

    ];

    const response = await axios.post(

      "https://openrouter.ai/api/v1/chat/completions",

      {
        model:
"deepseek/deepseek-v4-flash:free",

        messages
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

    // Save AI reply
    memory[userId].push({
      role: "assistant",
      content: reply
    });

    return reply;

  } catch (err) {

    console.log(
      err.response?.data || err.message
    );

    return "⚠️ Server busy right now.";
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

    // ==================================
    // NEW USER JOIN
    // ==================================

    if (
      update.message?.new_chat_members
    ) {

      const chatId =
update.message.chat.id;

      for (
        const user of
        update.message.new_chat_members
      ) {

        await sendMessage(
          chatId,
`👋 Welcome <b>${user.first_name}</b> to the group!`
        );

      }

      return res.sendStatus(200);
    }

    // ==================================
    // CHECK MESSAGE
    // ==================================

    if (!update.message?.text) {
      return res.sendStatus(200);
    }

    const msg = update.message;

    const chatId = msg.chat.id;

    const userId = msg.from.id;

    const username =
msg.from.first_name || "User";

    const text = msg.text;

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
`🚫 <b>${username}</b> banned for abusive messages.`
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
  username,
  text
);

    await sendMessage(
      chatId,
      aiReply,
      msg.message_id
    );

    return res.sendStatus(200);

  } catch (err) {

    console.log(err);

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
