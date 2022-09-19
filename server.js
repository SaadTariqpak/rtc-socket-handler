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

    const tempRoomExist = doesRoomExist(roomName);

    // Condition to check if room/call exist if parent return to monitor its baby
    if (room_data.isParentJoiningExistingCall == "true") {

      if (tempRoomExist) {

        socket.join(`${roomName}`);
        console.log(`1One User joined the Room Name : ${roomName}`);

      } else {

        socket.emit("onRoomNotExist", "Room does not exist!");
        console.log(`Room does not exist`);

      }

    } else {
      socket.join(`${roomName}`);
      console.log(`2One User joined the Room Name : ${roomName}`);

      if (!tempRoomExist) {

        const userData = new User({
          device_id: deviceId,
          device_name: deviceName
        })

        //Storing user data

        console.log(`user going to store `);
        console.log(userData);

        // userData.save().then(user => {
        updateUser(userData, function (userId) {
          console.log(userId);

          //   //creating meeting object
          var meetingData = new Meeting({
            meeting_id: roomName,
            user_id: userId
          })

          //Storing meeting object
          addUpdateMeeting(meetingData)

        });

        //res.status(200).json(dataToSave)

        //Now meeting created Sending reponse back to child to show qr code 
        socket.emit('onMeetingJoined', JSON.stringify(room_data)); //sending to sender-client only

      } else {


        //executes, passing results to callback
        Meeting.find({ meeting_id: roomName }, function (err, docs) {

          if (err) throw err;
          else {
            console.log(`Meetings ${docs[0]}`);

            User.findById(docs[0].user_id, function (err, user) {
              if (err) throw err;
              else {
                console.log(`User ${user}`);

                room_data.deviceName = user.device_name

                //Parents callback
                //Emit to request sender only if room exist
                socket.emit('onChildUserData', JSON.stringify(room_data));

              }
            });
          }
        });

        // Meeting.find({}, function (err, docs) {
        //   console.log(`Meetings ${docs}`);
        // });
        // socket.emit('onChildUserData', JSON.stringify(room_data));

        socket.broadcast
          .to(`${roomName}`)
          .emit("onOtherUserJoinedCall", JSON.stringify(room_data));

      }

      // socket.broadcast
      //   .to(`${roomName}`)
      //   .emit("onOtherUserJoinedCall", JSON.stringify(room_data));

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


  socket.on("changeControls", function (data) {
    const mData = JSON.parse(data);
    const roomName = mData.roomName;

    console.log(`changeControls triggered : Room Number ${roomName} `);
    socket.to(`${roomName}`).emit("onChangeControls", JSON.stringify(mData)); // Need to be parsed into Kotlin object in Kotlin

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

function updateUser(mUser, cb) {

  User.findOne({ device_id: mUser.device_id }, function (err, user) {
    if (err) throw err;
    else {

      // console.log(mUser);
      // console.log(user);

      if (user) {
        cb(user._id);
      } else {
        mUser.save(function (err, doc) {
          if (err) return console.error(err);

          console.log(doc);
          cb(doc._id);

        });



        // ).then(user => {

        //   console.log(user);

        //   cb(user._id);
        // });

      }
    }
  });
}

function addUpdateMeeting(meeting) {


  Meeting.replaceOne({ user_id: meeting.user_id }, { meeting_id: meeting.meeting_id, user_id: meeting.user_id }, { upsert: true }, function (error, res) {
    if (error) throw error;

  });
}