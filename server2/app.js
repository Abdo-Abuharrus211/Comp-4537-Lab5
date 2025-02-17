const http = require("http");
const url = require("url");
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.supabaseUrl;
const supabaseKey = process.env.supabaseKey;

const supabase = createClient(supabaseUrl, supabaseKey);

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

        const { data, error } = await supabase
          .from('patient')
          .insert(patients);

        if (error) throw error;

        res.end(JSON.stringify({ success: "Patients added", inserted: data.length }));
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  }

  else if (req.method === "GET" && parsedUrl.pathname === "/query") {
    const { table, select } = parsedUrl.query;

    if (!table || !select) {
      res.writeHead(400);
      return res.end(JSON.stringify({ error: "Table and select parameters are required." }));
    }

    try {
      const { data, error } = await supabase
        .from(table)
        .select(select);

      if (error) throw error;

      res.end(JSON.stringify(data));
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
        const { table, data } = JSON.parse(body);

        if (!table || !data) {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: "Table and data are required for insertion." }));
        }

        const { data: result, error } = await supabase
          .from(table)
          .insert(data);

        if (error) throw error;

        res.end(JSON.stringify({ success: "Data inserted", result }));
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
  });
});
