const express = require('express'),
mysql = require('mysql'),
app = express(),
fs = require('fs');
var net = require('net');
var https = require('https');
var privateKey  = fs.readFileSync('key.pem', 'utf8');
var certificate = fs.readFileSync('cert.pem', 'utf8');
const DEBUG = true;
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
  password: "tA9wIyVSzPEJHdMtGzhp",
  database: "development"
});

// connection.connect(function(err) {
//   if (err) 
//   {
//     if(DEBUG) console.log("Database err",err) 
//     throw err;
//   }
//   if(DEBUG) console.log("Connected to database!");
 
// });



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
    var imei_ = 0;
    console.log(dat[0])
    for(let i = 0; dat.length > 0; i++)
    {
      console.log("dat:",dat)
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
        imei_ = imei;
        packets.push({
          type: type,
          time: time,
          imei: imei
        })
        console.log(packets[packets.length -1 ])
        i=i+10;
        dat = dat.slice(12,dat.length)
      }else if(type == 0x42)
      {
        console.log("type: GPS")
        type = dat[0];
        var npos = dat[1];
        var aux = dat.slice(2,6)
        var time1=0,time2 =0;
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
          console.log("time1:", time1)
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
              
              if(j%3){
                lat+=aux[j]*mask;
                mask=mask*256;
              }else{
                lat+=aux[j];
                mask = 256;
              }
              console.log("lat:", lat,"j:",j)
                
            }else{
             
              if(j%3){
                lon+=aux[j]*mask;
                mask=mask*256;
              }else{
                lon+=aux[j];
                mask = 256;
              }
              console.log("lon:", lon,"j:",j)
            }
          }
          aux = aux.slice(6,aux.length);
          positions.push(
            {
              lat: ((((lat - 0.5)/16777214.0) - 0.5)*180.0).toFixed(4),
              lon: ((((lon - 0.5 )/16777216.0) -0.5)*360.0).toFixed(4),
              latnum : ((((lat - 0.5)/16777214.0) - 0.5)*180.0),
              lonnum : ((((lon - 0.5 )/16777216.0) -0.5)*360.0)
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
        console.log(packets[packets.length -1])
        dat = dat.slice( 10 + npos*6 ,dat.length);
      }else{
        dat = dat.slice(1,-1)
      }
    }
    //INSERT INTO  (`id_lora_devices_data`, `imei`, `latitude`, `longitude`, `millis`, `date_entry`) VALUES ('1', '111111111', '90.0', '-180.0', '11111', '2020-10-10 00:00:00');
    var sqls = [];
    for(let i = 0; i < packets.length; i++)
    {
      sqls = sqls.concat(sqlInsert(packets[i],imei_));

    }
    //var sql1 = "INSERT INTO `development`.`lora_devices_data` (`ime"
    console.log("SQLS:",sqls)
    sql =  `INSERT INTO lora_devices_data (\`imei\`, \`latitude\`, \`longitude\`, \`millis\`, \`date_entry\`) VALUES ?`;
    // for(let i = 0; i < sqls.length; i++)
    // {
      connection.query({sql: sql,timeout: 40000,},[sqls], function (err, result) {
        if (err){
          console.log("SQL err",err) 
          //throw err;
        }
        console.log("Result: " ,result);
      });
    // }
    
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
function sqlInsert(packet, imei_){
  var sql = [];
  if(packet.type === 0x40)
  {
    var imei =  null, latitude = null, longitude = null, millis =  null; 
    //INSERT INTO  (`id_lora_devices_data`, `imei`, `latitude`, `longitude`, `millis`, `date_entry`) VALUES ('1', '111111111', '90.0', '-180.0', '11111', '2020-10-10 00:00:00');
    var date =  new Date().toISOString();
    sql.push([`${packet.imei}`, null, null, `${packet.time}`, `${formatDate(date)}`]);

  }else if(packet.type === 0x42)
  {
    console.log("SQL for gps")
    var date = new Date().toISOString();
    for(let i = 0; i < packet.npos; i++)
    {
      sql.push([`${imei_}`, `${packet.positions[i].latnum}`, `${packet.positions[i].lonnum}`, `${packet.time1}`, formatDate(date)]);
    }
  }
  
  return sql;  
}

function formatDate(date)
{
  //2021-03-02T17:34:03.624Z
  var aux = date.split("T"),
  aux2 = aux[1].split(".");
  return  aux[0]+" "+aux2[0];
}
