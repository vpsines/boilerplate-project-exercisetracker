const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
require("dotenv").config();

app.use(cors());
app.use(express.static("public"));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// get mongo url
let mongoUri = process.env.MONGO_URI;

// connect to database
mongoose.connect(
  mongoUri,
  { useNewUrlParser: true, useUnifiedTopology: true },
  (err) => {
    if (!err) {
      console.log("Connected...");
    } else {
      console.error(err);
    }
  }
);

// user schema
const userSchema = mongoose.Schema({
  username: String,
},
{versionKey:false});

// exercise schema
const exerciseSchema = mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: Date,
},{versionKey:false});

var User = mongoose.model("User", userSchema);
var Exercise = mongoose.model("Exercise", exerciseSchema);

// add user
app.post("/api/users", async function (req, res) {
  var user = new User(req.body);
  try {
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).send(err);
  }
});

// get users
app.get("/api/users", async function (req, res) {
  var users =await User.find({});

  try {
     res.json(users);
  } catch (err) {
    res.status(500).json(err);
  }
});

// add excercises of user
app.post("/api/users/:_id/exercises", function (req, res) {});

// get excercise log of users
app.get("/api/users/:_id/logs", function (req, res) {});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
