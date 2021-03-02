const express = require('express'),
mysql = require('mysql'),
app = express(),
fs = require('fs');
var net = require('net');
var https = require('https');
var privateKey  = fs.readFileSync('key.pem', 'utf8');
var certificate = fs.readFileSync('cert.pem', 'utf8');

var credentials = {key: privateKey, cert: certificate};

var types = {
  imei: {
    type: 1,
    time: 4,
    imei: 7
  },
  gps: {
    type: 1,
    time1: 4,
    time2: 4,
    n: 1,
    positionX: 3,
    positionY: 3
  }
}

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
    
    var dat =   Buffer(data.buffer);
    console.log("data:",dat);
    var i = 0;
    var packets = [];
    console.log(dat[0])
    for(let i = 0; dat.length > 0; i++)
    {
      var type = dat[0];
      if(type == 0x40) //imei
      {
        
        console.log("type: IMEI");
        console.log("chartAt 1:",dat[1])
        var time = dat[1];
        var mask = 1;
        for(let k = 2; k <= 4; k++){
          console.log("CharCode at", k,": ",dat[k])
          time+= (dat[k] << (8*mask));
          console.log("time:",time)
          mask++;
        } 
        //var time = (dat.charCodeAt(1) << 24 | dat.charCodeAt(2) << 16 | dat.charCodeAt(3) << 8 | dat.charCodeAt(4));
        var imei = (dat[5] )
        mask = 256;
        for(let k = 6; k <= 11; k++){
          console.log("CharCode at", k,": ",dat[k])
          imei+= (dat[k]*mask);
          mask=mask*256;
        } 
        packets.push({
          type: type,
          time: time,
          imei: imei
        })
        console.log(packets[packets.length -1 ])
        i=i+10;
        dat = dat.slice(11,-1)
      }else if(type == 0x42)
      {
        console.log("type: GPS")
        type = dat[0];
        var npos = dat[1];
        var aux = data.slice(2,6)
        var time1,time2 ;
        var mask = 256;
        for(let k = 0; k < 3; k++)
        { 
          if(k > 0)
          {
            time1+= aux[k]*mask;
            mask= mask*256;
          }else{
            time1+= aux[k];
          }
        }
        aux = dat.slice(6,10); 
        for(let k = 0; k < 3; k++)
        { 
          if(k > 0)
          {
            time2+= aux[k]*mask;
            mask= mask*256;
          }else{
            time2+= aux[k];
          }
        }
        var positions = [];
        aux = dat.slice(10,10 + npos*6 + 1);
        for(let k = 0; k < npos; k++)
        {
          var lat= 0, lon= 0;
          
          for(let j = 0; j < 6; j++)
          {
            if(j <3){
              mask = 256;
              if(j%3){
                lat+=aux[j]*mask;
                mask=mask*256;
              }else{
                lat+=aux[j];
              }
                
            }else{
              mask = 256;
              if(j%3){
                lat+=aux[j]*mask;
                mask=mask*256;
              }else{
                lat+=aux[j];
              }
            }
          }
          aux = aux.slice(6,-1);
          positions.push(
            {
              lat: lat,
              lon: lon
            }
          )
        }
        packets.push({
          type: type,
          npos: npos,
          time1: time1,
          time2: time2,
          positions: positions
        })
      
        dat = dat.slice( 10 + npos*6 ,-1);
      }else{
        dat = dat.slice(1,-1)
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


