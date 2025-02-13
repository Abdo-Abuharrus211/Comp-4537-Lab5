const http = require("http");
const url = require('url');

class QueryHandler{

    constructor(port){
        this.port = port;
        this.server = http.createServer(this.handleRequest.bind(this));
    }

    handleRequest(req, res){
        const parsedUrl = url.parse(req.url, true);
        const pathname = parsedUrl.pathname;

        if(req.method === 'GET'){
            //Do stuff here
            // validate and run the SQL query by passing it to DB?
        }
        else if(req.method === 'POST'){
            // validate and run the SQL query by passing it to DB?
        }
        else{
            this.handleMethodNotAllowed(res);
        }
    }

}

const PORT = process.env.PORT || 8080;
const app = new Server(PORT);
app.start();