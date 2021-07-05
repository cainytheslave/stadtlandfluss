const port = 3000;
const express_port = 3001;
const debug = false;

const http = require('http');
const app = require('express')();
const websocketServer = require("websocket").server;

let currentGameCount = 0;

// html File Servers
app.get("/", (req, res) => res.sendFile(__dirname + "/client/index.html"));
app.get("/game/:gameId", (req, res) => res.sendFile(__dirname + "/client/game.html"));

// Javascript File Servers
app.get("/js/main", (req, res) => res.sendFile(__dirname + "/client/js/client.js"));

// CSS File Servers
app.get("/css/main", (req, res) => res.sendFile(__dirname + "/client/css/style.css"));

// Image File Servers
app.get("/favicon.ico", (req, res) => res.sendFile(__dirname + "/client/assets/favicon.ico"));

app.listen(express_port, () => console.log("[START] Express listening on Port " + express_port));

const httpServer = http.createServer();
httpServer.listen(port, () => console.log("[START] Server listening on Port " + port));

const games = {}
const clients = {}

const serverSocket = new websocketServer({
  "httpServer": httpServer
})

serverSocket.on("request", request => {
  const connection = request.accept(null, request.origin);
  connection.on("message", message => {
    const result = JSON.parse(message.utf8Data);
    
    if(result.method == "create"){
     const clientId = result.clientId;
     const con = clients[clientId].connection;
     const gameId = guid();
     const gameTitle = result.title;
     const gameRounds = result.rounds;
     const gameMaxPlayer = result.maxPlayer;

     games[gameId] = {
       "id": gameId,
       "author": clientId,
       "title": gameTitle,
       "rounds": gameRounds,
       "maxPlayer": gameMaxPlayer,
       "players": []
     }
     currentGameCount++;

     if(debug) console.log("[INFO] Game created! ("+ gameId +")");

     const payLoad = {
      "method": "create",
      "game": games[gameId]
    }
    con.send(JSON.stringify(payLoad));

    updateGames();
  }

  if(result.method == "keepId"){
    if(debug) console.log("[INFO] Old client("+result.oldId+") keeps his ID: " + result.clientId);
    clients[result.clientId] = {
      "clientId": result.clientId,
      "connection": clients[result.oldId].connection
    };
    clients[result.oldId] = null;
  }

  if(result.method == "deleteGame"){
    const clientId = result.clientId;
    const gameId = result.gameId;

    if(games[gameId].author == clientId){
      games[gameId] = null;
      if(debug) console.log("[INFO] Game (" + gameId + ") got deleted by its author.");
      updateGames();
      currentGameCount--;
    }else{
      if(debug) console.log("[WARN] Unauthorized User tried to delete a game.");
    }
  }

  if(result.method == "joinGame"){
    const clientId = result.clientId;
    const con = clients[clientId].connection;
    const game = games[result.gameId];

    if(game != null){
      if(game.players.length < game.maxPlayer){ // Lobby is NOT full
        if(clientIngame(clientId) == null){ // Player is NOT in another game
          game.players.push(clientId);
          updateGames();
        }else{
          const payLoad = {
            "method": "alert",
            "content": "You are already in another game!"
          }
          con.send(JSON.stringify(payLoad));
        }
      }else{
        const payLoad = {
          "method": "alert",
          "content": "This game is already full!"
        }
        con.send(JSON.stringify(payLoad));
      }
    }
  }

})

  // Registering the new Client
  const clientId = guid();
  
  clients[clientId] = {
    "clientId": clientId,
    "connection": connection
  };

  const payLoad = {
    "method": "connect",
    "clientId": clientId
  };
  connection.send(JSON.stringify(payLoad));

  if(debug) console.log("[INFO] Registered a new client with ID: " + clientId);

  updateGamesDirect(clients[clientId]);
  if(debug) console.log("[INFO] All Game Entries were sent to the new Client.")

})

// Broadcast all Game Entries
function updateGames(){
  if(debug) console.log("[BROADCAST] List of Games");
  for(const c of Object.keys(clients)) {
    const client = clients[c];
    if(client != null){
      const con = client.connection;
      const payLoad = {
        "method": "updateGames",
        "games": games
      }
      con.send(JSON.stringify(payLoad));
    }
  }
}
// Send all Game Entries to a Single Client
function updateGamesDirect(client){
  if(client != null){
    const con = client.connection;
    const payLoad = {
      "method": "updateGames",
      "games": games
    }
    con.send(JSON.stringify(payLoad));
  }
}

function clientIngame(clientId){
  for(const g of Object.keys(games)) {
    const game = games[g];
    if(game != null){
      if(game.players.includes(clientId)) return game;
    }
  }
  return null;
}

function guid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

