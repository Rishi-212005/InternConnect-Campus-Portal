CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
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



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'student',
    'recruiter',
    'placement',
    'faculty',
    'admin'
);


--
-- Name: application_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.application_status AS ENUM (
    'pending',
    'faculty_approved',
    'faculty_rejected',
    'applied',
    'shortlisted',
    'interview',
    'selected',
    'rejected'
);


--
-- Name: job_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.job_status AS ENUM (
    'draft',
    'pending_verification',
    'active',
    'closed'
);


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(_user_id uuid) RETURNS public.app_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    student_id uuid NOT NULL,
    status public.application_status DEFAULT 'pending'::public.application_status,
    faculty_id uuid,
    faculty_approved_at timestamp with time zone,
    faculty_notes text,
    recruiter_notes text,
    match_score integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    duration_minutes integer DEFAULT 60 NOT NULL,
    passing_score integer DEFAULT 60 NOT NULL,
    max_attempts integer DEFAULT 1,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    status text DEFAULT 'draft'::text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT assessments_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'active'::text, 'completed'::text])))
);


--
-- Name: code_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.code_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attempt_id uuid NOT NULL,
    question_id uuid NOT NULL,
    code text NOT NULL,
    language text DEFAULT 'javascript'::text,
    test_cases_passed integer DEFAULT 0,
    total_test_cases integer DEFAULT 0,
    score integer DEFAULT 0,
    execution_time_ms integer,
    output text,
    error text,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: coding_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coding_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_id uuid NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    difficulty text DEFAULT 'medium'::text,
    constraints text,
    examples text,
    starter_code text,
    test_cases jsonb DEFAULT '[]'::jsonb NOT NULL,
    expected_output text,
    points integer DEFAULT 50,
    time_limit_seconds integer DEFAULT 5,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT coding_questions_difficulty_check CHECK ((difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text])))
);


--
-- Name: exam_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_id uuid NOT NULL,
    student_id uuid NOT NULL,
    application_id uuid,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    submitted_at timestamp with time zone,
    total_score integer DEFAULT 0,
    percentage_score numeric(5,2) DEFAULT 0,
    status text DEFAULT 'in_progress'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT exam_attempts_status_check CHECK ((status = ANY (ARRAY['in_progress'::text, 'submitted'::text, 'evaluated'::text, 'passed'::text, 'failed'::text])))
);


--
-- Name: faculty_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faculty_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    employee_id text,
    department text,
    designation text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_approved boolean
);


--
-- Name: interview_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interview_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    scheduled_at timestamp with time zone NOT NULL,
    duration_minutes integer DEFAULT 60,
    meeting_link text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    interview_status text DEFAULT 'scheduled'::text,
    scheduled_by uuid,
    CONSTRAINT interview_schedules_interview_status_check CHECK ((interview_status = ANY (ARRAY['scheduled'::text, 'completed'::text, 'cancelled'::text, 'rescheduled'::text])))
);


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recruiter_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    company_name text NOT NULL,
    location text,
    job_type text DEFAULT 'Full-time'::text,
    salary_min integer,
    salary_max integer,
    required_skills text[],
    min_cgpa numeric(3,2),
    deadline timestamp with time zone,
    status public.job_status DEFAULT 'pending_verification'::public.job_status,
    verified_by uuid,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: mentor_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mentor_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    mentor_id uuid NOT NULL,
    department text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    link text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: recruiter_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recruiter_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    company_name text NOT NULL,
    company_logo_url text,
    company_website text,
    designation text,
    is_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: student_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    roll_number text,
    department text,
    year_of_study integer,
    cgpa numeric(3,2),
    skills text[],
    resume_url text,
    linkedin_url text,
    github_url text,
    is_verified boolean,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: applications applications_job_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_job_id_student_id_key UNIQUE (job_id, student_id);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: assessments assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_pkey PRIMARY KEY (id);


--
-- Name: code_submissions code_submissions_attempt_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_submissions
    ADD CONSTRAINT code_submissions_attempt_id_question_id_key UNIQUE (attempt_id, question_id);


--
-- Name: code_submissions code_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_submissions
    ADD CONSTRAINT code_submissions_pkey PRIMARY KEY (id);


--
-- Name: coding_questions coding_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coding_questions
    ADD CONSTRAINT coding_questions_pkey PRIMARY KEY (id);


--
-- Name: exam_attempts exam_attempts_assessment_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_attempts
    ADD CONSTRAINT exam_attempts_assessment_id_student_id_key UNIQUE (assessment_id, student_id);


--
-- Name: exam_attempts exam_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_attempts
    ADD CONSTRAINT exam_attempts_pkey PRIMARY KEY (id);


--
-- Name: faculty_profiles faculty_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faculty_profiles
    ADD CONSTRAINT faculty_profiles_pkey PRIMARY KEY (id);


--
-- Name: faculty_profiles faculty_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faculty_profiles
    ADD CONSTRAINT faculty_profiles_user_id_key UNIQUE (user_id);


--
-- Name: interview_schedules interview_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_schedules
    ADD CONSTRAINT interview_schedules_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: mentor_requests mentor_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_requests
    ADD CONSTRAINT mentor_requests_pkey PRIMARY KEY (id);


--
-- Name: mentor_requests mentor_requests_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mentor_requests
    ADD CONSTRAINT mentor_requests_student_id_key UNIQUE (student_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: recruiter_profiles recruiter_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recruiter_profiles
    ADD CONSTRAINT recruiter_profiles_pkey PRIMARY KEY (id);


--
-- Name: recruiter_profiles recruiter_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recruiter_profiles
    ADD CONSTRAINT recruiter_profiles_user_id_key UNIQUE (user_id);


--
-- Name: student_profiles student_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_pkey PRIMARY KEY (id);


--
-- Name: student_profiles student_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_user_id_key UNIQUE (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_mentor_requests_mentor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mentor_requests_mentor_id ON public.mentor_requests USING btree (mentor_id);


--
-- Name: idx_mentor_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mentor_requests_status ON public.mentor_requests USING btree (status);


--
-- Name: idx_mentor_requests_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mentor_requests_student_id ON public.mentor_requests USING btree (student_id);


--
-- Name: applications update_applications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: assessments update_assessments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: faculty_profiles update_faculty_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_faculty_profiles_updated_at BEFORE UPDATE ON public.faculty_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: jobs update_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: mentor_requests update_mentor_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_mentor_requests_updated_at BEFORE UPDATE ON public.mentor_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: recruiter_profiles update_recruiter_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_recruiter_profiles_updated_at BEFORE UPDATE ON public.recruiter_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: student_profiles update_student_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: applications applications_faculty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_faculty_id_fkey FOREIGN KEY (faculty_id) REFERENCES auth.users(id);


--
-- Name: applications applications_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: applications applications_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_student_id_fkey FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: assessments assessments_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: code_submissions code_submissions_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_submissions
    ADD CONSTRAINT code_submissions_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.exam_attempts(id) ON DELETE CASCADE;


--
-- Name: code_submissions code_submissions_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_submissions
    ADD CONSTRAINT code_submissions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.coding_questions(id) ON DELETE CASCADE;


--
-- Name: coding_questions coding_questions_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coding_questions
    ADD CONSTRAINT coding_questions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;


--
-- Name: exam_attempts exam_attempts_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_attempts
    ADD CONSTRAINT exam_attempts_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;


--
-- Name: exam_attempts exam_attempts_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_attempts
    ADD CONSTRAINT exam_attempts_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;


--
-- Name: faculty_profiles faculty_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faculty_profiles
    ADD CONSTRAINT faculty_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: interview_schedules interview_schedules_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_schedules
    ADD CONSTRAINT interview_schedules_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;


--
-- Name: interview_schedules interview_schedules_scheduled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_schedules
    ADD CONSTRAINT interview_schedules_scheduled_by_fkey FOREIGN KEY (scheduled_by) REFERENCES auth.users(id);


--
-- Name: jobs jobs_recruiter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_recruiter_id_fkey FOREIGN KEY (recruiter_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: jobs jobs_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES auth.users(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: recruiter_profiles recruiter_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recruiter_profiles
    ADD CONSTRAINT recruiter_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: student_profiles student_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: faculty_profiles All authenticated users can view faculty profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All authenticated users can view faculty profiles" ON public.faculty_profiles FOR SELECT TO authenticated USING (true);


--
-- Name: profiles All authenticated users can view profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All authenticated users can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);


--
-- Name: recruiter_profiles All authenticated users can view recruiter profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All authenticated users can view recruiter profiles" ON public.recruiter_profiles FOR SELECT TO authenticated USING (true);


--
-- Name: jobs Everyone can view active jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view active jobs" ON public.jobs FOR SELECT USING ((status = 'active'::public.job_status));


--
-- Name: student_profiles Faculty and placement can view student profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Faculty and placement can view student profiles" ON public.student_profiles FOR SELECT USING ((public.has_role(auth.uid(), 'faculty'::public.app_role) OR public.has_role(auth.uid(), 'placement'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'recruiter'::public.app_role)));


--
-- Name: faculty_profiles Faculty can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Faculty can insert their own profile" ON public.faculty_profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: applications Faculty can update applications for approval; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Faculty can update applications for approval" ON public.applications FOR UPDATE USING ((public.has_role(auth.uid(), 'faculty'::public.app_role) OR public.has_role(auth.uid(), 'placement'::public.app_role)));


--
-- Name: mentor_requests Faculty can update their mentor requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Faculty can update their mentor requests" ON public.mentor_requests FOR UPDATE USING ((public.has_role(auth.uid(), 'faculty'::public.app_role) AND (auth.uid() = mentor_id)));


--
-- Name: faculty_profiles Faculty can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Faculty can update their own profile" ON public.faculty_profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: applications Faculty can view applications they need to approve; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Faculty can view applications they need to approve" ON public.applications FOR SELECT USING ((public.has_role(auth.uid(), 'faculty'::public.app_role) OR public.has_role(auth.uid(), 'placement'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: assessments Faculty can view assessments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Faculty can view assessments" ON public.assessments FOR SELECT USING (public.has_role(auth.uid(), 'faculty'::public.app_role));


--
-- Name: exam_attempts Faculty can view attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Faculty can view attempts" ON public.exam_attempts FOR SELECT USING (public.has_role(auth.uid(), 'faculty'::public.app_role));


--
-- Name: mentor_requests Faculty can view their mentor requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Faculty can view their mentor requests" ON public.mentor_requests FOR SELECT USING ((public.has_role(auth.uid(), 'faculty'::public.app_role) AND (auth.uid() = mentor_id)));


--
-- Name: faculty_profiles Faculty can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Faculty can view their own profile" ON public.faculty_profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: assessments Placement and admin can manage assessments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Placement and admin can manage assessments" ON public.assessments USING ((public.has_role(auth.uid(), 'placement'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: coding_questions Placement and admin can manage questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Placement and admin can manage questions" ON public.coding_questions USING ((public.has_role(auth.uid(), 'placement'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: exam_attempts Placement and admin can view all attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Placement and admin can view all attempts" ON public.exam_attempts FOR SELECT USING ((public.has_role(auth.uid(), 'placement'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: code_submissions Placement and admin can view all submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Placement and admin can view all submissions" ON public.code_submissions FOR SELECT USING ((public.has_role(auth.uid(), 'placement'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: interview_schedules Placement can manage interviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Placement can manage interviews" ON public.interview_schedules TO authenticated USING ((public.has_role(auth.uid(), 'placement'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'placement'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: faculty_profiles Placement can update faculty approval; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Placement can update faculty approval" ON public.faculty_profiles FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'placement'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'placement'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: jobs Placement can update jobs for verification; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Placement can update jobs for verification" ON public.jobs FOR UPDATE USING ((public.has_role(auth.uid(), 'placement'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: student_profiles Placement can update student verification; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Placement can update student verification" ON public.student_profiles FOR UPDATE USING ((public.has_role(auth.uid(), 'placement'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'placement'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: jobs Placement can view all jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Placement can view all jobs" ON public.jobs FOR SELECT USING ((public.has_role(auth.uid(), 'placement'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: mentor_requests Placement can view all mentor requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Placement can view all mentor requests" ON public.mentor_requests FOR SELECT USING ((public.has_role(auth.uid(), 'placement'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: faculty_profiles Placement can view faculty profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Placement can view faculty profiles" ON public.faculty_profiles FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'placement'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR (user_id = auth.uid())));


--
-- Name: interview_schedules Recruiters can insert interviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Recruiters can insert interviews" ON public.interview_schedules FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.applications a
     JOIN public.jobs j ON ((j.id = a.job_id)))
  WHERE ((a.id = interview_schedules.application_id) AND (j.recruiter_id = auth.uid())))));


--
-- Name: jobs Recruiters can insert jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Recruiters can insert jobs" ON public.jobs FOR INSERT WITH CHECK ((auth.uid() = recruiter_id));


--
-- Name: recruiter_profiles Recruiters can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Recruiters can insert their own profile" ON public.recruiter_profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: applications Recruiters can update applications for their jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Recruiters can update applications for their jobs" ON public.applications FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.jobs
  WHERE ((jobs.id = applications.job_id) AND (jobs.recruiter_id = auth.uid())))));


--
-- Name: jobs Recruiters can update their own jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Recruiters can update their own jobs" ON public.jobs FOR UPDATE USING ((auth.uid() = recruiter_id));


--
-- Name: recruiter_profiles Recruiters can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Recruiters can update their own profile" ON public.recruiter_profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: applications Recruiters can view applications for their jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Recruiters can view applications for their jobs" ON public.applications FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.jobs
  WHERE ((jobs.id = applications.job_id) AND (jobs.recruiter_id = auth.uid())))));


--
-- Name: assessments Recruiters can view assessments for their jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Recruiters can view assessments for their jobs" ON public.assessments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.jobs j
  WHERE ((j.id = assessments.job_id) AND (j.recruiter_id = auth.uid())))));


--
-- Name: exam_attempts Recruiters can view attempts for their jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Recruiters can view attempts for their jobs" ON public.exam_attempts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.assessments a
     JOIN public.jobs j ON ((j.id = a.job_id)))
  WHERE ((a.id = exam_attempts.assessment_id) AND (j.recruiter_id = auth.uid())))));


--
-- Name: jobs Recruiters can view their own jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Recruiters can view their own jobs" ON public.jobs FOR SELECT USING ((auth.uid() = recruiter_id));


--
-- Name: recruiter_profiles Recruiters can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Recruiters can view their own profile" ON public.recruiter_profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: mentor_requests Students can create mentor requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can create mentor requests" ON public.mentor_requests FOR INSERT WITH CHECK ((auth.uid() = student_id));


--
-- Name: mentor_requests Students can delete pending requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can delete pending requests" ON public.mentor_requests FOR DELETE USING (((auth.uid() = student_id) AND (status = 'pending'::text)));


--
-- Name: applications Students can insert their own applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can insert their own applications" ON public.applications FOR INSERT WITH CHECK ((auth.uid() = student_id));


--
-- Name: student_profiles Students can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can insert their own profile" ON public.student_profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: exam_attempts Students can manage their own attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can manage their own attempts" ON public.exam_attempts USING ((auth.uid() = student_id));


--
-- Name: code_submissions Students can manage their own submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can manage their own submissions" ON public.code_submissions USING ((EXISTS ( SELECT 1
   FROM public.exam_attempts ea
  WHERE ((ea.id = code_submissions.attempt_id) AND (ea.student_id = auth.uid())))));


--
-- Name: applications Students can update their own applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can update their own applications" ON public.applications FOR UPDATE USING ((auth.uid() = student_id));


--
-- Name: student_profiles Students can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can update their own profile" ON public.student_profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: assessments Students can view active assessments for their approved applica; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can view active assessments for their approved applica" ON public.assessments FOR SELECT USING (((status = ANY (ARRAY['active'::text, 'scheduled'::text])) AND (EXISTS ( SELECT 1
   FROM public.applications a
  WHERE ((a.job_id = assessments.job_id) AND (a.student_id = auth.uid()) AND (a.status = 'faculty_approved'::public.application_status))))));


--
-- Name: coding_questions Students can view questions for active exams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can view questions for active exams" ON public.coding_questions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.assessments a
  WHERE ((a.id = coding_questions.assessment_id) AND (a.status = 'active'::text) AND (EXISTS ( SELECT 1
           FROM public.applications app
          WHERE ((app.job_id = a.job_id) AND (app.student_id = auth.uid()) AND (app.status = 'faculty_approved'::public.application_status))))))));


--
-- Name: applications Students can view their own applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can view their own applications" ON public.applications FOR SELECT USING ((auth.uid() = student_id));


--
-- Name: mentor_requests Students can view their own mentor requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can view their own mentor requests" ON public.mentor_requests FOR SELECT USING ((auth.uid() = student_id));


--
-- Name: student_profiles Students can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can view their own profile" ON public.student_profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notifications System can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_roles Users can insert their own role on signup; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own role on signup" ON public.user_roles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: interview_schedules Users can view relevant interviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view relevant interviews" ON public.interview_schedules FOR SELECT TO authenticated USING (true);


--
-- Name: notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: interview_schedules Users can view their related interviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their related interviews" ON public.interview_schedules FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.applications a
  WHERE ((a.id = interview_schedules.application_id) AND ((a.student_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.jobs j
          WHERE ((j.id = a.job_id) AND (j.recruiter_id = auth.uid())))))))));


--
-- Name: applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

--
-- Name: assessments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

--
-- Name: code_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.code_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: coding_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coding_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: exam_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: faculty_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.faculty_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: interview_schedules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.interview_schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: mentor_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mentor_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: recruiter_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recruiter_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: student_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;