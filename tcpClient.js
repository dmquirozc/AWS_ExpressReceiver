var net = require('net');
var addr ="https://3.16.100.199:3000/";
var ip ="3.16.100.199"
var client = new net.Socket();
client.connect(3001, ip, function() {
	console.log('Connected');
	client.write('Hello, server! Love, Client.');
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