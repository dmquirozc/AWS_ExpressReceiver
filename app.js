const express = require('express'),
mysql = require('mysql'),
app = express(),
fs = require('fs');
var net = require('net');
var https = require('https');
var privateKey  = fs.readFileSync('key.pem', 'utf8');
var certificate = fs.readFileSync('cert.pem', 'utf8');

var credentials = {key: privateKey, cert: certificate};


const port = 3000;
const dataPort =  3001;

var  connection  = mysql.createConnection({
  host: "development.cdznpbrtlaxc.us-east-2.rds.amazonaws.com",
  user: "admin",
  password: "tA9wIyVSzPEJHdMtGzhp"
});



var server = net.createServer(function(socket) {
	//socket.write('Echo server\r\n');
	console.log("tcp connection");

  socket.on('data', data => 
  {
    console.log("data:", data);

    connection.connect(function(err) {
      if (err) 
      {
        console.log("Database err",err) 
        throw err;
      }
      console.log("Connected to database!");
      var sql = "SELECT * FROM development.gps_sm limit 1;"
      connection.query(sql, function (err, result) {
        if (err){
          console.log("SQL err",err) 
          throw err;
        }
        console.log("Result: " ,result);
      });
    });
  })
  socket.on('error', err =>
  {
    console.log("error:", err)
  })
  
  socket.pipe(socket);
});
server.listen(dataPort, '127.0.0.1');


var httpsServer = https.createServer(credentials, app);




app.get('/', (req, res) => {
  res.send('Hello World!')
})

httpsServer.listen(port, () => {
  console.log("server starting on port : " + port)
});

//httpsServer.listen(port);


