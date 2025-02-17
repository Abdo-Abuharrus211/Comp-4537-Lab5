const SERVER_URL = "https://comp-4537-lab5.onrender.com";

// Insert predefined patients
document.getElementById("insertBtn").addEventListener("click", () => {
    fetch(`${SERVER_URL}/insert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            patients: [
                { name: "Sara Brown", dateOfBirth: "1901-01-01" },
                { name: "John Smith", dateOfBirth: "1941-01-01" },
                { name: "Jack Ma", dateOfBirth: "1961-01-30" },
                { name: "Elon Musk", dateOfBirth: "1999-01-01" }
            ]
        })
    })
        .then(res => res.text())
        .then(data => document.getElementById("output").textContent = data)
        .catch(err => console.error(err));
});

// Send query from textarea
document.getElementById("queryBtn").addEventListener("click", () => {
    const query = document.getElementById("queryBox").value.trim();

    if (!query) {
        alert("Please enter a valid SQL query.");
        return;
    }

    let method;
    let url = `${SERVER_URL}/query`;
    let options = {
        headers: { "Content-Type": "application/json" }
    };

    if (/^\s*SELECT/i.test(query)) {
        // Use GET for SELECT queries
        method = "GET";
        url += `?sql=${encodeURIComponent(query)}`;
    } else if (/^\s*INSERT/i.test(query)) {
        // Use POST for INSERT queries
        method = "POST";
        options.body = JSON.stringify({ sql: query });
    } else {
        alert("Only SELECT and INSERT queries are allowed.");
        return;
    }

    options.method = method;

    // Fetch query results
    fetch(url, options)
        .then(response => response.json())
        .then(data => {
            document.getElementById("output").textContent = JSON.stringify(data, null, 2);
        })
        .catch(error => console.error("Error:", error));
});