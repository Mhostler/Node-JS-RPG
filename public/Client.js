let canvas = document.createElement("canvas");
let ctx = canvas.getContext("2d");
let socket = io();
let gameReady = false;

canvas.width = 512;
canvas.height = 480;
document.body.appendChild(canvas);

let fieldbgImage = new Image();
fieldbgImage.src = "images/background.png";

let battlebgImage = new Image();
battlebgImage.src = "images/basicbattlefield.png"

let heroReady = false;
let heroImage = new Image();
heroImage.onload = function(){
    heroReady = true;
};
heroImage.src = "images/hero.png";

let enemyImage = new Image();
enemyImage.src = "images/monster.png";

//the state of the game
const GAME_STATE = {
    'FIELD': 0,
    'BATTLE': 1,
}

let game = {
    'state': GAME_STATE.FIELD,
    'enemies': [],
    'id': 0,
};

//stats and values for the hero character
let hero = {
    'hp': 0,
    'speed': 256,
    'xp': 0,
    'x': 0,
    'y': 0,
};

//keys being held down
let keysDown = [];

addEventListener("keydown",function(e){
    keysDown[e.keyCode] = true;
}, false);

addEventListener("keyup", function(e){
    delete keysDown[e.keyCode];
}, false);

//collect information for the start of the game.
socket.on('GameStart', function(msg){
    hero.hp = msg.hp;
    game.id = msg.id;
    console.log("connected, hero hp = " + hero.hp.toString());
});

socket.on('BattleStart', function(msg){
    for(let i = 0; i < msg; i++)
        game.enemies[i] = true;

    game.state = GAME_STATE.BATTLE;
});

socket.on('EnemyDeath', function(msg){
    for(let i = 0; i < game.enemies.length; i++){
        if(game.enemies[i]){ //find the first alive enemy, kill, move on
            game.enemies[i] = false;
            break;
        }
    }
});

socket.on('BattleEnd', function(msg){
    game.state = GAME_STATE.FIELD; //change back to field state
    hero.xp = msg.xp;
});

let update = function(modifier){
    //if we're in state 0, field state, allow walking around.
    if(game.state === GAME_STATE.FIELD)
    {
        if(38 in keysDown || 87 in keysDown){ //player holding up
            hero.y -= hero.speed * modifier;
            socket.emit('Movement', { 'id': game.id, 'distance': hero.speed * modifier });
        }
        if(40 in keysDown || 83 in keysDown){ //player holding down
            hero.y += hero.speed * modifier;
            socket.emit('Movement', { 'id': game.id, 'distance': hero.speed * modifier });    
        }
        if(37 in keysDown || 65 in keysDown){ //player holding left
            hero.x -= hero.speed * modifier;
            socket.emit('Movement', { 'id': game.id, 'distance': hero.speed * modifier });         
        }
        if(39 in keysDown || 68 in keysDown){ //player holding right
            hero.x += hero.speed * modifier;
            socket.emit('Movement', { 'id': game.id, 'distance': hero.speed * modifier });            
        }
    }
    else if(game.state === GAME_STATE.BATTLE)
    { //we're in battle state, allow attacking
        if(32 in keysDown) //player attacks enemy
        {
            //one attack per keypress
            delete keysDown[32];

            //tell the server that an attack happened
            socket.emit('Attack', {
                'id': game.id,
            });
        }
    }
};

let render = function(){
    let bgImage;
    //we're in battle
    if(game.state == GAME_STATE.BATTLE){ //change our mode to battle and draw battle background
        bgImage = battlebgImage;
    }
    else{ //not in battle use field image
        bgImage = fieldbgImage;
    }

    ctx.drawImage(bgImage,0,0); //draw the background

    if(heroReady){
        if(game.state == GAME_STATE.FIELD) { 
            ctx.drawImage(heroImage,hero.x,hero.y);

            //draw xp value onto screen during field state
            ctx.fillStyle = 'rgb(250, 250, 250)';
            ctx.font = '24px Helvetica';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText('Total Xp: ' + hero.xp, 32, 32 );
        }
        else{
            ctx.drawImage( heroImage, 0, 240);
            for(let i = 0; i < game.enemies.length; i++){
                if(game.enemies[i]) //if enemy exists draw its image
                ctx.drawImage( enemyImage, 256, 240 + (i * enemyImage.width));
            }
        }
    }
};

let main = function() {
    let now = Date.now();
    let delta = now - then;

    //if game isn't started, yet, make a connection and start game
    if(!gameReady)
    {
        gameReady = true;
        socket.emit("RequestGame", "hi");
    }

    update(delta/1000);
    render();

    then = now;

    requestAnimationFrame(main);
};

let then = Date.now();
//reset();
main();