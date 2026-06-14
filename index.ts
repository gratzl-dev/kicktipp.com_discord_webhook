
import {
	clearTimeouts,
	subscribeToLeaderboard,
	triggerManually,
} from "./src/webhook.js";
import "dotenv/config";
import { addDays, setHours } from "date-fns";
import {Kicktipp} from "./api/kicktipp";

async function main() {
	if(!process.env.KICKTIPP_BASEURL) {
		throw new Error("KICKTIPP_BASEURL environment variable missing");
	}
	if(!process.env.KICKTIPP_USERNAME) {
		throw new Error("KICKTIPP_USERNAME environment variable missing");
	}
	if(!process.env.KICKTIPP_PASSWORD) {
		throw new Error("KICKTIPP_PASSWORD environment variable missing");
	}

	await Kicktipp.init({
		baseUrl: process.env.KICKTIPP_BASEURL,
		username: process.env.KICKTIPP_USERNAME,
		password: process.env.KICKTIPP_PASSWORD,
	});

	if (process.argv[2] === "test") {
		const testIndex = parseInt(process.argv[3], 10);
		const leaderboard = await Kicktipp.leaderboard();
		console.log(leaderboard);
		if (!Number.isNaN(testIndex)) {
			void triggerManually(testIndex);
		}
	} else {
		void subscribeToLeaderboard();
		refreshSubscriptionsTomorrowMorning();

		function refreshSubscriptionsTomorrowMorning() {
			const now = new Date();
			const morning = setHours(addDays(now, 1), 5);

			setTimeout(() => {
				clearTimeouts();
				void subscribeToLeaderboard();
				refreshSubscriptionsTomorrowMorning();
			}, morning.getTime() - now.getTime());
		}
	}
}

main().catch(console.error);
