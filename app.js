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

connection.connect(function(err) {
  if (err) 
  {
    console.log("Database err",err) 
    throw err;
  }
  console.log("Connected to database!");
 
});



var server = net.createServer(function(socket) {
	//socket.write('Echo server\r\n');
	console.log("tcp connection");
  socket.on('connect', ()=>{
    socket.write("Hola");
  })
  socket.on('data', data => 
  {
    
    var dat =   data.toString();
    console.log("data:",dat);
    var i = 0;
    var packets = [];

    while(dat.length() > 0)
    {
      var type = dat.charCodeAt(0);
      if(type == 0x40) //imei
      {
        
        console.log("type: IMEI");
        var time = (dat.charCodeAt(1) << 24 | dat.charCodeAt(2) << 16 | dat.charCodeAt(3) << 8 | dat.charCodeAt(4));
        var imei = (dat.charCodeAt(5) << 48 | dat.charCodeAt(6) << 40| dat.charCodeAt(7) << 32| dat.charCodeAt(8) << 24| dat.charCodeAt(9) << 16 | dat.charCodeAt(10) << 8| dat.charCodeAt(11))
        packets.push({
          type: type,
          time: time,
          imei: imei
        })
        dat = dat.slice(11,-1)
      }else if(type == 0x41)
      {
        console.log("type: GPS")
      }
    }
    var sql = "SELECT * FROM development.gps_sm limit 1;"
    connection.query(sql, function (err, result) {
      if (err){
        console.log("SQL err",err) 
        throw err;
      }
      console.log("Result: " ,result);
    });
    
  })
  socket.on('error', err =>
  {
    console.log("error:", err)
  })
  
  socket.pipe(socket);
});

server.listen(dataPort);


var httpsServer = https.createServer(credentials, app);




app.get('/', (req, res) => {
  res.send('Hello World!')
})

httpsServer.listen(port, () => {
  console.log("server starting on port : " + port)
});

//httpsServer.listen(port);


