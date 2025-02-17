const http = require("http");
const mysql = require("mysql2/promise");
const { Connector } = require('@google-cloud/cloud-sql-connector');
const url = require("url");

// Google Cloud SQL configuration
const cloudSqlConnectionName = "optimal-aurora-451203-j1:us-central1:comp4537"; 
const dbUser = "joe";
const dbPassword = "clouds_judging"; 
const dbName = "patients";

// Create a connector instance
const connector = new Connector();
let pool;

async function initializePool() {
  const clientOpts = await connector.getOptions({
    instanceConnectionName: cloudSqlConnectionName,
    ipType: 'PUBLIC',
  });

  pool = await mysql.createPool({
    ...clientOpts,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    // ... other mysql2 options
  });

  console.log('Connected to Cloud SQL database.');
}

initializePool().catch(console.error);

// Start the server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  // Handle CORS preflight (OPTIONS) requests
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS, GET, POST",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  if (req.method === "POST" && parsedUrl.pathname === "/insert") {
    let body = "";

    req.on("data", chunk => { body += chunk.toString(); });
    req.on("end", async () => {
      try {
        const { patients } = JSON.parse(body);
        if (!Array.isArray(patients)) {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: "Invalid input format" }));
        }

        const values = patients.map(p => [p.name, p.dateOfBirth]);
        const sql = "INSERT INTO patient (name, dateOfBirth) VALUES ?";

        const [results] = await pool.query(sql, [values]);
        res.end(JSON.stringify({ success: "Patients added", inserted: results.affectedRows }));
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  }

  else if (req.method === "GET" && parsedUrl.pathname === "/query") {
    const sql = parsedUrl.query.sql;

    if (!sql || !sql.trim().toUpperCase().startsWith("SELECT")) {
      res.writeHead(400);
      return res.end(JSON.stringify({ error: "Only SELECT queries are allowed via GET." }));
    }

    try {
      const [results] = await pool.query(sql);
      res.end(JSON.stringify(results));
    } catch (error) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: error.message }));
    }
  }

  else if (req.method === "POST" && parsedUrl.pathname === "/query") {
    let body = "";
    req.on("data", chunk => { body += chunk.toString(); });

    req.on("end", async () => {
      try {
        const { sql } = JSON.parse(body);

        if (!sql || !sql.trim().toUpperCase().startsWith("INSERT")) {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: "Only INSERT queries are allowed via POST." }));
        }

        const [results] = await pool.query(sql);
        res.end(JSON.stringify({ success: "Query executed", results }));
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  }

  else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    pool.end().then(() => connector.close());
  });
});
