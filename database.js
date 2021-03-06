// function get_time(){
//   let today = new Date();
//   let hours = today.getHours();
//   let minutes = today.getMinutes();
//   return (hours + ":" + minutes);
// }



const http = require('http');
const fs = require('fs');
const url = require("url");
const MongoClient = require('mongodb').MongoClient;
const mongo_url = "mongodb+srv://gabman15:KVUSknDeCOb9@cluster0-amdd2.mongodb.net/test?retryWrites=true&w=majority";
const port = process.env.PORT || 8080;

var friend_succesful = false;

var httpServer = http.createServer(function (req, res) {
    console.log("Request url: " + req.url);
    url_parts = url.parse(req.url, true);
    switch (req.method) {
        case "GET":
        if (url_parts.pathname == "/get_friend_data") {
	    let today = new Date();
	    let current_hours = today.getHours();
	    let current_minutes = today.getMinutes();
	    console.log(current_hours+":"+current_minutes);
            usr_email = url_parts.query.usr_email;
            usr_name = url_parts.query.usr_name;
            console.log(usr_email);

	    checkTimes(current_hours, current_minutes, function() {
		addPerson(usr_email, usr_name, function () {
                    getFriendInfo(usr_email, function(friendInfo) {
			response_string = JSON.stringify(friendInfo);
			res.writeHead(200, {'Content-Type': 'text/html', 'Access-Control-Allow-Origin': "https://gsidam01.github.io"});
			res.write("A get method was requested\n");
			res.write(response_string);
			res.end();
                    });
		});
	    });
        }
        break;
        case "POST":
                if (url_parts.pathname == "/add_a_friend") {
                    usr_email = url_parts.query.usr_email;
                    friend_email = url_parts.query.friend_email;
                    console.log("User email: " + usr_email);
                    console.log("Friend email: " + friend_email);
                    friend_succesful = false;
                    addFriend(usr_email, friend_email, function() {
                        res.writeHead(200, {'Content-Type': 'text/html', 'Access-Control-Allow-Origin': "https://gsidam01.github.io"});
                        if (friend_succesful) {
                            res.write("#success");
                        } else {
                            res.write("#failure");
                        }
                        res.end();
                    });
                } else if (url_parts.pathname == "/log_location") {
                    usr_email = url_parts.query.usr_email;
                    location = url_parts.query.location;
                    time_start = url_parts.query.time_start;
                    time_end = url_parts.query.time_end;
                    console.log("User email: " + usr_email);
                    console.log("User location: " + location);
                    console.log("Start time: " + time_start);
                    console.log("End time: " + time_end);
                    updatePerson(usr_email, location, time_start, time_end, function() {
                        res.writeHead(200, {'Content-Type': 'text/html', 'Access-Control-Allow-Origin': "https://gsidam01.github.io"});
                        res.write("Succesfully updated time");
                        console.log("Succesfully updated time");
                        res.end();
                    });
                }
            break;
        default:
            break;
    }
});

httpServer.listen(port); 

function addPerson(email, name, callback) {
    MongoClient.connect(mongo_url, { useUnifiedTopology: true }, function(err, db) {
    if(err) {
        return console.log(err);
    }
    console.log("made it");
    var dbo = db.db("MonacoMap");
    var ppl = dbo.collection("People");
    ppl.find({"email":email},{}).toArray(function(err,res) {
        if(res.length > 0) {
        console.log("Person already in database");
        db.close();
        callback();
        return;
        } else {
        var newPerson = {"email": email, "name": name,
                 "location": null, "time_start": null,
                 "time_end": null, "friends": []};
        ppl.insertOne(newPerson, function(err, res) {
            if (err) {
            console.log ("Error: " + err);
            return;
            }
            console.log(name+ " was inserted into the database!");
            db.close();
            callback();
        });
        }
    }); 
    });
}

function addFriend(email, friendEmail, callback) {
    MongoClient.connect(mongo_url, { useUnifiedTopology: true }, function(err, db) {
    if(err) {
        return console.log(err);
    }

    var dbo = db.db("MonacoMap");
    var ppl = dbo.collection("People");
    ppl.findOne(
        {"email": friendEmail},
        function(err,result) {
        if(!result) {
            console.log("No one with that emaisl");
            friend_succesful = false;
            db.close();
            callback();
            return;
        }
        var friend = result;
        console.log(friend.email);
        ppl.updateOne(
            {
            "email":email
            },
            {
            $push: {
                "friends": friend.email
            }
            }
        ).then (function() {
            db.close();
            friend_succesful = true;
            callback();
        });
        console.log("Succesfully added friend to " + email);
        }
    );
    });
}


function removeAllPeople(callback) {
    MongoClient.connect(mongo_url, { useUnifiedTopology: true }, function(err, db) {
    if(err) {
        return console.log(err);
    }

    var dbo = db.db("MonacoMap");
    var ppl = dbo.collection("People");
    ppl.deleteMany({}, function(err, res) {
        if (err) {
        console.log ("Error: " + err);
        return;
        }
        console.log("All people were removed from the database!");
        db.close();
        callback();
    });
    });
}

function updatePerson(email, location, timeStart, timeEnd, callback) {
    MongoClient.connect(mongo_url, { useUnifiedTopology: true }, function(err, db) {
    if(err) {
        return console.log(err);
    }

    var dbo = db.db("MonacoMap");
    var ppl = dbo.collection("People");

    var query = {"email":email};
    var vals = {$set: {"location":location, "time_start":timeStart, "time_end":timeEnd}};
    ppl.updateOne(query, vals, function(err, res) {
        if (err) {
        console.log ("Error: " + err);
        return;
        }
        console.log("Successfully updated "+email+" to be at "+location);
        db.close();
        callback();
    });
    });
}

function checkTimes(currHrs,currMin, callback) {
    MongoClient.connect(mongo_url, { useUnifiedTopology: true }, function(err, db) {
    	if(err) {
    	    return console.log(err);
    	}
	console.log("Checking times");
	console.log(currHrs+":"+currMin);
    	var dbo = db.db("MonacoMap");
    	var ppl = dbo.collection("People");

	
    	var query = { "time_end": {$ne : null}};
    	ppl.find(query,{projection: {"_id":0,"email":1,"time_end":1}}).toArray(function(err, res) {
    	    if (err) {
    		console.log ("Error: " + err);
    		return;
    	    }
	    console.log(res);
	    var to_clear = [];
	    for (i=0; i < res.length; i++) {
		var time = res[i].time_end;
		//console.log(time);
		var hrs = time.substring(0,time.indexOf(":"));
		var min = time.substring(time.indexOf(":")+1);
		//console.log(hrs+":"+min);
		var add = false;
		if (currHrs > hrs)
		    add = true;
		if (currHrs == hrs && currMin > min)
		    add = true;
		if (add)
		    to_clear.push(res[i].email);
	    }
	    console.log ("TO CLEAR: "+to_clear);
	    var vals = {$set: {"location":null, "time_start":null, "time_end":null}};
	    ppl.updateMany({"email": { $in : to_clear } }, vals, function(err,res) {
		if (err) {
    		    console.log ("Error: " + err);
    		    return;
    		}
		db.close();
    		callback();
	    });
    	    //console.log("Successfully updated "+email+" to be at "+location);

    	});
    });
}

function getFriendInfo(email, callback) {
    MongoClient.connect(mongo_url, { useUnifiedTopology: true }, function(err, db) {
	if(err) {
            return console.log(err);
	}

	var dbo = db.db("MonacoMap");
	var ppl = dbo.collection("People");

	var query = {"email":email};

	ppl.findOne(query, function(err, res) {
            if (err) {
		console.log ("Error: " + err);
		return;
            }
            var friends = res.friends;
            var query = {$and: [ {"email": {$in : friends}}, {"location": {$ne: null}} ] }
            ppl.find(query, {projection:{"_id":0,"name":1,"location":1,"time_end":1}}).toArray(function(err,res) {
		if (err) {
		    console.log ("Error: " + err);
		    return;
		}
		var friendInfo = JSON.parse('{"friends" : []}');
		friendInfo.friends = res;
		db.close();
		callback(friendInfo);
	    });
	});
    });
}


checkTimes(22,41,function(){});
