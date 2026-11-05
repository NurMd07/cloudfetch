import express from "express";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSONFilePreset } from "lowdb/node";
import { spawn, execFileSync } from "child_process";
import fs from "fs";
import chokidar from "chokidar";
import si from "systeminformation";

dotenv.config({ override: true });

import session from "express-session";
import sessionFileStore from "session-file-store";

const FileStore = sessionFileStore(session);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(normalizeText(process.env.PORT) || 8000);
const VALID_DOWNLOAD_TYPES = new Set(["gdrive", "siteDL", "magnet"]);
const LOG_FILE = path.resolve(__dirname, "downloader.log");
const DB_FILE = path.resolve(__dirname, "db.json");

function normalizeText(value) {
	return typeof value === "string" ? value.trim() : "";
}

const getOutputDir = () => path.resolve(__dirname, normalizeText(process.env.OUTPUT) || "output");
const getMediaPath = (folderName) => {
	const mediaDirEnv = normalizeText(process.env.MEDIA_DIR);
	const baseDir = mediaDirEnv ? path.resolve(mediaDirEnv) : "/media";
	const dirNameMap = {
		movie: normalizeText(process.env.MOVIES_DIR_NAME) || "Movies",
		tv: normalizeText(process.env.SHOWS_DIR_NAME) || "Shows",
		anime: normalizeText(process.env.ANIME_DIR_NAME) || "Animes"
	};

	return path.join(baseDir, dirNameMap[folderName] || folderName);
};

const db = await JSONFilePreset(DB_FILE, []);
await db.read();
await db.write();

app.set("trust proxy", 1);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
	store: new FileStore({
		path: "./sessions",
		ttl: 60 * 60 * 24 * 30
	}),
	secret: normalizeText(process.env.SESSION_SECRET) || "default_secret",
	resave: false,
	saveUninitialized: false,
	cookie: {
		httpOnly: true,
		secure: normalizeText(process.env.NODE_ENV) === "production",
		sameSite: "lax",
		maxAge: 24 * 60 * 60 * 30 * 1000
	}
}));

async function getStorageInfo() {
	const disks = await si.fsSize();

	return disks
		.sort((a, b) => b.size - a.size)
		.filter((disk) => disk.mount !== "/media")
		.slice(0, 2)
		.map((disk) => ({
			mount: disk.mount,
			filesystem: disk.fs,
			totalGB: +(disk.size / 1024 ** 3).toFixed(2),
			usedGB: +(disk.used / 1024 ** 3).toFixed(2),
			freeGB: +((disk.size - disk.used) / 1024 ** 3).toFixed(2),
			usagePercent: disk.use
		}));
}

function getNextDbId() {
	return (db.data?.length ? [...db.data].sort((a, b) => Number(b.id) - Number(a.id))[0]?.id : 0) + 1;
}

function validateDownloadPayload(type, url, name) {
	const cleanUrl = normalizeText(url).replace(/\s+/g, "");
	const cleanName = normalizeText(name);

	const googleDriveFileRegex = /^https?:\/\/drive\.google\.com\/file\/d\/[^/?#]+(?:\/[^?#]*)?(?:\?[^#]*)?(?:#.*)?$/i;
	const magnetLinkRegex = /^magnet:\?(?=[^#\s]*\bxt=urn:btih:[a-z0-9]{32,40}(?:&|#|$))[^#\s]+(?:#.*)?$/i;
	const mediaFileRegex = /^https?:\/\/[^\s?#]+\.(?:mkv|mp4|zip)(?:\?[^#]*)?(?:#.*)?$/i;

	if (!VALID_DOWNLOAD_TYPES.has(type)) {
		return { valid: false, error: "Invalid type parameter" };
	}

	if (type === "gdrive" && (!cleanUrl || !googleDriveFileRegex.test(cleanUrl) || !cleanName)) {
		return { valid: false, error: "Invalid Google Drive URL" };
	}

	if (type === "siteDL" && (!cleanUrl || !mediaFileRegex.test(cleanUrl) || !cleanName)) {
		return { valid: false, error: "Invalid Media File URL" };
	}

	if (type === "magnet" && (!cleanUrl || !magnetLinkRegex.test(cleanUrl) || !cleanName)) {
		return { valid: false, error: "Invalid Magnet Link" };
	}

	return { valid: true, url: cleanUrl, name: cleanName };
}

function buildDownloadArgs({ id, type, category, name, url }) {
	const modeFlag = type === "gdrive" ? "-g" : type === "siteDL" ? "-s" : "-m";
	const cookiesEnabled = normalizeText(process.env.COOKIES) || "false";
	const browserName = normalizeText(process.env.BROWSER);
	const outputDir = getOutputDir();

	const args = [
		modeFlag,
		"-i", String(id),
		"-t", normalizeText(category) || "tv",
		"-n", normalizeText(name),
		"-l", normalizeText(url),
		"-c", cookiesEnabled
	];

	if (browserName) {
		args.push("-b", browserName);
	}

	if (outputDir) {
		args.push("-o", outputDir);
	}

	return args;
}

app.get("/login", async (req, res) => {
	res.render("login");
});

app.post("/login", async (req, res) => {
	const username = normalizeText(req.body.username);
	const password = normalizeText(req.body.password);
	const envUser = normalizeText(process.env.USERNAME);
	const envPass = normalizeText(process.env.PASSWORD);

	if (!envUser || !envPass) {
		return res.status(401).render("login", {
			error: '<span class="error">Username</span> or <span class="error">Password</span> is missing in the .env file!'
		});
	}

	if (username !== envUser || password !== envPass) {
		return res.status(401).render("login", {
			error: 'Your <span class="error">Username</span> or <span class="error">Password</span> is Invalid!'
		});
	}
	req.session.authenticated = true;

	req.session.save((err) => {
		if (err) return res.sendStatus(500);
		res.redirect("/");
	});
});

app.post("/logout", (req, res) => {
	req.session.destroy(() => {
		res.clearCookie("connect.sid");
		res.redirect("/login");
	});
});

function requireAuth(req, res, next) {
	if (req.session?.authenticated) {
		return next();
	}

	return res.redirect("/login");
}

// Protect everything below
app.use(requireAuth);

app.get("/", (req, res) => {
	res.render("index");
});

app.post("/download/:type", async (req, res) => {
	try {
		const type = req.params.type;
		const rawUrl = req.body.url;
		const rawName = req.body.name;
		const category = normalizeText(req.body.category) || "tv";
		const override = Boolean(req.body.override);

		const validation = validateDownloadPayload(type, rawUrl, rawName);
		if (!validation.valid) {
			return res.status(400).json({ error: validation.error });
		}

		const { url, name } = validation;
		await db.read();
		const existingEntry = db.data.find((entry) => entry.url === url);

		if (existingEntry && existingEntry.status === "pending") {
			return res.status(400).json({ error: "This URL is already in the download queue" });
		}

		if (existingEntry && existingEntry.status === "completed" && !override) {
			return res.status(400).json({
				error: "This URL has already been downloaded! Click download again to override ⚠️",
				override: true
			});
		}

		if (existingEntry && ["failed", "completed"].includes(existingEntry.status)) {
			db.data = db.data.filter((entry) => entry.url !== url);
			await db.write();
		}

		const nextId = getNextDbId();
		db.data.push({
			id: nextId,
			url,
			timestamp: new Date().toISOString(),
			status: "pending",
			category,
			name
		});
		await db.write();

		const scriptPath = path.join(__dirname, "src", "tvseries_downloader.sh");
		const downloadArgs = buildDownloadArgs({ id: nextId, type, category, name, url });

		const childProcess = spawn(scriptPath, downloadArgs);

		childProcess.on("error", (err) => {
			console.error("Failed to start downloader script:", err);
		});

		let jsonOutput = "";

		childProcess.stdout.on("data", (data) => {
			jsonOutput += data.toString();
		});

		childProcess.stderr.on("data", (data) => {
			const logMessage = data.toString().trim();
			if (logMessage) {
				fs.appendFile(LOG_FILE, `${logMessage}\n`, (err) => {
					if (err) console.error("Failed to write log:", err);
				});
			}
		});

		childProcess.on("close", async () => {
			let result = {};
			try {
				const lines = jsonOutput.trim().split("\n").filter(Boolean);
				const lastJsonLine = lines[lines.length - 1] || "";
				result = lastJsonLine ? JSON.parse(lastJsonLine) : {};
			} catch (error) {
				console.error("Failed to parse downloader output:", jsonOutput, error);
				return;
			}

			const dbId = Number(result.id || nextId);
			await db.read();
			const entryIndex = db.data.findIndex((entry) => Number(entry.id) === dbId);

			if (result.status === "error") {
				console.log(`Task with ID ${dbId} FAILED. Reason: ${result.message || "Unknown error"}`);
				if (entryIndex !== -1) {
					db.data[entryIndex].status = "failed";
				}
			} else {
				console.log(`Task with ID ${dbId} SUCCESS. Path: ${result.output_directory || result.output_file || "N/A"}`);
				if (entryIndex !== -1) {
					db.data[entryIndex].status = "completed";
					db.data[entryIndex].output_path = result.output_path;
					db.data[entryIndex].source_path = result.source_path;
				}
			}

			if (entryIndex !== -1) {
				await db.write();
			}
		});

		return res.status(200).json({ message: "Download started" });
	} catch (error) {
		console.error("Error in /download route:", error);
		return res.status(500).json({ error: "Internal Server Error" });
	}
});

app.get("/items", async (req, res) => {
	await db.read();
	res.json(db.data);
});

app.get("/deleteAll", async (req, res) => {
	await db.read();
	db.data = db.data.filter(
		(entry) => entry.status === "pending" && entry.timestamp > new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
	);
	await db.write();
	console.log("Deleting all files in the download directory...");
	res.json({ message: "Deleting all files in the download directory..." });
});

app.post("/deleteOne", async (req, res) => {
	const { id } = req.body;

	await db.read();
	db.data = db.data.filter((entry) => entry.id !== id);
	await db.write();
	res.json({ message: "Deleting one file in the download directory..." });
});

app.get("/clearData", async (req, res) => {
	try {
		await db.read();
		try {
			db.data.forEach((entry) => {
				if (entry.status === "pending") {
					const killProc = spawn(path.join(__dirname, "src", "tvseries_downloader.sh"), [
						"-k", String(entry.id),
						"-o", getOutputDir()
					]);
					killProc.on("error", (err) => console.error("Kill process error:", err));
				}
			});
		} catch (err) {
			console.error("Error killing the download process:", err);
		}
		fs.rmSync(getOutputDir(), { recursive: true, force: true });
		db.data = [];
		await db.write();
	} catch (err) {
		console.error("Error clearing data:", err);
		return res.status(500).json({ error: "Failed to clear data" });
	}
	res.json({ message: "Cleared all data from the output directory" });
});

app.get("/moveData", async (req, res) => {
	try {
		const scriptPath = path.join(__dirname, "src", "move_media.sh");
		const moveArgs = [];

		if (normalizeText(process.env.OUTPUT)) {
			moveArgs.push("-o", normalizeText(process.env.OUTPUT));
		}
		if (normalizeText(process.env.MEDIA_DIR)) {
			moveArgs.push("-m", normalizeText(process.env.MEDIA_DIR));
		}
		if (normalizeText(process.env.MOVIES_DIR_NAME)) {
			moveArgs.push("--movies-dir", normalizeText(process.env.MOVIES_DIR_NAME));
		}
		if (normalizeText(process.env.SHOWS_DIR_NAME)) {
			moveArgs.push("--shows-dir", normalizeText(process.env.SHOWS_DIR_NAME));
		}
		if (normalizeText(process.env.ANIME_DIR_NAME)) {
			moveArgs.push("--anime-dir", normalizeText(process.env.ANIME_DIR_NAME));
		}

		const moveProcess = spawn(scriptPath, moveArgs, {
			detached: true,
			stdio: "ignore"
		});

		moveProcess.on("error", (err) => {
			console.error("Failed to start move_media.sh:", err);
		});

		moveProcess.unref();
		res.json({ message: "Moving all completed data to a /media directory..." });
	} catch (err) {
		console.error("Error moving data:", err);
		return res.status(500).json({ error: "Failed to move data" });
	}
});

const MAX_LOG_SIZE = 64 * 1024;
const KEEP_LOG_SIZE = 32 * 1024;
let isRotatingLog = false;

function trimLogFileIfNeeded() {
	if (isRotatingLog) return false;
	try {
		if (!fs.existsSync(LOG_FILE)) return false;
		const stats = fs.statSync(LOG_FILE);
		if (stats.size <= MAX_LOG_SIZE) return false;

		isRotatingLog = true;
		const fd = fs.openSync(LOG_FILE, "r");
		const buffer = Buffer.alloc(KEEP_LOG_SIZE);
		const startPos = stats.size - KEEP_LOG_SIZE;

		fs.readSync(fd, buffer, 0, KEEP_LOG_SIZE, startPos);
		fs.closeSync(fd);

		let trimmedContent = buffer.toString("utf8");
		const firstNewline = trimmedContent.indexOf("\n");
		if (firstNewline !== -1) {
			trimmedContent = trimmedContent.slice(firstNewline + 1);
		}

		const header = `--- [SYSTEM] Old logs auto-cleared to keep page fast ---\n`;
		fs.writeFileSync(LOG_FILE, header + trimmedContent, "utf8");
		return true;
	} catch (err) {
		console.error("Error auto-trimming log file:", err);
		return false;
	} finally {
		isRotatingLog = false;
	}
}

app.get("/stream-logs", (req, res) => {
	let watcher = null;
	let heartbeat = null;
	let initialLoadTimer = null;

	try {
		res.writeHead(200, {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			"Connection": "keep-alive"
		});

		const sendLog = (data) => {
			try {
				const message = data.trim();
				if (message && !res.writableEnded) {
					res.write(`data: ${JSON.stringify({ message })}\n\n`);
				}
			} catch (err) {
				console.error("SSE write error:", err);
			}
		};

		if (!fs.existsSync(LOG_FILE)) {
			fs.writeFileSync(LOG_FILE, "", "utf8");
		}

		trimLogFileIfNeeded();

		let fileSize = fs.statSync(LOG_FILE).size;

		const readNewBytes = (filePath, start, end, onComplete) => {
			if (end <= start || res.writableEnded) {
				if (onComplete) onComplete();
				return;
			}

			const stream = fs.createReadStream(filePath, { start, end: end - 1 });
			let leftover = "";

			stream.on("data", (chunk) => {
				const lines = (leftover + chunk.toString()).split("\n");
				leftover = lines.pop() || "";
				lines.forEach(sendLog);
			});

			stream.on("end", () => {
				if (leftover && !res.writableEnded) sendLog(leftover);
				if (onComplete) onComplete();
			});

			stream.on("error", (err) => {
				console.error("Log stream error:", err);
				if (onComplete) onComplete();
			});
		};

		const INITIAL_DELAY_MS = 0;
		initialLoadTimer = setTimeout(() => {
			try {
				if (!res.writableEnded && fs.existsSync(LOG_FILE)) {
					const content = fs.readFileSync(LOG_FILE, "utf8");
					fileSize = Buffer.byteLength(content, "utf8");

					const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
					const recentLines = lines.slice(-150);

					let index = 0;
					const batchSize = 10;

					const sendBatch = () => {
						if (res.writableEnded || index >= recentLines.length) return;

						const batch = recentLines.slice(index, index + batchSize);
						batch.forEach(sendLog);
						index += batchSize;

						setTimeout(sendBatch, 15);
					};

					sendBatch();
				}
			} catch (err) {
				console.error("Error reading initial log history:", err);
			}
		}, INITIAL_DELAY_MS);

		watcher = chokidar.watch(LOG_FILE, {
			persistent: true,
			usePolling: true,
			interval: 150
		});

		watcher.on("change", (filePath) => {
			try {
				if (!fs.existsSync(filePath) || isRotatingLog) return;
				const stats = fs.statSync(filePath);

				if (stats.size > fileSize) {
					const previousSize = fileSize;
					fileSize = stats.size;

					readNewBytes(filePath, previousSize, stats.size, () => {
						if (stats.size > MAX_LOG_SIZE && trimLogFileIfNeeded()) {
							fileSize = fs.statSync(filePath).size;
						}
					});
				} else if (stats.size < fileSize) {
					fileSize = stats.size;
					if (stats.size === 0) {
						sendLog("--- [SYSTEM] Logs cleared ---");
					}
				}
			} catch (err) {
				console.error("Watcher change error:", err);
			}
		});

		watcher.on("error", (err) => {
			console.error("Chokidar error:", err);
		});

		heartbeat = setInterval(() => {
			try {
				if (!res.writableEnded) {
					res.write(": heartbeat\n\n");
				}
			} catch (err) {
				clearInterval(heartbeat);
			}
		}, 30000);

		req.on("close", () => {
			if (initialLoadTimer) clearTimeout(initialLoadTimer);
			if (heartbeat) clearInterval(heartbeat);
			if (watcher) watcher.close().catch((err) => console.error("Failed to close watcher:", err));
		});
	} catch (err) {
		console.error("Error setting up /stream-logs:", err);
		if (initialLoadTimer) clearTimeout(initialLoadTimer);
		if (heartbeat) clearInterval(heartbeat);
		if (watcher) watcher.close().catch(() => {});
		if (!res.headersSent) {
			res.status(500).json({ error: "Failed to stream logs" });
		}
	}
});

app.get("/clearLog", async (req, res) => {
	try {
		fs.writeFileSync(LOG_FILE, "");
		res.json({ message: "Log cleared successfully" });
	} catch (err) {
		console.log(err);
		res.status(500).json({ error: "Failed to clear Logs" });
	}
});

async function deleteFileOrDirectory(filePath, isDirectory = false) {
	if (!filePath) return;

	try {
		if (isDirectory) {
			await fs.promises.rm(filePath, {
				recursive: true,
				force: true
			});
		} else {
			await fs.promises.unlink(filePath);
		}
	} catch (err) {
		if (err.code === "ENOENT") return;
		throw err;
	}
}

app.get("/removeRecent", async (req, res) => {
	await db.read();
	const recentData = [...db.data].sort((a, b) => Number(b.id) - Number(a.id))[0];

	if (recentData) {
		try {
			const killProc = spawn(path.join(__dirname, "src", "tvseries_downloader.sh"), [
				"-k", String(recentData.id),
				"-o", getOutputDir()
			]);
			killProc.on("error", (err) => console.error("Kill process error:", err));
		} catch (err) {
			console.error("Error killing the download process:", err);
		}
		switch (recentData.category) {
			case "movie":
				try {
					await deleteFileOrDirectory(recentData.output_path, false);
					await deleteFileOrDirectory(recentData.source_path, false);
					if (recentData.output_path) {
						await deleteFileOrDirectory(path.join(getMediaPath("movie"), path.basename(recentData.output_path)), false);
					}
					db.data = db.data.filter((entry) => entry.id !== recentData.id);
				} catch (err) {
					console.error("Error deleting movie file:", err);
				}
				break;
			case "tv":
				try {
					await deleteFileOrDirectory(recentData.output_path, true);
					await deleteFileOrDirectory(recentData.source_path, true);
					if (recentData.output_path) {
						await deleteFileOrDirectory(path.join(getMediaPath("tv"), path.basename(recentData.output_path)), true);
					}
					db.data = db.data.filter((entry) => entry.id !== recentData.id);
				} catch (err) {
					console.error("Error deleting show files:", err);
				}
				break;
			case "anime":
				try {
					await deleteFileOrDirectory(recentData.output_path, true);
					await deleteFileOrDirectory(recentData.source_path, true);
					if (recentData.output_path) {
						await deleteFileOrDirectory(path.join(getMediaPath("anime"), path.basename(recentData.output_path)), true);
					}
					db.data = db.data.filter((entry) => entry.id !== recentData.id);
				} catch (err) {
					console.error("Error deleting anime files:", err);
				}
				break;
		}
	}
	await db.write();
	res.json({ message: "Removed the most recent entry from the database" });
});

app.get("/getStorageInfo", async (req, res) => {
	try {
		const storageInfo = await getStorageInfo();
		res.json(storageInfo);
	} catch (error) {
		console.error("Error fetching storage info:", error);
		res.status(500).json({ error: "Failed to fetch storage info" });
	}
});

app.get("/listDir", async (req, res) => {
	try {
		const output = fs.createWriteStream(LOG_FILE, { flags: "a" });
		const root = getOutputDir();

		output.write(`\n========== ${path.basename(root)} ==========\n`);

		function writeTree(dir, prefix = "") {
			let entries;

			try {
				entries = fs.readdirSync(dir, { withFileTypes: true })
					.sort((a, b) => {
						if (a.isDirectory() !== b.isDirectory()) {
							return a.isDirectory() ? -1 : 1;
						}
						return a.name.localeCompare(b.name);
					});
			} catch (err) {
				output.write(`${prefix}└── [Error: ${err.message}]\n`);
				return;
			}

			entries.forEach((entry, index) => {
				const isLast = index === entries.length - 1;
				const marker = isLast ? "└── " : "├── ";
				const isDir = entry.isDirectory();

				output.write(`${prefix}${marker}${entry.name}${isDir ? "/" : ""}\n`);

				if (isDir) {
					writeTree(
						path.join(dir, entry.name),
						prefix + (isLast ? "    " : "│   ")
					);
				}
			});
		}

		try {
			writeTree(root);
		} catch (err) {
			output.write(`Error: ${err.message}\n`);
		}

		output.write("====================\n");
		output.end();

		res.json({ success: "done" });
	} catch {
		res.status(500).json({ error: "Failed to fetch storage info! Please try again.." });
	}
});

app.listen(port, () => {
	execFileSync("bash", ["-c", `
		find ./src -type f -name "*.sh" -exec sed -i 's/\\r$//' {} + -exec chmod +x {} +
	`], {
		stdio: "inherit",
		cwd: process.cwd()
	});
	console.log(`Server running at http://localhost:${port}`);
});