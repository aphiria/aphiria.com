CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    is_active BOOL DEFAULT TRUE,
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_credentials (
    id SERIAL PRIMARY KEY,
    user_id int NOT NULL,
    hashed_password TEXT NOT NULL,
    is_active BOOL DEFAULT TRUE,
    timestamp TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_user_id FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_credential_resets (
    id SERIAL PRIMARY KEY,
    user_id int NOT NULL,
    salt TEXT NOT NULL,
    hashed_nonce TEXT NOT NULL,
    is_active BOOL DEFAULT TRUE,
    expiration TIMESTAMP NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_user_id FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_access_tokens (
    id SERIAL PRIMARY KEY,
    user_id int NOT NULL,
    salt TEXT NOT NULL,
    hashed_access_token TEXT NOT NULL,
    expiration TIMESTAMP NOT NULL,
    is_active BOOL DEFAULT TRUE,
    timestamp TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_user_id FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    author_id int NOT NULL,
    title TEXT NOT NULL,
    text_summary TEXT NOT NULL,
    markdown_content TEXT NOT NULL,
    html_content TEXT NOT NULL,
    created_date TIMESTAMP NOT NULL,
    last_updated_date TIMESTAMP NOT NULL,
    publish_date TIMESTAMP NOT NULL,
    is_deleted BOOL DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_author_id FOREIGN KEY(author_id) REFERENCES users(id)
);
