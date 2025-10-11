-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    creator_name TEXT,
    public_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create entries table
CREATE TABLE IF NOT EXISTS entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    normalized_text TEXT NOT NULL,
    color TEXT NOT NULL,
    participant_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_entries_session_id ON entries(session_id);
CREATE INDEX IF NOT EXISTS idx_entries_normalized_text ON entries(normalized_text);
CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since we're using anon key)

-- Sessions policies
CREATE POLICY "Allow public read access to sessions"
    ON sessions FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert access to sessions"
    ON sessions FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public update access to sessions"
    ON sessions FOR UPDATE
    USING (true);

CREATE POLICY "Allow public delete access to sessions"
    ON sessions FOR DELETE
    USING (true);

-- Entries policies
CREATE POLICY "Allow public read access to entries"
    ON entries FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert access to entries"
    ON entries FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public delete access to entries"
    ON entries FOR DELETE
    USING (true);

-- Enable Realtime for entries table (so we get live updates)
-- Note: This needs to be done in the Supabase dashboard or via SQL
-- ALTER PUBLICATION supabase_realtime ADD TABLE entries;

-- Comment for setup instructions
COMMENT ON TABLE sessions IS 'Stores word cloud session information';
COMMENT ON TABLE entries IS 'Stores individual word/phrase submissions from participants';
COMMENT ON COLUMN entries.text IS 'Original text entered by participant';
COMMENT ON COLUMN entries.normalized_text IS 'Processed text for grouping similar phrases';
