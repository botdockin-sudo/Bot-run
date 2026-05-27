// ======================================
// SUPREME TELEGRAM BOT
// FULL FIXED VERSION
// GROUP ISOLATED GAME SYSTEM
// SOCKET.IO + WEBRTC READY
// ======================================

require("dotenv").config();

const express = require("express");
const axios = require("axios");
const http = require("http");

const { Server } =
require("socket.io");

const app = express();

const server =
http.createServer(app);

const io =
new Server(server, {

cors:{
origin:"*"
}

});

app.use(express.json());

app.use(
express.static("public")
);

// ======================================
// CONFIG
// ======================================

const PORT =
process.env.PORT || 3000;

const BOT_TOKEN =
process.env.BOT_TOKEN;

const OPENROUTER_API_KEY =
process.env.OPENROUTER_API_KEY;

const GAME_URL =
process.env.GAME_URL;

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
// GROUP ISOLATED ROOMS
// ======================================

/*

STRUCTURE

gameRooms = {

groupId: {

roomId: {
...
}

}

}

*/

const gameRooms = {};

// ======================================
// SOCKET PLAYERS
// ======================================

const socketPlayers = {};

// ======================================
// AI MODELS
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
- Friendly
- Hindi English mix
- Human style
- Smart replies
- Never abusive
`;

// ======================================
// SEND MESSAGE
// ======================================

async function sendMessage(
chatId,
text,
replyId = null,
buttons = null
){

try{

const data = {

chat_id:chatId,
text,
parse_mode:"HTML"

};

if(replyId){

data.reply_to_message_id =
replyId;

}

if(buttons){

data.reply_markup = {

inline_keyboard:buttons

};

}

await axios.post(

`${TELEGRAM_API}/sendMessage`,

data

);

}catch(err){

console.log(
"Send Error:",
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
){

try{

await axios.post(

`${TELEGRAM_API}/deleteMessage`,

{
chat_id:chatId,
message_id:messageId
}

);

}catch(err){}

}

// ======================================
// BAN USER
// ======================================

async function banUser(
chatId,
userId
){

try{

await axios.post(

`${TELEGRAM_API}/banChatMember`,

{
chat_id:chatId,
user_id:userId
}

);

}catch(err){}

}

// ======================================
// TYPING
// ======================================

async function typing(chatId){

try{

await axios.post(

`${TELEGRAM_API}/sendChatAction`,

{
chat_id:chatId,
action:"typing"
}

);

}catch(err){}

}

// ======================================
// ROOM ID
// ======================================

function generateRoomId(){

return (

Math.random()
.toString(36)
.substring(2,8)

+

Date.now()
.toString(36)
.substring(4)

);

}

// ======================================
// SMART REPLY
// ======================================

function smartReply(text){

const lower =
text.toLowerCase();

if(
lower.includes("hi") ||
lower.includes("hello")
){

return "Hello bro";

}

if(
lower.includes("good morning")
){

return "Good morning";

}

if(
lower.includes("good night")
){

return "Good night";

}

if(
lower.includes("developer") ||
lower.includes("owner")
){

return "Developer: Easy Deplover";

}

return null;

}

// ======================================
// ABUSE CHECK
// ======================================

async function isAbusive(text){

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

for(const word of badWords){

if(clean.includes(word)){

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
){

try{

const now =
Date.now();

if(
cooldown[userId] &&
now - cooldown[userId] < 1500
){

return "Slow down";

}

cooldown[userId] = now;

if(!memory[userId]){

memory[userId] = [];

}

memory[userId].push({

role:"user",
content:message

});

if(
memory[userId].length > 4
){

memory[userId].shift();

}

const messages = [

{
role:"system",
content:SYSTEM_PROMPT
},

...memory[userId]

];

for(const model of models){

try{

const response =
await axios.post(

"https://openrouter.ai/api/v1/chat/completions",

{

model,

max_tokens:60,

temperature:0.7,

messages

},

{

headers:{

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

role:"assistant",
content:reply

});

return reply;

}catch(err){}

}

return "AI busy";

}catch(err){

return "AI error";

}

}

// ======================================
// SOCKET.IO
// ======================================

io.on(
"connection",
socket=>{

console.log(
"Socket connected:",
socket.id
);

// ====================================
// JOIN ROOM
// ====================================

socket.on(
"join-room",
data=>{

if(!data) return;

const roomId =
data.roomId;

const player =
data.player;

const groupId =
data.groupId;

if(
!roomId ||
!player ||
!groupId
)return;

// ================================
// VALIDATE GROUP ROOM
// ================================

if(
!gameRooms[groupId] ||
!gameRooms[groupId][roomId]
){

socket.emit(
"invalid-room"
);

return;

}

socket.join(roomId);

socketPlayers[
socket.id
] = {

roomId,
groupId,
player

};

socket.to(roomId)
.emit(
"player-joined",
player
);

}
);

// ====================================
// GAME MOVE
// ====================================

socket.on(
"game-move",
data=>{

if(!data) return;

if(!data.roomId)
return;

socket.to(
data.roomId
).emit(
"game-move",
data
);

}
);

// ====================================
// VOICE SIGNAL
// ====================================

socket.on(
"voice-signal",
data=>{

if(!data) return;

if(!data.roomId)
return;

socket.to(
data.roomId
).emit(
"voice-signal",
data
);

}
);

// ====================================
// DISCONNECT
// ====================================

socket.on(
"disconnect",
()=>{

const player =
socketPlayers[
socket.id
];

if(player){

socket.to(
player.roomId
).emit(
"player-disconnected"
);

delete socketPlayers[
socket.id
];

}

}
);

});

// ======================================
// GOOD MORNING
// ======================================

setInterval(async()=>{

const now =
new Date();

if(
now.getHours() === 6 &&
now.getMinutes() === 0
){

for(const id in groups){

await sendMessage(

id,

`
Good morning

Have a good day
`

);

}

}

},60000);

// ======================================
// GOOD NIGHT
// ======================================

setInterval(async()=>{

const now =
new Date();

if(
now.getHours() === 17 &&
now.getMinutes() === 0
){

for(const id in groups){

await sendMessage(

id,

`
Good night

Take rest
`

);

}

}

},60000);

// ======================================
// WEBHOOK
// ======================================

app.post(
"/webhook",
async(req,res)=>{

try{

const update =
req.body;

// ====================================
// CALLBACK QUERY
// ====================================

if(update.callback_query){

const query =
update.callback_query;

const data =
query.data;

const user =
query.from;

const userId =
user.id;

const username =
user.first_name ||
"Player";

const chatId =
String(
query.message.chat.id
);

// ====================================
// ENSURE GROUP FOLDER
// ====================================

if(!gameRooms[chatId]){

gameRooms[chatId] = {};

}

// ====================================
// CREATE GAME
// ====================================

if(data === "create_game"){

const roomId =
generateRoomId();

// ==================================
// SAVE INSIDE SAME GROUP
// ==================================

gameRooms[chatId][roomId] = {

host:userId,

hostName:username,

groupId:chatId,

joined:false,

createdAt:Date.now()

};

await sendMessage(

chatId,

`
${username} created a game room

Join quickly before someone else does.
`,

null,

[
[
{
text:
"JOIN GAME",

callback_data:
`join_${roomId}`
}
]
]

);

return res.sendStatus(200);

}

// ====================================
// JOIN GAME
// ====================================

if(
data.startsWith("join_")
){

const roomId =
data.replace(
"join_",
""
);

// ==================================
// ROOM MUST EXIST
// INSIDE SAME GROUP
// ==================================

if(
!gameRooms[chatId] ||
!gameRooms[chatId][roomId]
){

await sendMessage(

chatId,

"Room not found in this group"

);

return res.sendStatus(200);

}

const room =
gameRooms[chatId][roomId];

// ==================================
// ALREADY FULL
// ==================================

if(room.joined){

await sendMessage(

chatId,

"Room already full"

);

return res.sendStatus(200);

}

// ==================================
// HOST CHECK
// ==================================

if(room.host === userId){

await sendMessage(

chatId,

"You cannot join your own room"

);

return res.sendStatus(200);

}

room.joined = true;

// ==================================
// GAME URL
// ==================================

const p1Url =

`${GAME_URL}/?room=${roomId}&player=p1&group=${chatId}`;

const p2Url =

`${GAME_URL}/?room=${roomId}&player=p2&group=${chatId}`;

// ==================================
// MATCH FOUND
// ==================================

await sendMessage(

chatId,

`
MATCH FOUND

Player 1:
${room.hostName}

Player 2:
${username}

Voice chat enabled
`,

null,

[
[
{
text:
"PLAYER 1 PLAY",

web_app:{
url:p1Url
}
}
],
[
{
text:
"PLAYER 2 PLAY",

web_app:{
url:p2Url
}
}
]
]

);

return res.sendStatus(200);

}

}

// ====================================
// MESSAGE
// ====================================

if(!update.message){

return res.sendStatus(200);

}

const msg =
update.message;

const chatId =
String(
msg.chat.id
);

// ====================================
// SAVE GROUP
// ====================================

if(

msg.chat &&

(
msg.chat.type === "group" ||

msg.chat.type === "supergroup"
)

){

groups[chatId] = {

id:chatId,

title:
msg.chat.title ||
"Unknown Group"

};

}

// ====================================
// LAST ACTIVE
// ====================================

lastActive[chatId] =
Date.now();

// ====================================
// TEXT CHECK
// ====================================

if(!msg.text){

return res.sendStatus(200);

}

const userId =
msg.from.id;

const text =
msg.text;

// ====================================
// GAME COMMAND
// ====================================

if(

text.toLowerCase() === "/game" ||

text.toLowerCase() === "game"

){

await sendMessage(

chatId,

`
STRATEGY LINE

Tap below to create room
`,

msg.message_id,

[
[
{
text:
"CREATE ROOM",

callback_data:
"create_game"
}
]
]

);

return res.sendStatus(200);

}

// ====================================
// ABUSE
// ====================================

const badFound =
await isAbusive(text);

if(badFound){

if(!warnings[userId]){

warnings[userId] = 0;

}

warnings[userId]++;

await deleteMessage(
chatId,
msg.message_id
);

if(
warnings[userId] >= 3
){

await banUser(
chatId,
userId
);

await sendMessage(

chatId,

"User removed for abuse"

);

return res.sendStatus(200);

}

await sendMessage(

chatId,

`Warning ${warnings[userId]}/3`

);

return res.sendStatus(200);

}

// ====================================
// SMART REPLY
// ====================================

const localReply =
smartReply(text);

if(localReply){

await sendMessage(

chatId,
localReply,
msg.message_id

);

return res.sendStatus(200);

}

// ====================================
// AI CHAT
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

}catch(err){

console.log(
"Webhook Error:",
err.response?.data ||
err.message
);

return res.sendStatus(500);

}

});

// ======================================
// HOME
// ======================================

app.get("/",(req,res)=>{

res.send(
"Supreme Bot Running"
);

});

// ======================================
// CLEAN OLD ROOMS
// ======================================

setInterval(()=>{

const now =
Date.now();

for(
const groupId
in gameRooms
){

for(
const roomId
in gameRooms[groupId]
){

const room =
gameRooms[groupId][roomId];

if(

now - room.createdAt >

1000 * 60 * 10

){

delete gameRooms[groupId][roomId];

}

}

}

},60000);

// ======================================
// START SERVER
// ======================================

server.listen(PORT,()=>{

console.log(
"Server Started"
);

});
