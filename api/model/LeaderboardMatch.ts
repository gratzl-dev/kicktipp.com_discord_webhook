import type { Bet } from "./Bet.js";
import type { Score } from "./Score.js";

export interface LeaderboardMatch {
	index: number;
	date: Date;
	home: string;
	away: string;
	result?: Score;
	group?: string;
	shorthand?: string;
	live?: boolean;
	bets?: Bet[];
}
