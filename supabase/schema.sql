-- =============================================
-- VIBECHECK WEDDING — SCHEMA
-- =============================================

-- Tabla de bodas
CREATE TABLE IF NOT EXISTS weddings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT UNIQUE NOT NULL,        -- ej: LAURA_Y_MARCOS_2026
  couple_names TEXT NOT NULL,               -- ej: Laura y Marcos
  wedding_date DATE NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de invitados
CREATE TABLE IF NOT EXISTS guests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id    UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  bio           TEXT,                        -- máx 100 chars
  group_tag     TEXT,                        -- Familia Novia, Amigos Uni, etc
  video_url     TEXT,                        -- URL de Cloudinary
  thumbnail_url TEXT,                        -- thumbnail auto de Cloudinary
  consented     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas por boda
CREATE INDEX IF NOT EXISTS guests_wedding_idx ON guests(wedding_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE weddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests   ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede leer bodas (para validar el código)
CREATE POLICY "weddings_read_all"
  ON weddings FOR SELECT USING (true);

-- Cualquiera puede leer invitados
CREATE POLICY "guests_read_all"
  ON guests FOR SELECT USING (true);

-- Cualquiera puede insertar un invitado (con consentimiento)
CREATE POLICY "guests_insert_all"
  ON guests FOR INSERT WITH CHECK (consented = true);

-- =============================================
-- BODA DE PRUEBA (descomentar para testing)
-- =============================================

-- INSERT INTO weddings (code, couple_names, wedding_date)
-- VALUES ('LAURA_Y_MARCOS_2026', 'Laura y Marcos', '2026-09-15')
-- ON CONFLICT (code) DO NOTHING;