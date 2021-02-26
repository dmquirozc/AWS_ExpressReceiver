var net = require('net');

var client = new net.Socket();
client.connect(3001, '127.0.0.1', function() {
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