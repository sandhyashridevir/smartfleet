# SmartEV Fleet Management System

A production-ready full-stack system for managing electric delivery vehicle fleets.

## Architecture

```
EV Simulator → FastAPI Backend → PostgreSQL → React Dashboard
                              ↓
                         Driver App
```

## Services

| Service | URL | Description |
|---|---|---|
| Manager Dashboard | http://localhost:3000 | Fleet analytics & monitoring |
| Driver App | http://localhost:3001 | Driver view with vehicle status |
| Backend API | http://localhost:8000 | FastAPI REST service |
| API Docs | http://localhost:8000/docs | Swagger UI |

## Quick Start

### Prerequisites
- Docker Desktop installed and running
- Ports 3000, 3001, 8000, 5432 available

### Run the System

```bash
# Clone or navigate to SmartEVFleet directory
cd SmartEVFleet

# Build and start all services
docker compose up --build

# Or run in background
docker compose up --build -d
```

Wait ~30 seconds for all services to start, then open:
- **Manager Dashboard**: http://localhost:3000
- **Driver App**: http://localhost:3001
- **API Docs**: http://localhost:8000/docs

### Stop the System

```bash
docker compose down

# Remove volumes (reset database)
docker compose down -v
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | /vehicles/update | Ingest telemetry |
| GET | /vehicles/status | Latest snapshot of all vehicles |
| GET | /vehicles/history/{id} | Battery/temp history |
| GET | /vehicles/nearest_station/{id} | Find nearest charger |
| GET | /vehicles/distance/{id}/{station} | Distance to station |
| GET | /vehicles/predict/{id} | Battery prediction |
| GET | /fleet/analytics | Fleet-wide stats |
| GET | /fleet/delivery_plan | Delivery assignments |
| GET | /fleet/route_optimization | Low battery alerts |

## Features

- **Real-time Telemetry**: Simulator sends data every 5 seconds for EV001, EV002, EV003
- **Battery Prediction**: NumPy linear regression + moving average
- **Route Optimization**: Identifies vehicles below 40% battery
- **Delivery Planning**: Assigns charging stops for vehicles below 30%
- **Interactive Charts**: Battery & temperature trends via Chart.js
- **Auto-refresh**: Dashboard updates every 10 seconds
- **Driver App**: Mobile-friendly per-vehicle view

## Development

### Backend only (local)
```bash
cd backend
pip install -r requirements.txt
# Set env var
export DATABASE_URL=postgresql://evfleet:evfleet@localhost:5432/evfleet
uvicorn main:app --reload
```

### Simulator only (local)
```bash
cd simulator
pip install requests
export API_URL=http://localhost:8000
python simulator.py
```
