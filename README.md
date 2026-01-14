# Scalable Bulletin Board System with Nest.js and Supabase

This project is a scalable bulletin board system built with Nest.js, using Supabase as the PostgreSQL provider. It is designed to be deployed in a load-balanced environment using Docker and Nginx.

## Tech Stack

- **Framework:** Nest.js (TypeScript)
- **Database:** Supabase (Managed PostgreSQL) via TypeORM
- **Authentication:** Passport & JWT (JSON Web Tokens)
- **Infrastructure:** Docker & Docker Compose
- **Load Balancer:** Nginx

## Prerequisites

- [Docker](https://www.docker.com/get-started) and [Docker Compose](https://docs.docker.com/compose/install/) installed on your machine.
- A [Supabase](https://supabase.com/) account.

## Getting Started

### 1. Set up Supabase

1.  Create a new project on Supabase.
2.  Navigate to your project's **Settings** > **Database**.
3.  Under **Connection string**, find the `URI` that starts with `postgresql://`. This is your `DATABASE_URL`.

### 2. Configure Environment Variables

1.  Create a `.env` file in the root of the project by copying the `.env.example` file:
    ```bash
    cp .env.example .env
    ```
2.  Open the `.env` file and replace `your_supabase_database_url_here` with the connection string you copied from Supabase.

    ```
    DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/[YOUR-DB-NAME]
    ```

### 3. Run the Application

Once you have configured your `.env` file, you can start the application using Docker Compose:

```bash
docker-compose up --build
```

This command will:
1.  Build the Docker image for the Nest.js application.
2.  Start three instances of the application (`app1`, `app2`, `app3`).
3.  Start an Nginx container that will load balance requests across the three application instances.

The application will be accessible at `http://localhost:80`.

## Production Considerations

For production environments, it is recommended to use a proper database migration tool to manage schema changes. The `synchronize: true` option in TypeORM is disabled by default for safety.

## API Endpoints

### Auth Module (`/auth`)
- `POST /auth/signup`: Register a new user.
- `POST /auth/signin`: Log in and receive a JWT.

### Board Module (`/board`)
- `POST /board`: Create a new post (requires authentication).
- `GET /board`: Get a paginated list of posts. Can be filtered by a `search` query parameter.
- `GET /board/:id`: Get a specific post by its ID.
- `PATCH /board/:id`: Update a post (requires authentication, author only).
- `DELETE /board/:id`: Delete a post (requires authentication, author only).
