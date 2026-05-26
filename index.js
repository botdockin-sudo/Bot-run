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
// MEMORY
// ======================================

const memory = {};
const warnings = {};
const cooldown = {};
const groups = {};
const lastActive = {};
const selectedPromotion = {};

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
You are Supreme Telegram Bot.

Developer:
Easy Deplover

Rules:
- Funny group bot
- Hindi + English mix
- Human style chatting
- Short replies
- Fun personality
- Never abusive
- Friendly replies
- Smart replies
- Cool emojis

If user asks:
owner
developer
creator
who made you

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
// TYPING
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
// SMART LOCAL REPLY
// ======================================

function smartReply(text) {

const lower =
text.toLowerCase();

if (
lower.includes("hello") ||
lower.includes("hi")
) {

const replies = [

"👋 Oye hello bro 😄",

"🔥 Aagaye legend 😎",

"✨ Hi bro kya haal hai?",

"😄 Welcome boss"

];

return replies[
Math.floor(
Math.random() *
replies.length
)
];

}

if (
lower.includes("good morning")
) {

return `
🌅 Good morning bro ☕
Aaj ka mood full chill 😎
`;
}

if (
lower.includes("good night")
) {

return `
🌙 Good night bro 😴
`;
}

if (
lower.includes("developer") ||
lower.includes("owner") ||
lower.includes("creator") ||
lower.includes("who made you")
) {

return `
✨ My developer is Easy Deplover.
`;
}

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
"bhosdike",
"mc",
"bc",
"mkc",
"randi",
"lavda",
"gaand",
"chutiya",
"gandu",
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

const now =
Date.now();

if (
cooldown[userId] &&
now - cooldown[userId] < 1500
) {

return `
⏳ Slow bro 😆
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

if (
memory[userId].length > 4
) {

memory[userId].shift();

}

const messages = [

{
role: "system",
content: SYSTEM_PROMPT
},

...memory[userId]

];

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

max_tokens: 60,

temperature: 0.7,

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

const fallbackReplies = [

"😄 Samajh raha hu bro",

"🔥 Interesting scene hai",

"👀 Ye unexpected tha",

"😎 Full vibe me hu",

"🤖 AI thoda rest pe hai 😆"

];

return fallbackReplies[
Math.floor(
Math.random() *
fallbackReplies.length
)
];

} catch (err) {

return `
⚡ AI slow mode.
`;
}

}

// ======================================
// AUTO ACTIVE MESSAGE
// ======================================

setInterval(async () => {

const now =
Date.now();

for (const chatId in lastActive) {

const diff =
now - lastActive[chatId];

if (
diff >
1000 * 60 * 60
) {

try {

await sendMessage(
chatId,
`
😴 Group so gaya kya?

🔥 Active aao bhai
maze karte hai 😎
`
);

lastActive[chatId] =
Date.now();

} catch (err) {}

}

}

}, 60000);

// ======================================
// WEBHOOK
// ======================================

app.post(
"/webhook",
async (req, res) => {

try {

const update =
req.body;

// ====================================
// CALLBACK
// ====================================

if (
update.callback_query
) {

const query =
update.callback_query;

const data =
query.data;

const userId =
query.from.id;

const chatId =
query.message.chat.id;

// ================================
// SELECT GROUP
// ================================

if (
data.startsWith("promo_")
) {

const groupId =
data.replace(
"promo_",
""
);

selectedPromotion[
userId
] = groupId;

const buttons = [];

for (const id in groups) {

if (id == groupId)
continue;

buttons.push([
{
text:
groups[id].title,

callback_data:
`sendpromo_${id}`
}
]);

}

buttons.push([
{
text:
"🌍 All Groups",

callback_data:
"sendpromo_all"
}
]);

await sendMessage(
chatId,
"📨 Select where to send promotion",
null,
buttons
);

return res.sendStatus(200);

}

// ================================
// SEND PROMOTION
// ================================

if (
data.startsWith(
"sendpromo_"
)
) {

const target =
data.replace(
"sendpromo_",
""
);

const promoGroupId =
selectedPromotion[
userId
];

const promoGroup =
groups[promoGroupId];

// ==============================
// CREATE LINK
// ==============================

const invite =
await axios.post(
`${TELEGRAM_API}/createChatInviteLink`,
{
chat_id:
promoGroupId
}
);

const inviteLink =
invite.data.result
.invite_link;

const promoText =
`
🔥 ${promoGroup.title}

✨ Active Telegram Group
😎 Chill Community
💬 Daily Fun Chat

👇 Join Fast
`;

if (
target === "all"
) {

for (const id in groups) {

if (
id == promoGroupId
)
continue;

try {

await sendMessage(
id,
promoText,
null,
[
[
{
text:
"🚀 Join Group",

url:
inviteLink
}
]
]
);

} catch (err) {}

}

} else {

await sendMessage(
target,
promoText,
null,
[
[
{
text:
"🚀 Join Group",

url:
inviteLink
}
]
]
);

}

await sendMessage(
chatId,
"✅ Promotion sent 😎"
);

return res.sendStatus(200);

}

}

// ====================================
// MESSAGE
// ====================================

if (!update.message) {

return res.sendStatus(200);

}

const msg =
update.message;

const chatId =
msg.chat.id;

// ====================================
// SAVE GROUP
// ====================================

if (
msg.chat &&
(
msg.chat.type === "group" ||
msg.chat.type === "supergroup"
)
) {

groups[chatId] = {

id: chatId,

title:
msg.chat.title ||
"Unknown Group"

};

}

lastActive[chatId] =
Date.now();

// ====================================
// START
// ====================================

if (
msg.text === "/start"
) {

await sendMessage(
chatId,
`
🎸 Supreme Bot Started

🔥 Features:
• AI Chat
• Smart Replies
• Anti Abuse
• Promotion System
• Welcome Message
• Auto Active Message

👑 Developer:
Easy Deplover
`
);

return res.sendStatus(200);

}

// ====================================
// PROMOTION COMMAND
// ====================================

if (
msg.text === "/promotion"
) {

const buttons = [];

for (const id in groups) {

buttons.push([
{
text:
groups[id].title,

callback_data:
`promo_${id}`
}
]);

}

await sendMessage(
chatId,
"📢 Select group to promote",
null,
buttons
);

return res.sendStatus(200);

}

// ====================================
// JOIN
// ====================================

if (
msg.new_chat_members
) {

for (
const user of
msg.new_chat_members
) {

await sendMessage(
chatId,
`
✨ Welcome ${user.first_name}

🔥 Enjoy your stay
😎 Chill and fun only
`
);

}

return res.sendStatus(200);

}

// ====================================
// LEFT
// ====================================

if (
msg.left_chat_member
) {

await sendMessage(
chatId,
`
📤 ${msg.left_chat_member.first_name}
left the group.
`
);

return res.sendStatus(200);

}

// ====================================
// TEXT CHECK
// ====================================

if (!msg.text) {

return res.sendStatus(200);

}

const userId =
msg.from.id;

const username =
msg.from.first_name ||
"User";

const text =
msg.text;

// ====================================
// ABUSE
// ====================================

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

if (
warnings[userId] >= 3
) {

await banUser(
chatId,
userId
);

await sendMessage(
chatId,
`
🚫 ${username}
removed from group.

Reason:
Abusive language
`
);

return res.sendStatus(200);

}

await sendMessage(
chatId,
`
⚠️ Warning:
${warnings[userId]}/3

Remaining:
${remaining}
`
);

return res.sendStatus(200);

}

// ====================================
// LOCAL REPLY
// ====================================

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

// ====================================
// AI
// ====================================

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
err.response?.data ||
err.message
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
