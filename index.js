import { Kicktipp } from "./api/kicktipp.js";
import {
	clearTimeouts,
	subscribeToLeaderboard,
	triggerManually,
} from "./src/webhook.js";
import "dotenv/config";
import { addDays, setHours } from "date-fns";

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
		}, morning - now);
	}
}
