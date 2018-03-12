var mongo = require("mongodb").MongoClient;
var path = require('path');
var express = require('express');
var http = require('http');
var app = express();
var server = http.createServer(app);
var client = require('socket.io').listen(server);

	//Listening Port
	server.listen(8080, ()=> {
		console.log("Listening on port 8080");
	});



	//Using the express app to run a server
	app.use(express.static('public'));
	app.use((req, res, next) => {
		console.log("Identify me");
		next();
	});
	app.get('/', function(req, res){
		res.sendFile(__dirname + '/index1.html')
	});
	//Connecting to the database
	mongo.connect('mongodb://127.0.0.1/chat', function(err, database){
	if(err) throw err;

	//connecting to general socket
	client.on('connection', function(socket){


		//Declaring variables for connecting the database
		const chat = database.db('chat'); //database name
		var coll = chat.collection('messages'), //database collection name
			 sendStatus = function(s){ //function for holding and emmiting the Status of the app
			socket.emit('status', s)
		};


		//Emit all messages to the client
		coll.find().limit(100).sort({_id: 1}).toArray(function(err, res){
			if(err) throw err;
			socket.emit('output', res);
		})

	
		//listen for input
		socket.on('input', function(data){
			var name = data.name,
				message = data.message;
				whitespacePattern = /^s*$/; //RegEx for whitespace
				TypedNothing = /^\s|^\t/; //RegEx for you typed nothing. Besure to clear any space or tabbed space before any character in the reply
				Above140 = /^.{1,140}$/; //RegEx for 140 characters
				EmailCatcher = /([a-z0-9_\.-]+)@([a-z0-9_\.-]+)\.([a-z\.]{2,6})/; //RegEx for Email Address
				NumCatcher = /\+(234)[0-9]{10,}$|[0-9]{11}$/; //RegEx for catching any phone number
				WebsiteCatcher = /(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([/\w\.-]*)*\/?/; //Regex for catching website links

				//Test for whitespace
			if(whitespacePattern.test(name) || whitespacePattern.test(message)){
				sendStatus('Name and message required.');
			} else if(TypedNothing.test(message)){
				sendStatus("You typed nothing");
			}
				else if (!Above140.test(message)){
				sendStatus("You've exceeded the character limit");
			} else if(EmailCatcher.test(message)){
				sendStatus("Your reply contains an email address, kindly remove it");
			} else if (NumCatcher.test(message)){
				sendStatus("No phone Numbers allowed in your reply");
			} else if(WebsiteCatcher.test(message)){
				sendStatus("Your reply contains a link, kindly remove it");
			}
				else {

				//Sending the input objects to the database
				coll.insert({name: name, message: message}, function(){

					//Emit latest messages to all clients
					client.emit('output', [data]);

					//The Status funtion if everything goes fine
					sendStatus({
						message: "Message Sent!",
						clear: true
					});

				});
			}
			
		})

	});
})
