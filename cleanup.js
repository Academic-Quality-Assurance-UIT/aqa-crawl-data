require("dotenv").config();
const DatabaseManager = require("./src/database");

async function clearDatabase() {
	const db = new DatabaseManager();

	try {
		console.log("🧹 Starting database cleanup...");
		await db.connect();

		// Delete data in reverse order of foreign key dependencies
		console.log("🗑️  Deleting comments...");
		await db.executeQuery("DELETE FROM comment");

		console.log("🗑️  Deleting points...");
		await db.executeQuery("DELETE FROM point");

		console.log("🗑️  Deleting classes...");
		await db.executeQuery("DELETE FROM class");
		console.log("🗑️  Deleting subjects...");
		await db.executeQuery("DELETE FROM subject");

		console.log("🗑️  Deleting lecturers...");
		await db.executeQuery("DELETE FROM lecturer");

		console.log("🗑️  Deleting faculties...");
		await db.executeQuery("DELETE FROM faculty");

		console.log("🗑️  Deleting criteria...");
		await db.executeQuery("DELETE FROM criteria");

		console.log("🗑️  Deleting semesters...");
		await db.executeQuery("DELETE FROM semester");

		try {
			console.log("🗑️  Deleting point answers...");
			await db.executeQuery("DELETE FROM point_answer");
		} catch (error) {
			console.warn("⚠️  Skipping point_answer deletion (may not exist)");
		}

		try {
			console.log("🗑️  Deleting staff survey batches...");
			await db.executeQuery("DELETE FROM staff_survey_batch");
		} catch (error) {
			console.warn(
				"⚠️  Skipping staff_survey_batch deletion (may not exist)"
			);
		}

		try {
			console.log("🗑️  Deleting staff survey criteria...");
			await db.executeQuery("DELETE FROM staff_survey_criteria");
		} catch (error) {
			console.warn(
				"⚠️  Skipping staff_survey_criteria deletion (may not exist)"
			);
		}

		try {
			console.log("🗑️  Deleting staff survey points...");
			await db.executeQuery("DELETE FROM staff_survey_point");
		} catch (error) {
			console.warn(
				"⚠️  Skipping staff_survey_point deletion (may not exist)"
			);
		}

		try {
			console.log("🗑️  Deleting staff survey sheets...");
			await db.executeQuery("DELETE FROM staff_survey_sheet");
		} catch (error) {
			console.warn(
				"⚠️  Skipping staff_survey_sheet deletion (may not exist)"
			);
		}

		console.log("✅ Database cleanup completed successfully!");
		console.log("📊 All tables are now empty.");
		console.log("💡 Note: UUID fields do not need sequence resets.");
	} catch (error) {
		console.error("❌ Error during database cleanup:", error.message);
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

// Run the cleanup function
clearDatabase();
