const axios = require("axios");
const https = require("https");
require("dotenv").config();

class ApiClient {
	constructor() {
		this.baseURL = process.env.API_BASE_URL;
		this.token = process.env.API_TOKEN;
		this.client = axios.create({
			baseURL: this.baseURL,
			headers: {
				Authorization: `Bearer ${this.token}`,
				"Content-Type": "application/json",
			},
			// Add HTTPS agent to handle SSL certificate issues
			httpsAgent: new https.Agent({
				rejectUnauthorized: false,
			}),
			timeout: 30000, // 30 second timeout
		});
	}

	async getSurveyAnswers(sid, page = 1) {
		try {
			console.log(`Fetching survey answers for SID: ${sid}, Page: ${page}`);

			const response = await this.client.get("", {
				params: {
					action: "getSurveyAnswers",
					sid: sid,
					page: page,
				},
			});

			console.log(`Response status: ${response.status}`);
			console.log(`Response data keys:`, Object.keys(response.data || {}));

			if (response.data && response.data.success) {
				return response.data;
			} else if (response.data) {
				// Even if success is not explicitly true, check if we have data
				console.log(`API response success field:`, response.data.success);
				return response.data;
			} else {
				throw new Error(
					`API returned no data for SID: ${sid}, Page: ${page}`
				);
			}
		} catch (error) {
			console.error(
				`Error fetching survey answers for SID: ${sid}, Page: ${page}:`
			);
			console.error(`Error type: ${error.constructor.name}`);
			console.error(`Error message: ${error.message}`);
			if (error.response) {
				console.error(`Response status: ${error.response.status}`);
				console.error(`Response data:`, error.response.data);
			}
			throw error;
		}
	}

	async getAllSurveyAnswers(sid) {
		try {
			const allData = [];
			let page = 1;
			let hasMorePages = true;

			while (hasMorePages) {
				const response = await this.getSurveyAnswers(sid, page);

				if (response.data && response.data.length > 0) {
					allData.push(...response.data);
				}

				// Check if there are more pages
				if (response.meta && response.meta.pagination) {
					const { page: currentPage, pageCount } =
						response.meta.pagination;
					hasMorePages = currentPage < pageCount;
					page++;

					console.log(
						`Page ${currentPage}/${pageCount} processed. Total records so far: ${allData.length}`
					);
				} else {
					hasMorePages = false;
				}

				// Add a small delay to avoid overwhelming the server
				if (hasMorePages) {
					await new Promise((resolve) => setTimeout(resolve, 100));
				}
			}

			console.log(
				`Completed fetching all data. Total records: ${allData.length}`
			);
			return allData;
		} catch (error) {
			console.error(
				`Error fetching all survey answers for SID: ${sid}:`,
				error.message
			);
			throw error;
		}
	}
}

module.exports = ApiClient;
