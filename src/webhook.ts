import { Kicktipp } from "../api/kicktipp";
import type { LeaderboardMatch } from "../api/model/LeaderboardMatch";
import {
	generateGameResultWebhookMessage,
	generateWebhookMessageFromGame,
} from "./discord/embeds";

const games = new Map<
	string,
	{
		kicktipp: LeaderboardMatch;
		predictionTimeout: NodeJS.Timeout;
		postGameTimeout?: NodeJS.Timeout;
	}
>();

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

function getGameKey(game: LeaderboardMatch): string {
	return `${game.index}-${game.home}-${game.away}-${game.date.getTime()}`;
}

function scheduleGame(game: LeaderboardMatch) {
	const gameKey = getGameKey(game);

	if (games.has(gameKey)) {
		return;
	}

	const kickoff = game.date.getTime();
	const now = Date.now();

	const kickoffTimeout = setTimeout(
		async () => {
			const updatedLeaderboard = await Kicktipp.leaderboard();
			const updatedGame = updatedLeaderboard.find(
				(g) => getGameKey(g) === gameKey
			);

			if (!updatedGame) {
				console.error(`Game not found: ${game.home} vs ${game.away}`);
				return;
			}

			await sendWebhookMessage(generateWebhookMessageFromGame(updatedGame));

			const gameData = games.get(gameKey);
			if (gameData) {
				clearTimeout(gameData.predictionTimeout);
			}

			startPostGamePolling(updatedGame);
		},
		Math.max(0, kickoff - now + 10_000),
	);

	games.set(gameKey, {
		kicktipp: game,
		predictionTimeout: kickoffTimeout,
	});
}

function startPostGamePolling(game: LeaderboardMatch) {
	const gameKey = getGameKey(game);
	const gameData = games.get(gameKey);

	if (!gameData) {
		return;
	}

	gameData.postGameTimeout = setTimeout(
		async function poll() {
			const leaderboard = await Kicktipp.leaderboard();
			const updatedGame = leaderboard.find(
				(g) => getGameKey(g) === gameKey
			);

			if (!updatedGame) {
				console.error(`Game not found: ${game.home} vs ${game.away}`);
				games.delete(gameKey);
				return;
			}

			if (!updatedGame.live) {
				await sendWebhookMessage(generateGameResultWebhookMessage(updatedGame));
				games.delete(gameKey);
				return;
			}

			const t = setTimeout(poll, 60_000);
			const currentGameData = games.get(gameKey);
			if (currentGameData) {
				currentGameData.postGameTimeout = t;
			}
		},
		90 * 60 * 1000,
	);
}

function wait(ms: number) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}
