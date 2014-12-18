create table users(
  id serial PRIMARY KEY,
  username varchar(255) UNIQUE NOT NULL,
  email varchar(255) NOT NULL,
  password char(60) NOT NULL,
  avatar varchar(255) NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
