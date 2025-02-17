const http = require("http");
const mysql = require("mysql2"); // Use mysql2 instead of mysql
// const { Connector } = require('@google-cloud/cloud-sql-connector');
const url = require("url");
const path = require("path");
// const port = process.env.PORT || 8000;

// Your Cloud SQL instance details
const cloudSqlConnectionName = 'your-project-id:your-region:your-instance-id';
const dbUser = 'root';
const dbPassword = 'password';
const dbName = 'patients_db';

// Create a connector instance
const connector = new Connector();

// Get the connection details using the connector
const dbConfig = connector.getConfig({
    instanceConnectionName: cloudSqlConnectionName,
    user: dbUser,
    password: dbPassword,
    database: dbName,
});

// Create a MySQL connection using the Cloud SQL connector's config
const db = mysql.createConnection(dbConfig);

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Connected to Cloud SQL database.');
    }
});

// // Ensure the table exists
// db.query(`
//     CREATE TABLE IF NOT EXISTS patient (
//         patientid INT AUTO_INCREMENT PRIMARY KEY,
//         name VARCHAR(100),
//         dateOfBirth DATETIME
//     ) ENGINE=InnoDB;
// `, err => {
//     if (err) console.error("Error creating table:", err);
// });

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
                const sql = "INSERT INTO patient (name, dateOfBirth) VALUES ?";

                db.query(sql, [values], (err, results) => {
                    if (err) {
                        res.writeHead(500);
                        return res.end(JSON.stringify({ error: err.message }));
                    }
                    res.end(JSON.stringify({ success: "Patients added", inserted: results.affectedRows }));
                });
            } catch (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Invalid JSON payload" }));
            }
        });
    }

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
            res.end(JSON.stringify(results));
        });
    }

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
                    res.end(JSON.stringify({ success: "Query executed", results }));
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

const PORT = process.env.PORT || 3000;
const app = new Server(PORT);
app.start();