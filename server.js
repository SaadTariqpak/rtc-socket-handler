require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const User = require("./models/User");
const Meeting = require("./models/Meeting");

const mongoString = process.env.DATABASE_URL;
mongoose.connect(mongoString);
const database = mongoose.connection;

database.on("error", (error) => {
  console.log(error);
});

database.once("connected", () => {
  console.log("Database Connected");
});

var app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var server = app.listen(3000, () => {
  console.log("Server is running on port number 3000");
});

const io = require("socket.io")(server);

io.on("connection", function (socket) {
  //The moment one of your client connected to socket.io server it will obtain socket id
  //Let's print this out.
  console.log(`Connection : SocketId = ${socket.id}`);

  socket.on("subscribe", function (data) {
    console.log("subscribe trigged");

    const room_data = JSON.parse(data);
    const roomName = room_data.roomName;
    const deviceId = room_data.deviceId;
    const deviceName = room_data.deviceName;



    // Condition to check if room/call exist if parent return to monitor its baby
    if (room_data.isParentJoiningExistingCall == "true") {

      if (doesRoomExist(roomName)) {

        socket.join(`${roomName}`);
        console.log(`One User joined the Room Name : ${roomName}`);

      } else {

        socket.emit("onRoomNotExist", "Room does not exist!");
        console.log(`Room does not exist`);

      }

    } else {

      if (!doesRoomExist(roomName)) {
        const userData = new User({
          device_id: deviceId,
          deviceName: deviceName
        })

        try {


          //Storing user data

          // userData.save().then(user => {
          updateUser(userData, function (userId) {
            //   console.log(user._id);

            //   //creating meeting object
            var meetingData = new Meeting({
              meeting_id: roomName,
              user_id: userId
            })

            //Storing meeting object
            addUpdateMeeting(meetingData)

          });

          //res.status(200).json(dataToSave)

        }
        catch (error) {
          res.status(400).json({ message: error.message })
        }

      }

      socket.join(`${roomName}`);

      console.log(`One User joined the Room Name : ${roomName}`);

      socket.broadcast
        .to(`${roomName}`)
        .emit("onOtherUserJoinedCall", JSON.stringify(room_data));

    }

  });

  socket.on("unsubscribe", function (data) {
    console.log("unsubscribe trigged");
    const room_data = JSON.parse(data);
    const userName = room_data.userName;
    const roomName = room_data.roomName;

    console.log(` leaved Room Name : ${roomName}`);
    // socket.broadcast.to(`${roomName}`).emit('onEndCall',JSON.stringify(room_data))
    socket.leave(`${roomName}`);
  });

  socket.on("onCall", function (data) {
    const candidateConstant = JSON.parse(data);
    const roomName = candidateConstant.roomName;
    const type = candidateConstant.type;

    console.log(
      `onCall triggered : Room Number ${roomName} : Call Type => ${type}`
    );
    socket.broadcast
      .to(`${roomName}`)
      .emit("onCallReceived", JSON.stringify(candidateConstant)); // Need to be parsed into Kotlin object in Kotlin
  });

  socket.on("onCandidate", function (data) {
    const candidateConstant = JSON.parse(data);
    const roomName = candidateConstant.roomName;
    const type = candidateConstant.type;

    console.log(
      `onCandidate triggered : Room Number ${roomName} : Candidate Type => ${type}`
    );
    socket.broadcast
      .to(`${roomName}`)
      .emit("onCandidateReceived", JSON.stringify(candidateConstant)); // Need to be parsed into Kotlin object in Kotlin
  });

  socket.on("endCall", function (data) {
    const mData = JSON.parse(data);
    const roomName = mData.roomName;

    console.log(`endCall triggered : Room Number ${roomName} `);
    socket.broadcast.to(`${roomName}`).emit("onEndCall", JSON.stringify(mData)); // Need to be parsed into Kotlin object in Kotlin
  });

  //If you want to add typing function you can make it like this.

  // socket.on('typing',function(roomNumber){ //Only roomNumber is needed here
  //     console.log('typing triggered')
  //     socket.broadcast.to(`${roomNumber}`).emit('typing')
  // })

  // socket.on('stopTyping',function(roomNumber){ //Only roomNumber is needed here
  //     console.log('stopTyping triggered')
  //     socket.broadcast.to(`${roomNumber}`).emit('stopTyping')
  // })

  socket.on("disconnect", function () {
    console.log("One of sockets disconnected from our server.");
  });
});

function doesRoomExist(roomName) {
  if (io.sockets.adapter.rooms.get(`${roomName}`)) return true;
  else return false;
}

function updateUser(user, cb) {
  
  User.find({ device_id: user.device_id }, function (err, docs) {
    if (docs.length) {
      cb(docs._id);
    } else {
      user.save().then(user => {
        cb(user._id);
      });

    }
  });
}

function addUpdateMeeting(meeting) {


  Meeting.replaceOne({ user_id: meeting.user_id }, meeting, { upsert: true });
}