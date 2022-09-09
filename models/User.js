const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    device_id: {
        required: true,
        type: String
    },
    device_name: {
        required: true,
        type: String
    },

})

module.exports = mongoose.model('User', userSchema)