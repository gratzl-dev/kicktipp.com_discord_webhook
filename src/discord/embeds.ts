import type { APIEmbed } from "discord-api-types/v10";
import type { LeaderboardMatch } from "../../api/model/LeaderboardMatch";
import { getDiscordId } from "../discord_user_ids";
import type { WebhookMessage } from "./model/WebhookMessage";

export function generateWebhookMessageFromGame(updatedGame: LeaderboardMatch) {
	const webhookMsg: WebhookMessage = {
		content: `⚽ **${updatedGame.home}** - **${updatedGame.away}** Predictions ⚽`,
		embeds: [
			{
				description: `[Leaderboard](${process.env.KICKTIPP_BASEURL}/leaderboard) | [Prediction Center](${process.env.KICKTIPP_BASEURL}/leaderboard)`,
				fields: [],
				title: "🔗",
			},
		],
	};
	const embed: APIEmbed = {
		title: "Home - Away (●'◡'●)",
		description: "",
		color: 14177041,
	};
	updatedGame.bets?.forEach((bet) => {
		if (bet.bet) {
			embed.description += `\`${bet.bet.home.toString()}   -   ${bet.bet.away.toString()}\`  ${getDiscordId(bet.user)} \n`;
		}
	});
	webhookMsg.embeds?.unshift(embed);
	console.log(JSON.stringify(embed));
	return webhookMsg;
}

export function generateGameResultWebhookMessage(
	resultData: LeaderboardMatch,
): WebhookMessage | undefined {
	if (!resultData.result) return;
	return {
		content: `🥅 **${resultData.home}** - **${resultData.away}** Game Result are in! 🏆`,
		embeds: [
			{
				title: `\`${resultData.result.home} - ${resultData.result.away}\``,
				// color: home = green, away = red
			},
			...(resultData.bets
				? [
						{
							title: `Updated Rankings 📈`,
							description: resultData.bets
								.map(
									(bet, i) =>
										`**${i + 1}.** ${getDiscordId(bet.user)} | *+${bet.points}* Total: ${bet.totalPoints}\n`,
								)
								.join(""),
							color: 16766720,
						},
					]
				: []),
		],
	};
}
