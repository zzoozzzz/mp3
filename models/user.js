// models/user.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "User name is required"]
  },
  email: {
    type: String,
    required: [true, "User email is required"],
    unique: true, // 
    match: [/.+\@.+\..+/, "Please fill a valid email address"]
  },
  pendingTasks: {
    type: [String], // 
    default: []
  },
  dateCreated: {
    type: Date,
    default: Date.now
  }
});

// 
module.exports = mongoose.model('User', UserSchema);
