// Environment variables are expected to be loaded before this file runs
const USER_ID_MAP = JSON.parse(process.env.USER_ID_MAP || "{}");

function getDiscordId(user) {
  return USER_ID_MAP[user] || user;
}