require("dotenv").config();
const DatabaseManager = require("./src/database");

async function checkDatabaseStatus() {
	const db = new DatabaseManager();

	try {
		console.log("📊 Checking database status...");
		console.log("=".repeat(50));

		await db.connect();

		const tables = [
			"semester",
			"criteria",
			"faculty",
			"subject",
			"lecturer",
			"class",
			"point_answer",
			"point",
			"comment",
		];
		let totalRecords = 0;

		for (const table of tables) {
			try {
				const result = await db.executeQuery(
					`SELECT COUNT(*) as count FROM ${table}`
				);
				const count = parseInt(result[0].count);
				totalRecords += count;
				console.log(
					`📋 ${table.padEnd(15)}: ${count.toLocaleString()} records`
				);
			} catch (error) {
				console.log(`❌ ${table.padEnd(15)}: Error - ${error.message}`);
			}
		}

		console.log("=".repeat(50));
		console.log(`📈 Total records: ${totalRecords.toLocaleString()}`);
		console.log("✅ Database status check completed!");
	} catch (error) {
		console.error("❌ Error checking database status:", error.message);
		throw error;
	} finally {
		await db.disconnect();
	}
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
	console.error("Unhandled Rejection at:", promise, "reason:", reason);
	process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
	console.error("Uncaught Exception:", error);
	process.exit(1);
});

// Run the status check
checkDatabaseStatus();
