const btnCreate = document.getElementById("btnCreate");
const txtGameTitle = document.getElementById("txtGameTitle");
const txtGameRounds = document.getElementById("txtGameRounds");
const txtGamePlayer = document.getElementById("txtGamePlayer");
const list = document.getElementById('gameList');

let clientId = window.localStorage.getItem("clientId");

let ws = new WebSocket("ws://" + location.host.split(":")[0] + ":3000");

btnCreate.onclick = function(){
	let gameTitle = txtGameTitle.value;
	if(gameTitle.length < 1) gameTitle = "Unnamed Game";
	let rounds = txtGameRounds.value;
	if(rounds < 1) rounds = 1;
	let maxPlayer = txtGamePlayer.value;
	if(maxPlayer < 2) maxPlayer = 2;

	const payLoad = {
		"method": "create",
		"clientId": clientId,
		"title": gameTitle,
		"rounds": rounds,
		"maxPlayer": maxPlayer
	}
	ws.send(JSON.stringify(payLoad));
}

ws.onmessage = message =>{
	const response = JSON.parse(message.data);

	if(response.method == "connect"){
		if(clientId == null){
			clientId = response.clientId;
			window.localStorage.setItem("clientId", clientId);
			console.log("Client ID is now " + clientId);
		}else{
			clientId = window.localStorage.getItem("clientId");
			console.log("Client ID is still " + clientId)
			const payLoad = {
				"method": "keepId",
				"oldId": response.clientId,
				"clientId": clientId
			}
			ws.send(JSON.stringify(payLoad));
		}
	}

	if(response.method == "alert"){
		alert(response.content);
	}

	if(response.method == "create"){
		console.log("Game created with ID " + response.game.id);
	}

	if(response.method == "updateGames"){
		// Reset Table except the Header
		list.getElementsByTagName("tbody")[0].innerHTML = list.rows[0].innerHTML;

		const games = response.games;
		for(const g of Object.keys(games)){
			const game = games[g];

			if(game != null){
				let row = list.insertRow();
				let titleCell = row.insertCell(0);
				titleCell.innerHTML = game.title;
				let actionsCell = row.insertCell(1);
				let roundsCell = row.insertCell(2);
				roundsCell.innerHTML = game.rounds;
				let playersCell = row.insertCell(3);
				playersCell.innerHTML = game.players.length + "/" + game.maxPlayer;

				// Deletebutton - only available if you are the author of the game
				let btnDelete = document.createElement('button');
				btnDelete.innerHTML = "Delete";
				btnDelete.classList.add("action");
				if(game.author == clientId){
					btnDelete.onclick = e => {
						const payLoad = {
							"method": "deleteGame",
							"gameId": game.id,
							"clientId": clientId
						}
						ws.send(JSON.stringify(payLoad));
					};
				}else{
					btnDelete.disabled = true;
				}
				actionsCell.appendChild(btnDelete);

				// Joinbutton - only available if you are not in a game and the game is not full
				let btnJoin = document.createElement('button');
				btnJoin.innerHTML = "Join";
				btnJoin.classList.add("action");
				if(game.players.length < game.maxPlayer){
					btnJoin.onclick = e => {
						const payLoad = {
							"method": "joinGame",
							"gameId": game.id,
							"clientId": clientId
						}
						ws.send(JSON.stringify(payLoad));
					}
				}else{
					btnJoin.disabled = true;
				}
				actionsCell.appendChild(btnJoin);
			}
		}
	}
}