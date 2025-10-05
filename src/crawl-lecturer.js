const ApiClient = require("./apiClient");
const DatabaseManager = require("./database");
const { v4: uuidv4 } = require("uuid");

class LecturerSurveyCrawler {
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

			return await this.db.insertOrGetId(
				"staff_survey_batch",
				{
					display_name: semesterData.year,
				},
				"display_name",
				"staff_survey_batch_id"
			);
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
			let classId = null;

			// Extract basic information before the loop
			const workingYearData = this.findQuestionByCode(
				responseData,
				"MHthem"
			);

			const staffSurveySheetId = await this.db.insertOrGetId(
				"staff_survey_sheet",
				{
					display_name: uuidv4(),
					working_year: workingYearData ? workingYearData.value : null,
				},
				"display_name"
			);

			const criteriaMap = new Map();
			let pointAnswers = [];
			const comments = [];

			let currentCode;

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
				currentCode = code;

				// Process criteria and sub-questions (skip basic info codes as they're already processed)
				if (
					["nganhhoc", "tenmh", "tengv", "mamh", "MHthem"].includes(code)
				) {
					continue; // Skip basic info codes as they're already processed above
				}

				if (sub_questions && Array.isArray(sub_questions) && type === "F") {
					// For questions with sub-questions, don't save the parent question
					for (let i = 0; i < sub_questions.length; i++) {
						const subQuestion = sub_questions[i];
						const criteriaId = await this.db.insertOrGetId(
							"staff_survey_criteria",
							{
								display_name: subQuestion.question,
								category: questionData.group_name,
							},
							"display_name"
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
									maxPoint: Array.from(
										Object.keys(value[subQuestion.title])
									).length,
									point: pointValue,
									index: i,
									code,
								});
							}
						}
					}
				}

				// Process comments
				if (type == "Q") {
					const comments = Array.from(Object.values(value));
					pointAnswers = pointAnswers.map((item) => {
						if (code.includes(item.code)) {
							return { ...item, comment: comments[item.index] };
						}
						return item;
					});
				}

				// Process comments
				if (type == "T") {
					const criteriaId = await this.db.insertOrGetId(
						"staff_survey_criteria",
						{
							display_name: question,
							category: questionData.group_name,
						},
						"display_name"
					);
					await this.db.insertStaffSurveyPoint({
						max_point: 0,
						point: 0,
						comment: value,
						staff_survey_criteria_id: criteriaId,
						staff_survey_sheet_id: staffSurveySheetId,
					});
				}
			}

			for (const pointAnswer of pointAnswers) {
				await this.db.insertStaffSurveyPoint({
					max_point: pointAnswer.maxPoint,
					point: pointAnswer.point,
					comment: pointAnswer.comment,
					staff_survey_criteria_id: pointAnswer.criteriaId,
					staff_survey_sheet_id: staffSurveySheetId,
				});
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
			case "MH05":
				return 4;
			default:
				return 0;
		}
	}
}

module.exports = LecturerSurveyCrawler;
