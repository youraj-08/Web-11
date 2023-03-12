require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;

// const md5 = require("md5"); (for Hashing)
// const  encrypt = require("mongoose-encryption");  (used for encryption of sensetive details in DB.)

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.set('strictQuery', false);
mongoose.connect("mongodb://127.0.0.1:27017/userDB");

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});


// This encryption line of code must be written before mongoose model is created. 
// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]});  (used for encryption of sensetive details in DB.)

const User = new mongoose.model("User", userSchema);


app.get("/", function (req, res) {
    res.render("home");
});

app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/register", function (req, res) {
    res.render("register");
});

app.post("/register", function (req, res) {

    bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
        const newUser = new User({
            email: req.body.username,
            password: hash
        });
        newUser.save().then(() => {
            res.render("secrets");
        })
            .catch(err => {
                // res.status(400).send("Unable to save post to database.");
                console.log(err + "Unable to save post to database.");
            });
    })
});

app.post("/login", async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    try {
        const foundUser = await User.findOne({ email: username });
        if (foundUser) {
            bcrypt.compare(password, foundUser.password, function (err, result) {
                if (result === true) {
                    res.render("secrets");
                }
                else {
                    res.send("Incorrect Password");
                }
            });

        } else { res.send("User not found"); }
    }
    catch (err) { console.log(err); }
});



















app.listen(3000, function () {
    console.log("Server started at port 3000");
})