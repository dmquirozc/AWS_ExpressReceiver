var net = require('net');
var addr ="https://3.16.100.199:3000/";
//var ip ="3.16.100.199"
var ip ="127.0.0.1"
var client = new net.Socket();
client.connect(3001, ip, function() {
	console.log('Connected');
	var bytearray = [0x40,0x61,0xea,0x00,0x00,0xec,0x68,0x0b,0x69,0xe7,0x12,0x03]
	client.write(Buffer(bytearray));
    setTimeout(()=> {
        client.destroy(); // kill client after server's response
    }, 5000)
});

client.on('data', function(data) {
	console.log('Received: ' + data);
	
});

client.on('close', function() {
	console.log('Connection closed');
});