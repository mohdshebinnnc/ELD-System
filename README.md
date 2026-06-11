# Hours of Service (HOS) Trip Planner & ELD Log Generator

A production-ready, full-stack logistics dashboard that calculates trucking routes, checks FMCSA Hours of Service (HOS) property-carrying compliance rules, automatically schedules breaks and fuel stops, and programmatically draws paper-like daily driver logs (images & PDFs).

---

## 🛠️ Technology Stack

- **Backend:** Django, Django REST Framework, SQLite (default / local) / PostgreSQL (production-ready)
- **Frontend:** React, Vite, Tailwind CSS v4, React Leaflet (OpenStreetMap)
- **Engines:**
  - **HOS Compliance Simulator:** Custom event-driven time-slicing logic.
  - **ELD Log Drawing:** Python Pillow (PIL) vector canvas generator.
  - **PDF compiler:** ReportLab document generation.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+ and npm

---

### 1. Backend Setup (Django)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment and activate it:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install requirements:
   ```bash
   pip install -r requirements.txt
   ```

4. Run database migrations to initialize the SQLite database schema:
   ```bash
   python manage.py makemigrations api
   python manage.py migrate
   ```

5. Run the unit and integration tests to verify HOS rules, Pillow, and ReportLab:
   ```bash
   python manage.py test api
   ```

6. Start the development server:
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```
   *The API will be available at `http://localhost:8000`.*

---

### 2. Frontend Setup (React Vite)

1. Open a new terminal session and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install npm dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The dashboard will be active at `http://localhost:5173`.*

---

## 📦 Database Configurations (SQLite / PostgreSQL)

By default, the application runs on **SQLite** to make local execution instant and configuration-free. 

For production deployment, you can plug in **PostgreSQL** simply by providing a `DATABASE_URL` environment variable:
```bash
export DATABASE_URL="postgres://user:password@localhost:5432/db_name"
python manage.py migrate
```

---

## 🚚 Hours of Service Rules Simulated

The backend HOS calculator is built in strict adherence to **FMCSA Property-Carrying Regulations**:
- **11-Hour Driving Limit:** Driver is restricted from driving more than 11 hours per shift.
- **14-Hour Duty Window:** Once coming on duty, the driver's window elapses continuously and expires after 14 hours. Driving is prohibited past this point until a 10-hour rest is taken.
- **30-Minute Rest Break:** Required if 8 cumulative driving hours pass without a 30-minute off-duty break.
- **70-Hour / 8-Day Cycle Limit:** On-duty work hours are accumulated. If the driver hits 70 hours in 8 days, driving is suspended.
- **34-Hour Cycle Restart:** The cycle limit is reset to 0 hours by taking a 34-hour consecutive off-duty restart.
- **Fuel Stops:** Automatically scheduled every 1,000 miles (inserts 30 minutes On-Duty time, markers on the Leaflet map, and registers remarks).
- **Loading & Unloading:** Inserts 1 hour On-Duty time at pickup and dropoff points.
