var
	net = require('net'),
	fs = require('fs');

var portMap = {
    LEVEL1      : {  port1 : 5009, port2 : 5010},
    LEVEL2      : {  port1 : 9200, port2 : 9201},
    LOOKUP      : {  port1 : 9100, port2 : 9101},
    ADMIN       : {  port1 : 9300, port2 : 9301},
    DERIVATIVE  : {  port1 : 9400, port2 : 9401}
};

var config = {
	appName: process.env.APP_NAME || "IQFEED_DEMO",
	appVersion: process.env.APP_VERSION || "1.0.0.0",
	login: process.env.LOGIN,
	password: process.env.PASSWORD
};

Object.keys(portMap).forEach(function(portKey) {

	net.createServer(function(socket) {

		var beforeConnectedBuffer = "";
		var connected = false;
        var connection = net.createConnection(portMap[portKey]['port1']);
        
		socket.on('close', function() {
			connection.destroy();
        });
        
		socket.on('error', function(err) {
			console.error(err);
        });
        
		socket.on('data', function(data) {
			if (connected) {
                connection.write(data);
                console.log(`${portKey}|WRITE|${data}`);
			} else {
				beforeConnectedBuffer += data.toString();
			}
        });
        
		connection.on('connect', function() {
			connected = true;
			connection.write(beforeConnectedBuffer);
        });

        connection.on('data', function(data) {
            console.log(data.toString ? `${portKey}|` + data.toString().replace(/[\r\n]+/, '') : data);
            
        });
        
		connection.on('error', function(err) {
			console.error(err);
			connection.unpipe(socket);
			connection.destroy();
			socket.end();
        });
        
        connection.pipe(socket);
        
    }).listen(portMap[portKey]['port2']);

 
    
});

function startIqFeed() {
	var port = 9300; // IQFeed admin port

	console.log("Connecting to port ", port);

    var socket = net.createConnection(port);
    
	socket.on('error', function(err) {
	});
	socket.on('close', function() {
		console.log("Disconnected. Reconnecting in 1 second.");
		setTimeout(startIqFeed, 1000);
	});
	socket.on('connect', function() {
		console.log("Connected.");
		socket.write([
			"S,REGISTER CLIENT APP," + config.appName + "," + config.appVersion,
			"S,SET LOGINID," + config.login,
			"S,SET PASSWORD," + config.password,
			"S,CONNECT"
		].join("\r\n")+"\r\n");
	});
	socket.on('data', function(data) {
		if (data && data.toString().match(/S,STATS.*Not Connected/)) {
                    console.log("Sending 'connect' command.");
                    socket.write("S,CONNECT\r\n");
                }
        
        
		console.log(data.toString ? `${port}|` + data.toString().replace(/[\r\n]+/, '') : data);
	});
}
startIqFeed();