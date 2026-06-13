import { Kicktipp } from "./api/kicktipp.js";
import { Webhook } from "./src/webhook.js";
import "dotenv/config";
import {addDays, setHours} from "date-fns";

await Kicktipp.init({
  baseUrl: process.env.KICKTIPP_BASEURL,
  username: process.env.KICKTIPP_USERNAME,
  password: process.env.KICKTIPP_PASSWORD,
});

if (process.argv[2] === "test") {
  const testIndex = parseInt(process.argv[3]);
  const leaderboard = await Kicktipp.leaderboard();
  console.log(leaderboard);
  if (!isNaN(testIndex)) {
    void Webhook.triggerManually(testIndex);
  }
} else {
  void Webhook.subscribeToLeaderboard();
  refreshSubscriptionsTomorrowMorning();

  function refreshSubscriptionsTomorrowMorning() {
    const now = new Date();
    const morning = setHours(addDays(now, 1), 5);

    setTimeout(() => {
      Webhook.clearTimeouts();
      void Webhook.subscribeToLeaderboard();
      refreshSubscriptionsTomorrowMorning();
    }, morning - now);
  }
}
