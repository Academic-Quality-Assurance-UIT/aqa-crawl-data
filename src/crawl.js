const ApiClient = require("./apiClient");
const DatabaseManager = require("./database");

class SurveyCrawler {
	constructor() {
		this.apiClient = new ApiClient();
		this.db = new DatabaseManager();
		this.processedIds = new Set();
	}

	async crawl(sid, surveyInfo = null) {
		try {
			console.log(`Starting survey crawl for SID: ${sid}`);

			// Connect to database
			await this.db.connect();

			// Process semester info if provided
			let semesterId = null;
			if (surveyInfo) {
				semesterId = await this.processSemesterInfo(surveyInfo);
			}

			// Fetch all survey data
			const surveyData = await this.apiClient.getAllSurveyAnswers(sid);

			// Fetch all survey detail data with pagination
			const surveyDetailData = await this.apiClient.getAllSurveyDetail(sid, {
				limit: 50,
			});

			// Process each response
			let processedCount = 0;
			for (const responseData of surveyData) {
				await this.processResponse(
					responseData,
					semesterId,
					surveyInfo,
					surveyDetailData
				);
				processedCount++;

				if (processedCount % 10 === 0) {
					console.log(
						`Processed ${processedCount}/${surveyData.length} responses`
					);
				}
			}

			console.log(
				`Survey crawl completed successfully. Processed ${processedCount} responses.`
			);
		} catch (error) {
			console.error("Error during survey crawl:", error);
			throw error;
		} finally {
			await this.db.disconnect();
		}
	}

	async processSemesterInfo(surveyInfo) {
		try {
			const semesterData = {
				display_name: surveyInfo.semester_name,
				type: surveyInfo.semester_type,
				year: surveyInfo.year,
				search_string: `${surveyInfo.year}, ${surveyInfo.semester_type}`,
			};

			return await this.db.insertOrGetSemester(semesterData);
		} catch (error) {
			console.error("Error processing semester info:", error);
			throw error;
		}
	}

	async processResponse(
		responseData,
		semesterId = null,
		surveyInfo = null,
		surveyDetailData = []
	) {
		try {
			// Extract basic info for this response
			let facultyId = null;
			let subjectId = null;
			let lecturerId = null;
			let classId = null;
			let className = null;

			// Extract basic information before the loop
			const facultyData = this.findQuestionByCode(responseData, "nganhhoc");
			if (facultyData && facultyData.value) {
				facultyId = await this.db.insertOrGetId(
					"faculty",
					{
						display_name: facultyData.value,
						full_name: null,
						is_displayed: true,
					},
					"display_name"
				);
			}

			const subjectData = this.findQuestionByCode(responseData, "tenmh");
			if (subjectData && subjectData.value) {
				subjectId = await this.db.insertOrGetId(
					"subject",
					{
						display_name: subjectData.value,
						faculty_id: facultyId,
					},
					"display_name"
				);
			}

			const lecturerData = this.findQuestionByCode(responseData, "tengv");
			if (lecturerData && lecturerData.value) {
				lecturerId = await this.db.insertOrGetId(
					"lecturer",
					{ display_name: lecturerData.value },
					"display_name"
				);
			}

			const classData = this.findQuestionByCode(responseData, "mamh");
			if (classData && classData.value) {
				className = classData.value;
			}

			const criteriaMap = new Map();
			const pointAnswers = [];
			const comments = [];

			// Process criteria, points, and comments
			for (const [questionId, questionData] of Object.entries(
				responseData
			)) {
				if (!questionData || typeof questionData !== "object") continue;

				const {
					code,
					question,
					value,
					sub_questions,
					sub_question_fields,
					type,
				} = questionData;

				// Process criteria and sub-questions (skip basic info codes as they're already processed)
				if (["nganhhoc", "tenmh", "tengv", "mamh"].includes(code)) {
					continue; // Skip basic info codes as they're already processed above
				}

				if (sub_questions && Array.isArray(sub_questions) && type === "F") {
					// For questions with sub-questions, don't save the parent question
					for (const subQuestion of sub_questions) {
						const criteriaId = await this.db.insertOrGetId(
							"criteria",
							{
								display_name: subQuestion.question,
								code: subQuestion.title,
								index: null,
								semester_id: null,
								semesters: [],
							},
							"code"
						);

						criteriaMap.set(subQuestion.title, criteriaId);

						// Prepare point answer data
						if (
							sub_question_fields &&
							sub_question_fields[subQuestion.title]
						) {
							const pointValue = this.convertPointValue(
								sub_question_fields[subQuestion.title]
							);
							if (pointValue > 0) {
								pointAnswers.push({
									criteriaId: criteriaId,
									point: pointValue,
								});
							}
						}
					}
				} else if (question && code && !sub_questions) {
					// Regular question without sub-questions
					const criteriaId = await this.db.insertOrGetId(
						"criteria",
						{
							display_name: question,
							code: code,
							index: null,
							semester_id: null,
							semesters: [],
						},
						"code"
					);
					criteriaMap.set(code, criteriaId);
				}

				// Process comments
				if ((code === "Q25" || code === "Q26") && value && value.trim()) {
					comments.push({
						type: code === "Q25" ? "positive" : "negative",
						content: value.trim(),
					});
				}
			}

			// Create class record now that we have all the required IDs
			if (className) {
				// Search for program in surveyDetailData by matching class name (attribute_8)
				let program = null;
				if (surveyDetailData && surveyDetailData.length > 0) {
					const matchingDetail = surveyDetailData.find(
						(detail) => detail.class_name === className
					);
					if (matchingDetail) {
						program = matchingDetail.program;
					}
				}

				const classDataToSave = {
					display_name: className,
					semester_id: semesterId,
					program: program, // Use program found from survey detail data
					class_type: surveyInfo ? surveyInfo.type : null,
					subject_id: subjectId,
					lecturer_id: lecturerId,
					total_student: null,
					participating_student: null,
				};

				console.log(`Creating class with data:`, {
					display_name: className,
					semester_id: semesterId,
					program: program,
					subject_id: subjectId,
					lecturer_id: lecturerId,
					class_type: surveyInfo ? surveyInfo.type : null,
				});

				classId = await this.db.insertOrGetClass(classDataToSave);
			}

			// Save point answers and comments if we have class info
			if (classId) {
				// Save point answers
				for (const pointAnswer of pointAnswers) {
					await this.db.insertPointAnswer({
						max_point: 4,
						criteria_id: pointAnswer.criteriaId,
						class_id: classId,
						point: pointAnswer.point,
					});
				}

				// Save comments
				for (const comment of comments) {
					await this.db.insertComment({
						type: comment.type,
						content: comment.content,
						class_id: classId,
					});
				}
			}
		} catch (error) {
			console.error("Error processing response:", error);
			throw error;
		}
	}

	findQuestionByCode(responseData, targetCode) {
		for (const [questionId, questionData] of Object.entries(responseData)) {
			if (
				questionData &&
				typeof questionData === "object" &&
				questionData.code === targetCode
			) {
				return questionData;
			}
		}
		return null;
	}

	convertPointValue(value) {
		if (!value) return 0;

		switch (value) {
			case "MH01":
				return 1;
			case "MH02":
				return 2;
			case "MH03":
				return 3;
			case "MH04":
				return 4;
			default:
				return 0;
		}
	}
}

module.exports = SurveyCrawler;
