import { Kicktipp } from "../api/kicktipp";
import type { LeaderboardMatch } from "../api/model/LeaderboardMatch";
import {
	generateGameResultWebhookMessage,
	generateWebhookMessageFromGame,
} from "./discord/embeds";

const timeouts: NodeJS.Timeout[] = [];

export async function triggerManually(index: number): Promise<void> {
	const leaderboard = await Kicktipp.leaderboard(1);
	const game = leaderboard[index];
	await sendWebhookMessage(generateWebhookMessageFromGame(game));
	if (game.result) {
		await sendWebhookMessage(generateGameResultWebhookMessage(game));
	}
}

export async function subscribeToLeaderboard(): Promise<void> {
	let futureGames: LeaderboardMatch[] = [];
	while (!futureGames?.length) {
		const now = new Date();
		const leaderboard = await Kicktipp.leaderboard();
		futureGames = leaderboard.filter((l) => l.date > now);
		if (!futureGames.length) {
			console.log("No future games found. Retrying in 60 minutes...");
			await wait(3_600_000);
		}
	}

	console.log(`listening for ${futureGames.length} games`);

	futureGames.forEach((game) => {
		const now = new Date();
		const timeLeft = game.date.getTime() - now.getTime() + 10_000; // wait 10 seconds before refreshing

		console.log(
			`${game.home} vs ${game.away} starts at ${game.date} (${Math.floor(
				timeLeft / 1000 / 3600,
			)}:${String(Math.floor(((timeLeft / 1000) % 3600) / 60)).padStart(
				2,
				"0",
			)}:${String(Math.floor((timeLeft / 1000) % 60)).padStart(2, "0")} left)`,
		);

		scheduleGame(game);
	});
}

export async function sendWebhookMessage(message: unknown): Promise<void> {
	const webhookUrl = process.env.WEBHOOK_URL;

	if (!webhookUrl) {
		throw new Error("WEBHOOK_URL is not defined");
	}

	const response = await fetch(webhookUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(message),
	});

	console.log(`Webhook Result: ${response.status}`);

	if (!response.ok) {
		console.log(await response.text());
	}
}

export function clearTimeouts(): void {
	timeouts.forEach((timeout) => void clearTimeout(timeout));
}

function scheduleGame(game: LeaderboardMatch) {
	const kickoff = game.date.getTime();
	const now = Date.now();

	const kickoffTimeout = setTimeout(
		async () => {
			const updatedLeaderboard = await Kicktipp.leaderboard();
			const updatedGame = updatedLeaderboard[game.index];

			await sendWebhookMessage(generateWebhookMessageFromGame(updatedGame));

			startPostGamePolling(game);
		},
		Math.max(0, kickoff - now + 10_000),
	);

	timeouts.push(kickoffTimeout);
}

function startPostGamePolling(game: LeaderboardMatch) {
	const postGameTimeout = setTimeout(
		async function poll() {
			const leaderboard = await Kicktipp.leaderboard();
			const updatedGame = leaderboard[game.index];

			if (!updatedGame.live) {
				return await sendWebhookMessage(
					generateGameResultWebhookMessage(updatedGame),
				);
			}

			const t = setTimeout(poll, 60_000);
			timeouts.push(t);
		},
		90 * 60 * 1000,
	);

	timeouts.push(postGameTimeout);
}

function wait(ms: number) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}
