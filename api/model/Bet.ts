import type { Score } from "./Score.js";

export type Bet = {
	user: string;
	points: number;
	bet?: Score;
};
