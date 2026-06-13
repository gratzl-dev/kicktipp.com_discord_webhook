import { Kicktipp } from "../api/kicktipp.js";
import { getDiscordId } from "./discord_user_ids.js";
import * as Webhook from "./webhook.js";

const timeouts = [];

export async function triggerManually(index) {
	const leaderboard = await Kicktipp.leaderboard();
	const webhookMsg = Webhook.generateWebhookMessageFromGame(leaderboard[index]);
	console.log(webhookMsg);
	await Webhook.sendWebhookMessage(webhookMsg);
}

export async function subscribeToLeaderboard() {
	const leaderboard = await Kicktipp.leaderboard();

	const now = new Date();
	const today = leaderboard.filter((l) => l.date > now);
	console.log(`listening for ${today.length} games`);
	today.forEach((game) => {
		const timeLeft = game.date - now + 10_000; // wait 10 seconds before refreshing
		console.log(
			`${game.home} vs ${game.away} starts at ${new Date(game.date)} (${Math.floor(timeLeft / 1000 / 3600)}:${String(Math.floor(((timeLeft / 1000) % 3600) / 60)).padStart(2, "0")}:${String(Math.floor((timeLeft / 1000) % 60)).padStart(2, "0")} left)`,
		);

		const timeout = setTimeout(async () => {
			const updatedLeaderboard = await Kicktipp.leaderboard();
			const updatedGame = updatedLeaderboard[game.index];

			console.log(JSON.stringify(updatedGame));

			const webhookMsg = Webhook.generateWebhookMessageFromGame(updatedGame);
			await Webhook.sendWebhookMessage(webhookMsg);
		}, timeLeft);

		timeouts.push(timeout);
	});
}

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

export async function sendWebhookMessage(message) {
	const response = await fetch(process.env.WEBHOOK_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(message),
	});

	console.log(`Webhook Result: ${response.status}`);
	if (!`${response.status}`.startsWith("2")) {
		console.log(await response.text());
	}
}

export function clearTimeouts() {
	timeouts.forEach((timeout) => void clearTimeout(timeout));
}
