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
const userSchema = mongoose.Schema(
  {
    username: String,
    exercises: [
      {
        description: String,
        duration: Number,
        date: String,
      },
    ],
  },
  { versionKey: false }
);

var User = mongoose.model("User", userSchema);

// add user
app.post("/api/users", async function (req, res) {
  var user = new User(req.body);
  try {
    await user.save();
    var result = await User.findById(user._id).select("username _id");
    res.json(result);
  } catch (err) {
    res.status(500).send(err);
  }
});

// get users
app.get("/api/users", async function (req, res) {
  var users = await User.find({}).select("username _id");

  try {
    res.json(users);
  } catch (err) {
    res.status(500).json(err);
  }
});

// add excercises of user
app.post("/api/users/:_id/exercises", async function (req, res) {
  let id = req.params._id;
  var user = await User.findById(id);
  try {
    if (user) {
      var dateValue = req.body.date ? new Date(req.body.date) : new Date();
      var dateInString = dateValue.toDateString();
      user.exercises.push({
        description: req.body.description,
        duration: req.body.duration,
        date: dateInString,
      });
      var updatedUser = await user.save();
      var result = {
        username: updatedUser.username,
        description: req.body.duration,
        duration: req.body.duration,
        date: dateInString,
        _id: updatedUser._id,
      };
      res.json(result);
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

// get excercise log of users
app.get("/api/users/:_id/logs", async function (req, res) {
  var fromDate = req.query.from;
  var toDate = req.query.to;
  var limit = parseInt(req.query.limit);
  //var user = await User.findOne({_id:req.params._id},{exercises:{$slice: limit}}).populate("-exercises._id");
  var users = await User.aggregate([
    {
      $match: { _id: mongoose.Types.ObjectId(req.params._id) },
    },

    {
      $project: {
        _id: 1,
        username: 1,
        "exercises.description": 1,
        "exercises.duration": 1,
        "exercises.date": 1,
      },
    },
    {
      $project: {
        "exercises":{$slice : ["$exercises",0,limit]}
      },
    },
  ]).exec();
  try {
    let user = users[0];
    var result = {
      username: user.username,
      count: user.exercises.length,
      _id: user._id,
      log: user.exercises,
    };
    res.json(result);
  } catch (err) {
    res.status(500).send(err);
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
