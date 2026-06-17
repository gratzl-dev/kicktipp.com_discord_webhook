import type { Score } from "./Score.js";

export type Bet = {
	user: string;
	points: number;
	totalPoints: number;
	bet?: Score;
};
