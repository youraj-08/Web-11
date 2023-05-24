require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const FacebookStrategy = require('passport-facebook').Strategy;

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: "Some Random String.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.set("strictQuery", false);
mongoose.connect(process.env.MONGO_URL);



const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String,
    accountId: String,
    name: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }));



passport.use(new FacebookStrategy({
    clientID: process.env.CLIENT_FB,
    clientSecret: process.env.CLIENT_FB_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets",
},
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ accountId: profile.id, username: profile.displayName }, function (err, user) {
            return cb(err, user);
        });
    }));


app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/secrets",
    passport.authenticate("google", { failureRedirect: "/login" }),
    function (req, res) {
        res.redirect("/secrets");
    });


app.get("/auth/facebook",
    passport.authenticate("facebook"));

app.get("/auth/facebook/secrets",
    passport.authenticate("facebook", { failureRedirect: "/login" }),
    function (req, res) {
        res.redirect("/secrets");
    });

app.get("/", function (req, res) {
    res.render("home");
});

app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/register", function (req, res) {
    res.render("register");
});

app.get("/secrets", function (req, res) {
    User.find({ "secret": { $ne: null } }, function (err, foundUsers) {
        if (err) {
            console.log(err);
        } else {
            if (foundUsers) {
                res.render("secrets", { userWithSecrets: foundUsers });
            }
        }
    });
});

app.get("/submit", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

app.post("/submit", function (req, res) {
    const submittedSecret = req.body.secret;

    User.findById(req.user.id, function (err, foundUser) {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(function () {
                    res.redirect("/secrets");
                })
            }
        }
    })
});

app.get("/logout", function (req, res) {
    req.logout(function (err) {
        if (err) {
            console.log(err)
        }
        res.redirect("/");
    });
})

app.post("/register", function (req, res) {

    User.findOne({ username: req.body.username }, function (existingUser, err) {
        if (existingUser === null) {
            User.register({ username: req.body.username }, req.body.password, function (err, user) {
                if (err) {
                    console.log(err);
                    res.redirect("/register");
                } else {
                    passport.authenticate("local")(req, res, function () {
                        res.redirect("/secrets");
                    });
                }
            })
        } if (err) {
            console.log(err);
        }
    });
});


app.post("/login", async (req, res) => {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        }
    })
});


app.listen(3000, function () {
    console.log("Server started at port 3000");
})






// passport.use(
//     new FacebookStrategy(
//       {
//         clientID: process.env.CLIENT_FB,
//     clientSecret: process.env.CLIENT_FB_SECRET,
//     callbackURL: "http://localhost:3000/auth/facebook/secrets"
//       },
//       async function (accessToken, refreshToken, profile, cb) {
//         const user = await User.findOne({
//           accountId: profile.id,
//         });
//         if (!user) {
//           console.log('Adding new facebook user to DB..');
//           const user = new User({
//             accountId: profile.id,
//             name: profile.displayName
//           });
//           await user.save();
//           // console.log(user);
//           return cb(null, profile);
//         } else {
//           console.log('Facebook User already exist in DB..');
//           // console.log(profile);
//           return cb(null, profile);
//         }
//       }
//     )
//   );

//   app.get('/auth/facebook', passport.authenticate('facebook'));

//   app.get(
//     '/auth/facebook/secrets',
//     passport.authenticate('facebook', {
//       failureRedirect: '/login',
//     }),
//     function (req, res) {
//       // Successful authentication, redirect to success screen.
//       res.redirect('/secrets');
//     }
//   );



// passport.use(new FacebookStrategy({
//     clientID: process.env.CLIENT_FB,
//     clientSecret: process.env.CLIENT_FB_SECRET,
//     callbackURL: "http://localhost:3000/auth/facebook/secrets",
//     profileFields: ['id', 'displayName', 'email']
// }, async function (accessToken, refreshToken, profile, cb) {
//     try {
//         // Your search logic or user creation
//         User.findOrCreate({ username: profile.displayName, facebookId: profile.id }, function (err, user) {
//             return cb(err, user);
//         });
//     } catch (error) {
//         console.log(error);
//     }
// }
// ));
