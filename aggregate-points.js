require("dotenv").config();
const DatabaseManager = require("./src/database");

class PointAggregator {
	constructor() {
		this.db = new DatabaseManager();
	}

	async aggregatePoints() {
		try {
			console.log("🔄 Starting point aggregation process...");
			console.log("=".repeat(60));

			await this.db.connect();

			// First, let's see what data we have in point_answer
			const totalPointAnswers = await this.db.executeQuery(
				"SELECT COUNT(*) as count FROM point_answer"
			);
			console.log(
				`📊 Total point_answer records: ${totalPointAnswers[0].count}`
			);

			if (parseInt(totalPointAnswers[0].count) === 0) {
				console.log(
					"❌ No data found in point_answer table. Please run the crawler first."
				);
				return;
			}

			// Query to get aggregated data grouped by criteria_id and class_id
			const aggregationQuery = `
                SELECT 
                    criteria_id,
                    class_id,
                    4 as max_point,
                    AVG(point::FLOAT) as avg_point,
                    COUNT(*) as answer_count
                FROM point_answer 
                GROUP BY criteria_id, class_id
                ORDER BY class_id, criteria_id
            `;

			console.log("🔍 Querying aggregated data...");
			const aggregatedData = await this.db.executeQuery(aggregationQuery);

			console.log(
				`📈 Found ${aggregatedData.length} unique criteria-class combinations`
			);
			console.log("-".repeat(60));

			// Insert/update aggregated data into point table using upsert
			console.log(
				"🔄 Processing aggregated data with upsert (insert/update)..."
			);
			let insertedCount = 0;
			let updatedCount = 0;
			let skippedCount = 0;

			for (const row of aggregatedData) {
				try {
					const upsertQuery = `
                    INSERT INTO point (max_point, criteria_id, class_id, point) 
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (criteria_id, class_id) 
                    DO UPDATE SET 
                        max_point = EXCLUDED.max_point,
                        point = EXCLUDED.point,
                        created_at = CURRENT_TIMESTAMP
                    RETURNING (xmax = 0) AS is_insert
                `;

					const result = await this.db.executeQuery(upsertQuery, [
						row.max_point,
						row.criteria_id,
						row.class_id,
						row.avg_point,
					]);

					// Check if it was an insert or update
					if (result[0].is_insert) {
						insertedCount++;
					} else {
						updatedCount++;
					}

					// Log progress every 50 records
					if ((insertedCount + updatedCount) % 50 === 0) {
						console.log(
							`📝 Processed ${insertedCount + updatedCount}/${
								aggregatedData.length
							} records... (${insertedCount} inserted, ${updatedCount} updated)`
						);
					}
				} catch (error) {
					skippedCount++;
					console.error(
						`❌ Error processing record for criteria_id: ${row.criteria_id}, class_id: ${row.class_id}:`,
						error.message
					);
				}
			} // Summary
			console.log("\n" + "=".repeat(60));
			console.log("📊 POINT AGGREGATION SUMMARY");
			console.log("=".repeat(60));
			console.log(
				`📈 Total combinations processed: ${aggregatedData.length}`
			);
			console.log(`✅ Successfully inserted: ${insertedCount}`);
			console.log(`🔄 Successfully updated: ${updatedCount}`);
			console.log(`❌ Skipped due to errors: ${skippedCount}`);
			console.log(
				`📈 Success rate: ${(
					((insertedCount + updatedCount) / aggregatedData.length) *
					100
				).toFixed(1)}%`
			); // Show some sample data
			console.log("\n📋 Sample aggregated data:");
			console.log("-".repeat(60));

			const sampleQuery = `
                SELECT 
                    p.point_id,
                    p.criteria_id,
                    c.display_name as criteria_name,
                    cl.display_name as class_name,
                    p.point,
                    p.max_point
                FROM point p
                JOIN criteria c ON p.criteria_id = c.criteria_id
                JOIN class cl ON p.class_id = cl.class_id
                ORDER BY p.point DESC
                LIMIT 5
            `;

			const sampleData = await this.db.executeQuery(sampleQuery);

			sampleData.forEach((row, index) => {
				console.log(`${index + 1}. ${row.class_name}`);
				console.log(`   Criteria: ${row.criteria_name}`);
				console.log(
					`   Average Point: ${parseFloat(row.point).toFixed(2)}/${
						row.max_point
					}`
				);
				console.log("");
			});

			// Final verification
			const finalCount = await this.db.executeQuery(
				"SELECT COUNT(*) as count FROM point"
			);
			console.log(
				`🎯 Final point table record count: ${finalCount[0].count}`
			);

			console.log("✅ Point aggregation completed successfully!");
		} catch (error) {
			console.error("💥 Error during point aggregation:", error);
			throw error;
		} finally {
			await this.db.disconnect();
		}
	}

	async showPointStatistics() {
		try {
			console.log("📊 Point Statistics Report");
			console.log("=".repeat(60));

			await this.db.connect();

			// Overall statistics
			const overallStats = await this.db.executeQuery(`
                SELECT 
                    COUNT(*) as total_records,
                    AVG(point) as overall_avg,
                    MIN(point) as min_point,
                    MAX(point) as max_point,
                    COUNT(DISTINCT criteria_id) as unique_criteria,
                    COUNT(DISTINCT class_id) as unique_classes
                FROM point
            `);

			const stats = overallStats[0];
			console.log(`📈 Total aggregated records: ${stats.total_records}`);
			console.log(
				`📊 Overall average point: ${parseFloat(
					stats.overall_avg || 0
				).toFixed(2)}`
			);
			console.log(
				`📉 Minimum point: ${parseFloat(stats.min_point || 0).toFixed(2)}`
			);
			console.log(
				`📈 Maximum point: ${parseFloat(stats.max_point || 0).toFixed(2)}`
			);
			console.log(`🎯 Unique criteria: ${stats.unique_criteria}`);
			console.log(`🏫 Unique classes: ${stats.unique_classes}`);

			// Top performing classes
			console.log("\n🏆 Top 5 performing classes (by average point):");
			console.log("-".repeat(60));

			const topClasses = await this.db.executeQuery(`
                SELECT 
                    cl.display_name as class_name,
                    AVG(p.point) as avg_point,
                    COUNT(*) as criteria_count
                FROM point p
                JOIN class cl ON p.class_id = cl.class_id
                GROUP BY cl.class_id, cl.display_name
                ORDER BY avg_point DESC
                LIMIT 5
            `);

			topClasses.forEach((row, index) => {
				console.log(`${index + 1}. ${row.class_name}`);
				console.log(
					`   Average: ${parseFloat(row.avg_point).toFixed(2)}/4.0 (${
						row.criteria_count
					} criteria)`
				);
			});

			// Distribution of points
			console.log("\n📊 Point distribution:");
			console.log("-".repeat(60));

			const distribution = await this.db.executeQuery(`
                SELECT 
                    grade_range,
                    COUNT(*) as count,
                    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM point), 1) as percentage
                FROM (
                    SELECT 
                        CASE 
                            WHEN point >= 3.5 THEN 'Excellent (3.5-4.0)'
                            WHEN point >= 3.0 THEN 'Good (3.0-3.49)'
                            WHEN point >= 2.5 THEN 'Average (2.5-2.99)'
                            WHEN point >= 2.0 THEN 'Below Average (2.0-2.49)'
                            ELSE 'Poor (<2.0)'
                        END as grade_range,
                        point
                    FROM point
                ) AS graded_points
                GROUP BY grade_range
                ORDER BY 
                    CASE grade_range
                        WHEN 'Excellent (3.5-4.0)' THEN 1
                        WHEN 'Good (3.0-3.49)' THEN 2
                        WHEN 'Average (2.5-2.99)' THEN 3
                        WHEN 'Below Average (2.0-2.49)' THEN 4
                        ELSE 5
                    END
            `);

			distribution.forEach((row) => {
				console.log(
					`${row.grade_range}: ${row.count} records (${row.percentage}%)`
				);
			});
		} catch (error) {
			console.error("Error generating statistics:", error);
			throw error;
		} finally {
			await this.db.disconnect();
		}
	}
}

// Handle command line arguments
async function main() {
	const aggregator = new PointAggregator();
	const args = process.argv.slice(2);

	try {
		if (args.length === 0 || args[0] === "--aggregate") {
			// Default action - aggregate points
			await aggregator.aggregatePoints();
		} else if (args[0] === "--stats") {
			// Show statistics
			await aggregator.showPointStatistics();
		} else {
			console.log("Usage:");
			console.log(
				"  node aggregate-points.js                # Aggregate point_answer data into point table"
			);
			console.log(
				"  node aggregate-points.js --aggregate    # Same as above"
			);
			console.log(
				"  node aggregate-points.js --stats        # Show point statistics"
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

module.exports = PointAggregator;
