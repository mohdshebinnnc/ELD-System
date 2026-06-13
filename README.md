# 🚚 HOS Trip Planner & ELD Log Generator

A production-ready, full-stack logistics dashboard that calculates trucking routes, simulates FMCSA Hours of Service (HOS) property-carrying compliance rules, automatically schedules breaks and fuel stops, and programmatically draws paper-like daily driver logs (images & PDFs).

---

## 🛠️ Technology Stack

### Backend
- **Django & Django REST Framework (DRF):** REST APIs for trip planning, logs, and PDF downloads.
- **Neon PostgreSQL:** Database system for storing trips, drivers, and ELD logs.
- **Python Pillow (PIL):** Renders paper-like daily driver log grid sheets.
- **ReportLab:** Compiles detailed PDF logs with driver signatures, trip summaries, and grid sheets.

### Frontend
- **React.js (Vite):** Core library and build tool.
- **Tailwind CSS:** Modern utility styling.
- **React Leaflet (OpenStreetMap):** Fully interactive mapping interface.
- **Lucide React:** Icons package.

### Free Mapping & Routing Services (No Keys Required)
- **Map Tiles:** OpenStreetMap
- **Geocoding & Location Search:** Nominatim API (OpenStreetMap)
- **Routing & Mileage Calculation:** OSRM (Open Source Routing Machine) API

---

## 📂 Project Architecture

```
hos-trip-planner/
├── backend/                  # Django REST API
│   ├── api/                  # Core application logic (HOS engine, log drawer, models, views)
│   ├── hos_planner/          # Project settings & URL routing
│   ├── venv/                 # Python virtual environment (ignored by Git)
│   ├── requirements.txt      # Backend Python dependencies
│   ├── manage.py             # Django CLI
│   └── .env                  # Backend credentials (ignored by Git)
│
├── frontend/                 # React Frontend
│   ├── src/                  # React components & pages
│   ├── node_modules/         # Node packages (ignored by Git)
│   ├── package.json          # Node dependencies & scripts
│   └── vite.config.js        # Vite configurations (includes proxy settings)
│
└── .gitignore                # Root Git ignore configuration
```

---

## 🚀 Getting Started

### 1. Backend Setup (Django)

1. Open your terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment and activate it:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the `backend/` directory and configure your `DATABASE_URL` environment variable:
   ```ini
   DATABASE_URL=postgresql://neondb_owner:<password>@ep-dry-union-ai70tujy-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

5. Apply the database migrations:
   ```bash
   python manage.py migrate
   ```

6. Start the development server:
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```
   *The backend server will run at `http://localhost:8000`.*

---

### 2. Frontend Setup (React Vite)

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install the node packages:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend dashboard will run at `http://localhost:5173`.*

---

## 📦 Database Integration

### How `dj_database_url` Works
Django settings natively require a structured Python dictionary for database configurations (`DATABASES['default']`). However, cloud services and modern configurations typically store credentials in a single `DATABASE_URL` connection string.

The `dj-database-url` utility reads the `DATABASE_URL` string from `.env`, parses it, and automatically converts it into the exact dictionary configuration that Django needs.

---

## 🚚 Hours of Service (HOS) Rules Simulated

The backend HOS calculator parses route segments, mileages, and driving times, dynamically scheduling events based on **FMCSA Property-Carrying Regulations**:
* **11-Hour Driving Limit:** Restricts continuous driving to 11 hours per shift.
* **14-Hour Duty Window:** Restricts driving beyond a continuous 14-hour window from when the driver comes on duty. A 10-hour consecutive rest reset is required.
* **30-Minute Rest Break:** Required if 8 cumulative hours pass without at least a 30-minute off-duty break.
* **70-Hour / 8-Day Cycle Limit:** Calculates cumulative on-duty hours over rolling 8-day periods.
* **34-Hour Restart:** Automatically resets the 70-hour cycle when a 34-hour off-duty period is recorded.
* **Automated Breaks:** Automatically schedules 30-minute fuel stops every 1,000 miles and 1-hour loading/unloading breaks at pickup and dropoff locations.

---

## 💡 Troubleshooting

### 1. VS Code warning: "Cannot find module 'dj_database_url'"
If you see a red squiggly line under `import dj_database_url` in VS Code settings, your editor is likely using the system Python interpreter instead of your virtual environment.
* **Fix:** Press `Cmd + Shift + P` (Mac) or `Ctrl + Shift + P` (Windows), search for **`Python: Select Interpreter`**, and choose the interpreter inside the `backend/venv` path.

### 2. API Proxy Errors (`ECONNREFUSED` / `socket hang up`)
If the frontend shows proxy errors when calling the API:
* **Fix:** Ensure your Django server is running on port 8000 (`python manage.py runserver`). Vite uses a proxy middleware in `vite.config.js` to route all `/api` and `/media` calls directly to the Django server.
