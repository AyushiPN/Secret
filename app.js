require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
const findOrCreate = require("mongoose-findorcreate");


//We will use passport and not bcrypt
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
//md5 is used for hasing
//const md5 = require("md5");//this is a hashing module and weill be used to encrypt the data more securely
//mongoose encryption is weak and thus we use hashing
//const encrypt = require("mongoose-encryption");

//bcrypt will create salt round making it psassword more secure


const app = express();


app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
	extended : true
}));

app.use(session({
	secret : "Our little secret.",
	resave:false,
	saveUninitialized : false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set('useCreateIndex', true);
//create a special schema for data encryption
const userSchema = new mongoose.Schema({
	email: String,
	password: String,
	googleId: String, 
	secret: String
});

//we will create a new string for encryption 
//This plugin is used with mongoose encryption
//userSchema.plugin(encrypt, {secret : process.env.SECRET, encryptedFields : ["password"]});
//encryptedFields is used for encrypting specific felds

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL : "https://www.googleapis.com/oauth2/v3/userinfo",
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, profile, done) {
    console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));


app.get("/", function(req, res){
	res.render("home");
});

app.get("/auth/google",
	passport.authenticate("google", {scope:["profile"]})

);

app.get( "/auth/google/secrets",
    passport.authenticate( 'google', { failureRedirect:"/login"}),

    function(req, res){
    	res.redirect("/secrets");
    }
);

app.get("/login", function(req, res){
	res.render("login");
});

app.get("/register", function(req, res){
	res.render("register");
});

app.get("/secrets", function(req, res){
	//this will put the text on the website from the database
	User.find({"secret":{$ne:null}}, function(err, foundUsers){
		if(err)
		{
			console.log(err);
		}else{
			if(foundUsers){
				res.render("secrets", {usersWithSecrets : foundUsers});
			}
		}
	});
});

app.get("/submit", function(req, res){
	if(req.isAuthenticated()){
		res.render("submit");
	}else{
		res.redirect("/login");

	}
});

app.post("/submit", function(req, res){
	const secretSubmitted = req.body.secret;

	User.findById(req.user.id, function(err, foundUser){
		if(err){
			console.log(err);
		}else{
			if(foundUser){
				foundUser.secret = secretSubmitted;
				foundUser.save(function(){
					res.redirect("/secrets");
				});
			}
		}
	});
});

app.get("/logout", function(req, res){
	req.logout();
	res.redirect("/");
})

app.post("/register", function(req, res){
	
	User.register({username: req.body.username}, req.body.password, function(err,user){
		if(err){
			console.log(err);
			res.redirect("/register");
		}else{
			passport.authenticate("local")(req, res, function(){
				res.redirect("/secrets");
			});
		}
	});


//the code below is used in the case when we are using bcrypt
	//the data posted from the register route is stored in the database using the below method
// 	bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//     const newUser = new User({
// 		email : req.body.username,
// 		password : hash
// 	});

// 	newUser.save(function(err){
// 		if(!err){
// 			res.render("secrets");
// 		}else{
// 			console.log(err);
// 		}
// 	});
// });

	
});

app.post("/login", function(req, res){

	const user = new User({
		username: req.body.username,
		password: req.body.password
	});

	req.login(user, function(err){
		if(err){
			console.log(err);
		}else{
			passport.authenticate("local")(req, res, function(){
				res.redirect("/secrets");
			});
		}
	})

//the code below is used in the case when we are using bcrypt
//the data entered by the user is checked for pre existence inside the database using the following piece of code

	// const username = req.body.username;
	// const password = req.body.password;

	// User.findOne({email : username}, function(err, foundUser){
	// 	if(err){
	// 		console.log(err);
	// 	}else{
	// 		if(foundUser){

	// 			bcrypt.compare(password, foundUser.password, function(err, result) {
 //   				 if(result === true){
 //   				 	res.render("secrets");
 //   				 }
	// 		});
				
	// 		}
	// 	}
	// });
});

app.listen(3000, function(){
	console.log("server strated at port 3000");
});