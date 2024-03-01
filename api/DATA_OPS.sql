INSERT INTO author (username, password_hash, author_id, email, created_at, updated_at) 
VALUES ('Hector', 'hashed_password', 12345, 'hector@example.com', toTimestamp(now()), toTimestamp(now()));

CREATE INDEX ON author (username);

SELECT author_id FROM author WHERE username = 'Hector';