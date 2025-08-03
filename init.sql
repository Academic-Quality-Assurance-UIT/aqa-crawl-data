-- Create database is handled by docker environment variables
-- Connect to the database
\c aqa_survey;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables in the correct order

CREATE TABLE IF NOT EXISTS semester (
    semester_id VARCHAR(255) DEFAULT uuid_generate_v4() PRIMARY KEY,
    display_name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    year VARCHAR(50) NOT NULL,
    search_string VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS faculty (
    faculty_id VARCHAR(255) DEFAULT uuid_generate_v4() PRIMARY KEY,
    display_name VARCHAR(255) NOT NULL UNIQUE,
    full_name TEXT,
    is_displayed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subject (
    subject_id VARCHAR(255) DEFAULT uuid_generate_v4() PRIMARY KEY,
    display_name VARCHAR(255) NOT NULL UNIQUE,
    faculty_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id)
);

CREATE TABLE IF NOT EXISTS lecturer (
    lecturer_id VARCHAR(255) DEFAULT uuid_generate_v4() PRIMARY KEY,
    display_name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS criteria (
    criteria_id VARCHAR(255) DEFAULT uuid_generate_v4() PRIMARY KEY,
    display_name TEXT NOT NULL,
    code VARCHAR(255) NOT NULL UNIQUE,
    index INTEGER,
    semester_id TEXT,
    semesters JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS class (
    class_id VARCHAR(255) DEFAULT uuid_generate_v4() PRIMARY KEY,
    display_name VARCHAR(255) NOT NULL,
    semester_id VARCHAR(255) NOT NULL,
    program TEXT,
    class_type VARCHAR(50),
    subject_id VARCHAR(255),
    lecturer_id VARCHAR(255),
    total_student INTEGER,
    participating_student INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (semester_id) REFERENCES semester(semester_id),
    FOREIGN KEY (subject_id) REFERENCES subject(subject_id),
    FOREIGN KEY (lecturer_id) REFERENCES lecturer(lecturer_id),
    UNIQUE(display_name, semester_id)
);

CREATE TABLE IF NOT EXISTS point_answer (
    id SERIAL PRIMARY KEY,
    max_point INTEGER NOT NULL DEFAULT 4,
    criteria_id VARCHAR(255) NOT NULL,
    class_id VARCHAR(255) NOT NULL,
    point INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (criteria_id) REFERENCES criteria(criteria_id),
    FOREIGN KEY (class_id) REFERENCES class(class_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_criteria_class ON point_answer(criteria_id, class_id);

CREATE TABLE IF NOT EXISTS point (
    point_id VARCHAR(255) DEFAULT uuid_generate_v4() PRIMARY KEY,
    max_point INTEGER NOT NULL DEFAULT 4,
    criteria_id VARCHAR(255) NOT NULL,
    class_id VARCHAR(255) NOT NULL,
    point FLOAT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (criteria_id) REFERENCES criteria(criteria_id),
    FOREIGN KEY (class_id) REFERENCES class(class_id),
    UNIQUE(criteria_id, class_id)
);

-- Create indexes for point table
CREATE INDEX IF NOT EXISTS idx_point_criteria_class ON point(criteria_id, class_id);

CREATE TABLE IF NOT EXISTS comment (
    comment_id VARCHAR(255) DEFAULT uuid_generate_v4() PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('positive', 'negative')),
    content TEXT NOT NULL,
    class_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES class(class_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_class_type ON comment(class_id, type);
CREATE INDEX IF NOT EXISTS idx_semester_search ON semester(search_string);
CREATE INDEX IF NOT EXISTS idx_class_semester ON class(semester_id);
CREATE INDEX IF NOT EXISTS idx_subject_faculty ON subject(faculty_id);
