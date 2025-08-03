--
-- PostgreSQL database dump
--

-- Dumped from database version 16.3 (Debian 16.3-1.pgdg120+1)
-- Dumped by pg_dump version 16.9 (Ubuntu 16.9-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: btree_gin; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gin WITH SCHEMA public;


--
-- Name: EXTENSION btree_gin; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION btree_gin IS 'support for indexing common datatypes in GIN';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: unaccent; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;


--
-- Name: EXTENSION unaccent; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION unaccent IS 'text search dictionary that removes accents';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: user_entity_role_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_entity_role_enum AS ENUM (
    'LECTURER',
    'FACULTY',
    'FULL_ACCESS',
    'ADMIN'
);


--
-- Name: u(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.u(content character varying) RETURNS character varying
    LANGUAGE sql IMMUTABLE
    AS $$select to_tsvector(unaccent(content));$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: class; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class (
    class_id character varying NOT NULL,
    display_name character varying NOT NULL,
    semester_id character varying NOT NULL,
    program character varying NOT NULL,
    class_type character varying NOT NULL,
    subject_id character varying NOT NULL,
    lecturer_id character varying NOT NULL,
    total_student integer NOT NULL,
    participating_student integer NOT NULL
);


--
-- Name: comment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comment (
    comment_id character varying NOT NULL,
    content character varying NOT NULL,
    type character varying NOT NULL,
    class_id character varying
);


--
-- Name: criteria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.criteria (
    criteria_id character varying NOT NULL,
    display_name character varying NOT NULL,
    index integer,
    semester_id character varying
);


--
-- Name: faculty; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faculty (
    faculty_id character varying NOT NULL,
    display_name character varying NOT NULL,
    full_name character varying,
    is_displayed boolean DEFAULT true NOT NULL
);


--
-- Name: lecturer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lecturer (
    lecturer_id character varying NOT NULL,
    display_name character varying,
    mscb character varying,
    faculty_id character varying,
    username character varying,
    learning_position character varying,
    birth_date timestamp without time zone,
    gender boolean,
    learning character varying,
    email character varying,
    phone character varying,
    ngach character varying,
    "position" character varying
);


--
-- Name: permission_entity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permission_entity (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    lecture_id character varying NOT NULL,
    faculty_id character varying NOT NULL
);


--
-- Name: permission_entity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permission_entity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permission_entity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permission_entity_id_seq OWNED BY public.permission_entity.id;


--
-- Name: point; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point (
    point_id character varying NOT NULL,
    max_point integer NOT NULL,
    criteria_id character varying NOT NULL,
    class_id character varying,
    point double precision NOT NULL
);


--
-- Name: semester; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.semester (
    semester_id character varying NOT NULL,
    display_name character varying NOT NULL,
    type character varying NOT NULL,
    year character varying NOT NULL
);


--
-- Name: staff_survey_batch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_survey_batch (
    display_name character varying,
    staff_survey_batch_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    updated_at timestamp with time zone
);


--
-- Name: staff_survey_criteria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_survey_criteria (
    display_name character varying NOT NULL,
    category character varying NOT NULL,
    index integer,
    staff_survery_criteria_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    semesters text[] DEFAULT '{}'::text[] NOT NULL
);


--
-- Name: staff_survey_point; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_survey_point (
    max_point integer NOT NULL,
    point integer NOT NULL,
    comment character varying,
    staff_survery_criteria_id uuid,
    staff_survery_point_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    staff_survey_sheet_id uuid
);


--
-- Name: staff_survey_sheet; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_survey_sheet (
    display_name character varying,
    mscb character varying,
    birth character varying,
    gender boolean,
    academic_degree character varying,
    academic_title character varying,
    additional_comment character varying,
    staff_survey_batch_id uuid,
    staff_survey_sheet_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    faculty character varying
);


--
-- Name: subject; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subject (
    subject_id character varying NOT NULL,
    display_name character varying,
    faculty_id character varying NOT NULL
);


--
-- Name: user_entity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_entity (
    username character varying NOT NULL,
    password character varying NOT NULL,
    "displayName" character varying DEFAULT ''::character varying,
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    role public.user_entity_role_enum NOT NULL,
    "facultyFacultyId" character varying,
    "lastAccess" timestamp with time zone DEFAULT '2025-07-11 03:12:23.342+00'::timestamp with time zone,
    "lecturerLecturerId" character varying,
    "lastSendEmail" timestamp with time zone DEFAULT '2025-07-11 03:12:23.342+00'::timestamp with time zone
);


--
-- Name: permission_entity id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_entity ALTER COLUMN id SET DEFAULT nextval('public.permission_entity_id_seq'::regclass);


--
-- Name: semester PK_06f44a368424d5968fb2da79e18; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semester
    ADD CONSTRAINT "PK_06f44a368424d5968fb2da79e18" PRIMARY KEY (semester_id);


--
-- Name: staff_survey_batch PK_1839f176f895ddcebf8bbb88065; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_survey_batch
    ADD CONSTRAINT "PK_1839f176f895ddcebf8bbb88065" PRIMARY KEY (staff_survey_batch_id);


--
-- Name: class PK_4265c685fe8a9043bd8d400ad58; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class
    ADD CONSTRAINT "PK_4265c685fe8a9043bd8d400ad58" PRIMARY KEY (class_id);


--
-- Name: permission_entity PK_57a5504c7abcb1d2a9c82ae6f48; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_entity
    ADD CONSTRAINT "PK_57a5504c7abcb1d2a9c82ae6f48" PRIMARY KEY (id);


--
-- Name: comment PK_6a9f9bf1cf9a09107d3224a0e9a; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment
    ADD CONSTRAINT "PK_6a9f9bf1cf9a09107d3224a0e9a" PRIMARY KEY (comment_id);


--
-- Name: subject PK_70fbdd4144f3fc91373a93fe04a; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subject
    ADD CONSTRAINT "PK_70fbdd4144f3fc91373a93fe04a" PRIMARY KEY (subject_id);


--
-- Name: faculty PK_8339473e71533d4789bccccca06; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faculty
    ADD CONSTRAINT "PK_8339473e71533d4789bccccca06" PRIMARY KEY (faculty_id);


--
-- Name: staff_survey_sheet PK_887aacc835bdcd48576140fd225; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_survey_sheet
    ADD CONSTRAINT "PK_887aacc835bdcd48576140fd225" PRIMARY KEY (staff_survey_sheet_id);


--
-- Name: criteria PK_affb46f7985a6bec7d3d0f2b0fe; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.criteria
    ADD CONSTRAINT "PK_affb46f7985a6bec7d3d0f2b0fe" PRIMARY KEY (criteria_id);


--
-- Name: user_entity PK_b54f8ea623b17094db7667d8206; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_entity
    ADD CONSTRAINT "PK_b54f8ea623b17094db7667d8206" PRIMARY KEY (id);


--
-- Name: lecturer PK_db3ca2d6ec6a1c0c84d283a0a65; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lecturer
    ADD CONSTRAINT "PK_db3ca2d6ec6a1c0c84d283a0a65" PRIMARY KEY (lecturer_id);


--
-- Name: staff_survey_point PK_dec0bbfc2c04d38a358b4414cda; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_survey_point
    ADD CONSTRAINT "PK_dec0bbfc2c04d38a358b4414cda" PRIMARY KEY (staff_survery_point_id);


--
-- Name: staff_survey_criteria PK_efa43d5d5bd4811a24677a0eeda; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_survey_criteria
    ADD CONSTRAINT "PK_efa43d5d5bd4811a24677a0eeda" PRIMARY KEY (staff_survery_criteria_id);


--
-- Name: point PK_f900d38873a4023760b39e9132c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point
    ADD CONSTRAINT "PK_f900d38873a4023760b39e9132c" PRIMARY KEY (point_id);


--
-- Name: staff_survey_criteria UQ_4f43324ccb9784d1a65886746bb; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_survey_criteria
    ADD CONSTRAINT "UQ_4f43324ccb9784d1a65886746bb" UNIQUE (display_name, category);


--
-- Name: staff_survey_batch UQ_d0cc10edc95b69c09a0f0805f18; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_survey_batch
    ADD CONSTRAINT "UQ_d0cc10edc95b69c09a0f0805f18" UNIQUE (display_name);


--
-- Name: user_entity FK_0d7e1606d988336ac7c4485b4e3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_entity
    ADD CONSTRAINT "FK_0d7e1606d988336ac7c4485b4e3" FOREIGN KEY ("facultyFacultyId") REFERENCES public.faculty(faculty_id);


--
-- Name: point FK_154e6c0dea87abee2bd48e244cb; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point
    ADD CONSTRAINT "FK_154e6c0dea87abee2bd48e244cb" FOREIGN KEY (criteria_id) REFERENCES public.criteria(criteria_id);


--
-- Name: class FK_2c2897c87a5839e7c6dfb738af3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class
    ADD CONSTRAINT "FK_2c2897c87a5839e7c6dfb738af3" FOREIGN KEY (subject_id) REFERENCES public.subject(subject_id);


--
-- Name: staff_survey_sheet FK_2e048981496cf885c2225ce7f55; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_survey_sheet
    ADD CONSTRAINT "FK_2e048981496cf885c2225ce7f55" FOREIGN KEY (staff_survey_batch_id) REFERENCES public.staff_survey_batch(staff_survey_batch_id);


--
-- Name: criteria FK_2f215cf70be2bf2a47f58e9022c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.criteria
    ADD CONSTRAINT "FK_2f215cf70be2bf2a47f58e9022c" FOREIGN KEY (semester_id) REFERENCES public.semester(semester_id);


--
-- Name: point FK_308b41e9b0d14fd5da369ee6450; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point
    ADD CONSTRAINT "FK_308b41e9b0d14fd5da369ee6450" FOREIGN KEY (class_id) REFERENCES public.class(class_id);


--
-- Name: user_entity FK_321ec983d872275190a317d6b2a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_entity
    ADD CONSTRAINT "FK_321ec983d872275190a317d6b2a" FOREIGN KEY ("lecturerLecturerId") REFERENCES public.lecturer(lecturer_id);


--
-- Name: staff_survey_point FK_396481a2b4cdf766c9d616eea09; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_survey_point
    ADD CONSTRAINT "FK_396481a2b4cdf766c9d616eea09" FOREIGN KEY (staff_survery_criteria_id) REFERENCES public.staff_survey_criteria(staff_survery_criteria_id);


--
-- Name: comment FK_57f58603a2274983ccda5825708; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment
    ADD CONSTRAINT "FK_57f58603a2274983ccda5825708" FOREIGN KEY (class_id) REFERENCES public.class(class_id);


--
-- Name: subject FK_5c7c16e41339f8c24e898803831; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subject
    ADD CONSTRAINT "FK_5c7c16e41339f8c24e898803831" FOREIGN KEY (faculty_id) REFERENCES public.faculty(faculty_id);


--
-- Name: class FK_726337d5368f4cc1c3d83e1f79f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class
    ADD CONSTRAINT "FK_726337d5368f4cc1c3d83e1f79f" FOREIGN KEY (semester_id) REFERENCES public.semester(semester_id);


--
-- Name: lecturer FK_a9fb35131b3d66ecf1fb25c5cd6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lecturer
    ADD CONSTRAINT "FK_a9fb35131b3d66ecf1fb25c5cd6" FOREIGN KEY (faculty_id) REFERENCES public.faculty(faculty_id);


--
-- Name: class FK_b4b714ce38fee005e3865656974; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class
    ADD CONSTRAINT "FK_b4b714ce38fee005e3865656974" FOREIGN KEY (lecturer_id) REFERENCES public.lecturer(lecturer_id);


--
-- Name: staff_survey_point FK_f8fa973a34a75a1a0c41ba8f3df; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_survey_point
    ADD CONSTRAINT "FK_f8fa973a34a75a1a0c41ba8f3df" FOREIGN KEY (staff_survey_sheet_id) REFERENCES public.staff_survey_sheet(staff_survey_sheet_id);


--
-- PostgreSQL database dump complete
--

