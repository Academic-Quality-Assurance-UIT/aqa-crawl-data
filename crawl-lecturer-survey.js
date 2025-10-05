require("dotenv").config();
const fs = require("fs");
const path = require("path");
const SurveyCrawler = require("./src/crawl");
const LecturerSurveyCrawler = require("./src/crawl-lecturer");

class BulkSurveyCrawler {
	constructor() {
		this.crawler = new SurveyCrawler();
		this.lecturerCrawler = new LecturerSurveyCrawler();
		this.surveyListPath = path.join(__dirname, "docs", "survey_list_lecturer.json");
	}

	async crawlAllSurveys() {
		try {
			console.log("🚀 Starting bulk survey crawl...");
			console.log("=".repeat(60));

			// Read survey list
			const surveyList = this.loadSurveyList();

			console.log(`📋 Found ${surveyList.length} surveys to crawl`);
			console.log("-".repeat(60));

			let processedCount = 0;
			let successCount = 0;
			let errorCount = 0;
			const errors = [];

			for (const surveyInfo of surveyList) {
				try {
					processedCount++;
					console.log(
						`\n[${processedCount}/${surveyList.length}] Processing survey:`
					);
					console.log(`  📊 SID: ${surveyInfo.sid}`);
					console.log(`  📚 Title: ${surveyInfo.title}`);
					console.log(`  📅 Semester: ${surveyInfo.semester_name}`);
					console.log(`  🎯 Type: ${surveyInfo.type}`);

					// Crawl the survey
					await this.lecturerCrawler.crawl(surveyInfo.sid, surveyInfo);

					successCount++;
					console.log(`  ✅ Success!`);
				} catch (error) {
					errorCount++;
					const errorInfo = {
						sid: surveyInfo.sid,
						title: surveyInfo.title,
						error: error.message,
					};
					errors.push(errorInfo);

					console.log(`  ❌ Error: ${error.message}`);

					// Continue with next survey instead of stopping
					continue;
				}

				// Add delay between surveys to avoid overwhelming the server
				if (processedCount < surveyList.length) {
					console.log(`  ⏳ Waiting 2 seconds before next survey...`);
					await new Promise((resolve) => setTimeout(resolve, 2000));
				}
			}

			// Print summary
			console.log("\n" + "=".repeat(60));
			console.log("📈 BULK CRAWL SUMMARY");
			console.log("=".repeat(60));
			console.log(`📊 Total surveys: ${surveyList.length}`);
			console.log(`✅ Successful: ${successCount}`);
			console.log(`❌ Failed: ${errorCount}`);
			console.log(
				`📈 Success rate: ${(
					(successCount / surveyList.length) *
					100
				).toFixed(1)}%`
			);

			if (errors.length > 0) {
				console.log("\n🚨 ERRORS:");
				console.log("-".repeat(60));
				errors.forEach((error, index) => {
					console.log(`${index + 1}. SID: ${error.sid}`);
					console.log(`   Title: ${error.title}`);
					console.log(`   Error: ${error.error}`);
					console.log("");
				});
			}

			console.log("🎉 Bulk crawl completed!");
		} catch (error) {
			console.error("💥 Fatal error during bulk crawl:", error);
			throw error;
		}
	}

	async crawlBySemester(targetSemester) {
		try {
			console.log(`🎯 Starting crawl for semester: ${targetSemester}`);
			console.log("=".repeat(60));

			const surveyList = this.loadSurveyList();
			const filteredSurveys = surveyList.filter(
				(survey) => survey.semester_name === targetSemester
			);

			if (filteredSurveys.length === 0) {
				console.log(`❌ No surveys found for semester: ${targetSemester}`);
				console.log("\nAvailable semesters:");
				const semesters = [
					...new Set(surveyList.map((s) => s.semester_name)),
				];
				semesters.forEach((semester) => console.log(`  - ${semester}`));
				return;
			}

			console.log(
				`📋 Found ${filteredSurveys.length} surveys for ${targetSemester}`
			);

			let successCount = 0;
			let errorCount = 0;

			for (const surveyInfo of filteredSurveys) {
				try {
					console.log(
						`\n📊 Processing: ${surveyInfo.title} (${surveyInfo.sid})`
					);
					await this.crawler.crawl(surveyInfo.sid, surveyInfo);
					successCount++;
					console.log(`✅ Success!`);
				} catch (error) {
					errorCount++;
					console.log(`❌ Error: ${error.message}`);
				}

				// Small delay between surveys
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}

			console.log(`\n📈 Semester ${targetSemester} Summary:`);
			console.log(
				`✅ Successful: ${successCount}/${filteredSurveys.length}`
			);
			console.log(`❌ Failed: ${errorCount}/${filteredSurveys.length}`);
		} catch (error) {
			console.error("Error during semester crawl:", error);
			throw error;
		}
	}

	async crawlByYear(targetYear) {
		try {
			console.log(`📅 Starting crawl for year: ${targetYear}`);
			console.log("=".repeat(60));

			const surveyList = this.loadSurveyList();
			const filteredSurveys = surveyList.filter(
				(survey) => survey.year === targetYear
			);

			if (filteredSurveys.length === 0) {
				console.log(`❌ No surveys found for year: ${targetYear}`);
				console.log("\nAvailable years:");
				const years = [...new Set(surveyList.map((s) => s.year))];
				years.forEach((year) => console.log(`  - ${year}`));
				return;
			}

			console.log(
				`📋 Found ${filteredSurveys.length} surveys for ${targetYear}`
			);

			let successCount = 0;
			let errorCount = 0;

			for (const surveyInfo of filteredSurveys) {
				try {
					console.log(
						`\n📊 Processing: ${surveyInfo.title} (${surveyInfo.sid})`
					);
					await this.crawler.crawl(surveyInfo.sid, surveyInfo);
					successCount++;
					console.log(`✅ Success!`);
				} catch (error) {
					errorCount++;
					console.log(`❌ Error: ${error.message}`);
				}

				await new Promise((resolve) => setTimeout(resolve, 1000));
			}

			console.log(`\n📈 Year ${targetYear} Summary:`);
			console.log(
				`✅ Successful: ${successCount}/${filteredSurveys.length}`
			);
			console.log(`❌ Failed: ${errorCount}/${filteredSurveys.length}`);
		} catch (error) {
			console.error("Error during year crawl:", error);
			throw error;
		}
	}

	loadSurveyList() {
		try {
			if (!fs.existsSync(this.surveyListPath)) {
				throw new Error(
					`Survey list file not found: ${this.surveyListPath}`
				);
			}

			const fileContent = fs.readFileSync(this.surveyListPath, "utf8");
			const surveyList = JSON.parse(fileContent);

			if (!Array.isArray(surveyList)) {
				throw new Error("Survey list must be an array");
			}

			return surveyList;
		} catch (error) {
			console.error("Error loading survey list:", error);
			throw error;
		}
	}

	listAvailableSurveys() {
		try {
			const surveyList = this.loadSurveyList();

			console.log("📋 Available Surveys:");
			console.log("=".repeat(80));

			const groupedBySemester = {};
			surveyList.forEach((survey) => {
				if (!groupedBySemester[survey.semester_name]) {
					groupedBySemester[survey.semester_name] = [];
				}
				groupedBySemester[survey.semester_name].push(survey);
			});

			Object.keys(groupedBySemester)
				.sort()
				.forEach((semester) => {
					console.log(`\n📅 ${semester}:`);
					groupedBySemester[semester].forEach((survey) => {
						console.log(
							`  📊 ${survey.sid} - ${survey.type} - ${survey.title}`
						);
					});
				});

			console.log(`\n📈 Total: ${surveyList.length} surveys`);
			console.log(`📅 Semesters: ${Object.keys(groupedBySemester).length}`);
		} catch (error) {
			console.error("Error listing surveys:", error);
			throw error;
		}
	}
}

// Handle command line arguments
async function main() {
	const bulkCrawler = new BulkSurveyCrawler();
	const args = process.argv.slice(2);

	try {
		if (args.length === 0) {
			// No arguments - crawl all surveys
			await bulkCrawler.crawlAllSurveys();
		} else if (args[0] === "--list") {
			// List available surveys
			bulkCrawler.listAvailableSurveys();
		} else if (args[0] === "--semester" && args[1]) {
			// Crawl specific semester
			await bulkCrawler.crawlBySemester(args[1]);
		} else if (args[0] === "--year" && args[1]) {
			// Crawl specific year
			await bulkCrawler.crawlByYear(args[1]);
		} else {
			console.log("Usage:");
			console.log(
				"  node crawl-all.js                    # Crawl all surveys"
			);
			console.log(
				"  node crawl-all.js --list             # List available surveys"
			);
			console.log(
				'  node crawl-all.js --semester "HK1, 2024-2025"  # Crawl specific semester'
			);
			console.log(
				'  node crawl-all.js --year "2024-2025" # Crawl specific year'
			);
		}
	} catch (error) {
		console.error("💥 Fatal error:", error.message);
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

// Run if this file is executed directly
if (require.main === module) {
	main();
}

module.exports = BulkSurveyCrawler;
