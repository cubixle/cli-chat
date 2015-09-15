// Load the TCP Library
net = require('net');
clc = require('cli-color');
moment = require('moment');

// Keep track of the chat clients
var clients = [];
var names = {};

var broadcastService = {
  sendMessageHome: function(socket, message) {
    socket.write(message + '\n');
  },
  sendMessage: function(sender, message) {
    var message = String(message);
    var date = moment().format('HH:mm:ss');
    clientService.clients.forEach(function (client) {
        // Don't want to send it to sender
        if (client === sender) return;
        client.write(date + ' - ' + message.trim() + "\n");
    });
    
    // Log it to the server output too
    process.stdout.write(message)
  }
};

var serverService = {
  getHelpCommands: function(socket) {
    broadcastService.sendMessageHome(socket, clc.green('List of commands you can run'));
    broadcastService.sendMessageHome(socket, clc.yellow('/list') + ' - List all connected users.');
    broadcastService.sendMessageHome(socket, clc.yellow('/name {name}') + ' - Set your user name.');
  }
}

var clientService = {

  clients: [],
  names: {},
  addNewUser: function (socket) {
    // Identify this client
    socket.name = socket.remoteAddress + ":" + socket.remotePort
    this.names[socket.name] = socket.name;
    // Put this new client in the list
    this.clients.push(socket);
    broadcastService.sendMessageHome(socket, 'Welcome ' + socket.name + ', if you need any help type /help');

    broadcastService.sendMessage(socket, socket.name + " joined the chat");
    return socket;
  },
  removeUser: function(socket) {
    this.clients.splice(this.clients.indexOf(socket), 1);
    var name = this.names[socket.name];
    delete this.names[socket.name];

    broadcastService.sendMessage(socket, name + " left the chat.");
  },
  getUserName: function(socket) {
    return this.names[socket.name];
  },
  setUserName: function(socket, name) {
    this.names[socket.name] = name.trim();

    broadcastService.sendMessageHome(socket, clc.green('Your name has been updated')); 
  },
  getListOfNames: function() {
    var list = [];
    for (var key in this.names) {

        list.push(this.names[key].trim());
    }
    
    return list.join(', ');
  }

};

// Start a TCP Server
net.createServer(function (socket) {

  socket = clientService.addNewUser(socket);

  // Handle incoming messages from clients.
  socket.on('data', function (data) {
      var data = String(data);
      if (data.indexOf('/help') > -1) {
          serverService.getHelpCommands(socket);
      }
      else if (data.indexOf('/list') > -1) {
        broadcastService.sendMessageHome(socket, clientService.getListOfNames());
      }
      else if (data.indexOf('/name ') > -1) {
        clientService.setUserName(socket, data.substring(6));
      }
      else {
        var name = clientService.getUserName(socket);

        broadcastService.sendMessage(
          socket,
          clc.redBright(name) + clc.blueBright(": ") + data
        );
      }
  });

  // Remove the client from the list when it leaves
  socket.on('end', function () {
      clientService.removeUser(socket);
  });
}).listen(5000);

// Put a friendly message on the terminal of the server.
console.log("Chat server running at port 5000");
