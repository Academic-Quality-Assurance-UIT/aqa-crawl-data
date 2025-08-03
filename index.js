require("dotenv").config();
const SurveyCrawler = require("./src/crawl");

async function main() {
	const sid = process.argv[2] || "482311"; // Default SID from the requirement

	console.log("=".repeat(50));
	console.log("AQA Survey Data Crawler");
	console.log("=".repeat(50));
	console.log(`Survey ID: ${sid}`);
	console.log(`Started at: ${new Date().toISOString()}`);
	console.log("-".repeat(50));

	const crawler = new SurveyCrawler();

	try {
		await crawler.crawl(sid);
		console.log("-".repeat(50));
		console.log("✅ Survey crawl completed successfully!");
		console.log(`Completed at: ${new Date().toISOString()}`);
	} catch (error) {
		console.error("-".repeat(50));
		console.error("❌ Survey crawl failed:");
		console.error(error.message);
		console.error("-".repeat(50));
		process.exit(1);
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

// Run the main function
main();
