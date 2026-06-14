import { getDiscordId } from "../discord_user_ids.js";

export function generateWebhookMessageFromGame(updatedGame) {
	const webhookMsg = {
		content: `⚽ **${updatedGame.home}** - **${updatedGame.away}** Predictions ⚽`,
		embeds: [
			{
				description: `[Leaderboard](${process.env.KICKTIPP_BASEURL}/leaderboard) | [Prediction Center](${process.env.KICKTIPP_BASEURL}/leaderboard)`,
				fields: [],
				title: "🔗",
			},
		],
	};
	const embed = {
		title: "Home - Away (●'◡'●)",
		description: "",
		color: "14177041",
	};
	updatedGame.bets.forEach((bet) => {
		if (bet.bet) {
			embed.description += `\`${bet.bet.home.toString()}   -   ${bet.bet.away.toString()}\`  ${getDiscordId(bet.user)} \n`;
		}
	});
	webhookMsg.embeds.unshift(embed);
	console.log(JSON.stringify(embed));
	return webhookMsg;
}

// TODO
export function generateGameResultWebhookMessage(resultData) {
	return {
		content: `🥅 **${resultData.home}** - **${resultData.away}** Game Result are in! 🏆`,
		embeds: [
			{
				title: `\`${resultData.result.home} - ${resultData.result.away}\``,
				// color: home = green, away = red
			},
		],
	};
}
