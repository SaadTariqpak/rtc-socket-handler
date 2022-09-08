const express = require('express');
const bodyParser = require('body-parser');



var app = express();

app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json());


var server = app.listen(3000,()=>{
    console.log('Server is running on port number 3000')
})

const io = require('socket.io')(server);

//If next update not work then revert it
//     ,{
//     cors: {
//         origin: "http://157.230.202.1:80",
//         methods: ["GET", "POST"]
//       }
// });
//Chat Server

//var io = socketio.listen(server)

io.on('connection',function(socket) {

    //The moment one of your client connected to socket.io server it will obtain socket id
    //Let's print this out.
    console.log(`Connection : SocketId = ${socket.id}`)
    //Since we are going to use userName through whole socket connection, Let's make it global.   
    var userName = '';
   
    socket.on('subscribe', function(data) {
        
        console.log('subscribe trigged')
        
        const room_data = JSON.parse(data)
        
        userName = room_data.userName;
        const roomName = room_data.roomName;

        if( room_data.isParentJoiningExistingCall == "true") {

             if(io.sockets.adapter.rooms.get(`${roomName}`)){
                socket.join(`${roomName}`)
                console.log(`One User joined the Room Name : ${roomName}`)
        
             }else{
                socket.emit('onRoomNotExist', "Room does not exist!");
                console.log(`Room does not exist`)
        
             }

        }else{
            
            socket.join(`${roomName}`)
            console.log(`One User joined the Room Name : ${roomName}`)
        
        }

        
       
        // Let the other user get notification that user got into the room;
        // It can be use to indicate that person has read the messages. (Like turns "unread" into "read")

        //TODO: need to chose
        //io.to : User who has joined can get a event;
        //socket.broadcast.to : all the users except the user who has joined will get the message
        // socket.broadcast.to(`${roomName}`).emit('newUserToChatRoom',userName);
   
   
       // sending to all clients in room(channel) except sender
       socket.broadcast.to(`${roomName}`).emit('onOtherUserJoinedCall', JSON.stringify(room_data));
   
    })

    socket.on('unsubscribe',function(data) {
        console.log('unsubscribe trigged')
        const room_data = JSON.parse(data)
        const userName = room_data.userName;
        const roomName = room_data.roomName;
    
        console.log(` leaved Room Name : ${roomName}`)
        // socket.broadcast.to(`${roomName}`).emit('onEndCall',JSON.stringify(room_data))
        socket.leave(`${roomName}`)
    })

    socket.on('onCall',function(data) {
       

        // const messageData = JSON.parse(data)
        // const messageContent = messageData.messageContent
        // const roomName = messageData.roomName
        
        const candidateConstant = JSON.parse(data)
        const roomName = candidateConstant.roomName
        const type = candidateConstant.type
        
        console.log(`onCall triggered : Room Number ${roomName} : Call Type => ${type}`)

        
        // Just pass the data that has been passed from the writer socket
        // const chatData = {
        //     userName : userName,
        //     messageContent : messageContent,
        //     roomName : roomName
        // }
        // socket.broadcast.to(`${roomName}`).emit('updateChat',JSON.stringify(chatData)) // Need to be parsed into Kotlin object in Kotlin
       
        socket.broadcast.to(`${roomName}`).emit('onCallReceived',JSON.stringify(candidateConstant)) // Need to be parsed into Kotlin object in Kotlin
        
    })


    socket.on('onCandidate',function(data) {
      

        // const messageData = JSON.parse(data)
        // const messageContent = messageData.messageContent
        // const roomName = messageData.roomName
        
        const candidateConstant = JSON.parse(data)
        const roomName = candidateConstant.roomName
        const type = candidateConstant.type


        console.log(`onCandidate triggered : Room Number ${roomName} : Candidate Type => ${type}`)

        
        // Just pass the data that has been passed from the writer socket
        // const chatData = {
        //     userName : userName,
        //     messageContent : messageContent,
        //     roomName : roomName
        // }
        // socket.broadcast.to(`${roomName}`).emit('updateChat',JSON.stringify(chatData)) // Need to be parsed into Kotlin object in Kotlin
       
        socket.broadcast.to(`${roomName}`).emit('onCandidateReceived',JSON.stringify(candidateConstant)) // Need to be parsed into Kotlin object in Kotlin
        
    })

    socket.on('endCall',function(data) {
      

        // const messageData = JSON.parse(data)
        // const messageContent = messageData.messageContent
        // const roomName = messageData.roomName
        
        const mData = JSON.parse(data)
        const roomName = mData.roomName



        console.log(`endCall triggered : Room Number ${roomName} `)
        
        // Just pass the data that has been passed from the writer socket
        // const chatData = {
        //     userName : userName,
        //     messageContent : messageContent,
        //     roomName : roomName
        // }
        // socket.broadcast.to(`${roomName}`).emit('updateChat',JSON.stringify(chatData)) // Need to be parsed into Kotlin object in Kotlin
       
        socket.broadcast.to(`${roomName}`).emit('onEndCall',JSON.stringify(mData)) // Need to be parsed into Kotlin object in Kotlin
        
    })

    //If you want to add typing function you can make it like this.
    
    // socket.on('typing',function(roomNumber){ //Only roomNumber is needed here
    //     console.log('typing triggered')
    //     socket.broadcast.to(`${roomNumber}`).emit('typing')
    // })

    // socket.on('stopTyping',function(roomNumber){ //Only roomNumber is needed here
    //     console.log('stopTyping triggered')
    //     socket.broadcast.to(`${roomNumber}`).emit('stopTyping')
    // })

    socket.on('disconnect', function () {
        console.log("One of sockets disconnected from our server.")
    });
})