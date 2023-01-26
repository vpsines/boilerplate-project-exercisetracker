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
        date: Date,
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
  try {
    var user = await User.findById(id);
    if (user) {
      var dateValue = req.body.date ? new Date(req.body.date) : new Date();
      user.exercises.push({
        description: req.body.description,
        duration: parseInt(req.body.duration),
        date: dateValue,
      });
      var updatedUser = await user.save();
      var result = {
        _id: updatedUser._id,
        username: updatedUser.username,
        date: dateValue.toDateString(),
        duration: parseInt(req.body.duration),
        description: req.body.description
      };
      res.json(result);
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

// get excercise log of users
app.get("/api/users/:_id/logs", async function (req, res) {

  // get query parameters
  var fromDate = new Date(req.query.from);
  var toDate = new Date(req.query.to);
  var limitValue = parseInt(req.query.limit);

  // filter user by id stage
  var getUserId ={
    $match: { _id: mongoose.Types.ObjectId(req.params._id) },
  };

  // from date and to condition
  var fromCondition = { $gte: [ "$$item.date", fromDate ] };
  var toCondition = { $lte: [ "$$item.date", toDate ] };

  var dateConditions = [];

  // push fromCondition only if from query is present
  if(req.query.from){
    dateConditions.push(fromCondition);
  }

    // push toCondition only if to query is present
  if(req.query.to){
    dateConditions.push(toCondition);
  }

  // filter by date stage
  var fiterByDate = {
    $project: {
      username: 1,
      _id:1,
      exercises: {
          $filter: {
          input: "$exercises",
          as: "item",
          cond: { $and: dateConditions},
          } } }
  };

  // limit stage
  var limitLog =       {
    $project: {
      username: 1,
      _id:1,
      exercises: { $slice: ["$exercises", 0, limitValue] },
    },
  };

  // exclude exercise id of excercise stage
  var removeExerciseId = {
    $project: {
      "exercises._id": 0,
    },
  };

  // stages for aggregating user data
  var stages = 
    [
      getUserId,
      fiterByDate,
      removeExerciseId
    ];
  
    // push limilog only if limit query is present
  if(req.query.limit){
    stages.push(limitLog);
  }

  // user query
  var users = await User.aggregate(stages).exec();

  try {
    let user = users[0];

    // convert date to req format
    var exercises = user.exercises;
    exercises.forEach((element,index,arr) => {
      arr[index].date = new Date(element.date).toDateString();
    });

    // json format
    var result = {
      username: user.username,
      count:exercises.length,
      _id: user._id,
      log: exercises,
    };

    // send result
    res.json(result);
  } catch (err) {
    res.status(500).send(err);
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
