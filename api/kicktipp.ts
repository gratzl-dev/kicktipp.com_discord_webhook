import makeFetchCookie from "fetch-cookie";
import { type HTMLElement, parse } from "node-html-parser";
import * as tough from "tough-cookie";
import type { KicktippConfig } from "./model/KicktippConfig";
import type { LeaderboardMatch } from "./model/LeaderboardMatch";
import type { ScheduleMatch } from "./model/ScheduleMatch";
import type { Score } from "./model/Score";

const cookieJar = new tough.CookieJar();
const fetchCookie = makeFetchCookie(fetch, cookieJar);

let _baseUrl: string;

export const Kicktipp = {
	get baseUrl(): string {
		return _baseUrl;
	},

	set baseUrl(value: string) {
		_baseUrl = value;
	},

	async init(config: KicktippConfig): Promise<void> {
		Kicktipp.baseUrl = config.baseUrl;

		await Kicktipp.login(config.username, config.password);

		cookieJar.setCookieSync(
			`timezone=${process.env.TZ ?? "Europe/Berlin"}`,
			"https://www.kicktipp.com",
		);
	},

	async login(username: string, password: string): Promise<void> {
		if (Kicktipp.isLoggedIn()) {
			return;
		}

		try {
			const response = await fetchCookie(
				"https://www.kicktipp.com/wm-2026-remote-saufen/profil/loginaction",
				{
					credentials: "include",
					headers: {
						"User-Agent":
							"Mozilla/5.0 (X11; Linux x86_64; rv:151.0) Gecko/20100101 Firefox/151.0",
						Accept:
							"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
						"Accept-Language": "en-US,en;q=0.9",
						"Content-Type": "application/x-www-form-urlencoded",
						"Upgrade-Insecure-Requests": "1",
						"Sec-Fetch-Dest": "document",
						"Sec-Fetch-Mode": "navigate",
						"Sec-Fetch-Site": "same-origin",
						"Sec-Fetch-User": "?1",
						Priority: "u=0, i",
					},
					referrer: `${Kicktipp.baseUrl}/profile/login`,
					body: new URLSearchParams({
						kennung: username,
						passwort: password,
						submitbutton: "",
					}),
					method: "POST",
					mode: "cors",
				},
			);

			const setCookie = response.headers.get("set-cookie");

			if (!setCookie?.includes("login=")) {
				throw new Error("set-cookie header missing from response.");
			}

			console.log("Login successful:", response.status);
		} catch (error) {
			console.error(
				"Login failed:",
				error instanceof Error ? error.message : error,
			);
		}
	},

	async leaderboard(page = 0): Promise<LeaderboardMatch[]> {
		Kicktipp.throwIfNotLoggedIn();

		const response = await fetchCookie(
			`${Kicktipp.baseUrl}/leaderboard?spieltagIndex=${page}`,
			{
				method: "GET",
			},
		);

		const html = parse(await response.text());

		const spiele = html.getElementById("spielplanSpiele");
		if (!spiele) {
			throw new Error("spielplanSpiele table not found");
		}

		const spieleResult = parseSpielplanSpieleTable(spiele);

		const table = html.getElementById("ranking");
		if (!table) {
			throw new Error("ranking table not found");
		}

		const header = table.querySelector(".headerErgebnis");
		const body = table.querySelector("tbody");

		if (!header || !body) {
			throw new Error("ranking table structure invalid");
		}

		const th = header.querySelectorAll("th");

		for (let i = 3; i < th.length - 4; i++) {
			const headerboxes = th[i].querySelectorAll(".headerbox");

			spieleResult[i - 3].shorthand =
				`${headerboxes[0]?.innerHTML ?? ""} - ${headerboxes[1]?.innerHTML ?? ""}`;

			spieleResult[i - 3].live =
				!!headerboxes[2] &&
				headerboxes[2].classNames.includes("kicktipp-liveergebnis");
		}

		const tr = body.querySelectorAll("tr");

		tr.forEach((row) => {
			if (row.classNames === "endOfBlock") {
				return;
			}

			const cols = row.querySelectorAll("td");
			const username = cols[2]?.innerText ?? "";

			const bets = row.querySelectorAll(".ereignis");

			bets.forEach((b, i) => {
				if (!spieleResult[i].bets) {
					spieleResult[i].bets = [];
				}

				const sub = b.querySelector("sub");

				if (sub) {
					b.removeChild(sub);
				}

				spieleResult[i].bets.push({
					user: username,
					points: sub ? Number(sub.innerText) : 0,
					bet: extractValues(b.innerText),
				});
			});
		});

		return spieleResult;
	},

	async schedule(page = 0): Promise<ScheduleMatch[]> {
		Kicktipp.throwIfNotLoggedIn();

		const response = await fetchCookie(
			`${Kicktipp.baseUrl}/schedule?spieltagIndex=${page}`,
			{
				method: "GET",
			},
		);

		await fetch(`${Kicktipp.baseUrl}/leaderboard?spieltagIndex=`, {
			method: "GET",
			mode: "cors",
		});

		const html = parse(await response.text());

		const table = html.getElementById("spiele");
		if (!table) {
			throw new Error("spiele table not found");
		}

		return parseSpieleTable(table);
	},

	isLoggedIn(): boolean {
		return !!cookieJar
			.getCookiesSync("https://www.kicktipp.com")
			.find((c) => c.key === "login");
	},

	throwIfNotLoggedIn(): void {
		if (!Kicktipp.isLoggedIn()) {
			throw new Error("Not logged in.");
		}
	},
};

function extractValues(bet: string): Score | undefined {
	const points = bet.trim().split("-");

	return points.length === 2
		? {
				home: Number(points[0]),
				away: Number(points[1]),
			}
		: undefined;
}

function parseSpielplanSpieleTable(table: HTMLElement): LeaderboardMatch[] {
	const body = table.querySelector("tbody");

	if (!body) {
		return [];
	}

	const result: LeaderboardMatch[] = [];

	const tr = body.querySelectorAll("tr");

	tr.forEach((row, i) => {
		const cols = row.querySelectorAll("td");

		const baseObject: LeaderboardMatch = {
			index: i,
			date: new Date(cols[0]?.innerText),
			home: cols[1]?.innerText ?? "",
			away: cols[2]?.innerText ?? "",
			result: extractValues(cols[cols.length - 1]?.innerText ?? ""),
		};

		if (cols.length === 5) {
			baseObject.group = cols[3]?.innerText;
		}

		result.push(baseObject);
	});

	return result;
}

function parseSpieleTable(table: HTMLElement): ScheduleMatch[] {
	const body = table.querySelector("tbody");

	if (!body) {
		return [];
	}

	const result: ScheduleMatch[] = [];

	const tr = body.querySelectorAll("tr");

	tr.forEach((row, i) => {
		const cols = row.querySelectorAll("td");

		result.push({
			index: i,
			date: cols[0]?.innerText ?? "",
			deadline: cols[1]?.innerText ?? "",
			home: cols[2]?.innerText ?? "",
			away: cols[3]?.innerText ?? "",
			group: cols[4]?.innerText ?? "",
		});
	});

	return result;
}
