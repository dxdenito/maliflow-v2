--
-- PostgreSQL database dump
--

\restrict Ba3vJTQlmQVaaGbDylXECsbtZkpVw3TuAgWhq82H2L6kMVy4HEQMO0MK1L2nzEg

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounts (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    account_type character varying(30) NOT NULL,
    pool character varying(20) NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.accounts OWNER TO postgres;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO postgres;

--
-- Name: budget_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.budget_items (
    id uuid NOT NULL,
    budget_id uuid NOT NULL,
    category_id uuid NOT NULL,
    amount numeric(14,2) NOT NULL,
    CONSTRAINT ck_budget_items_amount_positive CHECK ((amount > (0)::numeric))
);


ALTER TABLE public.budget_items OWNER TO postgres;

--
-- Name: budgets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.budgets (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    period date NOT NULL,
    total_amount numeric(14,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_budgets_total_positive CHECK ((total_amount > (0)::numeric))
);


ALTER TABLE public.budgets OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    name character varying(60) NOT NULL,
    icon character varying(30) NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenses (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    category_id uuid NOT NULL,
    account_id uuid,
    amount numeric(14,2) NOT NULL,
    spent_on date NOT NULL,
    description character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    obligation_id uuid,
    CONSTRAINT ck_expenses_amount_positive CHECK ((amount > (0)::numeric))
);


ALTER TABLE public.expenses OWNER TO postgres;

--
-- Name: incomes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.incomes (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    source character varying(100) NOT NULL,
    income_type character varying(30) NOT NULL,
    expected_amount numeric(14,2) NOT NULL,
    expected_on date NOT NULL,
    period date NOT NULL,
    status character varying(20) NOT NULL,
    received_amount numeric(14,2),
    received_on date,
    account_id uuid,
    note character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_incomes_expected_positive CHECK ((expected_amount > (0)::numeric)),
    CONSTRAINT ck_incomes_receipt_consistent CHECK (((((status)::text = 'expected'::text) AND (received_amount IS NULL) AND (received_on IS NULL) AND (account_id IS NULL)) OR (((status)::text = 'received'::text) AND (received_amount > (0)::numeric) AND (received_on IS NOT NULL) AND (account_id IS NOT NULL))))
);


ALTER TABLE public.incomes OWNER TO postgres;

--
-- Name: investment_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.investment_events (
    id uuid NOT NULL,
    investment_id uuid NOT NULL,
    user_id uuid NOT NULL,
    kind character varying(20) NOT NULL,
    amount numeric(14,2) NOT NULL,
    occurred_on date NOT NULL,
    account_id uuid,
    note character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_investment_events_kind_valid CHECK (((kind)::text = ANY ((ARRAY['opening'::character varying, 'contribution'::character varying, 'withdrawal'::character varying, 'valuation'::character varying])::text[]))),
    CONSTRAINT ck_investment_events_shape CHECK (((((kind)::text = 'valuation'::text) AND (amount >= (0)::numeric) AND (account_id IS NULL)) OR (((kind)::text = 'opening'::text) AND (amount > (0)::numeric) AND (account_id IS NULL)) OR (((kind)::text = ANY ((ARRAY['contribution'::character varying, 'withdrawal'::character varying])::text[])) AND (amount > (0)::numeric) AND (account_id IS NOT NULL))))
);


ALTER TABLE public.investment_events OWNER TO postgres;

--
-- Name: investments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.investments (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    investment_type character varying(20) NOT NULL,
    note character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_investments_type_valid CHECK (((investment_type)::text = ANY ((ARRAY['stock'::character varying, 'mmf'::character varying, 'business'::character varying, 'other'::character varying])::text[])))
);


ALTER TABLE public.investments OWNER TO postgres;

--
-- Name: ledger_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ledger_entries (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    entry_type character varying(40) NOT NULL,
    amount numeric(14,2) NOT NULL,
    from_account_id uuid,
    to_account_id uuid,
    occurred_on date NOT NULL,
    description character varying(255),
    reference_type character varying(40),
    reference_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_ledger_entries_amount_positive CHECK ((amount > (0)::numeric)),
    CONSTRAINT ck_ledger_entries_different_accounts CHECK (((from_account_id IS NULL) OR (to_account_id IS NULL) OR (from_account_id <> to_account_id))),
    CONSTRAINT ck_ledger_entries_has_account CHECK (((from_account_id IS NOT NULL) OR (to_account_id IS NOT NULL)))
);


ALTER TABLE public.ledger_entries OWNER TO postgres;

--
-- Name: obligation_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.obligation_payments (
    id uuid NOT NULL,
    obligation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    account_id uuid NOT NULL,
    amount numeric(14,2) NOT NULL,
    paid_on date NOT NULL,
    note character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_obligation_payments_amount_positive CHECK ((amount > (0)::numeric))
);


ALTER TABLE public.obligation_payments OWNER TO postgres;

--
-- Name: obligations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.obligations (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    original_amount numeric(14,2) NOT NULL,
    due_on date,
    note character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    installment_amount numeric(14,2),
    frequency character varying(20),
    first_due_on date,
    CONSTRAINT ck_obligations_amount_positive CHECK ((original_amount > (0)::numeric))
);


ALTER TABLE public.obligations OWNER TO postgres;

--
-- Name: purchase_allocations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_allocations (
    id uuid NOT NULL,
    payment_id uuid NOT NULL,
    account_id uuid NOT NULL,
    amount numeric(14,2) NOT NULL,
    CONSTRAINT ck_purchase_allocations_amount_positive CHECK ((amount > (0)::numeric))
);


ALTER TABLE public.purchase_allocations OWNER TO postgres;

--
-- Name: purchase_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_payments (
    id uuid NOT NULL,
    purchase_id uuid NOT NULL,
    user_id uuid NOT NULL,
    paid_on date NOT NULL,
    is_deposit boolean DEFAULT false NOT NULL,
    note character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.purchase_payments OWNER TO postgres;

--
-- Name: purchases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchases (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    kind character varying(20) NOT NULL,
    price numeric(14,2) NOT NULL,
    finance_charges numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    lender character varying(100),
    purchased_on date NOT NULL,
    installment_amount numeric(14,2),
    frequency character varying(20),
    first_due_on date,
    note character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    asset_value numeric(14,2),
    CONSTRAINT ck_purchases_charges_nonnegative CHECK ((finance_charges >= (0)::numeric)),
    CONSTRAINT ck_purchases_kind_valid CHECK (((kind)::text = ANY ((ARRAY['cash'::character varying, 'financed'::character varying])::text[]))),
    CONSTRAINT ck_purchases_price_positive CHECK ((price > (0)::numeric))
);


ALTER TABLE public.purchases OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    hashed_password character varying(255) NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.accounts (id, user_id, name, account_type, pool, is_active, created_at) FROM stdin;
aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	be0729f0-b4c9-45aa-8613-3185ec72b9a2	Cash	cash	available	t	2026-10-17 09:37:36.407572-07
63a392bf-058e-4c0d-9652-625d015e651f	be0729f0-b4c9-45aa-8613-3185ec72b9a2	Mobile wallet	mobile_money	available	t	2026-10-17 09:38:00.997044-07
23b919d9-b73c-4754-8d42-172efab1e4a7	be0729f0-b4c9-45aa-8613-3185ec72b9a2	Bank savings	bank	savings	t	2026-10-17 09:38:21.433972-07
9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Cash	cash	available	t	2026-10-21 07:02:19.904365-07
ad384dff-b0f6-4497-89bb-3cea1c47ff0e	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	KCB BANK	bank	available	t	2026-10-21 07:03:01.187405-07
0410f96c-f730-432c-891f-3c17856e97d4	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	MPESA	mobile_money	available	t	2026-10-21 07:03:35.801812-07
dc6b3c7c-f609-475e-807e-0b0a539e0fdc	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	MSHWARI	mobile_money	savings	t	2026-10-21 07:03:55.315312-07
448051ba-f072-4137-a986-490e8348e900	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	KCB SAVINGS	bank	savings	t	2026-10-21 07:04:16.242976-07
303689cb-0649-4dfe-9f05-5568ae9d23bf	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	WALLET	cash	available	t	2026-10-21 07:20:25.972269-07
\.


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alembic_version (version_num) FROM stdin;
065cf9623650
\.


--
-- Data for Name: budget_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.budget_items (id, budget_id, category_id, amount) FROM stdin;
e4a4064a-687b-4d04-ae1c-f612b9fafcef	8961ceb0-cfa2-4221-a261-5239590657d9	e8d768ad-16d3-437d-8ade-c3642aac9690	600.00
521d842b-69d7-4665-b7cb-d36d23eec629	8961ceb0-cfa2-4221-a261-5239590657d9	6f375d79-2589-4960-8288-608243536326	4400.00
f786273f-12bd-47c1-ad2b-1a54eb899601	8961ceb0-cfa2-4221-a261-5239590657d9	6f5980e2-f642-41aa-a66b-6bce3f1d90f5	3520.00
cb8dc8a1-2ed0-466c-831a-3ffd8886749a	8961ceb0-cfa2-4221-a261-5239590657d9	66d36515-9cfb-405b-9bb3-34a075df0092	400.00
d6aad70b-99b9-4f1d-a557-53bf0752879d	8961ceb0-cfa2-4221-a261-5239590657d9	3b2e07c7-0110-40aa-b2cd-0dc2052d7e6f	1080.00
6f0b7a38-fd16-46ee-a1c7-3ceaa8b05551	437a5793-d74b-4584-ade3-a154380fe14c	e8d768ad-16d3-437d-8ade-c3642aac9690	600.00
c06c5f7f-ffe0-4841-92f8-5ad20fcd0e78	437a5793-d74b-4584-ade3-a154380fe14c	6f375d79-2589-4960-8288-608243536326	4400.00
2aae5fcc-a0e2-46c6-934c-48aa84e52aab	437a5793-d74b-4584-ade3-a154380fe14c	66d36515-9cfb-405b-9bb3-34a075df0092	400.00
c801d49e-2dce-474c-a71e-c2f5cba22b67	437a5793-d74b-4584-ade3-a154380fe14c	3b2e07c7-0110-40aa-b2cd-0dc2052d7e6f	1080.00
b3ceafda-ac60-485f-88fb-c6f29da3895a	437a5793-d74b-4584-ade3-a154380fe14c	6f5980e2-f642-41aa-a66b-6bce3f1d90f5	3520.00
07c131ac-ec27-485e-ba8a-6c74dac73535	5e00b22c-7219-483c-af80-e88504f6b9ed	30caf803-b9ca-4ab5-97fc-28560f01771d	680.00
d7e22549-7f96-4771-9dfe-1c9fde259697	5e00b22c-7219-483c-af80-e88504f6b9ed	609f0be3-4762-4ac6-98b8-7c2526506076	4400.00
241bf1c1-8ad4-4108-8a09-00a3b0070d29	5e00b22c-7219-483c-af80-e88504f6b9ed	8cc092b1-11bd-4f13-a348-2a66cece255a	1400.00
adee90e7-88d0-4d1a-bb15-41e6f824ec90	5e00b22c-7219-483c-af80-e88504f6b9ed	2bd5ea63-7adf-4875-a140-9570aa2cd487	3520.00
a7dc4c04-c69f-4466-8f0e-6053e0477c5d	e89fa241-b76b-4618-a6ec-cbb3ae837923	30caf803-b9ca-4ab5-97fc-28560f01771d	680.00
92509805-d98e-434e-a93a-afbf7abdf610	e89fa241-b76b-4618-a6ec-cbb3ae837923	609f0be3-4762-4ac6-98b8-7c2526506076	4400.00
69ca0a80-de13-4a38-8ea7-74a7cd97a311	e89fa241-b76b-4618-a6ec-cbb3ae837923	8cc092b1-11bd-4f13-a348-2a66cece255a	1400.00
508a19ed-504d-4308-9b2b-06e6cea9cd72	e89fa241-b76b-4618-a6ec-cbb3ae837923	2bd5ea63-7adf-4875-a140-9570aa2cd487	3520.00
\.


--
-- Data for Name: budgets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.budgets (id, user_id, period, total_amount, created_at) FROM stdin;
8961ceb0-cfa2-4221-a261-5239590657d9	be0729f0-b4c9-45aa-8613-3185ec72b9a2	2026-09-01	10000.00	2026-10-18 12:56:48.66941-07
437a5793-d74b-4584-ade3-a154380fe14c	be0729f0-b4c9-45aa-8613-3185ec72b9a2	2026-10-01	10000.00	2026-10-18 13:00:30.446144-07
5e00b22c-7219-483c-af80-e88504f6b9ed	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	2026-10-01	10000.00	2026-10-21 07:00:18.831232-07
e89fa241-b76b-4618-a6ec-cbb3ae837923	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	2026-11-01	10000.00	2026-11-01 01:12:30.531387-07
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, user_id, name, icon, is_active, created_at) FROM stdin;
6f375d79-2589-4960-8288-608243536326	be0729f0-b4c9-45aa-8613-3185ec72b9a2	Food	utensils	t	2026-10-18 12:06:17.235746-07
6f5980e2-f642-41aa-a66b-6bce3f1d90f5	be0729f0-b4c9-45aa-8613-3185ec72b9a2	Transport	bus	t	2026-10-18 12:06:17.235746-07
3f21f4fe-7e76-4388-a237-86b11bed4f25	be0729f0-b4c9-45aa-8613-3185ec72b9a2	Rent	home	t	2026-10-18 12:06:17.235746-07
fd74601b-a47d-41f8-8be8-92f0517871ea	be0729f0-b4c9-45aa-8613-3185ec72b9a2	Utilities	zap	t	2026-10-18 12:06:17.235746-07
e8d768ad-16d3-437d-8ade-c3642aac9690	be0729f0-b4c9-45aa-8613-3185ec72b9a2	Airtime & data	smartphone	t	2026-10-18 12:06:17.235746-07
a558b73f-ced4-4d64-944f-440c5d5f5f16	be0729f0-b4c9-45aa-8613-3185ec72b9a2	Clothes	shirt	t	2026-10-18 12:06:17.235746-07
3bdf40d8-a3a5-4aea-8037-4571e8159e6d	be0729f0-b4c9-45aa-8613-3185ec72b9a2	Health	heart-pulse	t	2026-10-18 12:06:17.235746-07
1bf60427-f73e-4e16-b75d-fe855a3af419	be0729f0-b4c9-45aa-8613-3185ec72b9a2	Entertainment	clapperboard	t	2026-10-18 12:06:17.235746-07
3b2e07c7-0110-40aa-b2cd-0dc2052d7e6f	be0729f0-b4c9-45aa-8613-3185ec72b9a2	Other	tag	t	2026-10-18 12:06:17.235746-07
66d36515-9cfb-405b-9bb3-34a075df0092	be0729f0-b4c9-45aa-8613-3185ec72b9a2	Offerings	tag	t	2026-10-18 12:27:41.911762-07
609f0be3-4762-4ac6-98b8-7c2526506076	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Food	utensils	t	2026-10-21 06:58:02.785108-07
2bd5ea63-7adf-4875-a140-9570aa2cd487	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Transport	bus	t	2026-10-21 06:58:02.785108-07
49890a94-80e1-4f5e-bb5e-16f27ffe532d	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Rent	home	t	2026-10-21 06:58:02.785108-07
df9447a8-78f6-4f1a-b159-7bd346d3d182	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Utilities	zap	t	2026-10-21 06:58:02.785108-07
30caf803-b9ca-4ab5-97fc-28560f01771d	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Airtime & data	smartphone	t	2026-10-21 06:58:02.785108-07
2888e1fb-b56e-41b4-b1f6-ccdf63be75f9	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Clothes	shirt	t	2026-10-21 06:58:02.785108-07
66191df2-a3c3-47c3-86b9-0bc166f6144b	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Health	heart-pulse	t	2026-10-21 06:58:02.785108-07
cb6fd9c3-da4b-4c4b-9940-c4fe43391f14	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Entertainment	clapperboard	t	2026-10-21 06:58:02.785108-07
8cc092b1-11bd-4f13-a348-2a66cece255a	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Other	tag	t	2026-10-21 06:58:02.785108-07
9b11a043-5842-4d9b-acaf-c5b7d55d3d25	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Offering	tag	t	2026-10-21 07:26:10.260466-07
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expenses (id, user_id, category_id, account_id, amount, spent_on, description, created_at, obligation_id) FROM stdin;
6ee594b3-713e-4eee-9194-87406cb9cde8	be0729f0-b4c9-45aa-8613-3185ec72b9a2	e8d768ad-16d3-437d-8ade-c3642aac9690	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	560.00	2026-08-18	\N	2026-10-18 12:10:18.03324-07	\N
e7d22541-f28f-4313-a4db-3737f77ccc35	be0729f0-b4c9-45aa-8613-3185ec72b9a2	6f375d79-2589-4960-8288-608243536326	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	2030.00	2026-08-18	Monthly lunch	2026-10-18 12:11:20.001402-07	\N
9f76ada5-6f64-4e91-b6d6-737ec5e2a696	be0729f0-b4c9-45aa-8613-3185ec72b9a2	6f5980e2-f642-41aa-a66b-6bce3f1d90f5	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	2640.00	2026-08-18	Monthly fare	2026-10-18 12:11:56.917939-07	\N
34a27f01-35f7-4c30-8595-870969b444a3	be0729f0-b4c9-45aa-8613-3185ec72b9a2	3b2e07c7-0110-40aa-b2cd-0dc2052d7e6f	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	2493.00	2026-08-18	gifts for friends family and self	2026-10-18 12:13:11.241142-07	\N
6020e49e-a45f-4ed7-9cf9-2c3239567d18	be0729f0-b4c9-45aa-8613-3185ec72b9a2	e8d768ad-16d3-437d-8ade-c3642aac9690	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	560.00	2026-09-18	monthly airtime	2026-10-18 12:18:49.025475-07	\N
82668dd6-4017-4e89-b958-ab3cf12e1f36	be0729f0-b4c9-45aa-8613-3185ec72b9a2	6f375d79-2589-4960-8288-608243536326	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	2710.00	2026-09-18	Monthly food	2026-10-18 12:19:40.255299-07	\N
4a5a6617-c4b8-4b7e-a627-c42581ffb34a	be0729f0-b4c9-45aa-8613-3185ec72b9a2	6f5980e2-f642-41aa-a66b-6bce3f1d90f5	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	2930.00	2026-09-18	monthly transport	2026-10-18 12:20:20.340492-07	\N
7ef48527-6921-4a67-a068-11ee0c4b447c	be0729f0-b4c9-45aa-8613-3185ec72b9a2	3b2e07c7-0110-40aa-b2cd-0dc2052d7e6f	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	2040.00	2026-09-18	monthly gifts for self and others	2026-10-18 12:21:22.283295-07	\N
6c3ca79d-d138-49f6-be2b-c3d00f6786fa	be0729f0-b4c9-45aa-8613-3185ec72b9a2	6f5980e2-f642-41aa-a66b-6bce3f1d90f5	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	30.00	2026-10-01	fare to stage	2026-10-18 12:23:59.755247-07	\N
4676d1a8-cb0c-45c8-84b9-22bd506097da	be0729f0-b4c9-45aa-8613-3185ec72b9a2	6f5980e2-f642-41aa-a66b-6bce3f1d90f5	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	40.00	2026-10-01	fare to work	2026-10-18 12:24:45.607772-07	\N
a9fe0ab0-1a51-4fad-86df-eb0653a42247	be0729f0-b4c9-45aa-8613-3185ec72b9a2	6f375d79-2589-4960-8288-608243536326	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	200.00	2026-10-01	lunch	2026-10-18 12:25:14.292573-07	\N
4ead062c-967c-46bb-b389-73ecc4b0eab6	be0729f0-b4c9-45aa-8613-3185ec72b9a2	e8d768ad-16d3-437d-8ade-c3642aac9690	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	20.00	2026-10-01	airtime	2026-10-18 12:25:49.116228-07	\N
c2e3eaa9-e8b3-4d85-829b-7170a8067b3c	be0729f0-b4c9-45aa-8613-3185ec72b9a2	e8d768ad-16d3-437d-8ade-c3642aac9690	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	20.00	2026-10-03	airtime	2026-10-18 12:26:49.106328-07	\N
714eb638-44c9-41eb-9615-26f0333af21d	be0729f0-b4c9-45aa-8613-3185ec72b9a2	66d36515-9cfb-405b-9bb3-34a075df0092	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	100.00	2026-10-04	Sunday offering	2026-10-18 12:28:05.812111-07	\N
101e7136-fdcf-4b34-b323-540a6646dd92	be0729f0-b4c9-45aa-8613-3185ec72b9a2	3b2e07c7-0110-40aa-b2cd-0dc2052d7e6f	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	100.00	2026-10-04	gifts for self	2026-10-18 12:28:56.870465-07	\N
a5daede6-f8ec-4ab3-9bcd-f498b3210997	be0729f0-b4c9-45aa-8613-3185ec72b9a2	6f5980e2-f642-41aa-a66b-6bce3f1d90f5	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	50.00	2026-10-05	fare to stage	2026-10-18 12:29:46.328073-07	\N
a0ff1017-4100-4cdd-8277-649016cca20d	be0729f0-b4c9-45aa-8613-3185ec72b9a2	6f5980e2-f642-41aa-a66b-6bce3f1d90f5	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	40.00	2026-10-05	Fare to work	2026-10-18 12:30:24.569195-07	\N
21d16376-69ba-4254-9b59-42f5a2e2cc39	be0729f0-b4c9-45aa-8613-3185ec72b9a2	e8d768ad-16d3-437d-8ade-c3642aac9690	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	20.00	2026-10-05	\N	2026-10-18 12:31:02.734137-07	\N
a8ff0720-d651-47a1-a7e0-58a70ad525d3	be0729f0-b4c9-45aa-8613-3185ec72b9a2	6f5980e2-f642-41aa-a66b-6bce3f1d90f5	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	40.00	2026-10-05	Transport back home	2026-10-18 12:31:52.092462-07	\N
956e5e36-c550-4350-9ddf-29970bffdbfa	be0729f0-b4c9-45aa-8613-3185ec72b9a2	3b2e07c7-0110-40aa-b2cd-0dc2052d7e6f	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	455.00	2026-10-05	gifts to self	2026-10-18 12:32:12.623601-07	\N
cc2ffcfd-eccd-4b52-b71b-2f25ea683e64	be0729f0-b4c9-45aa-8613-3185ec72b9a2	6f5980e2-f642-41aa-a66b-6bce3f1d90f5	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	50.00	2026-10-06	transport to stage	2026-10-20 12:18:44.664492-07	\N
18649eb0-2739-4e1f-9e5f-b4837c69217c	be0729f0-b4c9-45aa-8613-3185ec72b9a2	e8d768ad-16d3-437d-8ade-c3642aac9690	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	20.00	2026-10-06	\N	2026-10-20 12:19:03.005822-07	\N
0afbe5a1-3514-4988-ae4c-c2d4f87f2c6e	be0729f0-b4c9-45aa-8613-3185ec72b9a2	6f5980e2-f642-41aa-a66b-6bce3f1d90f5	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	40.00	2026-10-06	\N	2026-10-20 12:19:27.748109-07	\N
043fa920-ac22-472a-bda3-8555b2f34125	be0729f0-b4c9-45aa-8613-3185ec72b9a2	e8d768ad-16d3-437d-8ade-c3642aac9690	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	20.00	2026-10-06	\N	2026-10-20 12:19:40.513166-07	\N
f491f196-6cef-4f7d-9de1-a5c306a86663	be0729f0-b4c9-45aa-8613-3185ec72b9a2	6f375d79-2589-4960-8288-608243536326	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	160.00	2026-10-06	\N	2026-10-20 12:19:56.265323-07	\N
efdf142d-a628-4adc-a375-968e7bc1be84	be0729f0-b4c9-45aa-8613-3185ec72b9a2	6f5980e2-f642-41aa-a66b-6bce3f1d90f5	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	80.00	2026-10-07	\N	2026-10-20 12:20:19.32088-07	\N
799a6405-872c-49cc-843e-02f9fa55e584	be0729f0-b4c9-45aa-8613-3185ec72b9a2	e8d768ad-16d3-437d-8ade-c3642aac9690	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	40.00	2026-10-07	\N	2026-10-20 12:20:37.774478-07	\N
1e9686ea-97bc-49e1-807d-c3763ea193e7	be0729f0-b4c9-45aa-8613-3185ec72b9a2	6f5980e2-f642-41aa-a66b-6bce3f1d90f5	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	40.00	2026-10-07	\N	2026-10-20 12:20:57.966573-07	\N
f85daadc-53b3-468b-bc02-28d412e53c45	be0729f0-b4c9-45aa-8613-3185ec72b9a2	e8d768ad-16d3-437d-8ade-c3642aac9690	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	20.00	2026-10-07	\N	2026-10-20 12:21:26.665538-07	\N
2dafba7e-e9f9-43b7-b148-9bf70811d6e2	be0729f0-b4c9-45aa-8613-3185ec72b9a2	6f5980e2-f642-41aa-a66b-6bce3f1d90f5	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	40.00	2026-10-09	\N	2026-10-20 12:21:58.951673-07	\N
e0cfb796-188b-4c3b-b80b-b80077228e55	be0729f0-b4c9-45aa-8613-3185ec72b9a2	e8d768ad-16d3-437d-8ade-c3642aac9690	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	20.00	2026-10-10	\N	2026-10-20 12:22:20.060835-07	\N
3f98e89b-fa0e-476c-90a9-f18c7d21fc20	be0729f0-b4c9-45aa-8613-3185ec72b9a2	e8d768ad-16d3-437d-8ade-c3642aac9690	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	20.00	2026-10-12	\N	2026-10-20 12:22:58.381997-07	\N
ff468ae6-0d3c-46b2-a03b-c683a792da93	be0729f0-b4c9-45aa-8613-3185ec72b9a2	6f5980e2-f642-41aa-a66b-6bce3f1d90f5	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	40.00	2026-10-12	\N	2026-10-20 12:22:40.410566-07	\N
22842f8f-66bd-4d61-8d35-e9ca1f4c9f9a	be0729f0-b4c9-45aa-8613-3185ec72b9a2	e8d768ad-16d3-437d-8ade-c3642aac9690	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	20.00	2026-10-13	\N	2026-10-20 12:23:25.157521-07	\N
34468d38-815d-4c0a-a00a-275ceb1233a4	be0729f0-b4c9-45aa-8613-3185ec72b9a2	e8d768ad-16d3-437d-8ade-c3642aac9690	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	20.00	2026-10-13	\N	2026-10-20 12:23:43.481574-07	\N
9d74319d-e45f-4dcc-aec6-7a9160a1f35f	be0729f0-b4c9-45aa-8613-3185ec72b9a2	6f5980e2-f642-41aa-a66b-6bce3f1d90f5	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	40.00	2026-10-13	\N	2026-10-20 12:24:05.174788-07	\N
71c871ec-a06b-4b1f-aac4-e4b0b16a81b3	be0729f0-b4c9-45aa-8613-3185ec72b9a2	6f5980e2-f642-41aa-a66b-6bce3f1d90f5	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	40.00	2026-10-13	\N	2026-10-20 12:24:43.909511-07	\N
44a1bea1-c124-4f4a-80af-cde3f185a4ec	be0729f0-b4c9-45aa-8613-3185ec72b9a2	e8d768ad-16d3-437d-8ade-c3642aac9690	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	20.00	2026-10-19	\N	2026-10-20 12:24:57.519194-07	\N
148f489c-7ec2-4f94-8b6d-d7c00b578d7a	be0729f0-b4c9-45aa-8613-3185ec72b9a2	6f5980e2-f642-41aa-a66b-6bce3f1d90f5	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	70.00	2026-10-19	\N	2026-10-20 12:25:15.416844-07	\N
0c4edbc7-1ab9-4715-99ff-12228658e5ab	be0729f0-b4c9-45aa-8613-3185ec72b9a2	3b2e07c7-0110-40aa-b2cd-0dc2052d7e6f	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	350.00	2026-10-19	Dolly's cover	2026-10-20 12:25:44.928704-07	\N
e629b6ae-7c1a-4616-adea-9a10aee9b9db	be0729f0-b4c9-45aa-8613-3185ec72b9a2	3b2e07c7-0110-40aa-b2cd-0dc2052d7e6f	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	1790.00	2026-10-19	Dolly's book	2026-10-20 12:26:12.011307-07	\N
f2916ca5-6a6c-4edb-98e5-2056c0b7f3dd	be0729f0-b4c9-45aa-8613-3185ec72b9a2	3b2e07c7-0110-40aa-b2cd-0dc2052d7e6f	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	2000.00	2026-10-19	Dinner date with Dolly	2026-10-20 12:26:46.591282-07	\N
385507a1-3ec1-434e-8f3b-069e7ba3330d	be0729f0-b4c9-45aa-8613-3185ec72b9a2	6f5980e2-f642-41aa-a66b-6bce3f1d90f5	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	80.00	2026-10-19	\N	2026-10-20 12:27:07.810115-07	\N
bbdd849a-50f1-4f3e-bcf8-1b17757eff08	be0729f0-b4c9-45aa-8613-3185ec72b9a2	6f5980e2-f642-41aa-a66b-6bce3f1d90f5	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	70.00	2026-10-19	\N	2026-10-20 12:27:18.040076-07	\N
5301872b-ceba-4e11-98ac-303ccac3f71c	be0729f0-b4c9-45aa-8613-3185ec72b9a2	3b2e07c7-0110-40aa-b2cd-0dc2052d7e6f	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	1500.00	2026-10-20	Mashujaa Holiday treat	2026-10-20 12:27:51.376024-07	\N
eaff1925-c4a0-411b-9483-4af8fe776654	be0729f0-b4c9-45aa-8613-3185ec72b9a2	6f375d79-2589-4960-8288-608243536326	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	400.00	2026-10-21	\N	2026-10-21 05:43:01.636805-07	\N
e515a941-9e95-474b-81bd-74df711fa45c	be0729f0-b4c9-45aa-8613-3185ec72b9a2	6f5980e2-f642-41aa-a66b-6bce3f1d90f5	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	40.00	2026-10-21	\N	2026-10-21 05:43:11.357088-07	\N
b41696df-b01e-46c0-8827-9d19a9e5a739	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	8cc092b1-11bd-4f13-a348-2a66cece255a	303689cb-0649-4dfe-9f05-5568ae9d23bf	1790.00	2026-10-19	Book gift for dolly	2026-10-21 07:21:30.591686-07	\N
f450790f-17b7-46cb-913a-792327894266	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	8cc092b1-11bd-4f13-a348-2a66cece255a	303689cb-0649-4dfe-9f05-5568ae9d23bf	350.00	2026-10-19	Cover case for dolly	2026-10-21 07:22:19.064279-07	\N
3c9897cf-79a9-435c-a5e0-ce674a9e85a0	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	2bd5ea63-7adf-4875-a140-9570aa2cd487	303689cb-0649-4dfe-9f05-5568ae9d23bf	220.00	2026-10-19	\N	2026-10-21 07:23:13.887721-07	\N
e51bdd72-ad56-4be8-ba58-775308c30b10	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	8cc092b1-11bd-4f13-a348-2a66cece255a	303689cb-0649-4dfe-9f05-5568ae9d23bf	1500.00	2026-10-20	Mashujaa day Holiday treat	2026-10-21 07:23:48.933318-07	\N
6ac5e314-d336-454f-bc64-481dc46adbfd	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	8cc092b1-11bd-4f13-a348-2a66cece255a	303689cb-0649-4dfe-9f05-5568ae9d23bf	2000.00	2026-10-19	Dinner date with Dolly	2026-10-21 07:21:49.213893-07	\N
3f72a812-9dc1-4797-9041-606bf880070f	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	30caf803-b9ca-4ab5-97fc-28560f01771d	303689cb-0649-4dfe-9f05-5568ae9d23bf	260.00	2026-10-12	\N	2026-10-21 07:24:49.292928-07	\N
5acae252-daf2-49ec-991a-c081d89dca2e	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	2bd5ea63-7adf-4875-a140-9570aa2cd487	303689cb-0649-4dfe-9f05-5568ae9d23bf	610.00	2026-10-12	\N	2026-10-21 07:25:31.201824-07	\N
2df0b9c0-8a7e-41f6-8260-16bedac1a174	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	609f0be3-4762-4ac6-98b8-7c2526506076	303689cb-0649-4dfe-9f05-5568ae9d23bf	760.00	2026-10-12	\N	2026-10-21 07:25:56.020351-07	\N
963296c2-0a4e-40d0-ba95-6b64430cdd47	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	9b11a043-5842-4d9b-acaf-c5b7d55d3d25	303689cb-0649-4dfe-9f05-5568ae9d23bf	100.00	2026-10-10	\N	2026-10-21 07:26:25.94995-07	\N
095410d7-52fb-43c0-a51c-d4816d8da56a	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	8cc092b1-11bd-4f13-a348-2a66cece255a	303689cb-0649-4dfe-9f05-5568ae9d23bf	115.00	2026-10-10	self snack treat	2026-10-21 07:27:56.586781-07	\N
4608ad49-955a-4d0d-9164-a83d8730e28d	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	2bd5ea63-7adf-4875-a140-9570aa2cd487	303689cb-0649-4dfe-9f05-5568ae9d23bf	40.00	2026-10-21	\N	2026-10-21 07:30:06.007898-07	\N
e57a90d4-0e00-4c7e-8425-dbcd321e874f	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	609f0be3-4762-4ac6-98b8-7c2526506076	303689cb-0649-4dfe-9f05-5568ae9d23bf	400.00	2026-10-21	\N	2026-10-21 07:30:22.162684-07	\N
39f53203-ae20-4c84-a5c7-344664488c4d	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	30caf803-b9ca-4ab5-97fc-28560f01771d	0410f96c-f730-432c-891f-3c17856e97d4	20.00	2026-10-21	\N	2026-10-22 06:03:41.139942-07	\N
8d8227a2-2f25-4b32-a123-3d3101f83ea0	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	30caf803-b9ca-4ab5-97fc-28560f01771d	0410f96c-f730-432c-891f-3c17856e97d4	20.00	2026-10-22	\N	2026-10-22 06:03:53.164121-07	\N
1a497676-dbd8-4b42-bba3-287e7605d901	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	2bd5ea63-7adf-4875-a140-9570aa2cd487	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	40.00	2026-10-22	\N	2026-10-22 06:04:04.760033-07	\N
3dbcedb9-45b4-439d-8f66-c3a579055ded	be0729f0-b4c9-45aa-8613-3185ec72b9a2	6f5980e2-f642-41aa-a66b-6bce3f1d90f5	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	40.00	2026-10-22	\N	2026-10-22 09:20:31.379753-07	\N
53a6f734-8136-44a5-a714-b2a249998c4e	be0729f0-b4c9-45aa-8613-3185ec72b9a2	e8d768ad-16d3-437d-8ade-c3642aac9690	63a392bf-058e-4c0d-9652-625d015e651f	20.00	2026-10-22	\N	2026-10-22 09:20:48.363369-07	\N
bb82b810-10d2-483c-a085-be3143919287	be0729f0-b4c9-45aa-8613-3185ec72b9a2	e8d768ad-16d3-437d-8ade-c3642aac9690	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	20.00	2026-10-21	\N	2026-10-22 09:21:06.969392-07	\N
19fe0050-4737-4738-b62d-aabd82393548	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	30caf803-b9ca-4ab5-97fc-28560f01771d	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	50.00	2026-10-23	fare to stage	2026-10-23 11:30:33.194398-07	\N
570cd0ee-d88d-46cf-99fc-80231662a2b5	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	2bd5ea63-7adf-4875-a140-9570aa2cd487	\N	80.00	2026-10-23	Fare to town	2026-10-23 11:31:12.962157-07	bea1a0b0-21e3-41af-ac08-448730fed4c2
be2c74e1-ae35-497a-842c-1b1d948992b2	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	609f0be3-4762-4ac6-98b8-7c2526506076	\N	220.00	2026-10-23	Food at Town	2026-10-23 11:31:52.193885-07	c9815719-732e-4f9d-b0b5-5d48e6f28ff5
3252ce13-412e-44c3-ad19-70f12a060f42	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	2bd5ea63-7adf-4875-a140-9570aa2cd487	\N	100.00	2026-10-23	Fare home	2026-10-23 11:32:23.324596-07	d7f14d0b-edb0-4ea1-8800-473d64332075
76dfdb7c-9353-4a63-84b7-3a2410a5a5e2	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	30caf803-b9ca-4ab5-97fc-28560f01771d	\N	40.00	2026-10-23	\N	2026-10-23 11:33:05.69315-07	624838b5-d813-48ba-a4a8-47fb9d2b39a4
f1171e0d-b9ec-4408-bb2b-1808f6912665	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	30caf803-b9ca-4ab5-97fc-28560f01771d	0410f96c-f730-432c-891f-3c17856e97d4	10.00	2026-10-25	\N	2026-10-25 12:27:21.913049-07	\N
fabcf3a1-5fc8-42e8-b7c9-cfc63a4d57c7	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	2bd5ea63-7adf-4875-a140-9570aa2cd487	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	40.00	2026-10-27	\N	2026-10-27 09:28:24.959009-07	\N
1d70aa3d-2df2-4885-bfba-c724a3408c74	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	609f0be3-4762-4ac6-98b8-7c2526506076	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	180.00	2026-10-27	\N	2026-10-27 09:29:07.329287-07	\N
6b13e5c1-b7fa-4d2b-abec-a22b44f75966	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	30caf803-b9ca-4ab5-97fc-28560f01771d	\N	20.00	2026-10-29	\N	2026-10-29 05:24:20.124045-07	033401d5-011c-4264-8801-da7af74fd50b
5678aa9a-accc-44d0-8ae7-542b4e5f8881	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	609f0be3-4762-4ac6-98b8-7c2526506076	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	100.00	2026-10-29	\N	2026-10-29 05:24:40.90152-07	\N
21ba1349-77dd-4f12-9f8c-9336edfde725	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	8cc092b1-11bd-4f13-a348-2a66cece255a	\N	50.00	2026-10-29	njugu	2026-10-29 05:25:49.345727-07	c96154ac-e13e-448c-8d68-5c0d189d36b5
b1962ab5-ce31-4fe5-9878-f881460b28b5	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	2bd5ea63-7adf-4875-a140-9570aa2cd487	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	80.00	2026-10-29	\N	2026-10-29 05:26:07.579061-07	\N
361fb73c-7519-484f-8d9c-7c4195e87c53	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	30caf803-b9ca-4ab5-97fc-28560f01771d	\N	40.00	2026-10-30	\N	2026-10-30 13:21:35.319845-07	56b53840-188c-4c89-8dad-3c47186a0c01
67db6b02-5191-4107-8bc5-84124a12ba2e	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	8cc092b1-11bd-4f13-a348-2a66cece255a	\N	425.00	2026-10-30	Shopping for mum	2026-10-30 13:22:01.23916-07	628d4f41-09da-46f3-8fde-26c12cdeb069
e65ba586-2a27-4c36-b24a-701afcba3c76	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	8cc092b1-11bd-4f13-a348-2a66cece255a	\N	100.00	2026-10-30	\N	2026-10-30 13:22:41.208732-07	08e9c805-0bb4-4f5f-adeb-d8669b1e3991
04f2c47b-dcb0-4e2a-9c2f-e545fb8bc5a1	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	8cc092b1-11bd-4f13-a348-2a66cece255a	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	50.00	2026-10-31	medicine	2026-11-01 01:11:09.011121-07	\N
8dfc6d7d-1d2a-4af3-a5aa-804ac2d4e7b3	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	30caf803-b9ca-4ab5-97fc-28560f01771d	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	60.00	2026-10-31	\N	2026-11-01 01:11:28.119737-07	\N
02c874eb-1989-4767-9b50-770acb27112c	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	8cc092b1-11bd-4f13-a348-2a66cece255a	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	100.00	2026-10-31	Tandie gift	2026-11-01 01:10:43.449159-07	\N
1a8b36c7-6b7b-49d5-9f8c-2d8aec2a7ed6	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	30caf803-b9ca-4ab5-97fc-28560f01771d	\N	40.00	2026-11-02	\N	2026-11-02 00:44:50.570534-08	96314d3d-0723-4758-87da-1c2b71902540
5df46026-d0d6-40d7-b7d9-ca9fe61b88d2	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	609f0be3-4762-4ac6-98b8-7c2526506076	\N	150.00	2026-11-02	\N	2026-11-02 03:52:50.974495-08	c296690e-6a0d-42ef-bea0-ad82a3346ef7
df05f1a0-4340-4cc4-9242-930b494456ba	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	2bd5ea63-7adf-4875-a140-9570aa2cd487	\N	80.00	2026-11-02	\N	2026-11-02 07:37:37.91025-08	fa6f4d47-f401-4383-b7e9-1facbb823d7c
5c3f50eb-375d-44ec-9c86-b4bb0b141e50	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	609f0be3-4762-4ac6-98b8-7c2526506076	\N	170.00	2026-11-03	\N	2026-11-03 05:31:25.173225-08	23dc6fca-9c3c-4fd4-b98d-b2a6fa59c27b
1a532874-a41a-4df0-aa04-7b118bdcd901	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	8cc092b1-11bd-4f13-a348-2a66cece255a	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	20.00	2026-11-03	sweets	2026-11-03 21:57:13.702469-08	\N
79431b18-380c-4cf0-86d0-127ee4de7420	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	609f0be3-4762-4ac6-98b8-7c2526506076	\N	200.00	2026-11-04	\N	2026-11-04 08:12:48.867892-08	614a02f3-1996-4070-9855-4bc7dab3340b
290603b6-852c-4b1d-a2a2-fc7fd5d49772	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	30caf803-b9ca-4ab5-97fc-28560f01771d	\N	20.00	2026-11-04	\N	2026-11-04 08:13:02.281703-08	03309062-40bf-4ff8-b1a0-e7779c63f3a0
f3277868-cd52-4af5-bbfe-b11155eb4184	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	8cc092b1-11bd-4f13-a348-2a66cece255a	ad384dff-b0f6-4497-89bb-3cea1c47ff0e	76.00	2026-11-04	transaction cost	2026-11-04 10:10:03.52208-08	\N
d805740d-2612-4cb3-9464-fbd4fd7402b1	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	30caf803-b9ca-4ab5-97fc-28560f01771d	0410f96c-f730-432c-891f-3c17856e97d4	48.00	2026-11-04	transaction cost	2026-11-04 10:14:05.38053-08	\N
2b66049d-b97f-4ff3-8ea3-d1003eb3b6e1	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	609f0be3-4762-4ac6-98b8-7c2526506076	0410f96c-f730-432c-891f-3c17856e97d4	190.00	2026-11-05	\N	2026-11-05 04:18:42.353874-08	\N
41537d34-7acc-480f-8df1-8cb20867ce2f	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	2bd5ea63-7adf-4875-a140-9570aa2cd487	0410f96c-f730-432c-891f-3c17856e97d4	80.00	2026-11-05	\N	2026-11-05 07:23:37.728626-08	\N
803062ef-e632-46a1-af67-6e0daf6b8cc6	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	30caf803-b9ca-4ab5-97fc-28560f01771d	0410f96c-f730-432c-891f-3c17856e97d4	20.00	2026-11-06	\N	2026-11-05 22:32:20.710833-08	\N
03b8ce8a-bd91-4f89-9b31-297b2b7122dd	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	2bd5ea63-7adf-4875-a140-9570aa2cd487	0410f96c-f730-432c-891f-3c17856e97d4	90.00	2026-11-06	\N	2026-11-05 22:32:36.828417-08	\N
010fd651-9e00-41d3-bd9c-9e16ac550e17	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	609f0be3-4762-4ac6-98b8-7c2526506076	0410f96c-f730-432c-891f-3c17856e97d4	50.00	2026-11-06	\N	2026-11-05 22:32:57.926516-08	\N
\.


--
-- Data for Name: incomes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.incomes (id, user_id, source, income_type, expected_amount, expected_on, period, status, received_amount, received_on, account_id, note, created_at) FROM stdin;
e1f63afb-438b-44bc-ade7-aa8f4be7a9f1	be0729f0-b4c9-45aa-8613-3185ec72b9a2	Salary	salary	58000.00	2026-08-31	2026-08-01	received	58000.00	2026-10-18	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-18 06:33:29.422288-07
528be776-f37b-4ecb-91ed-f51f59b13249	be0729f0-b4c9-45aa-8613-3185ec72b9a2	Salary	salary	50999.00	2026-09-30	2026-09-01	received	50999.00	2026-10-18	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-18 06:34:05.282698-07
0fe742e1-948b-4692-ad39-3539e11e5397	be0729f0-b4c9-45aa-8613-3185ec72b9a2	Salary	salary	50999.00	2026-10-30	2026-10-01	expected	\N	\N	\N	\N	2026-10-18 06:37:35.99824-07
3966eb2c-e863-4f7d-89a5-f7569c5f71ee	be0729f0-b4c9-45aa-8613-3185ec72b9a2	Salary	salary	8200.00	2026-07-31	2026-07-01	received	8200.00	2026-10-18	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-18 11:36:53.860808-07
092c36a8-53e6-4df9-aa70-58fa68d77565	be0729f0-b4c9-45aa-8613-3185ec72b9a2	Side Hustle	side_hustle	500.00	2026-09-18	2026-09-01	received	500.00	2026-10-18	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-18 11:37:50.984925-07
44b68860-bcf0-4fcf-adb2-23594a29ee06	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Gift	other	10.00	2026-10-23	2026-10-01	received	10.00	2026-10-23	303689cb-0649-4dfe-9f05-5568ae9d23bf	\N	2026-10-23 11:34:13.295779-07
56e6ca3e-d71c-4e4e-a28d-767154da4388	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Salary	salary	50999.00	2026-11-01	2026-11-01	expected	\N	\N	\N	\N	2026-11-01 01:12:58.40054-07
77ea9ccb-d9f1-4281-9ecd-bf6637d8036f	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Salary	salary	50999.00	2026-10-30	2026-10-01	received	50899.00	2026-11-04	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	\N	2026-10-21 07:01:30.888076-07
\.


--
-- Data for Name: investment_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.investment_events (id, investment_id, user_id, kind, amount, occurred_on, account_id, note, created_at) FROM stdin;
203c60e5-a345-4839-a4cc-d6139f743a94	81689918-bea1-4906-8082-4d937056bd32	be0729f0-b4c9-45aa-8613-3185ec72b9a2	opening	100000.00	2026-10-21	\N	Already invested before using MaliFlow	2026-10-20 23:29:53.927526-07
0045cd8f-b2e2-4e1b-b8fa-d0b197a440f1	81689918-bea1-4906-8082-4d937056bd32	be0729f0-b4c9-45aa-8613-3185ec72b9a2	valuation	125000.00	2026-10-21	\N	\N	2026-10-20 23:29:53.927526-07
4192f428-75d0-4273-ab42-8f4bdb3e0244	81689918-bea1-4906-8082-4d937056bd32	be0729f0-b4c9-45aa-8613-3185ec72b9a2	withdrawal	30000.00	2026-10-21	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-20 23:32:20.294639-07
24941ebe-c6ab-427a-974f-3568ca4edbc7	81689918-bea1-4906-8082-4d937056bd32	be0729f0-b4c9-45aa-8613-3185ec72b9a2	valuation	105000.00	2026-10-21	\N	\N	2026-10-20 23:34:01.029556-07
a1d685bf-b663-428e-ab18-8ab33c6e716d	81689918-bea1-4906-8082-4d937056bd32	be0729f0-b4c9-45aa-8613-3185ec72b9a2	valuation	105000.00	2026-10-21	\N	\N	2026-10-20 23:34:29.334004-07
bc262091-c236-4538-9979-501c19e9da9f	81689918-bea1-4906-8082-4d937056bd32	be0729f0-b4c9-45aa-8613-3185ec72b9a2	valuation	105000.00	2026-10-21	\N	\N	2026-10-20 23:41:07.023119-07
11ac65a3-7169-4672-b3ba-9e81ee425e73	b7ecb412-ba7d-49ea-b1e8-1fb61e7782aa	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	contribution	200.00	2026-10-23	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	\N	2026-10-24 14:54:36.935131-07
8d1cda91-6ce4-4c7a-afe3-7de1286a8b11	b7ecb412-ba7d-49ea-b1e8-1fb61e7782aa	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	valuation	200.05	2026-10-27	\N	\N	2026-10-27 09:31:54.747406-07
3dd6988b-bf64-4906-9e05-f880100013f1	b7ecb412-ba7d-49ea-b1e8-1fb61e7782aa	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	valuation	200.11	2026-10-28	\N	\N	2026-10-28 00:27:04.17362-07
4f45df12-1605-4b48-8f8c-7e4f3f129eb4	b7ecb412-ba7d-49ea-b1e8-1fb61e7782aa	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	valuation	200.32	2026-11-01	\N	\N	2026-11-01 01:18:13.886533-07
f888d7f5-6435-4671-bb9c-b3c74c88c5bf	b7ecb412-ba7d-49ea-b1e8-1fb61e7782aa	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	valuation	200.36	2026-11-02	\N	\N	2026-11-02 04:18:24.477727-08
956efb28-af4c-4a55-aaef-11ed288adc3d	b7ecb412-ba7d-49ea-b1e8-1fb61e7782aa	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	valuation	200.43	2026-11-03	\N	\N	2026-11-02 22:39:23.154021-08
c66510bd-4d54-4c60-a2ac-636d2e63f53d	b7ecb412-ba7d-49ea-b1e8-1fb61e7782aa	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	valuation	200.49	2026-11-04	\N	\N	2026-11-03 21:58:49.214725-08
4e733c1e-30f7-43ea-bec9-d18850630edb	b7ecb412-ba7d-49ea-b1e8-1fb61e7782aa	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	contribution	10000.00	2026-11-04	0410f96c-f730-432c-891f-3c17856e97d4	\N	2026-11-04 10:12:40.636526-08
157e4846-ed87-4a17-941b-53c84504375b	b7ecb412-ba7d-49ea-b1e8-1fb61e7782aa	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	valuation	10200.54	2026-11-05	\N	\N	2026-11-04 22:11:34.267363-08
d0d32b3b-456d-4eb3-b133-6a58d294fabf	b7ecb412-ba7d-49ea-b1e8-1fb61e7782aa	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	valuation	10203.26	2026-11-06	\N	\N	2026-11-05 22:37:06.94718-08
\.


--
-- Data for Name: investments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.investments (id, user_id, name, investment_type, note, created_at) FROM stdin;
81689918-bea1-4906-8082-4d937056bd32	be0729f0-b4c9-45aa-8613-3185ec72b9a2	Sanlam mmf	mmf	\N	2026-10-20 23:29:53.927526-07
b7ecb412-ba7d-49ea-b1e8-1fb61e7782aa	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Etica Fixed Income Fund -KES	mmf	\N	2026-10-24 14:54:14.753384-07
\.


--
-- Data for Name: ledger_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ledger_entries (id, user_id, entry_type, amount, from_account_id, to_account_id, occurred_on, description, reference_type, reference_id, created_at) FROM stdin;
49eba65f-64d8-4bd6-a98c-9b230b330677	be0729f0-b4c9-45aa-8613-3185ec72b9a2	opening_balance	1500.00	\N	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	2026-10-17	Opening balance	account	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	2026-10-17 09:37:36.407572-07
e7b40d4b-f870-49b1-96dc-a087c654ff5e	be0729f0-b4c9-45aa-8613-3185ec72b9a2	opening_balance	3000.00	\N	63a392bf-058e-4c0d-9652-625d015e651f	2026-10-17	Opening balance	account	63a392bf-058e-4c0d-9652-625d015e651f	2026-10-17 09:38:00.997044-07
67d5f46a-3b17-4771-ac02-2f7cd49d8a28	be0729f0-b4c9-45aa-8613-3185ec72b9a2	opening_balance	10000.00	\N	23b919d9-b73c-4754-8d42-172efab1e4a7	2026-10-17	Opening balance	account	23b919d9-b73c-4754-8d42-172efab1e4a7	2026-10-17 09:38:21.433972-07
bbeedbb5-afe8-4ebc-958a-8d280cc5fcba	be0729f0-b4c9-45aa-8613-3185ec72b9a2	income	58000.00	\N	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	2026-10-18	Salary	income	e1f63afb-438b-44bc-ade7-aa8f4be7a9f1	2026-10-18 06:33:29.422288-07
1553feaf-4968-4907-bf8b-e309f6a6b654	be0729f0-b4c9-45aa-8613-3185ec72b9a2	income	50999.00	\N	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	2026-10-18	Salary	income	528be776-f37b-4ecb-91ed-f51f59b13249	2026-10-18 06:34:05.282698-07
339b8768-467c-4491-9bbb-eca40c2f6bf0	be0729f0-b4c9-45aa-8613-3185ec72b9a2	income	8200.00	\N	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	2026-10-18	Salary	income	3966eb2c-e863-4f7d-89a5-f7569c5f71ee	2026-10-18 11:36:53.860808-07
e9bd56d1-b41a-47fa-8db9-3fccf37ec54f	be0729f0-b4c9-45aa-8613-3185ec72b9a2	income	500.00	\N	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	2026-10-18	Side Hustle	income	092c36a8-53e6-4df9-aa70-58fa68d77565	2026-10-18 11:37:50.984925-07
3100b221-04a0-4ca9-aff2-48fcb1487be1	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	560.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-08-18	Airtime & data	expense	6ee594b3-713e-4eee-9194-87406cb9cde8	2026-10-18 12:10:18.03324-07
630ac55f-56f5-4f49-8dbd-5983fd441d75	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	2030.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-08-18	Monthly lunch	expense	e7d22541-f28f-4313-a4db-3737f77ccc35	2026-10-18 12:11:20.001402-07
d3691e68-2b8d-43cf-bdba-e08b844b8231	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	2640.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-08-18	Monthly fare	expense	9f76ada5-6f64-4e91-b6d6-737ec5e2a696	2026-10-18 12:11:56.917939-07
bf9c98b8-7edc-4934-81f9-64f3a7be52a9	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	2493.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-08-18	gifts for friends family and self	expense	34a27f01-35f7-4c30-8595-870969b444a3	2026-10-18 12:13:11.241142-07
fb1b561c-b0aa-4321-99f8-0a437092f216	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	560.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-09-18	monthly airtime	expense	6020e49e-a45f-4ed7-9cf9-2c3239567d18	2026-10-18 12:18:49.025475-07
da88caeb-79d0-4a3e-9248-687b28227c30	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	2710.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-09-18	Monthly food	expense	82668dd6-4017-4e89-b958-ab3cf12e1f36	2026-10-18 12:19:40.255299-07
4e3afc20-0ae3-4935-b5e1-4594645b7bff	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	2930.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-09-18	monthly transport	expense	4a5a6617-c4b8-4b7e-a627-c42581ffb34a	2026-10-18 12:20:20.340492-07
ea778b16-0733-4b19-9b58-f4bfab6011ee	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	2040.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-09-18	monthly gifts for self and others	expense	7ef48527-6921-4a67-a068-11ee0c4b447c	2026-10-18 12:21:22.283295-07
cb26c00c-9427-44e2-b56b-b71d92d0de7f	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	30.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-01	fare to stage	expense	6c3ca79d-d138-49f6-be2b-c3d00f6786fa	2026-10-18 12:23:59.755247-07
337ee8c1-7e0c-41f4-9cd9-dfca3243aaba	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	40.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-01	fare to work	expense	4676d1a8-cb0c-45c8-84b9-22bd506097da	2026-10-18 12:24:45.607772-07
40f1b1d4-f1d9-46b7-b183-565a52ff1ab0	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	200.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-01	lunch	expense	a9fe0ab0-1a51-4fad-86df-eb0653a42247	2026-10-18 12:25:14.292573-07
031e83f6-4f69-4b7c-806a-5ede01349a04	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	20.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-01	airtime	expense	4ead062c-967c-46bb-b389-73ecc4b0eab6	2026-10-18 12:25:49.116228-07
bf842836-5b0a-4e8e-b645-72b26aae776e	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	20.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-03	airtime	expense	c2e3eaa9-e8b3-4d85-829b-7170a8067b3c	2026-10-18 12:26:49.106328-07
8c9c4230-abcf-4049-a19e-1979c8105901	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	100.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-04	Sunday offering	expense	714eb638-44c9-41eb-9615-26f0333af21d	2026-10-18 12:28:05.812111-07
84ce6cc8-6d60-40c4-8594-b7e78b82142f	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	100.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-04	gifts for self	expense	101e7136-fdcf-4b34-b323-540a6646dd92	2026-10-18 12:28:56.870465-07
e1a21d30-bf8a-484d-a225-b29c5899d8a8	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	50.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-05	fare to stage	expense	a5daede6-f8ec-4ab3-9bcd-f498b3210997	2026-10-18 12:29:46.328073-07
d1117cc3-1f4d-449b-a9ab-92464b008013	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	40.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-05	Fare to work	expense	a0ff1017-4100-4cdd-8277-649016cca20d	2026-10-18 12:30:24.569195-07
9999a411-91ba-43d0-b538-f16e6d58ada6	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	20.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-05	Airtime & data	expense	21d16376-69ba-4254-9b59-42f5a2e2cc39	2026-10-18 12:31:02.734137-07
1cebbbd6-5ab5-465f-8fe1-6c6939209da1	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	40.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-05	Transport back home	expense	a8ff0720-d651-47a1-a7e0-58a70ad525d3	2026-10-18 12:31:52.092462-07
2c405aa4-17e3-4f25-a482-4b023f86c39e	be0729f0-b4c9-45aa-8613-3185ec72b9a2	savings_deposit	43000.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	23b919d9-b73c-4754-8d42-172efab1e4a7	2026-09-30	Month-end savings	\N	\N	2026-10-18 13:17:59.220467-07
818776d9-dcd0-40c6-93bf-b967de486765	be0729f0-b4c9-45aa-8613-3185ec72b9a2	debt_payment	1000.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-18	Helb	obligation_payment	7259d65a-4bae-4f23-b0bf-54869b75605e	2026-10-18 13:40:33.317928-07
eea78c9f-8cd0-4b07-ad00-a30f721d4c85	be0729f0-b4c9-45aa-8613-3185ec72b9a2	debt_payment	1000.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-18	Helb	obligation_payment	5138acf9-9e4a-43e7-bcc2-a05bf757aa1b	2026-10-18 13:40:52.380488-07
217194d9-df68-433a-960f-681bc3fbdc1b	be0729f0-b4c9-45aa-8613-3185ec72b9a2	debt_payment	3000.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-20	Laptop	obligation_payment	716294ba-4bf3-4214-accc-88b24a6527a8	2026-10-20 00:54:19.972955-07
faecdbf7-a547-4a62-8f9b-1c76bdcca2aa	be0729f0-b4c9-45aa-8613-3185ec72b9a2	purchase_payment	50000.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-20	2018 BMW 118i	purchase_payment	2353244f-90b8-49e8-b594-f756f71996cf	2026-10-20 01:44:51.993881-07
2a336852-9ebf-4d8c-b717-6906b3c7358c	be0729f0-b4c9-45aa-8613-3185ec72b9a2	purchase_payment	50000.00	23b919d9-b73c-4754-8d42-172efab1e4a7	\N	2026-10-20	2018 BMW 118i	purchase_payment	2353244f-90b8-49e8-b594-f756f71996cf	2026-10-20 01:44:51.993881-07
3b4466cd-443f-4cdf-8bbe-8cbc5fc166bb	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	455.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-05	gifts to self	expense	956e5e36-c550-4350-9ddf-29970bffdbfa	2026-10-18 12:32:12.623601-07
bcad384f-7b4e-4192-b7c4-ab5bf3def1cd	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	50.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-06	transport to stage	expense	cc2ffcfd-eccd-4b52-b71b-2f25ea683e64	2026-10-20 12:18:44.664492-07
83538fb4-bb02-4e5e-8b9f-26de428dba59	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	20.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-06	Airtime & data	expense	18649eb0-2739-4e1f-9e5f-b4837c69217c	2026-10-20 12:19:03.005822-07
29ed8c5b-7940-41f2-927d-992621357e6f	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	40.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-06	Transport	expense	0afbe5a1-3514-4988-ae4c-c2d4f87f2c6e	2026-10-20 12:19:27.748109-07
5c078db2-5df2-43a2-a11b-107322d3c27e	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	20.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-06	Airtime & data	expense	043fa920-ac22-472a-bda3-8555b2f34125	2026-10-20 12:19:40.513166-07
88e1f2cc-32eb-4f0c-84e1-3a15b8e36044	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	160.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-06	Food	expense	f491f196-6cef-4f7d-9de1-a5c306a86663	2026-10-20 12:19:56.265323-07
fe6f0731-5e91-4c68-84ea-911dbee58aeb	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	80.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-07	Transport	expense	efdf142d-a628-4adc-a375-968e7bc1be84	2026-10-20 12:20:19.32088-07
1970d66a-827d-4c9c-ae17-3c6b4fdbbabe	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	40.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-07	Airtime & data	expense	799a6405-872c-49cc-843e-02f9fa55e584	2026-10-20 12:20:37.774478-07
8364736b-da3d-4ba6-80a8-2b1d7b696519	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	40.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-07	Transport	expense	1e9686ea-97bc-49e1-807d-c3763ea193e7	2026-10-20 12:20:57.966573-07
693bcb0b-39ac-44a2-bb1f-025e47fb2fdc	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	20.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-07	Airtime & data	expense	f85daadc-53b3-468b-bc02-28d412e53c45	2026-10-20 12:21:26.665538-07
17a4195b-f578-4013-8ea6-88b4918c5a6b	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	40.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-09	Transport	expense	2dafba7e-e9f9-43b7-b148-9bf70811d6e2	2026-10-20 12:21:58.951673-07
6bb8b4c5-c91e-4ec7-b519-c3e53c4cc46b	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	20.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-10	Airtime & data	expense	e0cfb796-188b-4c3b-b80b-b80077228e55	2026-10-20 12:22:20.060835-07
a5e951e4-dca4-4ed0-a982-2ad3b72683e4	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	20.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-12	Airtime & data	expense	3f98e89b-fa0e-476c-90a9-f18c7d21fc20	2026-10-20 12:22:58.381997-07
bef916f2-f46a-4ac2-b910-27aba917eb0f	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	40.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-12	Transport	expense	ff468ae6-0d3c-46b2-a03b-c683a792da93	2026-10-20 12:22:40.410566-07
70ea5ad0-a32e-4007-86f0-c55f97fe8e7d	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	20.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-13	Airtime & data	expense	22842f8f-66bd-4d61-8d35-e9ca1f4c9f9a	2026-10-20 12:23:25.157521-07
cc2903be-40fe-4bff-9aa4-ecb552fec143	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	20.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-13	Airtime & data	expense	34468d38-815d-4c0a-a00a-275ceb1233a4	2026-10-20 12:23:43.481574-07
ce8f7644-1c50-4266-b602-d7e7ceb3f490	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	40.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-13	Transport	expense	9d74319d-e45f-4dcc-aec6-7a9160a1f35f	2026-10-20 12:24:05.174788-07
cfa7365a-f588-4193-bc02-4ed793198e36	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	40.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-13	Transport	expense	71c871ec-a06b-4b1f-aac4-e4b0b16a81b3	2026-10-20 12:24:43.909511-07
e54a12b9-da52-4fb9-b720-e2ce63415a29	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	20.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-19	Airtime & data	expense	44a1bea1-c124-4f4a-80af-cde3f185a4ec	2026-10-20 12:24:57.519194-07
c9a87399-947d-4434-b247-d3544e0fe23b	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	70.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-19	Transport	expense	148f489c-7ec2-4f94-8b6d-d7c00b578d7a	2026-10-20 12:25:15.416844-07
78fce076-a7b7-450f-8d71-f7209cb6a18d	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	350.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-19	Dolly's cover	expense	0c4edbc7-1ab9-4715-99ff-12228658e5ab	2026-10-20 12:25:44.928704-07
615ec7a1-b2c5-4d88-9205-e5c70f07f89b	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	1500.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-20	Mashujaa Holiday treat	expense	5301872b-ceba-4e11-98ac-303ccac3f71c	2026-10-20 12:27:51.376024-07
92ae6400-2d30-40a6-98b0-ae77e9e85057	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	1790.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-19	Dolly's book	expense	e629b6ae-7c1a-4616-adea-9a10aee9b9db	2026-10-20 12:26:12.011307-07
6482b22a-0ef0-4657-9d23-829d49ece622	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	2000.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-19	Dinner date with Dolly	expense	f2916ca5-6a6c-4edb-98e5-2056c0b7f3dd	2026-10-20 12:26:46.591282-07
39b68847-2b69-4589-85b4-599eff5442dc	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	80.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-19	Transport	expense	385507a1-3ec1-434e-8f3b-069e7ba3330d	2026-10-20 12:27:07.810115-07
968c42d3-fa51-426c-91ee-f84b9a394bb4	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	70.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-19	Transport	expense	bbdd849a-50f1-4f3e-bcf8-1b17757eff08	2026-10-20 12:27:18.040076-07
d226c789-a50a-4b3c-af94-33b8d2c0df0e	be0729f0-b4c9-45aa-8613-3185ec72b9a2	investment_withdrawal	30000.00	\N	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	2026-10-21	Sanlam mmf	investment_event	4192f428-75d0-4273-ab42-8f4bdb3e0244	2026-10-20 23:32:20.294639-07
3a8d717a-992c-41c8-85eb-a650c039275d	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	400.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-21	Food	expense	eaff1925-c4a0-411b-9483-4af8fe776654	2026-10-21 05:43:01.636805-07
cf5ba196-c50d-42e5-af96-01787d709182	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	40.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-21	Transport	expense	e515a941-9e95-474b-81bd-74df711fa45c	2026-10-21 05:43:11.357088-07
83b084b8-4a34-47fe-9c83-dda17b4c0c41	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	opening_balance	3000.00	\N	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	2026-10-21	Opening balance	account	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	2026-10-21 07:02:19.904365-07
5e504413-fec7-44bb-9014-7ae42e6b9d4b	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	opening_balance	100000.00	\N	ad384dff-b0f6-4497-89bb-3cea1c47ff0e	2026-10-21	Opening balance	account	ad384dff-b0f6-4497-89bb-3cea1c47ff0e	2026-10-21 07:03:01.187405-07
c67bef3d-a228-4861-8d8f-f2253cdea7bb	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	opening_balance	50.00	\N	0410f96c-f730-432c-891f-3c17856e97d4	2026-10-21	Opening balance	account	0410f96c-f730-432c-891f-3c17856e97d4	2026-10-21 07:03:35.801812-07
368dc4f1-b2e3-4312-bcb7-51815e0e9356	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	opening_balance	8145.00	\N	303689cb-0649-4dfe-9f05-5568ae9d23bf	2026-10-21	Opening balance	account	303689cb-0649-4dfe-9f05-5568ae9d23bf	2026-10-21 07:20:25.972269-07
b650e435-f426-4e0e-a4cc-a90b4960707a	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	1790.00	303689cb-0649-4dfe-9f05-5568ae9d23bf	\N	2026-10-19	Book gift for dolly	expense	b41696df-b01e-46c0-8827-9d19a9e5a739	2026-10-21 07:21:30.591686-07
e4801da6-d178-411f-885c-247fbbae40c1	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	350.00	303689cb-0649-4dfe-9f05-5568ae9d23bf	\N	2026-10-19	Cover case for dolly	expense	f450790f-17b7-46cb-913a-792327894266	2026-10-21 07:22:19.064279-07
7d964aa1-0e00-4ec4-a57d-f71fdf3f691a	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	income	50899.00	\N	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	2026-11-04	Salary	income	77ea9ccb-d9f1-4281-9ecd-bf6637d8036f	2026-11-04 10:06:19.449196-08
928b8ea6-539c-4d49-b5db-b7c0fb3aca22	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	1500.00	303689cb-0649-4dfe-9f05-5568ae9d23bf	\N	2026-10-20	Mashujaa day Holiday treat	expense	e51bdd72-ad56-4be8-ba58-775308c30b10	2026-10-21 07:23:48.933318-07
1e5c961e-4256-4112-b563-31b2751c2830	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	2000.00	303689cb-0649-4dfe-9f05-5568ae9d23bf	\N	2026-10-19	Dinner date with Dolly	expense	6ac5e314-d336-454f-bc64-481dc46adbfd	2026-10-21 07:21:49.213893-07
8b2528f0-7080-4156-872d-b2c32041db76	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	220.00	303689cb-0649-4dfe-9f05-5568ae9d23bf	\N	2026-10-19	Transport	expense	3c9897cf-79a9-435c-a5e0-ce674a9e85a0	2026-10-21 07:23:13.887721-07
a86092f9-3728-49ac-966d-4f32e9330c1b	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	260.00	303689cb-0649-4dfe-9f05-5568ae9d23bf	\N	2026-10-12	Airtime & data	expense	3f72a812-9dc1-4797-9041-606bf880070f	2026-10-21 07:24:49.292928-07
c2bcfefb-b68b-4c45-8fe4-017ef56a92f1	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	610.00	303689cb-0649-4dfe-9f05-5568ae9d23bf	\N	2026-10-12	Transport	expense	5acae252-daf2-49ec-991a-c081d89dca2e	2026-10-21 07:25:31.201824-07
f70fc44c-b1bb-49cb-a88e-a8fc58916c2d	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	760.00	303689cb-0649-4dfe-9f05-5568ae9d23bf	\N	2026-10-12	Food	expense	2df0b9c0-8a7e-41f6-8260-16bedac1a174	2026-10-21 07:25:56.020351-07
560c7245-4996-4ad1-a4bd-6eef87bae3c6	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	100.00	303689cb-0649-4dfe-9f05-5568ae9d23bf	\N	2026-10-10	Offering	expense	963296c2-0a4e-40d0-ba95-6b64430cdd47	2026-10-21 07:26:25.94995-07
93522b9b-ad60-4f5f-b14f-f237c62850f3	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	115.00	303689cb-0649-4dfe-9f05-5568ae9d23bf	\N	2026-10-10	self snack treat	expense	095410d7-52fb-43c0-a51c-d4816d8da56a	2026-10-21 07:27:56.586781-07
ece7ecd9-0d01-4a26-9ad1-017eddd8afd3	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	40.00	303689cb-0649-4dfe-9f05-5568ae9d23bf	\N	2026-10-21	Transport	expense	4608ad49-955a-4d0d-9164-a83d8730e28d	2026-10-21 07:30:06.007898-07
c94c4d3d-bd4f-4f7a-90fa-ee386cc52510	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	400.00	303689cb-0649-4dfe-9f05-5568ae9d23bf	\N	2026-10-21	Food	expense	e57a90d4-0e00-4c7e-8425-dbcd321e874f	2026-10-21 07:30:22.162684-07
be74d21c-53cf-4961-bfea-34b939c5ef91	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	20.00	0410f96c-f730-432c-891f-3c17856e97d4	\N	2026-10-21	Airtime & data	expense	39f53203-ae20-4c84-a5c7-344664488c4d	2026-10-22 06:03:41.139942-07
440a6edd-99f0-45e5-bdae-79f509b7d01d	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	20.00	0410f96c-f730-432c-891f-3c17856e97d4	\N	2026-10-22	Airtime & data	expense	8d8227a2-2f25-4b32-a123-3d3101f83ea0	2026-10-22 06:03:53.164121-07
942752f4-7c0f-4417-826b-2f735fca1158	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	40.00	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	\N	2026-10-22	Transport	expense	1a497676-dbd8-4b42-bba3-287e7605d901	2026-10-22 06:04:04.760033-07
9e3292d8-d68a-4168-b31b-37a8e94826b2	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	40.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-22	Transport	expense	3dbcedb9-45b4-439d-8f66-c3a579055ded	2026-10-22 09:20:31.379753-07
7be7fa2b-fe84-48b0-826b-e41d14122183	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	20.00	63a392bf-058e-4c0d-9652-625d015e651f	\N	2026-10-22	Airtime & data	expense	53a6f734-8136-44a5-a714-b2a249998c4e	2026-10-22 09:20:48.363369-07
d3f887ed-a145-4e07-bf83-f852158fe939	be0729f0-b4c9-45aa-8613-3185ec72b9a2	expense	20.00	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	\N	2026-10-21	Airtime & data	expense	bb82b810-10d2-483c-a085-be3143919287	2026-10-22 09:21:06.969392-07
272f1bfd-0b01-4a50-8e75-b80cd3a02fa4	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	50.00	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	\N	2026-10-23	fare to stage	expense	19fe0050-4737-4738-b62d-aabd82393548	2026-10-23 11:30:33.194398-07
7f58acc9-5152-4585-9755-29276d82c5ce	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	income	10.00	\N	303689cb-0649-4dfe-9f05-5568ae9d23bf	2026-10-23	Gift	income	44b68860-bcf0-4fcf-adb2-23594a29ee06	2026-10-23 11:34:13.295779-07
b28730f5-4ab0-4684-a5d2-9c0c23fe0e0f	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	debt_payment	10.00	303689cb-0649-4dfe-9f05-5568ae9d23bf	\N	2026-10-23	Work Savings: Airtime & data	obligation_payment	8a1d8df6-cc8b-4316-ba87-74d97b7783ee	2026-10-23 11:35:27.690291-07
edbbf00c-1754-4d97-a5d8-372a0cbc907e	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	investment_contribution	200.00	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	\N	2026-10-23	Etica Fixed Income Fund -KES	investment_event	11ac65a3-7169-4672-b3ba-9e81ee425e73	2026-10-24 14:54:36.935131-07
50689186-660e-49e1-beaa-9371bff93afa	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	10.00	0410f96c-f730-432c-891f-3c17856e97d4	\N	2026-10-25	Airtime & data	expense	f1171e0d-b9ec-4408-bb2b-1808f6912665	2026-10-25 12:27:21.913049-07
98597d33-d93f-4cd6-b945-bea456285b3d	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	40.00	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	\N	2026-10-27	Transport	expense	fabcf3a1-5fc8-42e8-b7c9-cfc63a4d57c7	2026-10-27 09:28:24.959009-07
09ff7beb-e2c8-4116-bd25-375b93584600	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	180.00	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	\N	2026-10-27	Food	expense	1d70aa3d-2df2-4885-bfba-c724a3408c74	2026-10-27 09:29:07.329287-07
f9151c46-db74-4a0c-b81c-5dc5b1751d6f	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	100.00	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	\N	2026-10-29	Food	expense	5678aa9a-accc-44d0-8ae7-542b4e5f8881	2026-10-29 05:24:40.90152-07
4589f7ec-8e95-4a14-bdf0-2f15eeb62582	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	80.00	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	\N	2026-10-29	Transport	expense	b1962ab5-ce31-4fe5-9878-f881460b28b5	2026-10-29 05:26:07.579061-07
2d202171-da49-4735-b54a-05ae9f9ae303	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	50.00	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	\N	2026-10-31	medicine	expense	04f2c47b-dcb0-4e2a-9c2f-e545fb8bc5a1	2026-11-01 01:11:09.011121-07
fd18518c-55de-4af3-ad9d-6a4d64865958	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	60.00	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	\N	2026-10-31	Airtime & data	expense	8dfc6d7d-1d2a-4af3-a5aa-804ac2d4e7b3	2026-11-01 01:11:28.119737-07
8790e5a8-4f8f-4137-a574-e771eb2ce122	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	100.00	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	\N	2026-10-31	Tandie gift	expense	02c874eb-1989-4767-9b50-770acb27112c	2026-11-01 01:10:43.449159-07
20b4c71b-eb80-4614-93fb-a258ea00d7b5	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	20.00	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	\N	2026-11-03	sweets	expense	1a532874-a41a-4df0-aa04-7b118bdcd901	2026-11-03 21:57:13.702469-08
12c82c74-b21b-4935-ae03-ffcd0f09b9d5	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	transfer	50899.00	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	ad384dff-b0f6-4497-89bb-3cea1c47ff0e	2026-11-04	\N	transfer	\N	2026-11-04 10:07:50.795921-08
83b776d3-43fa-4799-883a-ace8fa967769	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	transfer	22000.00	ad384dff-b0f6-4497-89bb-3cea1c47ff0e	0410f96c-f730-432c-891f-3c17856e97d4	2026-11-04	\N	transfer	\N	2026-11-04 10:09:07.950874-08
4a1ac752-bb7c-4d67-83f8-b272c489e43d	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	76.00	ad384dff-b0f6-4497-89bb-3cea1c47ff0e	\N	2026-11-04	transaction cost	expense	f3277868-cd52-4af5-bbfe-b11155eb4184	2026-11-04 10:10:03.52208-08
031e8bcf-651e-4cf3-b123-50c60103f71f	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	investment_contribution	10000.00	0410f96c-f730-432c-891f-3c17856e97d4	\N	2026-11-04	Etica Fixed Income Fund -KES	investment_event	4e733c1e-30f7-43ea-bec9-d18850630edb	2026-11-04 10:12:40.636526-08
ccbd6112-6909-4b91-b981-71ab9e6f1b3e	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	48.00	0410f96c-f730-432c-891f-3c17856e97d4	\N	2026-11-04	transaction cost	expense	d805740d-2612-4cb3-9464-fbd4fd7402b1	2026-11-04 10:14:05.38053-08
4a4b1b19-c60f-43d0-8c71-24f794fece79	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	190.00	0410f96c-f730-432c-891f-3c17856e97d4	\N	2026-11-05	Food	expense	2b66049d-b97f-4ff3-8ea3-d1003eb3b6e1	2026-11-05 04:18:42.353874-08
e1510be9-6893-42e0-a763-8f0ee7a3ba2d	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	debt_payment	1100.00	0410f96c-f730-432c-891f-3c17856e97d4	\N	2026-11-05	SHOP ARREARS	obligation_payment	3d16159f-b0e5-4272-953a-b835e6ae779a	2026-11-05 07:18:43.153172-08
a0dd8ad4-d45f-4964-93c1-2726ebc9a571	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	debt_payment	30.00	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	\N	2026-11-05	Work Savings: Airtime & data	obligation_payment	07c5f3be-c601-44a8-ad56-28d85b62c325	2026-11-05 07:18:53.119385-08
a369edfd-3585-42c1-897f-1c5533bd574c	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	debt_payment	20.00	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	\N	2026-11-05	Work Savings: Airtime & data	obligation_payment	86e9b373-ce49-475e-b9b7-07518a259982	2026-11-05 07:19:04.022015-08
945b2091-f289-42ad-93ce-8c7be4d518c2	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	debt_payment	40.00	0410f96c-f730-432c-891f-3c17856e97d4	\N	2026-11-05	Work Savings: Airtime & data	obligation_payment	cb123b55-4570-43c4-81c5-bb8cbca430e8	2026-11-05 07:19:42.256642-08
e86a32c5-e508-49b8-b251-d675d8bc5f4a	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	debt_payment	40.00	0410f96c-f730-432c-891f-3c17856e97d4	\N	2026-11-05	Work Savings: Airtime & data	obligation_payment	204730d4-0ea2-4513-ada7-af798525d4db	2026-11-05 07:19:58.409957-08
19d260e2-65d5-475f-aadb-ab3d49062d6c	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	debt_payment	20.00	0410f96c-f730-432c-891f-3c17856e97d4	\N	2026-11-05	Work Savings: Airtime & data	obligation_payment	dd038383-cf66-4988-b8eb-61e9bb5caa1a	2026-11-05 07:20:09.932696-08
0b4a2ccc-75a8-4132-b4fe-3796f0317bbf	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	debt_payment	100.00	0410f96c-f730-432c-891f-3c17856e97d4	\N	2026-11-05	Work Savings: Fare home	obligation_payment	68857276-923e-483d-a484-a00e34df1c28	2026-11-05 07:20:19.778446-08
c7a02cf6-bf63-43bb-90ba-eca15b79456d	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	debt_payment	80.00	0410f96c-f730-432c-891f-3c17856e97d4	\N	2026-11-05	Work Savings: Fare to town	obligation_payment	d0943351-9641-4bf6-82a2-46126a7d11ba	2026-11-05 07:20:33.235927-08
530d50ca-6fa9-4e03-b359-c422fcf633da	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	debt_payment	150.00	0410f96c-f730-432c-891f-3c17856e97d4	\N	2026-11-05	Work Savings: Food	obligation_payment	cfbbdf8b-dfee-43a9-b471-1206e8997e33	2026-11-05 07:20:42.469957-08
4207f1dd-5f1d-4791-ba0a-7756384f2821	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	debt_payment	170.00	0410f96c-f730-432c-891f-3c17856e97d4	\N	2026-11-05	Work Savings: Food	obligation_payment	e0061c7a-dcfe-478f-b0a2-74f124722cb0	2026-11-05 07:20:54.192018-08
d537186e-1dea-4c24-b9d5-ccafa1f39a15	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	debt_payment	200.00	0410f96c-f730-432c-891f-3c17856e97d4	\N	2026-11-05	Work Savings: Food	obligation_payment	3700d97d-78fa-40c7-8556-a94e56363705	2026-11-05 07:21:04.151678-08
9b6bf91f-f958-4518-871c-eaf75ae129fb	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	debt_payment	220.00	0410f96c-f730-432c-891f-3c17856e97d4	\N	2026-11-05	Work Savings: Food at Town	obligation_payment	88163e31-923c-485b-b6b4-c59285bc6b63	2026-11-05 07:21:12.745733-08
8fe4c713-b66d-4983-8a8f-9f05377a1ddc	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	debt_payment	50.00	ad384dff-b0f6-4497-89bb-3cea1c47ff0e	\N	2026-11-05	Work Savings: njugu	obligation_payment	5f186295-2ce1-47ae-ab99-c49852a14b50	2026-11-05 07:21:22.245698-08
4e2e75d0-a1f2-4958-ab48-70e5aca58776	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	debt_payment	100.00	0410f96c-f730-432c-891f-3c17856e97d4	\N	2026-11-05	Work Savings: Other	obligation_payment	5f34df0c-0758-433c-8fef-b1998923b3b9	2026-11-05 07:21:32.277274-08
66a77cb4-5958-4029-a123-82f1b5932976	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	debt_payment	425.00	0410f96c-f730-432c-891f-3c17856e97d4	\N	2026-11-05	Work Savings: Shopping for mum	obligation_payment	8f9ae90f-8f41-4068-b3fe-7aa25cf9ce0f	2026-11-05 07:21:56.472593-08
9dfc585d-3c18-4ccc-92c6-c0561b0fe682	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	debt_payment	80.00	0410f96c-f730-432c-891f-3c17856e97d4	\N	2026-11-05	Work Savings: Transport	obligation_payment	36537711-168d-4e0b-8c69-6eaad95449d1	2026-11-05 07:22:13.971041-08
a4c110c0-9a05-4bd3-8a71-69be5ce72fc7	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	80.00	0410f96c-f730-432c-891f-3c17856e97d4	\N	2026-11-05	Transport	expense	41537d34-7acc-480f-8df1-8cb20867ce2f	2026-11-05 07:23:37.728626-08
53462a94-b870-49c7-b3f5-0189dd38363c	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	adjustment	378.00	0410f96c-f730-432c-891f-3c17856e97d4	\N	2026-11-05	Balance adjustment	adjustment	\N	2026-11-05 07:25:29.663886-08
edbe8c54-1626-40f2-bb75-02e32a6959c1	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	adjustment	350.00	\N	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	2026-11-05	Balance adjustment	adjustment	\N	2026-11-05 07:26:51.387905-08
99557286-6304-410a-adf9-bfd150683628	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	20.00	0410f96c-f730-432c-891f-3c17856e97d4	\N	2026-11-06	Airtime & data	expense	803062ef-e632-46a1-af67-6e0daf6b8cc6	2026-11-05 22:32:20.710833-08
e6e02cb9-15e5-4169-bd71-fdc580f5af7e	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	90.00	0410f96c-f730-432c-891f-3c17856e97d4	\N	2026-11-06	Transport	expense	03b8ce8a-bd91-4f89-9b31-297b2b7122dd	2026-11-05 22:32:36.828417-08
8d488608-d58b-4fd4-8346-3bce51d20d7d	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	expense	50.00	0410f96c-f730-432c-891f-3c17856e97d4	\N	2026-11-06	Food	expense	010fd651-9e00-41d3-bd9c-9e16ac550e17	2026-11-05 22:32:57.926516-08
a8e2e7ff-0e27-4848-bba7-83db95a1a4d3	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	adjustment	30.00	\N	0410f96c-f730-432c-891f-3c17856e97d4	2026-11-06	Balance adjustment	adjustment	\N	2026-11-05 22:36:31.762074-08
\.


--
-- Data for Name: obligation_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.obligation_payments (id, obligation_id, user_id, account_id, amount, paid_on, note, created_at) FROM stdin;
7259d65a-4bae-4f23-b0bf-54869b75605e	a078e17d-e126-4633-8463-287a5564310b	be0729f0-b4c9-45aa-8613-3185ec72b9a2	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	1000.00	2026-10-18	\N	2026-10-18 13:40:33.317928-07
5138acf9-9e4a-43e7-bcc2-a05bf757aa1b	a078e17d-e126-4633-8463-287a5564310b	be0729f0-b4c9-45aa-8613-3185ec72b9a2	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	1000.00	2026-10-18	\N	2026-10-18 13:40:52.380488-07
716294ba-4bf3-4214-accc-88b24a6527a8	1dd55321-15b8-4acd-ac04-bb9f6e99a685	be0729f0-b4c9-45aa-8613-3185ec72b9a2	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	3000.00	2026-10-20	October installment	2026-10-20 00:54:19.972955-07
8a1d8df6-cc8b-4316-ba87-74d97b7783ee	624838b5-d813-48ba-a4a8-47fb9d2b39a4	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	303689cb-0649-4dfe-9f05-5568ae9d23bf	10.00	2026-10-23	\N	2026-10-23 11:35:27.690291-07
3d16159f-b0e5-4272-953a-b835e6ae779a	56771ee3-3f0e-4124-ab97-607c5ea196f4	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	0410f96c-f730-432c-891f-3c17856e97d4	1100.00	2026-11-05	\N	2026-11-05 07:18:43.153172-08
07c5f3be-c601-44a8-ad56-28d85b62c325	624838b5-d813-48ba-a4a8-47fb9d2b39a4	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	30.00	2026-11-05	\N	2026-11-05 07:18:53.119385-08
86e9b373-ce49-475e-b9b7-07518a259982	033401d5-011c-4264-8801-da7af74fd50b	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	9faa948c-b4bb-4f3b-b5f8-e1be810d8d9a	20.00	2026-11-05	\N	2026-11-05 07:19:04.022015-08
cb123b55-4570-43c4-81c5-bb8cbca430e8	56b53840-188c-4c89-8dad-3c47186a0c01	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	0410f96c-f730-432c-891f-3c17856e97d4	40.00	2026-11-05	\N	2026-11-05 07:19:42.256642-08
204730d4-0ea2-4513-ada7-af798525d4db	96314d3d-0723-4758-87da-1c2b71902540	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	0410f96c-f730-432c-891f-3c17856e97d4	40.00	2026-11-05	\N	2026-11-05 07:19:58.409957-08
dd038383-cf66-4988-b8eb-61e9bb5caa1a	03309062-40bf-4ff8-b1a0-e7779c63f3a0	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	0410f96c-f730-432c-891f-3c17856e97d4	20.00	2026-11-05	\N	2026-11-05 07:20:09.932696-08
68857276-923e-483d-a484-a00e34df1c28	d7f14d0b-edb0-4ea1-8800-473d64332075	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	0410f96c-f730-432c-891f-3c17856e97d4	100.00	2026-11-05	\N	2026-11-05 07:20:19.778446-08
d0943351-9641-4bf6-82a2-46126a7d11ba	bea1a0b0-21e3-41af-ac08-448730fed4c2	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	0410f96c-f730-432c-891f-3c17856e97d4	80.00	2026-11-05	\N	2026-11-05 07:20:33.235927-08
cfbbdf8b-dfee-43a9-b471-1206e8997e33	c296690e-6a0d-42ef-bea0-ad82a3346ef7	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	0410f96c-f730-432c-891f-3c17856e97d4	150.00	2026-11-05	\N	2026-11-05 07:20:42.469957-08
e0061c7a-dcfe-478f-b0a2-74f124722cb0	23dc6fca-9c3c-4fd4-b98d-b2a6fa59c27b	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	0410f96c-f730-432c-891f-3c17856e97d4	170.00	2026-11-05	\N	2026-11-05 07:20:54.192018-08
3700d97d-78fa-40c7-8556-a94e56363705	614a02f3-1996-4070-9855-4bc7dab3340b	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	0410f96c-f730-432c-891f-3c17856e97d4	200.00	2026-11-05	\N	2026-11-05 07:21:04.151678-08
88163e31-923c-485b-b6b4-c59285bc6b63	c9815719-732e-4f9d-b0b5-5d48e6f28ff5	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	0410f96c-f730-432c-891f-3c17856e97d4	220.00	2026-11-05	\N	2026-11-05 07:21:12.745733-08
5f186295-2ce1-47ae-ab99-c49852a14b50	c96154ac-e13e-448c-8d68-5c0d189d36b5	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	ad384dff-b0f6-4497-89bb-3cea1c47ff0e	50.00	2026-11-05	\N	2026-11-05 07:21:22.245698-08
5f34df0c-0758-433c-8fef-b1998923b3b9	08e9c805-0bb4-4f5f-adeb-d8669b1e3991	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	0410f96c-f730-432c-891f-3c17856e97d4	100.00	2026-11-05	\N	2026-11-05 07:21:32.277274-08
8f9ae90f-8f41-4068-b3fe-7aa25cf9ce0f	628d4f41-09da-46f3-8fde-26c12cdeb069	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	0410f96c-f730-432c-891f-3c17856e97d4	425.00	2026-11-05	\N	2026-11-05 07:21:56.472593-08
36537711-168d-4e0b-8c69-6eaad95449d1	fa6f4d47-f401-4383-b7e9-1facbb823d7c	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	0410f96c-f730-432c-891f-3c17856e97d4	80.00	2026-11-05	\N	2026-11-05 07:22:13.971041-08
\.


--
-- Data for Name: obligations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.obligations (id, user_id, name, original_amount, due_on, note, created_at, installment_amount, frequency, first_due_on) FROM stdin;
a078e17d-e126-4633-8463-287a5564310b	be0729f0-b4c9-45aa-8613-3185ec72b9a2	Helb	144000.00	\N	\N	2026-10-18 13:40:11.410661-07	\N	\N	\N
1dd55321-15b8-4acd-ac04-bb9f6e99a685	be0729f0-b4c9-45aa-8613-3185ec72b9a2	Laptop	36000.00	\N	Kimtech	2026-10-20 00:53:57.29929-07	3000.00	monthly	2026-10-20
56771ee3-3f0e-4124-ab97-607c5ea196f4	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	SHOP ARREARS	1100.00	2026-11-05	SHOP	2026-10-21 07:06:01.307348-07	\N	\N	\N
bea1a0b0-21e3-41af-ac08-448730fed4c2	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Work Savings: Fare to town	80.00	\N	Paid by Work Savings on 23 Oct 2026	2026-10-23 11:31:12.962157-07	\N	\N	\N
c9815719-732e-4f9d-b0b5-5d48e6f28ff5	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Work Savings: Food at Town	220.00	\N	Paid by Work Savings on 23 Oct 2026	2026-10-23 11:31:52.193885-07	\N	\N	\N
d7f14d0b-edb0-4ea1-8800-473d64332075	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Work Savings: Fare home	100.00	\N	Paid by Work Savings on 23 Oct 2026	2026-10-23 11:32:23.324596-07	\N	\N	\N
624838b5-d813-48ba-a4a8-47fb9d2b39a4	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Work Savings: Airtime & data	40.00	\N	Paid by Work Savings on 23 Oct 2026	2026-10-23 11:33:05.69315-07	\N	\N	\N
033401d5-011c-4264-8801-da7af74fd50b	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Work Savings: Airtime & data	20.00	\N	Paid by Work Savings on 29 Oct 2026	2026-10-29 05:24:20.124045-07	\N	\N	\N
c96154ac-e13e-448c-8d68-5c0d189d36b5	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Work Savings: njugu	50.00	\N	Paid by Work Savings on 29 Oct 2026	2026-10-29 05:25:49.345727-07	\N	\N	\N
56b53840-188c-4c89-8dad-3c47186a0c01	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Work Savings: Airtime & data	40.00	\N	Paid by Work Savings on 30 Oct 2026	2026-10-30 13:21:35.319845-07	\N	\N	\N
628d4f41-09da-46f3-8fde-26c12cdeb069	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Work Savings: Shopping for mum	425.00	\N	Paid by Work Savings on 30 Oct 2026	2026-10-30 13:22:01.23916-07	\N	\N	\N
08e9c805-0bb4-4f5f-adeb-d8669b1e3991	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Work Savings: Other	100.00	\N	Paid by Work Savings on 30 Oct 2026	2026-10-30 13:22:41.208732-07	\N	\N	\N
96314d3d-0723-4758-87da-1c2b71902540	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Work Savings: Airtime & data	40.00	\N	Paid by Work Savings on 02 Nov 2026	2026-11-02 00:44:50.570534-08	\N	\N	\N
c296690e-6a0d-42ef-bea0-ad82a3346ef7	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Work Savings: Food	150.00	\N	Paid by Work Savings on 02 Nov 2026	2026-11-02 03:52:50.974495-08	\N	\N	\N
fa6f4d47-f401-4383-b7e9-1facbb823d7c	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Work Savings: Transport	80.00	\N	Paid by Work Savings on 02 Nov 2026	2026-11-02 07:37:37.91025-08	\N	\N	\N
23dc6fca-9c3c-4fd4-b98d-b2a6fa59c27b	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Work Savings: Food	170.00	\N	Paid by Work Savings on 03 Nov 2026	2026-11-03 05:31:25.173225-08	\N	\N	\N
614a02f3-1996-4070-9855-4bc7dab3340b	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Work Savings: Food	200.00	\N	Paid by Work Savings on 04 Nov 2026	2026-11-04 08:12:48.867892-08	\N	\N	\N
03309062-40bf-4ff8-b1a0-e7779c63f3a0	e337b54e-d57f-45ed-b6eb-f8ebbd16c665	Work Savings: Airtime & data	20.00	\N	Paid by Work Savings on 04 Nov 2026	2026-11-04 08:13:02.281703-08	\N	\N	\N
\.


--
-- Data for Name: purchase_allocations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_allocations (id, payment_id, account_id, amount) FROM stdin;
548c019b-4d36-4aae-bef8-d393279caa57	2353244f-90b8-49e8-b594-f756f71996cf	aa3ec2ad-edbd-416e-988d-7224a7ec6fa1	50000.00
244d9f1a-0533-4994-a8a5-8f7af6f02249	2353244f-90b8-49e8-b594-f756f71996cf	23b919d9-b73c-4754-8d42-172efab1e4a7	50000.00
\.


--
-- Data for Name: purchase_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_payments (id, purchase_id, user_id, paid_on, is_deposit, note, created_at) FROM stdin;
2353244f-90b8-49e8-b594-f756f71996cf	b6cd7667-ae1f-4189-befe-fa14046ba701	be0729f0-b4c9-45aa-8613-3185ec72b9a2	2026-10-20	t	\N	2026-10-20 01:44:51.993881-07
\.


--
-- Data for Name: purchases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchases (id, user_id, name, kind, price, finance_charges, lender, purchased_on, installment_amount, frequency, first_due_on, note, created_at, asset_value) FROM stdin;
b6cd7667-ae1f-4189-befe-fa14046ba701	be0729f0-b4c9-45aa-8613-3185ec72b9a2	2018 BMW 118i	financed	1380000.00	120000.00	Moiz motors mombasa	2026-10-20	50000.00	monthly	2026-11-20	\N	2026-10-20 01:44:51.993881-07	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, full_name, hashed_password, is_active, created_at, updated_at) FROM stdin;
be0729f0-b4c9-45aa-8613-3185ec72b9a2	denixkaranjah@gmail.com	Denis Kibathi Karanja	$argon2id$v=19$m=65536,t=3,p=4$1TchmyqUr6ZlwGf0OVgK6Q$9uClVEIc+bhduZib2i9Y8SEPUWCFwu21CIwJkEQzAuk	t	2026-10-17 07:21:51.412412-07	2026-10-17 07:21:51.412412-07
e337b54e-d57f-45ed-b6eb-f8ebbd16c665	deniskibathi@gmail.com	DENIS KIBATHI	$argon2id$v=19$m=65536,t=3,p=4$aETIqjBbzMSOkQfFzUPWBw$V692C11jSXLH2GmJpyNKycDi03SR5XBaloG5DnS1sAU	t	2026-10-21 06:57:52.439777-07	2026-10-21 06:57:52.439777-07
\.


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: budget_items budget_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_items
    ADD CONSTRAINT budget_items_pkey PRIMARY KEY (id);


--
-- Name: budgets budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: incomes incomes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incomes
    ADD CONSTRAINT incomes_pkey PRIMARY KEY (id);


--
-- Name: investment_events investment_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.investment_events
    ADD CONSTRAINT investment_events_pkey PRIMARY KEY (id);


--
-- Name: investments investments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.investments
    ADD CONSTRAINT investments_pkey PRIMARY KEY (id);


--
-- Name: ledger_entries ledger_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_pkey PRIMARY KEY (id);


--
-- Name: obligation_payments obligation_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.obligation_payments
    ADD CONSTRAINT obligation_payments_pkey PRIMARY KEY (id);


--
-- Name: obligations obligations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.obligations
    ADD CONSTRAINT obligations_pkey PRIMARY KEY (id);


--
-- Name: purchase_allocations purchase_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_allocations
    ADD CONSTRAINT purchase_allocations_pkey PRIMARY KEY (id);


--
-- Name: purchase_payments purchase_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_payments
    ADD CONSTRAINT purchase_payments_pkey PRIMARY KEY (id);


--
-- Name: purchases purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_pkey PRIMARY KEY (id);


--
-- Name: accounts uq_accounts_user_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT uq_accounts_user_name UNIQUE (user_id, name);


--
-- Name: budget_items uq_budget_items_budget_category; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_items
    ADD CONSTRAINT uq_budget_items_budget_category UNIQUE (budget_id, category_id);


--
-- Name: budgets uq_budgets_user_period; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT uq_budgets_user_period UNIQUE (user_id, period);


--
-- Name: categories uq_categories_user_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT uq_categories_user_name UNIQUE (user_id, name);


--
-- Name: investments uq_investments_user_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.investments
    ADD CONSTRAINT uq_investments_user_name UNIQUE (user_id, name);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_expenses_user_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_expenses_user_date ON public.expenses USING btree (user_id, spent_on);


--
-- Name: ix_incomes_user_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_incomes_user_period ON public.incomes USING btree (user_id, period);


--
-- Name: ix_investment_events_investment_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_investment_events_investment_date ON public.investment_events USING btree (investment_id, occurred_on);


--
-- Name: ix_ledger_entries_from_account_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_ledger_entries_from_account_id ON public.ledger_entries USING btree (from_account_id);


--
-- Name: ix_ledger_entries_to_account_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_ledger_entries_to_account_id ON public.ledger_entries USING btree (to_account_id);


--
-- Name: ix_ledger_entries_user_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_ledger_entries_user_date ON public.ledger_entries USING btree (user_id, occurred_on);


--
-- Name: ix_obligation_payments_obligation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_obligation_payments_obligation_id ON public.obligation_payments USING btree (obligation_id);


--
-- Name: ix_obligations_user_due; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_obligations_user_due ON public.obligations USING btree (user_id, due_on);


--
-- Name: ix_purchase_allocations_payment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_purchase_allocations_payment_id ON public.purchase_allocations USING btree (payment_id);


--
-- Name: ix_purchase_payments_purchase_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_purchase_payments_purchase_id ON public.purchase_payments USING btree (purchase_id);


--
-- Name: ix_purchases_user_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_purchases_user_date ON public.purchases USING btree (user_id, purchased_on);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: accounts accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: budget_items budget_items_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_items
    ADD CONSTRAINT budget_items_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES public.budgets(id) ON DELETE CASCADE;


--
-- Name: budget_items budget_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_items
    ADD CONSTRAINT budget_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;


--
-- Name: budgets budgets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: categories categories_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: expenses expenses_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;


--
-- Name: expenses expenses_obligation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_obligation_id_fkey FOREIGN KEY (obligation_id) REFERENCES public.obligations(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: incomes incomes_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incomes
    ADD CONSTRAINT incomes_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: incomes incomes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incomes
    ADD CONSTRAINT incomes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: investment_events investment_events_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.investment_events
    ADD CONSTRAINT investment_events_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: investment_events investment_events_investment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.investment_events
    ADD CONSTRAINT investment_events_investment_id_fkey FOREIGN KEY (investment_id) REFERENCES public.investments(id) ON DELETE CASCADE;


--
-- Name: investment_events investment_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.investment_events
    ADD CONSTRAINT investment_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: investments investments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.investments
    ADD CONSTRAINT investments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ledger_entries ledger_entries_from_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_from_account_id_fkey FOREIGN KEY (from_account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: ledger_entries ledger_entries_to_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_to_account_id_fkey FOREIGN KEY (to_account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: ledger_entries ledger_entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: obligation_payments obligation_payments_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.obligation_payments
    ADD CONSTRAINT obligation_payments_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: obligation_payments obligation_payments_obligation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.obligation_payments
    ADD CONSTRAINT obligation_payments_obligation_id_fkey FOREIGN KEY (obligation_id) REFERENCES public.obligations(id) ON DELETE CASCADE;


--
-- Name: obligation_payments obligation_payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.obligation_payments
    ADD CONSTRAINT obligation_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: obligations obligations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.obligations
    ADD CONSTRAINT obligations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: purchase_allocations purchase_allocations_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_allocations
    ADD CONSTRAINT purchase_allocations_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;


--
-- Name: purchase_allocations purchase_allocations_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_allocations
    ADD CONSTRAINT purchase_allocations_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.purchase_payments(id) ON DELETE CASCADE;


--
-- Name: purchase_payments purchase_payments_purchase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_payments
    ADD CONSTRAINT purchase_payments_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.purchases(id) ON DELETE CASCADE;


--
-- Name: purchase_payments purchase_payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_payments
    ADD CONSTRAINT purchase_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: purchases purchases_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict Ba3vJTQlmQVaaGbDylXECsbtZkpVw3TuAgWhq82H2L6kMVy4HEQMO0MK1L2nzEg

