-- SmartFleet Tamil Nadu — Full Schema + Seed v2
-- 30 vehicles · 6 cities · 12 stations · 50 orders
-- ALL ORDERS START AS PENDING — simulator assigns them live so you can watch real-time delivery

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
    city VARCHAR(50) NOT NULL,
    lat FLOAT NOT NULL,
    lon FLOAT NOT NULL
);

CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    vehicle_id VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'available'
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(30) UNIQUE NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    pickup_area VARCHAR(100) NOT NULL,
    delivery_area VARCHAR(100) NOT NULL,
    city VARCHAR(50) NOT NULL,
    lat FLOAT NOT NULL,
    lon FLOAT NOT NULL,
    priority VARCHAR(10) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'pending',
    assigned_vehicle VARCHAR(20) DEFAULT NULL,
    estimated_distance_km FLOAT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    delivered_at TIMESTAMP DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_city ON orders(city);

CREATE TABLE IF NOT EXISTS deliveries (
    id SERIAL PRIMARY KEY,
    vehicle_id VARCHAR(20) NOT NULL,
    order_id VARCHAR(30) NOT NULL,
    destination VARCHAR(200) NOT NULL,
    city VARCHAR(50) NOT NULL,
    assigned_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'in_progress',
    completed_at TIMESTAMP DEFAULT NULL
);

-- CHARGING STATIONS
INSERT INTO charging_stations (name, city, lat, lon) VALUES
('Tata Power - Guindy',           'Chennai',     13.0067, 80.2206),
('Ather Grid - T.Nagar',          'Chennai',     13.0418, 80.2341),
('BPCL - Anna Nagar',             'Chennai',     13.0850, 80.2101),
('Charge Zone - OMR',             'Chennai',     12.9279, 80.2279),
('Tata Power - RS Puram',         'Coimbatore',  11.0050, 76.9629),
('Ather Grid - Gandhipuram',      'Coimbatore',  11.0168, 76.9558),
('BPCL - Anna Nagar Madurai',     'Madurai',      9.9312, 78.1198),
('Charge Zone - Mattuthavani',    'Madurai',      9.9195, 78.1092),
('Tata Power - Salem Steel City', 'Salem',       11.6643, 78.1460),
('Ather Grid - Srirangam',        'Trichy',      10.8631, 78.6927),
('BPCL - Palayamkottai',          'Tirunelveli',  8.7139, 77.7567),
('Charge Zone - Peelamedu',       'Coimbatore',  11.0232, 77.0086)
ON CONFLICT DO NOTHING;

-- VEHICLES — all start as available
INSERT INTO vehicles (vehicle_id, name, city, status) VALUES
('TN01EV001','Chennai Central Runner',    'Chennai',     'available'),
('TN01EV002','T.Nagar Express',           'Chennai',     'available'),
('TN01EV003','Anna Nagar Courier',        'Chennai',     'available'),
('TN01EV004','Guindy Industrial Rider',   'Chennai',     'available'),
('TN01EV005','OMR Tech Park Delivery',    'Chennai',     'available'),
('TN01EV006','Adyar Last Mile',           'Chennai',     'available'),
('TN01EV007','Velachery Zone Runner',     'Chennai',     'available'),
('TN01EV008','Tambaram South Courier',    'Chennai',     'available'),
('TN01EV009','Porur West Rider',          'Chennai',     'available'),
('TN01EV010','Perambur North Express',    'Chennai',     'available'),
('TN09EV001','RS Puram Rider',            'Coimbatore',  'available'),
('TN09EV002','Gandhipuram Express',       'Coimbatore',  'available'),
('TN09EV003','Peelamedu Tech Courier',    'Coimbatore',  'available'),
('TN09EV004','Saibaba Colony Runner',     'Coimbatore',  'available'),
('TN09EV005','Singanallur Delivery',      'Coimbatore',  'available'),
('TN50EV001','Madurai Anna Nagar Rider',  'Madurai',     'available'),
('TN50EV002','Mattuthavani Express',      'Madurai',     'available'),
('TN50EV003','KK Nagar Courier',          'Madurai',     'available'),
('TN50EV004','Tallakulam Runner',         'Madurai',     'available'),
('TN50EV005','Bypass Road Delivery',      'Madurai',     'available'),
('TN25EV001','Salem Steel City Rider',    'Salem',       'available'),
('TN25EV002','Fairlands Express',         'Salem',       'available'),
('TN25EV003','Shevapet Courier',          'Salem',       'available'),
('TN25EV004','Suramangalam Runner',       'Salem',       'available'),
('TN45EV001','Trichy Srirangam Rider',    'Trichy',      'available'),
('TN45EV002','Thillai Nagar Express',     'Trichy',      'available'),
('TN45EV003','Woraiyur Courier',          'Trichy',      'available'),
('TN72EV001','Tirunelveli Palayam Rider', 'Tirunelveli', 'available'),
('TN72EV002','Melapalayam Express',       'Tirunelveli', 'available'),
('TN72EV003','Vannarpettai Courier',      'Tirunelveli', 'available')
ON CONFLICT DO NOTHING;

-- INITIAL TELEMETRY — vehicles start at their city positions
INSERT INTO ev_telemetry (vehicle_id, battery_percent, temperature, lat, lon, timestamp) VALUES
('TN01EV001', 88.0, 32.5, 13.0827, 80.2707, NOW()),
('TN01EV002', 74.0, 33.2, 13.0418, 80.2341, NOW()),
('TN01EV003', 65.0, 34.0, 13.0850, 80.2101, NOW()),
('TN01EV004', 82.0, 33.5, 13.0067, 80.2206, NOW()),
('TN01EV005', 91.0, 32.0, 12.9279, 80.2279, NOW()),
('TN01EV006', 70.0, 35.1, 13.0012, 80.2565, NOW()),
('TN01EV007', 55.0, 33.8, 12.9816, 80.2209, NOW()),
('TN01EV008', 78.0, 34.5, 12.9249, 80.1000, NOW()),
('TN01EV009', 79.0, 32.8, 13.0358, 80.1568, NOW()),
('TN01EV010', 63.0, 33.2, 13.1181, 80.2353, NOW()),
('TN09EV001', 82.0, 31.5, 11.0050, 76.9629, NOW()),
('TN09EV002', 67.0, 32.1, 11.0168, 76.9558, NOW()),
('TN09EV003', 75.0, 33.0, 11.0232, 77.0086, NOW()),
('TN09EV004', 93.0, 31.0, 11.0230, 76.9612, NOW()),
('TN09EV005', 60.0, 32.5, 11.0019, 77.0265, NOW()),
('TN50EV001', 76.0, 34.0,  9.9312, 78.1198, NOW()),
('TN50EV002', 52.0, 34.8,  9.9195, 78.1092, NOW()),
('TN50EV003', 88.0, 33.5,  9.9252, 78.1198, NOW()),
('TN50EV004', 65.0, 34.0,  9.9567, 78.0819, NOW()),
('TN50EV005', 61.0, 34.2,  9.8963, 78.1219, NOW()),
('TN25EV001', 70.0, 32.0, 11.6643, 78.1460, NOW()),
('TN25EV002', 84.0, 31.5, 11.6680, 78.1560, NOW()),
('TN25EV003', 55.0, 32.8, 11.6790, 78.1420, NOW()),
('TN25EV004', 57.0, 33.0, 11.6530, 78.1600, NOW()),
('TN45EV001', 95.0, 31.0, 10.8631, 78.6927, NOW()),
('TN45EV002', 48.0, 34.1, 10.8050, 78.6856, NOW()),
('TN45EV003', 72.0, 32.5, 10.7905, 78.7047, NOW()),
('TN72EV001', 86.0, 33.0,  8.7139, 77.7567, NOW()),
('TN72EV002', 44.0, 35.0,  8.7273, 77.7382, NOW()),
('TN72EV003', 61.0, 34.0,  8.7480, 77.6930, NOW());

-- ALL 50 ORDERS — all pending, simulator assigns them live
INSERT INTO orders (order_id, customer_name, pickup_area, delivery_area, city, lat, lon, priority, status) VALUES
('ORD-CHN-001','Priya Rajan',       'Chennai Central Hub', 'T.Nagar Pondy Bazaar',      'Chennai',     13.0418, 80.2341, 'urgent', 'pending'),
('ORD-CHN-002','Karthik Murugan',   'Guindy Warehouse',    'Anna Nagar 2nd Avenue',     'Chennai',     13.0850, 80.2101, 'normal', 'pending'),
('ORD-CHN-003','Lakshmi Devi',      'OMR Distribution',    'Velachery Main Road',       'Chennai',     12.9816, 80.2209, 'normal', 'pending'),
('ORD-CHN-004','Senthil Kumar',     'Tambaram Hub',        'Chromepet Market',          'Chennai',     12.9516, 80.1418, 'urgent', 'pending'),
('ORD-CHN-005','Anitha Selvi',      'Chennai Central Hub', 'Adyar Canal Road',          'Chennai',     13.0012, 80.2565, 'low',    'pending'),
('ORD-CHN-006','Rajesh Pandian',    'Guindy Warehouse',    'Porur Junction',            'Chennai',     13.0358, 80.1568, 'normal', 'pending'),
('ORD-CHN-007','Meena Krishnan',    'Anna Nagar Hub',      'Perambur Barracks Road',    'Chennai',     13.1181, 80.2353, 'urgent', 'pending'),
('ORD-CHN-008','Vijay Selvam',      'OMR Distribution',    'Sholinganallur Signal',     'Chennai',     12.9008, 80.2273, 'normal', 'pending'),
('ORD-CHN-009','Kavitha Suresh',    'Chennai Central Hub', 'Mylapore Tank',             'Chennai',     13.0339, 80.2619, 'low',    'pending'),
('ORD-CHN-010','Arun Balaji',       'Tambaram Hub',        'Pallavaram Market',         'Chennai',     12.9675, 80.1491, 'normal', 'pending'),
('ORD-CHN-011','Deepa Nair',        'Guindy Warehouse',    'Saidapet Colony',           'Chennai',     13.0225, 80.2209, 'urgent', 'pending'),
('ORD-CHN-012','Murugan Pillai',    'Anna Nagar Hub',      'Mogappair West',            'Chennai',     13.0827, 80.1707, 'normal', 'pending'),
('ORD-CHN-013','Sunita Rao',        'OMR Distribution',    'Perungudi IT Park',         'Chennai',     12.9600, 80.2450, 'normal', 'pending'),
('ORD-CHN-014','Prakash Iyer',      'Chennai Central Hub', 'Nungambakkam High Road',    'Chennai',     13.0569, 80.2425, 'urgent', 'pending'),
('ORD-CHN-015','Geetha Lakshmi',    'Guindy Warehouse',    'Ashok Nagar 10th Avenue',   'Chennai',     13.0311, 80.2094, 'low',    'pending'),
('ORD-CHN-016','Suresh Babu',       'Tambaram Hub',        'Mudichur Road',             'Chennai',     12.9095, 80.0801, 'normal', 'pending'),
('ORD-CHN-017','Pooja Venkat',      'Anna Nagar Hub',      'Ambattur Industrial',       'Chennai',     13.0982, 80.1573, 'normal', 'pending'),
('ORD-CHN-018','Ravi Chandran',     'OMR Distribution',    'Thoraipakkam Junction',     'Chennai',     12.9367, 80.2360, 'urgent', 'pending'),
('ORD-CHN-019','Uma Shankar',       'Chennai Central Hub', 'Kodambakkam Main',          'Chennai',     13.0508, 80.2201, 'low',    'pending'),
('ORD-CHN-020','Bala Krishna',      'Guindy Warehouse',    'Chromepet Nehru Nagar',     'Chennai',     12.9487, 80.1389, 'normal', 'pending'),
('ORD-CHN-021','Saranya Devi',      'Anna Nagar Hub',      'Villivakkam Station Road',  'Chennai',     13.1046, 80.2105, 'normal', 'pending'),
('ORD-CHN-022','Dinesh Kumar',      'OMR Distribution',    'Karapakkam Village Road',   'Chennai',     12.9166, 80.2276, 'urgent', 'pending'),
('ORD-CBE-001','Arjun Nair',        'CBE Central Hub',     'RS Puram Cross Cut Road',   'Coimbatore',  11.0050, 76.9629, 'urgent', 'pending'),
('ORD-CBE-002','Preethi Raj',       'Peelamedu Hub',       'Gandhipuram Bus Stand',     'Coimbatore',  11.0168, 76.9558, 'normal', 'pending'),
('ORD-CBE-003','Kiran Selvam',      'CBE Central Hub',     'Saibaba Colony 3rd Street', 'Coimbatore',  11.0230, 76.9612, 'normal', 'pending'),
('ORD-CBE-004','Nithya Devi',       'Peelamedu Hub',       'Singanallur Roundabout',    'Coimbatore',  11.0019, 77.0265, 'urgent', 'pending'),
('ORD-CBE-005','Siva Prakash',      'CBE Central Hub',     'Ramanathapuram Main',       'Coimbatore',  11.0310, 77.0152, 'low',    'pending'),
('ORD-CBE-006','Rekha Subramaniam', 'Peelamedu Hub',       'Goldwins Junction',         'Coimbatore',  11.0421, 76.9887, 'normal', 'pending'),
('ORD-CBE-007','Manoj Kumar',       'CBE Central Hub',     'Ondipudur Market',          'Coimbatore',  10.9950, 77.0412, 'normal', 'pending'),
('ORD-CBE-008','Revathy Krishnan',  'Peelamedu Hub',       'Race Course Road',          'Coimbatore',  11.0167, 76.9728, 'urgent', 'pending'),
('ORD-MDU-001','Tamil Selvan',      'MDU Central Hub',     'Anna Nagar Madurai',        'Madurai',      9.9312, 78.1198, 'urgent', 'pending'),
('ORD-MDU-002','Valli Ammal',       'Mattuthavani Hub',    'KK Nagar Main Road',        'Madurai',      9.9252, 78.1198, 'normal', 'pending'),
('ORD-MDU-003','Pandian Raj',       'MDU Central Hub',     'Tallakulam Overbridge',     'Madurai',      9.9567, 78.0819, 'normal', 'pending'),
('ORD-MDU-004','Malathi Devi',      'Mattuthavani Hub',    'Bypass Road Madurai',       'Madurai',      9.8963, 78.1219, 'urgent', 'pending'),
('ORD-MDU-005','Ganesan Pillai',    'MDU Central Hub',     'Pasumalai Hill Area',       'Madurai',      9.8800, 78.0831, 'low',    'pending'),
('ORD-MDU-006','Sumathi Lakshmi',   'Mattuthavani Hub',    'Villapuram Junction',       'Madurai',      9.9018, 78.1398, 'normal', 'pending'),
('ORD-MDU-007','Murugesan TK',      'MDU Central Hub',     'Arappalayam Bus Depot',     'Madurai',      9.9195, 78.1092, 'normal', 'pending'),
('ORD-MDU-008','Nirmala Raj',       'Mattuthavani Hub',    'Ellis Nagar 5th Street',    'Madurai',      9.9421, 78.1351, 'urgent', 'pending'),
('ORD-SLM-001','Karthikeyan R',     'Salem Hub',           'Steel City Market',         'Salem',       11.6643, 78.1460, 'urgent', 'pending'),
('ORD-SLM-002','Padmavathi S',      'Salem Hub',           'Fairlands Bus Stand',       'Salem',       11.6680, 78.1560, 'normal', 'pending'),
('ORD-SLM-003','Sivakumar P',       'Salem Hub',           'Shevapet Main Road',        'Salem',       11.6790, 78.1420, 'normal', 'pending'),
('ORD-SLM-004','Meenakshi A',       'Salem Hub',           'Suramangalam Junction',     'Salem',       11.6530, 78.1600, 'urgent', 'pending'),
('ORD-SLM-005','Ramalingam K',      'Salem Hub',           'Hasthampatti Town',         'Salem',       11.6800, 78.1700, 'low',    'pending'),
('ORD-SLM-006','Vijayalakshmi',     'Salem Hub',           'Ammapet Market Area',       'Salem',       11.6432, 78.1532, 'normal', 'pending'),
('ORD-TRY-001','Thiruvengadam',     'Trichy Hub',          'Srirangam Temple Street',   'Trichy',      10.8631, 78.6927, 'urgent', 'pending'),
('ORD-TRY-002','Saradha Devi',      'Trichy Hub',          'Thillai Nagar Main',        'Trichy',      10.8050, 78.6856, 'normal', 'pending'),
('ORD-TRY-003','Anbarasan M',       'Trichy Hub',          'Woraiyur Station Road',     'Trichy',      10.7905, 78.7047, 'normal', 'pending'),
('ORD-TRY-004','Kaveri Ammal',      'Trichy Hub',          'KK Nagar Trichy',           'Trichy',      10.8300, 78.6950, 'urgent', 'pending'),
('ORD-TNV-001','Jayalakshmi R',     'Tirunelveli Hub',     'Palayamkottai Market',      'Tirunelveli',  8.7139, 77.7567, 'urgent', 'pending'),
('ORD-TNV-002','Chelladurai P',     'Tirunelveli Hub',     'Melapalayam Junction',      'Tirunelveli',  8.7273, 77.7382, 'normal', 'pending'),
('ORD-TNV-003','Amudha Selvi',      'Tirunelveli Hub',     'Vannarpettai Main Road',    'Tirunelveli',  8.7480, 77.6930, 'normal', 'pending')
ON CONFLICT DO NOTHING;
