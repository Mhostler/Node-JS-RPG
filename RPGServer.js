let express = require("express");
let app = express();
let http = require("http").Server(app);
let io = require("socket.io")(http);
let Db = require('tingodb')().Db;
let assert = require('assert');

let db = new Db('C:\\Users\\Saf\\Documents\\VS-Code Projects\\JS RPG\\tingo', {});
let collection = db.collection("HeroData");

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

app.use(express.static(__dirname + '/public'));

http.listen(3000,"0.0.0.0", 1000000, function(){
    console.log('listening on *:3000');
});

app.set('view engine','ejs');

const GAME_STATE = {
    'FIELD': 0,
    'BATTLE': 1,
}
//games going on
let games = [];

//Note to self - don't open file, use address "localhost:3000"
io.on('connection', function(socket){

    console.log("a user connected");
    
    socket.on('RequestGame', function(msg){
        let hero = {
            'hp': 10,
            'xp': 0,
        }

        let game = {
            'id': Math.random(),
            'socket': socket,
            'hero': hero,
            'state': GAME_STATE.FIELD,
            'enemies': [],
            'distance': Math.random() % (256 * 3) + 256,
        }
        games.push(game);

        //send game information to player
        game.socket.emit('GameStart', {
            'hp': game.hero.hp,
            'state': game.state,
            'id': game.id,
            'distance': game.distance,
        });

    }); //end game start

    socket.on('Movement', function(msg){
        //movement happened, determine if a random battles occurs or not.
        //find game in games
        for(let i = 0; i < games.length; i++)
        {
            if(games[i].id == msg.id){
                //subtarct off time till random battle
                games[i].distance -= msg.distance;
                
                //if we're past threshold, battle happens
                if(games[i].distance <= 0){
                    for(let j = 0; j < Math.random() * (3 - 1) + 1; j++){
                        games[i].enemies[j] = {
                            'hp': 2,
                        };
                    }
                    //change game state to battle
                    games[i].state = GAME_STATE.BATTLE;

                    //reset distance randomizer to 1-3 times player movement speed.
                    games[i].distance = Math.random() * (256 * 3) + 256;

                    //send back the game data as it stands
                    games[i].socket.emit('BattleStart', games[i].enemies.length);
                }
            }
        }
    }); //end movement

    socket.on('Attack', function(msg){
        for(i in games){
            if(games[i].id == msg.id && games[i].enemies.length > 0){ //find our current game

                --games[i].enemies[0].hp; //lower the hp by 1

                if(games[i].enemies[0].hp <= 0){ //enemy has died, remove from game
                    games[i].enemies.splice(0,1); //remove first enemy
                    games[i].socket.emit('EnemyDeath', '0');
                    games[i].hero.xp += 1;
                }
                if(games[i].enemies.length <= 0){ //no enemies left end battle
                    games[i].socket.emit('BattleEnd', {
                        'state': GAME_STATE.FIELD,
                        'xp': games[i].hero.xp,
                    });
                }
            }
        }
    }); //end Attack

});

let loadbyName = function(val, fun){
    collection.findOne({name:val}, function(err, res){
        assert.equal(null, err);
        fun(err, res);
    });
};