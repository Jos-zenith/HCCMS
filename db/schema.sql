-- HCCMS database schema (PostgreSQL 14+; also runs on embedded PGlite)
-- Applied automatically on first connection (lib/db.ts). Idempotent.

CREATE TABLE IF NOT EXISTS households (
  id          UUID PRIMARY KEY,
  name        TEXT NOT NULL,
  city        TEXT NOT NULL DEFAULT 'Chennai',
  locality    TEXT,
  members     INTEGER CHECK (members > 0),
  key_hash    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per physical board. kind decides which readings it may send.
CREATE TABLE IF NOT EXISTS devices (
  id            TEXT PRIMARY KEY,
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('tree', 'vehicle', 'camera')),
  name          TEXT NOT NULL,
  key_hash      TEXT NOT NULL UNIQUE,
  last_seen_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_devices_household ON devices(household_id);

CREATE TABLE IF NOT EXISTS trees (
  id               UUID PRIMARY KEY,
  household_id     UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  species_key      TEXT NOT NULL,
  dbh_cm           REAL NOT NULL CHECK (dbh_cm > 0),
  height_m         REAL NOT NULL CHECK (height_m > 0),
  sensor_device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
  camera_device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
  measured_on      DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trees_household ON trees(household_id);

-- Every trunk/height measurement is kept. Carbon credits come only from growth
-- between measurements (trees.dbh_cm / height_m cache the latest one).
CREATE TABLE IF NOT EXISTS tree_measurements (
  id           BIGSERIAL PRIMARY KEY,
  tree_id      UUID NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  measured_on  DATE NOT NULL,
  dbh_cm       REAL NOT NULL CHECK (dbh_cm > 0),
  height_m     REAL NOT NULL CHECK (height_m > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tree_measurements_tree ON tree_measurements(tree_id, measured_on);

-- Backfill trees registered before measurement history existed
INSERT INTO tree_measurements (tree_id, measured_on, dbh_cm, height_m)
SELECT t.id, t.measured_on, t.dbh_cm, t.height_m FROM trees t
 WHERE NOT EXISTS (SELECT 1 FROM tree_measurements m WHERE m.tree_id = t.id);

-- Sensor readings. Columns are nullable: each module only sends what it measures.
CREATE TABLE IF NOT EXISTS readings (
  id                BIGSERIAL PRIMARY KEY,
  device_id         TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  recorded_at       TIMESTAMPTZ NOT NULL,
  received_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  temperature_c     REAL,
  humidity_pct      REAL,
  soil_moisture_pct REAL,
  soil_ph           REAL,
  light_pct         REAL,
  co2_ppm           REAL,
  pm25_ugm3         REAL,
  UNIQUE (device_id, recorded_at)
);
CREATE INDEX IF NOT EXISTS idx_readings_device_time ON readings(device_id, recorded_at DESC);

-- Leaf images from the camera module, analysed by the inference server.
CREATE TABLE IF NOT EXISTS leaf_scans (
  id                  BIGSERIAL PRIMARY KEY,
  tree_id             UUID NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  device_id           TEXT REFERENCES devices(id) ON DELETE SET NULL,
  captured_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  green_ratio         REAL NOT NULL,
  vari                REAL NOT NULL,
  vegetation_coverage REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leaf_scans_tree_time ON leaf_scans(tree_id, captured_at DESC);

-- Household emission activities entered from bills / fuel receipts.
CREATE TABLE IF NOT EXISTS activities (
  id            UUID PRIMARY KEY,
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('electricity', 'lpg', 'petrol', 'diesel', 'cng')),
  quantity      REAL NOT NULL CHECK (quantity > 0),
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start)
);
CREATE INDEX IF NOT EXISTS idx_activities_household ON activities(household_id, period_end DESC);
