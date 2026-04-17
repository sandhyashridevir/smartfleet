CREATE TABLE IF NOT EXISTS ev_telemetry (
    id SERIAL PRIMARY KEY,
    vehicle_id VARCHAR(20) NOT NULL,
    battery_percent FLOAT NOT NULL,
    temperature FLOAT NOT NULL,
    lat FLOAT NOT NULL,
    lon FLOAT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_vehicle ON ev_telemetry(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_ts ON ev_telemetry(timestamp DESC);

CREATE TABLE IF NOT EXISTS charging_stations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    lat FLOAT NOT NULL,
    lon FLOAT NOT NULL
);

CREATE TABLE IF NOT EXISTS deliveries (
    id SERIAL PRIMARY KEY,
    vehicle_id VARCHAR(20) NOT NULL,
    destination VARCHAR(200) NOT NULL
);

INSERT INTO charging_stations (name, lat, lon) VALUES
    ('StationA', 37.7749, -122.4194),
    ('StationB', 37.8044, -122.2712)
ON CONFLICT DO NOTHING;

INSERT INTO deliveries (vehicle_id, destination) VALUES
    ('EV001', 'Area A'),
    ('EV002', 'Area B'),
    ('EV003', 'Area C')
ON CONFLICT DO NOTHING;

-- Seed initial telemetry for all 3 vehicles
INSERT INTO ev_telemetry (vehicle_id, battery_percent, temperature, lat, lon, timestamp) VALUES
    ('EV001', 85.0, 22.5, 37.7750, -122.4183, NOW() - INTERVAL '1 minute'),
    ('EV002', 62.0, 24.1, 37.7900, -122.4000, NOW() - INTERVAL '1 minute'),
    ('EV003', 28.0, 21.8, 37.7600, -122.4400, NOW() - INTERVAL '1 minute'),
    ('EV001', 83.5, 22.8, 37.7751, -122.4182, NOW() - INTERVAL '45 seconds'),
    ('EV002', 60.5, 24.3, 37.7901, -122.3998, NOW() - INTERVAL '45 seconds'),
    ('EV003', 26.5, 22.0, 37.7601, -122.4399, NOW() - INTERVAL '45 seconds');
