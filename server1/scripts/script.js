const apiRoot = "http://localhost:8888/"


//TODO: Should make OOP and proper
// 

function sendDbReq() {
    const query = document.getElementById("txtarea").value;
    let method = "";
    query.trim.trim();
    if (query.startsWith() == "SELECT") {
        method = "GET";
    }
    else if (query.startsWith() == "INSERT") {
        method = "POST";
    }
    else {
        alert("Has to be 'SELECT' or 'INSERT'");
        console.log("Invalid query");
    }

    const xhttp = new XMLHttpRequest();
    xhttp.open(method, `${apiRoot}/query`);
    xhttp.send(query);                      // Sending the query
    xhttp.onreadystatechange = () => {
        // do something
    }
}

const subBtn = document.getElementById("submit-btn");
subBtn.addEventListener('click', () => {
    postToDb();
})

