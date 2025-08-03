# AQA Survey Data Crawler

This project cr## Available Scripts

-  `npm start` or `npm run crawl` -## Database Schema

The application creates the following tables with UUID primary keys:

-  **semester**: Survey semester information (semester_id, display_name, type, year, search_string)
-  **criteria**: Survey criteria/questions (criteria_id, display_name, code, index, semester_id, semesters)
-  **faculty**: Academic faculties (faculty_id, display_name, full_name, is_displayed)
-  **subject**: Academic subjects (subject_id, display_name, faculty_id)
-  **lecturer**: Lecturers/instructors (lecturer_id, display_name)
-  **class**: Academic classes (class_id, display_name, semester_id, program, class_type, subject_id, lecturer_id, total_student, participating_student)
-  **point_answer**: Point-based answers to survey questions
-  **comment**: Text comments (comment_id, type, content, class_id) - positive/negative feedbackrvey crawler with default SID (831799)
-  `npm run crawl-all` - Crawl all surveys from survey_list.json
-  `npm run crawl-list` - List all available surveys from survey_list.json
-  `npm run cleanup` or `npm run clear` - Remove all data from database
-  `npm run status` - Check database status and record counts
-  `npm run dev` - Run with nodemon for development

## Bulk Survey Crawling

The project now supports crawling multiple surveys at once using the survey list:

### Crawl All Surveys

```bash
npm run crawl-all
```

### List Available Surveys

```bash
npm run crawl-list
```

### Crawl Specific Semester

```bash
node crawl-all.js --semester "HK1, 2024-2025"
```

### Crawl Specific Year

````bash
node crawl-all.js --year "2024-2025"
```urvey data from the UIT Survey API and stores it in a PostgreSQL database.

## Prerequisites

-  Node.js (v14 or higher)
-  Docker and Docker Compose
-  Git

## Installation

1. Clone the repository and navigate to the project directory:

```bash
cd /path/to/AQA
````

2. Install dependencies:

```bash
npm install
```

3. Start the database:

```bash
docker-compose up -d
```

4. Wait for the database to be ready (about 30 seconds), then run the crawler:

```bash
npm start
```

Or to crawl a specific survey ID:

```bash
node index.js 831799
```

## Available Scripts

-  `npm start` or `npm run crawl` - Run the survey crawler with default SID (831799)
-  `npm run cleanup` or `npm run clear` - Remove all data from database and reset sequences
-  `npm run status` - Check database status and record counts
-  `npm run dev` - Run with nodemon for development

## Project Structure

```
AQA/
├── src/
│   ├── crawl.js          # Main crawler logic
│   ├── apiClient.js      # API client for survey data
│   └── database.js       # Database operations
├── docs/
│   ├── README.md         # API documentation
│   └── sample_response.json # Sample API response
├── docker-compose.yml    # Database configuration
├── init.sql             # Database schema
├── .env                 # Environment variables
├── package.json         # Project dependencies
└── index.js            # Main entry point
```

## Database Schema

The application creates the following tables:

-  **criteria**: Survey criteria/questions
-  **faculty**: Academic faculties
-  **subject**: Academic subjects
-  **lecturer**: Lecturers/instructors
-  **class**: Academic classes
-  **point_answer**: Point-based answers to survey questions
-  **comment**: Text comments (positive/negative feedback)

## Features

-  Fetches survey data from UIT Survey API with pagination
-  Processes complex survey responses with sub-questions
-  Handles database constraints and duplicate prevention
-  Stores point-based answers and text comments separately
-  Comprehensive error handling and logging

## Environment Variables

The following environment variables are configured in `.env`:

-  `DB_HOST`: Database host (default: localhost)
-  `DB_PORT`: Database port (default: 5432)
-  `DB_NAME`: Database name (default: aqa_survey)
-  `DB_USER`: Database user (default: aqa_user)
-  `DB_PASSWORD`: Database password (default: aqa_password)
-  `API_BASE_URL`: Survey API base URL
-  `API_TOKEN`: Authentication token for the API

## Usage

### Start Database

```bash
docker-compose up -d
```

### Run Crawler

```bash
# Use default SID (831799)
npm start

# Use specific SID
node index.js 988287
```

### Check Database Status

```bash
npm run status
```

### Clear All Data

```bash
npm run cleanup
```

### Stop Database

### Stop Database

```bash
docker-compose down
```

## API Information

The crawler uses the 8th API endpoint from the documentation:

-  **Endpoint**: `GET https://survey.uit.edu.vn/api/survey_api.php?action=getSurveyAnswers`
-  **Authentication**: Bearer token (configured in .env)
-  **Pagination**: Automatically handles multiple pages

## Data Processing

1. **Basic Information Extraction**:

   -  Faculty name (code: `nganhhoc`)
   -  Subject name (code: `tenmh`)
   -  Lecturer name (code: `tengv`)
   -  Class name (code: `mamh`)

2. **Survey Responses**:

   -  Point-based answers for questions with sub-questions (type F)
   -  Text comments for questions Q25 (positive) and Q26 (negative)

3. **Database Storage Order**:
   1. Semester
   2. Criteria
   3. Faculty
   4. Subject
   5. Lecturer
   6. Class
   7. Point answers
   8. Comments

## Error Handling

-  Database connection failures
-  API request failures
-  Duplicate entry prevention
-  Graceful shutdown on errors
