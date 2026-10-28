# MaliFlow
### Take control of your money. Build your financial future.

A personal finance management platform for understanding where your money goes, planning where it should go, and tracking your progress over time.

**React · FastAPI · PostgreSQL · SQLAlchemy**

</div>

---

## About

**MaliFlow** is a personal finance management web application designed to bring everyday financial activities into one organized workspace. It helps users track income and expenses, plan budgets, manage savings, monitor obligations, follow investment performance, and organize major purchases — including purchases made through financing agreements.

Rather than treating every balance as the same thing, MaliFlow is designed to distinguish between **available funds, reserved funds, savings, investments, and outstanding obligations**. This separation helps users develop a clearer picture of their financial position and make more informed decisions.

> **Project goal:** Make personal finances easier to understand, manage, and improve.

## Design philosophy

MaliFlow uses a clean, dashboard-first interface with a signature **navy, slate, and emerald** visual identity.

| Color | Hex | Purpose |
|---|---|---|
| Navy | `#0F172A` | Primary dark background |
| Slate | `#1E293B` | Cards and secondary surfaces |
| Emerald | `#10B981` | Primary actions and positive indicators |
| Deep emerald | `#064E3B` | Supporting accent |
| White | `#F8FAFC` | Primary text on dark surfaces |
| Slate gray | `#94A3B8` | Secondary text |
| Border slate | `#334155` | Borders and dividers |
| Light slate | `#F1F5F9` | Light-mode surfaces |

The interface emphasizes readable financial figures, consistent spacing, subtle borders, rounded components, and clear visual hierarchy. The design direction supports both dark and light modes while keeping the emerald accent consistent.

## Features

### Financial overview
- A central dashboard for key financial indicators.
- Separate visibility into available funds, income, expenses, savings, investments, and obligations.
- Financial summaries derived from recorded activity.

### Income management
- Record income from different sources.
- Distinguish income expected from income actually received.
- Account for early or delayed income in relation to its intended financial period.

### Expense tracking
- Record day-to-day spending.
- Organize expenses by category.
- Use actual expenses to understand spending patterns and budget performance.

### Budget planning
- Create budgets for different spending categories.
- Compare planned budgets with actual spending.
- Identify overspending and differences between potential and actual savings.

### Savings management
- Record deliberate transfers into and out of savings.
- Keep savings separate from ordinary unspent money.
- Track transfers without treating them as income or expenses.

### Obligations and debt
- Record financial obligations and repayment details.
- Track amounts paid, remaining balances, and repayment status.
- Monitor commitments over time.

### Investment tracking
- Maintain investment records and current valuations.
- Record contributions and withdrawals.
- Distinguish invested capital from gains or losses.
- Track realized profit and current investment performance.

### Major purchases and financing
- Record major cash and financed purchases.
- Maintain financing agreement details, including lender, deposit, and expected repayment terms.
- Record deposits, instalments, lump-sum payments, and final settlements.
- Allocate payments between available funds and savings.
- Track payment history and outstanding financed amounts.

### Financial ledger
- Maintain a traceable record of financial movements.
- Support consistent balance updates across relevant financial activities.
- Use recorded transactions as the basis for financial summaries.

*Feature availability may vary as development progresses.*

## Technology stack

### Frontend
- **React** — component-based user interface
- **JavaScript** — application logic
- **Vite** — development server and build tooling
- **Tailwind CSS** — styling and responsive layouts

### Backend
- **Python** — backend language
- **FastAPI** — REST API
- **SQLAlchemy** — database ORM
- **Alembic** — database migrations

### Database
- **PostgreSQL** — relational data storage

## Architecture

MaliFlow follows a frontend–backend architecture. The React application communicates with the FastAPI backend through API endpoints, while PostgreSQL stores persistent application data.

The backend separates responsibilities into distinct layers:

```text
React + Vite Frontend
        |
        | HTTP / REST API
        v
FastAPI Routes
        |
        v
Schemas and Validation
        |
        v
Services / Business Logic
        |
        v
Repositories / Data Access
        |
        v
SQLAlchemy Models
        |
        v
PostgreSQL Database
```

Alembic manages database schema changes through migrations.

### Design considerations
- Authenticated access to user-specific financial data.
- Server-side validation of financial operations.
- Transactional handling of important multi-step balance changes.
- Clear separation of API, business logic, and database access.
- Financial summaries calculated from recorded data rather than maintained as disconnected reports.

## Project structure

The repository is organized into frontend and backend applications. The backend follows a layered structure similar to the following:

```text
MaliFlow/
├── frontend/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── context/
│       ├── pages/
│       └── services/
│
└── backend/
    ├── app/
    │   ├── core/
    │   ├── models/
    │   ├── schemas/
    │   ├── repositories/
    │   ├── services/
    │   ├── routes/
    │   └── main.py
    └── alembic/
        └── versions/
```

*This is a representative structure; exact folders and files may change as the project evolves.*

## Getting started

### Prerequisites

Install the following before running the application:

- [Node.js](https://nodejs.org/) and npm
- [Python](https://www.python.org/)
- [PostgreSQL](https://www.postgresql.org/)
- Git

### 1. Clone the repository

```bash
git clone <repository-url>
cd MaliFlow
```

Replace `<repository-url>` with the actual Git repository URL.

### 2. Configure the database

Create a PostgreSQL database for MaliFlow. Configure the backend environment with the database connection string and any other required application settings.

Keep secrets and credentials in environment variables. **Do not commit `.env` files containing passwords, secret keys, or production credentials.**

### 3. Start the backend

From the backend directory, create and activate a virtual environment.

**Windows (Command Prompt):**

```bat
cd backend
python -m venv .venv
.venv\Scripts\activate
```

**Linux / macOS:**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
```

Install the backend dependencies using the project's dependency file, if provided:

```bash
pip install -r requirements.txt
```

Configure the environment variables and apply database migrations:

```bash
alembic upgrade head
```

Start the FastAPI development server using the project's configured application entry point. For a standard `app.main:app` entry point:

```bash
uvicorn app.main:app --reload
```

The API is typically available at `http://127.0.0.1:8000`. FastAPI's interactive API documentation is typically available at `http://127.0.0.1:8000/docs`.

### 4. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
```

Configure the frontend API base URL according to the project's environment setup. For a Vite application, this may use a variable such as `VITE_API_URL`.

Start the development server:

```bash
npm run dev
```

Open the local URL printed by Vite in the terminal.

> **Setup note:** Commands, environment variable names, and dependency files should be checked against the current repository before first use. This README intentionally does not invent database credentials or secret values.

## Financial concepts

MaliFlow is designed around several important distinctions:

- **Available funds:** Money currently available for spending.
- **Reserved funds:** Money set aside for a future intended period.
- **Savings:** Money deliberately transferred into a savings balance.
- **Investments:** Capital held in investment accounts, with valuations and gains or losses tracked separately.
- **Obligations:** Amounts owed to other parties.
- **Potential savings:** Income minus planned budget allocations.
- **Actual savings potential:** Income minus actual expenses, which may differ from the amount deliberately transferred into savings.

These distinctions help avoid treating expected income as cash already received, treating internal transfers as new income, or confusing investment value with immediately spendable money.

## Security and data integrity

Financial data requires careful handling. MaliFlow's design includes user-specific data access, validated API inputs, and transactional processing for important financial movements.

For any deployment beyond local development, additional review should cover authentication and authorization, secret management, HTTPS, database backups, logging, dependency updates, and production configuration.

## Development status

MaliFlow is under active development. Core financial modules have been built incrementally, with ongoing work focused on integration, testing, interface refinement, and expanding the application's reporting and overall usability.

The README will evolve alongside the application as features are completed and verified.

## Roadmap

Potential areas for continued development include:

- [ ] Expand automated tests for financial calculations and transaction flows.
- [ ] Improve reports and historical financial comparisons.
- [ ] Add clearer alerts for upcoming obligations and expected income.
- [ ] Refine responsive layouts and accessibility.
- [ ] Strengthen production deployment, backup, and monitoring workflows.
- [ ] Improve onboarding and financial account setup.

## Contributing

MaliFlow is being developed iteratively. Before proposing changes, please describe the issue or improvement, explain the expected behavior, and include relevant testing details where possible.

If the repository is not yet open to external contributions, treat this section as guidance for future collaboration.


---

<div align="center">

**MaliFlow**  
*Know your money. Plan with purpose. Build your future.*

</div>

