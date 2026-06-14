const USER_ID_MAP: Record<string, string> = JSON.parse(
	process.env.USER_ID_MAP ?? "{}",
);

export function getDiscordId(user: string) {
	return USER_ID_MAP[user] ?? user;
}
