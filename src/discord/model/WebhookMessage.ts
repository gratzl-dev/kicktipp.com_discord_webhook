import type { APIEmbed } from "discord-api-types/v10";

export interface WebhookMessage {
	content?: string;
	embeds?: APIEmbed[];
	username?: string;
	avatar_url?: string;
}
