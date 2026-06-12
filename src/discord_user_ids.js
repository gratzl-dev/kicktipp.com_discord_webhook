const USER_ID_MAP = JSON.parse(process.env.USER_ID_MAP ?? "{}");

export function getDiscordId(user) {
    return USER_ID_MAP[user] ?? user;
}