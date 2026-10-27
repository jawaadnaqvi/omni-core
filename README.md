# Omni Core

Omni Core is a personal knowledge hub built for students and professionals who want to keep their study materials organized and make better use of them.

The idea behind the project is simple: instead of switching between PDFs, notes, AI chat tools, and online meeting platforms, users can manage their learning in one place.

Omni Core lets users upload study materials, organize notes into collections, ask questions about their documents, generate mock tests, and join live virtual classes.

## Features

- **Authentication:** User registration and login with JWT-based authentication and protected routes.
- **Notes and Collections:** Create notes, organize them into books, and keep related study materials together.
- **PDF Uploads:** Upload study documents and use their content for AI-powered queries.
- **AI Tutor:** Ask questions about uploaded documents and get answers based on the retrieved content.
- **Document-Specific Chat:** Select a particular PDF to keep the AI's answers focused on that document.
- **Mock Test Generator:** Generate MCQs, short questions, long questions, and answer keys based on study material.
- **Virtual Classroom:** Create or join video sessions through Jitsi Meet, with lobby security.
- **Chat History:** Keep conversations available for later, with separate histories for general chats and document-based queries.
- **Focus Tools:** Use a Pomodoro timer to manage study sessions.
- **Interactive Interface:** A responsive dark-themed dashboard with animations and an animated AI mascot named Teechu.

## Tech Stack

### Frontend
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Lucide React
- React Markdown
- Web Speech API for text-to-speech

### Backend
- Python
- FastAPI
- SQLAlchemy
- Alembic
- Passlib and Bcrypt for password hashing
- Python-Jose for JWT authentication

### Database and AI
- PostgreSQL
- pgvector for vector storage and similarity search
- Google GenAI SDK for text embeddings
- LiteLLM for LLM routing
- Groq for primary inference
- Gemini as a fallback model
- pypdf for PDF text extraction

### Deployment and Infrastructure
- Docker and Docker Compose
- Vercel for the frontend
- Render for the backend API
- Supabase for PostgreSQL

## How the AI Tutor Works

Omni Core uses Retrieval-Augmented Generation (RAG) to answer questions using a user's uploaded study materials.

The process works as follows:

1. **Upload:** The user uploads a PDF containing the relevant study material.
2. **Text Extraction:** The backend extracts the document's text using `pypdf`.
3. **Chunking:** The extracted text is divided into smaller sections so relevant passages can be retrieved efficiently.
4. **Embeddings:** Each text chunk is converted into a 768-dimensional vector using the configured Google embedding model.
5. **Storage:** The vectors and associated document information are stored in PostgreSQL using pgvector.
6. **Retrieval:** When a question is submitted, the system creates a query embedding and searches for relevant chunks using cosine distance.
7. **Response Generation:** The retrieved passages are sent to the configured language model along with the user's question to generate a context-aware answer.

In document-specific mode, retrieval is restricted to the selected PDF. This helps keep responses relevant to the material the user is studying.

The AI Tutor is designed to ground its answers in retrieved content. Its accuracy still depends on document quality, retrieval results, and the language model's response.

## Project Structure

```text
Omni-Core/
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js routes and layouts
│   │   └── components/       # Reusable UI components
│   └── public/               # Static assets and mascot
│
├── backend/
│   ├── app/
│   │   ├── core/             # Configuration, database, security
│   │   ├── modules/          # Authentication, notes, AI
│   │   └── shared/           # Embeddings and LLM utilities
│   ├── alembic/              # Database migrations
│   └── uploads/              # Local uploaded files
│
├── docker-compose.yml
└── README.md
```

*The structure above is illustrative; adjust it to match the actual repository if your folder names differ.*

## Getting Started

### Prerequisites

Make sure you have the following installed:

- Python 3.10 or later
- Node.js 18 or later
- npm
- Docker Desktop
- Git

You will also need the required API keys and a PostgreSQL database configured for pgvector.

### 1. Clone the Repository

```bash
git clone https://github.com/jawaadnaqvi/omni-core.git
cd omni-core
```

### 2. Set Up the Backend

Open a terminal in the project directory.

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment.

**Windows:**

```powershell
.venv\Scripts\activate
```

**macOS/Linux:**

```bash
source .venv/bin/activate
```

Install the Python dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file in the location expected by your backend configuration and add the required environment variables.

Example:

```env
DATABASE_URL=your_postgresql_connection_string
SECRET_KEY=your_secret_key
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
```

Use the variable names required by your actual application configuration. Never commit real API keys or secrets to GitHub.

### 3. Start the Database Services

From the project root, run:

```bash
docker-compose up -d
```

Make sure your PostgreSQL instance is running and the pgvector extension is available.

If your project uses a local Docker database, verify that `DATABASE_URL` points to the correct instance.

### 4. Apply Database Migrations

From the backend directory, run:

```bash
alembic upgrade head
```

### 5. Start the Backend API

```bash
uvicorn app.main:app --reload --port 8001
```

Once the backend is running, open the FastAPI documentation at:

`http://localhost:8001/docs`

### 6. Set Up the Frontend

Open another terminal and navigate to the frontend directory:

```bash
cd frontend
npm install
npm run dev
```

Open the local frontend at:

`http://localhost:3000`

Make sure the frontend API configuration points to the running backend.

## Environment Variables

The following variables are used in the example setup. Your actual requirements may differ depending on the current implementation.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | Secret used for application security and token signing |
| `GROQ_API_KEY` | API key for Groq inference |
| `GEMINI_API_KEY` | API key for Google Gemini and embeddings |

Keep environment files out of version control. Add `.env` to `.gitignore` and use your hosting provider's environment-variable settings for deployment.

## Deployment

The planned deployment setup is:

- **Frontend:** Vercel
- **Backend:** Render
- **Database:** Supabase PostgreSQL with pgvector

Before deploying, configure the production environment variables, database connection, frontend API URL, CORS settings, and file-storage strategy.

For uploaded PDFs, use persistent storage appropriate to your hosting environment rather than assuming local files will survive redeployments.

## Live Demo

- **Frontend Application:** [https://omni-core-henna.vercel.app/](https://omni-core-henna.vercel.app/)
- **Backend API:** [https://omni-core-backend.onrender.com](https://omni-core-backend.onrender.com)
- **API Documentation:** [https://omni-core-backend.onrender.com/api/v1/docs](https://omni-core-backend.onrender.com/api/v1/docs)

*(Note: The backend is hosted on Render's free tier, so the first request might take up to 50 seconds to wake up the server.)*

## About

I'm Jawaad Naqvi, a software engineering student interested in backend development and practical AI applications.

I built Omni Core to explore how document processing, vector search, and language models can work together in a useful learning platform. Working on this project has given me experience with API development, database design, authentication, embeddings, and RAG-based question answering.

I'm particularly interested in building applications where the AI is connected to useful, relevant data rather than relying only on general-purpose chat.

## Connect

- **GitHub:** [jawaadnaqvi](https://github.com/jawaadnaqvi)
- **LinkedIn:** [Jawaad Naqvi](https://www.linkedin.com/in/jawaad-naqvi-b58686151/)

---

*Omni Core — Keep your knowledge organized and make it easier to learn from it.*
