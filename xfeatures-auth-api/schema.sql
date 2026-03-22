DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS email_verifications;
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id TEXT PRIMARY KEY,
	username TEXT UNIQUE NOT NULL,
	email TEXT UNIQUE NOT NULL,
	email_verified INTEGER DEFAULT 0,

	password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT DEFAULT 'user',

	mfa_enabled INTEGER DEFAULT 0,
	mfa_secret TEXT,

	first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,

	last_login_at INTEGER,
	created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
    updated_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
    status TEXT DEFAULT 'active',
	totp_secret TEXT,
    pending_totp_secret TEXT,
	is_2fa_enabled INTEGER DEFAULT 0,
	backup_codes TEXT,
	language TEXT DEFAULT 'en',
	location TEXT DEFAULT 'Unknown'
);

CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
    ip_address TEXT,
	user_agent TEXT,
	expires_at INTEGER NOT NULL,
	created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);

CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
	action TEXT NOT NULL,
	ip_address TEXT,
    details TEXT,
	created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE password_resets (
    token TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE email_verifications (
    token TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
    email TEXT NOT NULL,
	expires_at INTEGER NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE integrations (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	provider TEXT NOT NULL,
	provider_id TEXT NOT NULL,
	provider_username TEXT,
	is_active INTEGER DEFAULT 1,
	created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX idx_user_provider_id ON integrations(user_id, provider, provider_id);
