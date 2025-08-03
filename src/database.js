const { Client } = require("pg");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

class DatabaseManager {
	constructor() {
		this.connection = null;
	}

	async connect() {
		try {
			this.connection = new Client({
				host: process.env.DB_HOST,
				port: process.env.DB_PORT,
				user: process.env.DB_USER,
				password: process.env.DB_PASSWORD,
				database: process.env.DB_NAME,
			});

			await this.connection.connect();
			console.log("Database connected successfully");
		} catch (error) {
			console.error("Database connection failed:", error);
			throw error;
		}
	}

	async disconnect() {
		if (this.connection) {
			await this.connection.end();
			console.log("Database disconnected");
		}
	}

	async executeQuery(query, params = []) {
		try {
			const result = await this.connection.query(query, params);
			return result.rows;
		} catch (error) {
			console.error("Query execution failed:", error);
			throw error;
		}
	}

	async insertOrGetId(table, data, uniqueField, idField = null) {
		try {
			// Determine the ID field name
			const actualIdField = idField || this.getIdFieldName(table);

			// Try to get existing record first
			const selectQuery = `SELECT ${actualIdField} FROM ${table} WHERE ${uniqueField} = $1`;
			const existingRecord = await this.executeQuery(selectQuery, [
				data[uniqueField],
			]);

			if (existingRecord.length > 0) {
				return existingRecord[0][actualIdField];
			}

			// Insert new record
			const fields = Object.keys(data).join(", ");
			const placeholders = Object.keys(data)
				.map((_, index) => `$${index + 1}`)
				.join(", ");
			const values = Object.values(data);

			const insertQuery = `INSERT INTO ${table} (${fields}) VALUES (${placeholders}) RETURNING ${actualIdField}`;
			const result = await this.executeQuery(insertQuery, values);
			return result[0][actualIdField];
		} catch (error) {
			if (error.code === "23505") {
				// PostgreSQL unique violation error code
				// Handle duplicate entry by getting the existing record
				const actualIdField = idField || this.getIdFieldName(table);
				const selectQuery = `SELECT ${actualIdField} FROM ${table} WHERE ${uniqueField} = $1`;
				const existingRecord = await this.executeQuery(selectQuery, [
					data[uniqueField],
				]);
				return existingRecord[0][actualIdField];
			}
			throw error;
		}
	}

	getIdFieldName(table) {
		const idFieldMap = {
			semester: "semester_id",
			faculty: "faculty_id",
			subject: "subject_id",
			lecturer: "lecturer_id",
			criteria: "criteria_id",
			class: "class_id",
			comment: "comment_id",
		};
		return idFieldMap[table] || "id";
	}

	async insertOrGetSemester(semesterData) {
		try {
			const selectQuery = `SELECT semester_id FROM semester WHERE search_string = $1`;
			const existingRecord = await this.executeQuery(selectQuery, [
				semesterData.search_string,
			]);

			if (existingRecord.length > 0) {
				return existingRecord[0].semester_id;
			}

			const insertQuery = `
				INSERT INTO semester (display_name, type, year, search_string) 
				VALUES ($1, $2, $3, $4) RETURNING semester_id
			`;
			const result = await this.executeQuery(insertQuery, [
				semesterData.display_name,
				semesterData.type,
				semesterData.year,
				semesterData.search_string,
			]);
			return result[0].semester_id;
		} catch (error) {
			if (error.code === "23505") {
				const selectQuery = `SELECT semester_id FROM semester WHERE search_string = $1`;
				const existingRecord = await this.executeQuery(selectQuery, [
					semesterData.search_string,
				]);
				return existingRecord[0].semester_id;
			}
			throw error;
		}
	}

	async insertOrGetClass(classData) {
		try {
			const selectQuery = `SELECT class_id FROM class WHERE display_name = $1 AND semester_id = $2`;
			const existingRecord = await this.executeQuery(selectQuery, [
				classData.display_name,
				classData.semester_id,
			]);

			if (existingRecord.length > 0) {
				return existingRecord[0].class_id;
			}

			const insertQuery = `
				INSERT INTO class (display_name, semester_id, program, class_type, subject_id, lecturer_id, total_student, participating_student) 
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING class_id
			`;
			const result = await this.executeQuery(insertQuery, [
				classData.display_name,
				classData.semester_id,
				classData.program,
				classData.class_type,
				classData.subject_id,
				classData.lecturer_id,
				classData.total_student,
				classData.participating_student,
			]);
			return result[0].class_id;
		} catch (error) {
			if (error.code === "23505") {
				const selectQuery = `SELECT class_id FROM class WHERE display_name = $1 AND semester_id = $2`;
				const existingRecord = await this.executeQuery(selectQuery, [
					classData.display_name,
					classData.semester_id,
				]);
				return existingRecord[0].class_id;
			}
			throw error;
		}
	}

	async insertPointAnswer(data) {
		try {
			const insertQuery = `
                INSERT INTO point_answer (max_point, criteria_id, class_id, point) 
                VALUES ($1, $2, $3, $4) RETURNING id
            `;
			const result = await this.executeQuery(insertQuery, [
				data.max_point,
				data.criteria_id,
				data.class_id,
				data.point,
			]);
			return result[0].id;
		} catch (error) {
			console.error("Error inserting point answer:", error);
			throw error;
		}
	}

	async insertComment(data) {
		try {
			const insertQuery = `
                INSERT INTO comment (type, content, class_id) 
                VALUES ($1, $2, $3) RETURNING comment_id
            `;
			const result = await this.executeQuery(insertQuery, [
				data.type,
				data.content,
				data.class_id,
			]);
			return result[0].comment_id;
		} catch (error) {
			console.error("Error inserting comment:", error);
			throw error;
		}
	}
}

module.exports = DatabaseManager;
