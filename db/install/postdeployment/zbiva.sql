--
-- PostgreSQL database dump
--

-- Dumped from database version 9.0.5
-- Dumped by pg_dump version 9.0.5
-- Started on 2012-03-15 17:30:58

SET statement_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = off;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET escape_string_warning = off;

SET search_path = public, pg_catalog;

--
-- TOC entry 3085 (class 0 OID 0)
-- Dependencies: 233
-- Name: auth_group_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

INSERT INTO concepts.d_languages VALUES ('de', 'DEUTSCH', false);
INSERT INTO concepts.d_languages VALUES ('sl', 'SLOVENSCINA', false);

UPDATE public.auth_user
   SET password = 'pbkdf2_sha256$12000$48KOOKlD8ftO$WSP374aj2+ynJi31/u7wu/aepXiLsPodlvJvr/AwI5k='
 WHERE USERNAME = 'admin';
  
-- Completed on 2012-03-15 17:30:59

--
-- PostgreSQL database dump complete
--
