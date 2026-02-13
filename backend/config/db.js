import mysql from "mysql2/promise";

// Lazy initialization - read env vars when pool is first accessed
let poolInstance = null;

function getPool() {
  if (!poolInstance) {
    const {
      DB_HOST,
      DB_PORT,
      DB_USER,
      DB_PASSWORD,
      DB_NAME
    } = process.env;

    // Temporary debug log - remove after confirming connection works
    // eslint-disable-next-line no-console
    console.log("[DB DEBUG] Environment variables:", {
      DB_HOST: DB_HOST || "(not set)",
      DB_PORT: DB_PORT || "(not set)",
      DB_USER: DB_USER || "(not set - THIS IS THE PROBLEM!)",
      DB_PASSWORD: DB_PASSWORD ? "***SET***" : "(not set)",
      DB_NAME: DB_NAME || "(not set)"
    });

    if (!DB_USER) {
      // eslint-disable-next-line no-console
      console.error(
        "[DB] ❌ DB_USER is missing! Check your .env file in backend/.env"
      );
    }
    if (!DB_NAME) {
      // eslint-disable-next-line no-console
      console.error(
        "[DB] ❌ DB_NAME is missing! Check your .env file in backend/.env"
      );
    }
    if (!DB_USER || !DB_NAME) {
      // eslint-disable-next-line no-console
      console.error(
        "[DB] MySQL config incomplete. Make sure backend/.env exists and contains DB_USER and DB_NAME"
      );
    }

    poolInstance = mysql.createPool({
      host: DB_HOST || "localhost",
      port: DB_PORT ? Number.parseInt(DB_PORT, 10) : 3306,
      user: DB_USER,
      password: DB_PASSWORD || undefined,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });
  }
  return poolInstance;
}

// Export pool as a Proxy that forwards all calls to the actual pool
export const pool = new Proxy({}, {
  get(target, prop) {
    const actualPool = getPool();
    const value = actualPool[prop];
    if (typeof value === "function") {
      return value.bind(actualPool);
    }
    return value;
  }
});

/**
 * Get a connection from the pool (for transactions).
 * Release with connection.release() when done.
 */
export async function getConnection() {
  try {
    return await getPool().getConnection();
  } catch (error) {
    const wrapped = Object.assign(
      new Error(
        "Unable to connect to the database. Please check MySQL is running and DB_* env vars are set."
      ),
      { status: 503, code: "DatabaseUnavailable" }
    );
    // eslint-disable-next-line no-console
    console.error("[DB] MySQL connection error:", error);
    throw wrapped;
  }
}

/**
 * Test database connection
 */
export async function testConnection() {
  try {
    const connection = await getPool().getConnection();
    await connection.ping();
    connection.release();
    // eslint-disable-next-line no-console
    console.log("[DB] MySQL connection pool initialized successfully");
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[DB] MySQL connection test failed:", error.message);
    return false;
  }
}
