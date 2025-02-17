const http = require("http");
const { Client } = require("pg"); // Import the PostgreSQL client
const url = require("url");
const path = require("path");
const port = process.env.PORT || 8000;

// Database configuration using environment variables
const dbConnectionString = "postgresql://lab5database_user:IYE258XJiN77apbtJBaM2gpDzT8tkRzi@dpg-cupchjdsvqrc73evoegg-a.oregon-postgres.render.com/lab5database"

// Create a connection to PostgreSQL using the connection string
const db = new Client({
    connectionString: dbConnectionString,
    ssl: {
        rejectUnauthorized: false, // Required for Render's PostgreSQL SSL connections
    },
});

db.connect(err => {
    if (err) {
        console.error("Database connection failed:", err);
    } else {
        console.log("Connected to PostgreSQL database.");
    }
});

// Ensure the table exists for PostgreSQL
db.query(`
    CREATE TABLE IF NOT EXISTS patient (
        patientid SERIAL PRIMARY KEY,
        name VARCHAR(100),
        dateOfBirth TIMESTAMP
    );
`, err => {
    if (err) console.error("Error creating table:", err);
});

// Start the server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);

    // Handle CORS preflight (OPTIONS) requests
    if (req.method === "OPTIONS") {
        res.writeHead(204, { // 204 No Content
            "Access-Control-Allow-Origin": "*", // Allow any origin or specify your frontend domain
            "Access-Control-Allow-Methods": "OPTIONS, GET, POST",
            "Access-Control-Allow-Headers": "Content-Type",
        });
        return res.end();
    }

    // Handle POST request to /insert endpoint
    if (req.method === "POST" && parsedUrl.pathname === "/insert") {
        let body = "";

        req.on("data", chunk => { body += chunk.toString(); });
        req.on("end", () => {
            try {
                const { patients } = JSON.parse(body);
                if (!Array.isArray(patients)) {
                    res.writeHead(400);
                    return res.end(JSON.stringify({ error: "Invalid input format" }));
                }

                const values = patients.map(p => [p.name, p.dateOfBirth]);
                const sql = "INSERT INTO patient (name, dateOfBirth) VALUES ($1, $2) RETURNING *";

                db.query(sql, [values], (err, results) => {
                    if (err) {
                        res.writeHead(500);
                        return res.end(JSON.stringify({ error: err.message }));
                    }
                    res.end(JSON.stringify({ success: "Patients added", inserted: results.rows }));
                });
            } catch (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Invalid JSON payload" }));
            }
        });
    }

    // Handle GET request to /query endpoint
    else if (req.method === "GET" && parsedUrl.pathname === "/query") {
        const sql = parsedUrl.query.sql;

        if (!sql || !sql.trim().toUpperCase().startsWith("SELECT")) {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "Only SELECT queries are allowed via GET." }));
        }

        db.query(sql, (err, results) => {
            if (err) {
                res.writeHead(500);
                return res.end(JSON.stringify({ error: err.message }));
            }
            res.end(JSON.stringify(results.rows)); // PostgreSQL results are in `rows` array
        });
    }

    // Handle POST request to /query endpoint (for INSERT queries)
    else if (req.method === "POST" && parsedUrl.pathname === "/query") {
        let body = "";
        req.on("data", chunk => { body += chunk.toString(); });

        req.on("end", () => {
            try {
                const { sql } = JSON.parse(body);

                if (!sql || !sql.trim().toUpperCase().startsWith("INSERT")) {
                    res.writeHead(400);
                    return res.end(JSON.stringify({ error: "Only INSERT queries are allowed via POST." }));
                }

                db.query(sql, (err, results) => {
                    if (err) {
                        res.writeHead(500);
                        return res.end(JSON.stringify({ error: err.message }));
                    }
                    res.end(JSON.stringify({ success: "Query executed", results: results.rows }));
                });
            } catch (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Invalid JSON payload" }));
            }
        });
    }

    else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Not found" }));
    }
});

server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
