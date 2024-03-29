//init variables
var dgram = require("dgram");
var server = dgram.createSocket("udp4");
var data;
var rooms = [];
var room_list = [];
const msgType = {
    GET_ROOM_LIST: 0,
    CREATE_ROOM: 1,
    GET_ROOM: 2,
    SET_ROOM: 3,
    DELETE_ROOM: 4,

    GET_PLAYERS: 5,
    JOIN_ROOM: 6,
    GET_PLAYER: 7,
    SET_PLAYER: 8,
    LEAVE_ROOM: 9,

    SEND_ALL: 10
};
//setup objects
class Room {
    constructor(room_code, max_players, room_public) {
        this.room_code = room_code;
        this.max_players = max_players;
        this.room_public = room_public;
        this.players = [];
        this.items = [];
    }
}
class Player {
    constructor(port, address, player_name, color_head, color_body, acc_head, acc_body) {
        this.address = address;
        this.port = port;
        this.player_name = player_name;
        this.color_head = color_head;
        this.color_body = color_body;
        this.acc_head = acc_head;
        this.acc_body = acc_body;
        this.input_move_x = 0;
        this.input_move_y = 0;
        this.aim_x = 0;
        this.aim_y = 0;
        this.x = 0;
        this.y = 0;
        this.player_state = 0;
        this.hp = 300;
        this.input_spawn = 0;
        this.input_interact = 0;
        this.input_attack = 0;
        this.input_drop = 0;

        let item_fists={};
		item_fists.type = 0;
		item_fists.item_state = 3;
		item_fists.damage = 50;
		this.items = [item_fists];

        this.item_selected = 0;
    }
}
//utility functions
function send_room_players(room_index, return_message, return_data) {
    let players = rooms[room_index].players;
    for (let player_i = 0; player_i < players.length; player_i++) {
        let player = players[player_i];
        data.return_data = return_data
        data.return_msg = return_message;
        server.send(JSON.stringify(data), player.port, player.address);
    }
}
function send_all_players(return_message, return_data) {
    for (let room_i = 0; room_i<rooms.length; room_i++) {
        send_room_players(room_i, return_message, return_data);
    }
}
function get_room_index(room_code) {
    for (let room_i=0; room_i<rooms.length; room_i++) {
        if (room_code == rooms[room_i].room_code) {
            return room_i;
        }
    }
    return -1;
}
function room_code_at_index(room_code, room_index) {
    if (rooms[room_index] == undefined) {
        return false;
    }
    if (rooms[room_index].room_code == room_code) {
        return true;
    }
    return false;
}
function player_at_index(room_index, player_index, rinfo) {
    let player = rooms[room_index].players[player_index];
    if (player == undefined) {
        return false;
    }
    if (player.port == rinfo.port && player.address == rinfo.address) {
        return true;
    }
    return false;
}
function set_object_properties(object,properties) {
    for (let property in properties) {
        object[property] = properties[property];
    }
}
//room functions
function get_room_list(data, rinfo) {
    data.room_list = room_list;
    data.return_msg = "returned room list";
    server.send(JSON.stringify(data), rinfo.port, rinfo.address);
}
function create_room(data, rinfo) {
    let room_code = data.room_code;
    let room_exists = get_room_index(room_code);
    if (room_exists>-1) {
        data.return_msg = "room code exists";
        server.send(JSON.stringify(data), rinfo.port, rinfo.address);
        return;
    }
    data.room_index = rooms.length;
    let _room = new Room(data.room_code, data.max_players, data.room_public);
    let _room_data = {};
    _room_data.room_code = _room.room_code;
    _room_data.room_public = _room.room_public;
    _room_data.max_players = _room.max_players;
    _room_data.players = [];
    rooms.push(_room);
    room_list.push(_room_data);
    data.player_index = 0;
    data.player_port = rinfo.port;
    data.player_address = rinfo.address;
    data.return_msg = "created room";
    server.send(JSON.stringify(data), rinfo.port, rinfo.address);
    
    console.table(rooms);
    join_room(data, rinfo);
}
function get_room(data, rinfo) {
    let room_index = data.room_index;
    let room_code = data.room_code;
    if (room_code_at_index(room_code, room_index)) {
        data.room_data = rooms[room_index];
        data.return_msg = "returned room";
        server.send(JSON.stringify(data), rinfo.port, rinfo.address);
        return;
    }
    data.return_msg = "room code not found at index";
    server.send(JSON.stringify(data), rinfo.port, rinfo.address);
}
function set_room(data, rinfo) {
    let room_index = data.room_index;
    let room_code = data.room_code;
    let room_data = data.room_data;
    if (room_code_at_index(room_code, room_index)) {
        set_object_properties(rooms[room_index],room_data);
        set_object_properties(room_list[room_index],room_data);
        data.return_msg = "room set";
        server.send(JSON.stringify(data), rinfo.port, rinfo.address);
        return;
    }
    data.return_msg = "room code not found at index";
    server.send(JSON.stringify(data), rinfo.port, rinfo.address);
}
function delete_room(data, rinfo) {
    let room_index = data.room_index;
    let room_code = data.room_code;
    if (room_code_at_index(room_code, room_index)) {
        rooms.splice(room_index, 1);
        room_list.splice(room_index, 1);
        data.return_msg = "deleted room";
        server.send(JSON.stringify(data), rinfo.port, rinfo.address);
        console.table(rooms);
        send_all_players("update indexes");
        return;
    }
    data.return_msg = "room code not found at index";
    server.send(JSON.stringify(data), rinfo.port, rinfo.address);
}
//player functions
function get_players(data, rinfo) {
    let room_index = data.room_index;
    let room_code = data.room_code;
    if (room_code_at_index(room_code, room_index)) {
        data.players = rooms[room_index].players;
        data.return_msg = "returned players";
        server.send(JSON.stringify(data), rinfo.port, rinfo.address);
        return;
    }
    data.return_msg = "room code not found at index";
    server.send(JSON.stringify(data), rinfo.port, rinfo.address);
}
function join_room(data, rinfo) {
    let room_index = data.room_index;
    let room_code = data.room_code;
    if (room_code_at_index(room_code, room_index)) {
        let max_players =   rooms[room_index].max_players;
        let room_public =   rooms[room_index].room_public;
        let players =       rooms[room_index].players;
        if ((data.room_public == 0 && room_public == 0) || (room_public == 1)) {
            if (players.length<max_players) {
                data.player_index = players.length;
                data.player_port = rinfo.port;
                data.player_address = rinfo.address;
                players.push(new Player(rinfo.port, rinfo.address, data.player_name, data.color_head, data.color_body, data.acc_head, data.acc_body));

                let _player_info = {};
                _player_info.port = rinfo.port;
                _player_info.address = rinfo.address;
                room_list[room_index].players.push(_player_info);

                data.type = msgType.JOIN_ROOM;
                data.return_msg = "joined room";
                server.send(JSON.stringify(data), rinfo.port, rinfo.address);
                console.table(rooms);
                let return_data = {
                    player_name : data.player_name,
                    color_head : data.color_head,
                    color_body : data.color_body
                }
                send_room_players(room_index, "player joined", return_data)
                return;
            }
            data.return_msg = "room full";
            server.send(JSON.stringify(data), rinfo.port, rinfo.address);
            return;
        }
        data.return_msg = "room unavailable";
        server.send(JSON.stringify(data), rinfo.port, rinfo.address);
        return;
    }
    data.return_msg = "room code not found at index";
    server.send(JSON.stringify(data), rinfo.port, rinfo.address);
}
function get_player(data, rinfo) {
    let room_index = data.room_index;
    let room_code = data.room_code;
    let player_index = data.player_index;
    if (room_code_at_index(room_code, room_index)) {
        let player = rooms[room_index].players[player_index];
        if (player != undefined) {
            data.player_data = player;
            data.return_msg = "returned player";
            server.send(JSON.stringify(data), rinfo.port, rinfo.address);
            return;
        }
        data.return_msg = "player not found at index";
        server.send(JSON.stringify(data), rinfo.port, rinfo.address);
        return;
    }
    data.return_msg = "room code not found at index";
    server.send(JSON.stringify(data), rinfo.port, rinfo.address);
}
function set_player(data, rinfo) {
    let room_index = data.room_index;
    let room_code = data.room_code;
    let player_index = data.player_index;
    let player_data = data.player_data;
    if (room_code_at_index(room_code, room_index)) {
        if (player_at_index(room_index, player_index, rinfo)) {
            set_object_properties(rooms[room_index].players[player_index], player_data);
            data.return_msg = "player set";
            server.send(JSON.stringify(data), rinfo.port, rinfo.address);
            return;
        }
        data.return_msg = "player not found at index";
        server.send(JSON.stringify(data), rinfo.port, rinfo.address);
        return;
    }
    data.return_msg = "room code not found at index";
    server.send(JSON.stringify(data), rinfo.port, rinfo.address);
}
function leave_room(data, rinfo) {
    let room_index = data.room_index;
    let room_code = data.room_code;
    let player_index = data.player_index;
    if (room_code_at_index(room_code, room_index)) {
        if (player_at_index(room_index, player_index, rinfo)) {
            let player = rooms[room_index].players[player_index];
            let return_data = {
                player_name : player.player_name,
                color_head : player.color_head,
                color_body : player.color_body
            }
            rooms[room_index].players.splice(player_index, 1);
            room_list[room_index].players.splice(player_index, 1);
            data.type = msgType.LEAVE_ROOM;
            data.return_msg = "left room";
            server.send(JSON.stringify(data), rinfo.port, rinfo.address);
            console.table(rooms);
            send_room_players(room_index, "player left", return_data)
            if (rooms[room_index].players.length == 0) {
                delete_room(data, rinfo);
            }
            return;
        }
        data.return_msg = "player not found at index";
        server.send(JSON.stringify(data), rinfo.port, rinfo.address);
        return;
    }
    data.return_msg = "room code not found at index";
    server.send(JSON.stringify(data), rinfo.port, rinfo.address);
}
function send_all(data, rinfo) {
    let room_index = data.room_index;
    let return_message = data.return_message;
    let return_data = data.return_data;
    return_data.sender = rinfo;
    send_room_players(room_index, return_message, return_data);
}
console.log("SERVER START");
//run server
server.on("message", (buff, rinfo) => {
    data = JSON.parse(buff);
    switch (data.type) {
        case msgType.GET_ROOM_LIST:
            get_room_list(data, rinfo);
            break;
        case msgType.CREATE_ROOM:
            create_room(data, rinfo);
            break;
        case msgType.GET_ROOM:
            get_room(data, rinfo);
            break;
        case msgType.SET_ROOM:
            set_room(data, rinfo);
            break;
        case msgType.DELETE_ROOM:
            delete_room(data, rinfo);
            break;
        case msgType.GET_PLAYERS:
            get_players(data, rinfo);
            break;
        case msgType.JOIN_ROOM:
            join_room(data, rinfo);
            break;
        case msgType.GET_PLAYER:
            get_player(data, rinfo);
            break;
        case msgType.SET_PLAYER:
            set_player(data, rinfo);
            break;
        case msgType.LEAVE_ROOM:
            leave_room(data, rinfo);
            break;
        case msgType.SEND_ALL:
            send_all(data, rinfo);
            break;
        default:
            break;
    }
});
server.bind(8080);