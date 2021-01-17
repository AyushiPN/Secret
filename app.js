require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();

console.log(process.env.API_KEY);

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
	extended : true
}));

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});

//create a special schema for data encryption
const userSchema = new mongoose.Schema({
	email: String,
	password: String
});

//we will create a new string for encryption 

userSchema.plugin(encrypt, {secret : process.env.SECRET, encryptedFields : ["password"]});
//encryptedFields is used for encrypting specific felds

const User = new mongoose.model("User", userSchema);



app.get("/", function(req, res){
	res.render("home");
});

app.get("/login", function(req, res){
	res.render("login");
});

app.get("/register", function(req, res){
	res.render("register");
});


app.post("/register", function(req, res){
	//the data posted from the register route is stored in the database using the below method
	const newUser = new User({
		email : req.body.username,
		password : req.body.password
	});

	newUser.save(function(err){
		if(!err){
			res.render("secrets");
		}else{
			console.log(err);
		}
	});
});

app.post("/login", function(req, res){
//the data entered by the user is checked for pre existence inside the database using the following piece of code

	const username = req.body.username;
	const password = req.body.password;

	User.findOne({email : username}, function(err, foundUser){
		if(err){
			console.log(err);
		}else{
			if(foundUser){
				if(foundUser.password === password)
				{
					res.render("secrets");
				}
			}
		}
	});
});

app.listen(3000, function(){
	console.log("server strated at port 3000");
})