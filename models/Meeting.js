const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
    meeting_id: {
        required: true,
        type: String
    },
    user_id: {
        required: true,
        type: mongoose.Schema.Types.ObjectId,
        ref:'Users'
    }
})

module.exports = mongoose.model('Meeting', meetingSchema)