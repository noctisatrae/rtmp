CREATE TABLE messages (
  channel_id bigint,
  message_id bigint,
  author_id bigint,
  content text,
  created_at timestamp,
  updated_at_at timestamp,
  PRIMARY KEY ((channel_id), message_id)
) WITH CLUSTERING ORDER BY (message_id DESC);

CREATE TABLE author (
  username text,
  password_hash text,
  author_id bigint,
  email text,
  created_at timestamp,
  updated_at timestamp,
  PRIMARY KEY ((author_id), updated_at)  
) WITH CLUSTERING ORDER BY (updated_at DESC);

CREATE TABLE channel (
  author_id bigint,
  channel_id bigint,
  channel_name text,
  channel_description text,
  created_at timestamp,
  edited_at timestamp,
  PRIMARY KEY ((author_id), channel_id)
) WITH CLUSTERING ORDER BY (channel_id DESC);