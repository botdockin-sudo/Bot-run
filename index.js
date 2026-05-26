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
const groupActivity = {};
const botGroups = {};
const promotionState = {};

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
- Hindi + English mix
- Funny and chill replies
- Keep replies short
- Use emojis naturally
- Act like real online friend
- Respect everyone
- Never abuse users

If someone asks:
who made you,
owner,
developer,
creator,
kisne banaya

Reply:
✨ My developer is Easy Deplover.
`;

// ======================================
// SEND MESSAGE
// ======================================

async function sendMessage(
  chatId,
  text,
  replyId = null,
  buttons = null
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

    if (buttons) {

      data.reply_markup = {
        inline_keyboard: buttons
      };

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
// AUTO INACTIVE MESSAGE
// ======================================

setInterval(async () => {

  const now = Date.now();

  for (const chatId in groupActivity) {

    const data =
    groupActivity[chatId];

    if (
      now - data.lastMessage >
      7200000
    ) {

      await sendMessage(

        chatId,

`😴 @${data.username}

Kaha gayab ho bhai 😆

Group me active aao 🔥`
      );

      data.lastMessage = now;

    }

  }

}, 600000);

// ======================================
// SMART LOCAL REPLY
// ======================================

function smartReply(text) {

  const lower =
  text.toLowerCase();

  // owner
  if (
    lower.includes("owner") ||
    lower.includes("developer") ||
    lower.includes("kisne banaya")
  ) {

    return `
✨ My developer is Easy Deplover.
`;
  }

  // hello
  if (
    lower.includes("hello") ||
    lower.includes("hi")
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

  // good night
  if (
    lower.includes("good night")
  ) {

    return `
🌙 Good night bro 😆
`;
  }

  return null;
}

// ======================================
// ABUSE CHECK
// ======================================

function isAbusive(text) {

  const clean =
  text
  .toLowerCase()
  .replace(/4/g, "a")
  .replace(/@/g, "a")
  .replace(/0/g, "o")
  .replace(/[^a-z]/g, "");

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
// AI CHAT
// ======================================

async function askAI(
  userId,
  message
) {

  try {

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

    if (!memory[userId]) {
      memory[userId] = [];
    }

    memory[userId].push({
      role: "user",
      content: message
    });

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

    // AI models
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
"application/json"

            }
          }

        );

        const reply =
response.data
.choices[0]
.message.content;

        return reply;

      } catch (err) {

        console.log(
          `❌ Failed: ${model}`
        );

      }
    }

    // fallback
    const fallbackReplies = [

      "😄 Bro network slow chal raha hai.",

      "🔥 Oho interesting scene hai.",

      "😎 Full samajh raha hu bro.",

      "🤖 AI thoda rest pe hai 😆",

      "✨ Tum log group ko mast bana dete ho 😄"

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

    // ==================================
    // CALLBACK BUTTONS
    // ==================================

    if (update.callback_query) {

      const query =
      update.callback_query;

      const data =
      query.data;

      const userId =
      query.from.id;

      const chatId =
      query.message.chat.id;

      // select source
      if (
        data.startsWith(
          "promo_source_"
        )
      ) {

        const sourceGroup =
        data.replace(
          "promo_source_",
          ""
        );

        promotionState[userId] = {
          sourceGroup
        };

        const buttons = [];

        for (const id in botGroups) {

          if (id === sourceGroup)
          continue;

          buttons.push([
            {
              text:
botGroups[id].title,

              callback_data:
`promo_target_${id}`
            }
          ]);

        }

        buttons.push([
          {
            text:
"🌍 All Groups",

            callback_data:
"promo_all"
          }
        ]);

        await sendMessage(

          chatId,

`📤 Select where to send promotion`,

          null,

          buttons

        );

      }

      // all groups
      if (
        data === "promo_all"
      ) {

        const source =
promotionState[userId]
?.sourceGroup;

        const sourceData =
botGroups[source];

        for (const id in botGroups) {

          if (id === source)
          continue;

          await sendMessage(

            id,

`🔥 Join ${sourceData.title}

😎 Active community
💬 Amazing chats
🚀 Join fast`,

            null,

            [
              [
                {
                  text:
"🚀 Join Group",

                  url:
`https://t.me/c/${String(source).replace("-100","")}`
                }
              ]
            ]

          );

        }

        await sendMessage(
          chatId,
          "✅ Promotion sent."
        );

      }

      // single group
      if (
        data.startsWith(
          "promo_target_"
        )
      ) {

        const target =
        data.replace(
          "promo_target_",
          ""
        );

        const source =
promotionState[userId]
?.sourceGroup;

        const sourceData =
botGroups[source];

        await sendMessage(

          target,

`🔥 Join ${sourceData.title}

😎 Active community
💬 Amazing chats
🚀 Join fast`,

          null,

          [
            [
              {
                text:
"🚀 Join Group",

                url:
`https://t.me/c/${String(source).replace("-100","")}`
              }
            ]
          ]

        );

        await sendMessage(
          chatId,
          "✅ Promotion sent successfully."
        );

      }

      return res.sendStatus(200);
    }

    // ==================================
    // MESSAGE
    // ==================================

    if (!update.message) {
      return res.sendStatus(200);
    }

    const msg = update.message;

    const chatId = msg.chat.id;

    // save groups
    if (
      msg.chat.type === "group" ||
      msg.chat.type === "supergroup"
    ) {

      botGroups[chatId] = {
        id: chatId,
        title: msg.chat.title
      };

    }

    // text check
    if (!msg.text) {
      return res.sendStatus(200);
    }

    const userId = msg.from.id;

    const username =
    msg.from.first_name || "User";

    const text = msg.text;

    // activity
    groupActivity[chatId] = {

      username,

      lastMessage: Date.now()

    };

    console.log(
      "📩 Message:",
      text
    );

    // ==================================
    // PROMOTION COMMAND
    // ==================================

    if (
      text === "/promotion"
    ) {

      const buttons = [];

      for (const id in botGroups) {

        buttons.push([
          {
            text:
botGroups[id].title,

            callback_data:
`promo_source_${id}`
          }
        ]);

      }

      await sendMessage(

        chatId,

`📢 Select group to promote`,

        null,

        buttons

      );

      return res.sendStatus(200);
    }

    // ==================================
    // ABUSE CHECK
    // ==================================

    const badFound =
    isAbusive(text);

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

`🚫 ${username} removed from group.`

        );

        return res.sendStatus(200);
      }

      await sendMessage(

        chatId,

`⚠️ Warning for ${username}

${warnings[userId]}/3

Remaining:
${remaining}`

      );

      return res.sendStatus(200);
    }

    // ==================================
    // SMART REPLY
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
