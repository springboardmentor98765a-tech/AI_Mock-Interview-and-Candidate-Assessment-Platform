import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the server folder
dotenv.config({ path: path.join(__dirname, ".env") });

const { Pool } = pg;

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

// Test database connection
(async () => {
    try {
        const client = await pool.connect();

        console.log("✅ PostgreSQL Connected Successfully");

        const db = await client.query("SELECT current_database()");
        console.log("Database:", db.rows[0].current_database);

        const schema = await client.query("SELECT current_schema()");
        console.log("Schema:", schema.rows[0].current_schema);

        const tables = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
        `);

        console.log("Tables:", tables.rows);

        client.release();
    } catch (err) {
        console.error("❌ Database Connection Error");
        console.error(err);
    }
})();

export default pool;