var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var cors = require('cors');
var Mailgun = require('mailgun-js');
var async = require('async');

app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json());
app.use(cors());

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

//Your api key, from Mailgun’s Control Panel
var api_key = 'key-2b66aeb552d0359e216a4b0e0a8cad81';

//Your domain, from the Mailgun Control Panel
var domain = 'mg.mrrmrr.com';

//Your sending email address
var from_who = 'mail@mg.mrrmrr.com';

app.post('/sendEndorseLink',

  //express.basicAuth('username', 'password'),
  function(request, response) {
    console.log('email received');

    // This code section de-circularizes JSON
    // Cases covered are:
    // var a = {b:1}
    // var o = {};
    // o.one = a;
    // o.two = a;
    // one and two point to the same object, but two is discarded:
    // source: http://stackoverflow.com/questions/11616630/json-stringify-avoid-typeerror-converting-circular-structure-to-json
    var JSONString;
    var cache = [];
    JSONString = JSON.stringify(request, function(key, value) {
      if (typeof value === 'object' && value !== null) {
        if (cache.indexOf(value) !== -1) {
          // Circular reference found, discard key
          return;
        }
        // Store value in our collection
        cache.push(value);
      }
      return value;
    });
    cache = null; // Enable garbage collection

    // This code section parses out the To and CC emails
    // as well as the subject line and emails all recipients (except)

    var to = request.body.To;
    var cc = request.body.Cc;

    var firstPart = to.split('>');
    var toEmails = [];
    for (var index in firstPart) {
      var secondPart = firstPart[index].split('<');
      if (secondPart[secondPart.length - 1].indexOf('@') != -1) { // Verifies the string has a common email character
        toEmails.push(secondPart[secondPart.length - 1]);
      }

    }
    if (toEmails.indexOf('mail@mg.mrrmrr.com') != -1) {
      toEmails.splice(toEmails.indexOf('mail@mg.mrrmrr.com'), 1);
    }

    firstPart = cc.split('>');
    var ccEmails = [];
    for (var index in firstPart) {
      var secondPart = firstPart[index].split('<');
      if (secondPart[secondPart.length - 1].indexOf('@') != -1) { // Verifies the string has a common email character
        ccEmails.push(secondPart[secondPart.length - 1]);
      }
    }

    if (ccEmails.indexOf('mail@mg.mrrmrr.com') != -1) {
      ccEmails.splice(ccEmails.indexOf('mail@mg.mrrmrr.com'), 1);
    }

    console.log('Emails collected: To(' + toEmails.length + '):' + toEmails.toString() + ' Cc(' + ccEmails.length + '):' + ccEmails.toString() + ' Subject: ' + request.body.subject);

    // First we initialize our module

    var mailgun = new Mailgun({
      apiKey: api_key,
      domain: domain
    });

    var fed360params = '?project=' + encodeURIComponent(request.body.subject) + '&emails=' + toEmails.toString();

    if (ccEmails.length > 0) {
      fed360params = fed360params + ',' + ccEmails.toString();
    }

    var params = {
      to: toEmails.toString(),
      from: 'mail@mg.mrrmrr.com',
      subject: request.body.subject,
      html: '<html > <head> <meta charset="UTF-8"> <title>Fed360 Simple HTML Email Invitation</title> <style>@import url(https://fonts.googleapis.com/css?family=Open+Sans:300,400,800);.fed360-email{font-family: "Open Sans", sans-serif; font-weight: 300;}.fed360-email .fed360{display: inline-block; width: 200px; height: 60px; padding-top: 0px; font-size: 50px; vertical-align: top; font-weight: 800; color: LightGrey;}</style> </head> <body> <div class="fed360-email"> <div class="welcome">Hi,</div><br><div class="invitation">One or more of your team members has invited you to give anonymous endorsements for your team\'s skills.</div><br><a class="link" href="http://codepen.io/OurDailyBread/debug/vLNGoG' + fed360params + '">Endorse your team\'s skills</a> <br><br><br><div class="signature">Automated Transaction by the Fed360 Team Endorsement Program</div><div class="fed360">Fed360</div><div class "warning">Please do not reply to this email</div><a href="http://fed360.parseapp.com/" class "website">Visit the Fed360 Homepage</div></div></body></html>'
    };

    if (ccEmails.length > 0) {
      params.cc = ccEmails.toString();
    }

    // Then we create a cloud function
    mailgun.messages().send(params, function(err, body) {
      //If there is an error, render the error page
      if (err) {
        res.render('error', {
          error: err
        });
        console.log("got an error: ", err);
      }
      //Else we can greet    and leave
      else {
        console.log('mail submitted');
        console.log(body);
      }
    });

    // This code section saves the incoming email to the Parse cloud database - TODO

  },
  function(error) {
    console.log('error receiving email');
    console.log(error);
    //response.status(500);
    //response.send('Error');
  }
);

//var base = new Airtable({ apiKey: 'keyWInwqgSshQe7GV' }).base('appYLZr7VvVPKZGvf');
var Airtable = require('airtable');
Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: 'keyWInwqgSshQe7GV'
});
var base = Airtable.base('appYLZr7VvVPKZGvf');

app.post('/saveProfile', function(request, response) {
  console.log('POST received');
  saveProfile(request, response);

});


function saveProfile(request, response) {
	
  //console.warn(JSON.stringify(request.body));
  var profileJSON = JSON.parse(request.body.profile);
  var profileId = '';
  console.warn('data being processed: ' + JSON.stringify(profileJSON));
 
  
  if ((typeof profileJSON.username == 'undefined') || (profileJSON.username == '')) {
	 if (typeof profileJSON.email == 'undefined') {
		 console.warn('no username or email found');
		 response.send('no username or email found');
		 return;
	 }
	 console.warn('email: ' + profileJSON.email);
	 profileId = profileJSON.email;
     //getProfileJSON = getProfile(profileId, getProfileJSON);
  } else {
	  console.warn('username: ' + profileJSON.username);
	  profileId = profileJSON.username;
     //getProfileJSON = getProfile(profileId, getProfileJSON);
  }
  
  getProfile(profileId, profileJSON, response);
  /*
    async.series([
    function(callback) {
		console.warn('processing profile');
		getProfile(profileId, profileJSON, callback);
		console.warn('testing 2');
	},
	function(callback) {
   	    console.warn('processing organization');
        getOrganization(profileJSON.organization, profileJSON, callback);
	}
	],
	//optional callback
	function(err, results) {
		if (err) {
			console.warn('Error: '  + err);
			response.send('Error: ' + err);
		} else {
		// results is now equal to ['one', 'two']
		  var profileRecord = results[0];
		  var organizationRecord = results[1];
		  updateProfile(profileJSON, profileRecord, organizationRecord, response);
		  updateOrganization(profileJSON, profileRecord, organizationRecord, response);
		}
	});
 */
 
}

function getProfile(ID, profileJSON, response) {
  console.warn('loading ID');
  console.warn('getting profile for ' + ID);
  var foundId = false;
  base('People').select({
    view: "Main View"
  }).eachPage(function page(records, fetchNextPage) {

    // This function (`page`) will get called for each page of records.

    records.forEach(function(record) {
	  console.warn('received record: ' + record.get('Profile ID'));
	  //console.warn(JSON.stringify(record));
	  console.warn('comparing ID ' + ID);
      if (record.get('Profile ID') == ID) {
		foundId = true;
		console.warn('foundId: ' + foundId);
        console.error('Located existing profile ' + record.get('id'));
		//callback(null, record);
		response.send('found and done.');
		//getOrganization(profileJSON.organization, profileJSON, record, response);
      }
	  console.warn('checked record: ' + record.get('Profile ID'));
    });

    // To fetch the next page of records, call `fetchNextPage`.
    // If there are more records, `page` will get called again.
    // If there are no more records, `done` will get called.
    fetchNextPage();

  }, function done(error) {
	console.warn('getProfile done');
    if (error) {
        console.warn('getProfile error: ' + error);
        //callback('getProfile error: ' + error, null);
    } else {
		if (foundId == false) {
		  console.warn('no profile found for ' + ID);
		  //addProfile(profileJSON, response);
		} else {
		  console.warn('end of getProfile: ' + ID);
		}		
	}
	response.send('not found and done.');
  });
  console.warn('getProfile end');
}

function addProfile(profileJSON, response) {
	console.warn('adding profile: ' + profileJSON.firstname);
  // save profile to Airtable
    base('People').create({
      "Name (First)": profileJSON.firstname,
      "Password": profileJSON.password,
      "Name (Last)": profileJSON.lastname,
      //"Endorsements (received)": [],
      //"Endorsements (given)": [],
      //"Deliveries": [],
      //"Organization": '',
      "Direct Supervisor (email)": profileJSON.supervisoremail,
      "Email": profileJSON.email,
      //"Job Changes": [],
      "Username": profileJSON.username//,
      //"Training Ratings": "1", // ask Logan about this
      //"Deliveries copy": []
    }, function(err, record) {
	  console.warn('finished adding profile');
      if (err) {
        console.warn('addProfile error: ' + err);
        //callback('addProfile error: ' + err, null);
      } else {
        console.warn('profile added: ' + record.get('id'));
		console.warn(JSON.stringify(record));
        //callback(null, record);
		//getOrganization(profileJSON.organization, profileJSON, record, response);
		response.send('done');
	  }
	  
    });

}

function updateProfile(profileJSON, profileRecord, organizationRecord, response) {
  console.warn('updating organization: ' + profileRecord.get('Profile ID') + ' for ' + organizationRecord.get('Name'));
  base('People').update(profileRecord.get('id'), {
      "Name (First)": profileJSON.firstname,
      "Password": profileJSON.password,
      "Name (Last)": profileJSON.lastname,
      "Endorsements (received)": profileRecord.get('Endorsements (received)'),
      "Endorsements (given)": profileRecord.get('Endorsements (given)'),
      "Deliveries": profileRecord.get('Deliveries'),
      "Organization": organizationRecord.get('id'),
      "Direct Supervisor (email)": profileJSON.supervisoremail,
      "Email": profileJSON.email,
      "Job Changes": profileRecord.get('Job Changes'),
      "Username": profileJSON.username,
      "Training Ratings": "1", // ask Logan about this
      "Deliveries copy": profileRecord.get('Deliveries copy')
    }, function(err, record) {
      if (err) {
        console.warn('updateProfile error: ' + err);
        response.send('Error: ' + err);
      } else {
		console.warn('profile updated: ' + record.get('id'));
		response.send('Sucessfully added/updated record: ' + record.get('id'));
      }
    });

}

function getOrganization(organization, profileJSON, profileRecord, response) {
  console.warn('getting organization ID: ' + organization);
  base('Organizations').select({
    view: "Main View"
  }).eachPage(function page(records, fetchNextPage) {

    // This function (`page`) will get called for each page of records.

    records.forEach(function(record) {
      console.warn('received organization record ' + record.get('Name'));
	  console.warn('comparing record name');
      if (record.get('Name') == organization) {
		console.warn('attempting to get ID');
        organizationId = records.get('ID');
        console.warn('Located existing organization ' + record.get('Name'));
        //callback(null, record);
		updateOrganization(profileJSON, profileRecord, record, response)
      }
      console.warn('fetching next record');
    });

    // To fetch the next page of records, call `fetchNextPage`.
    // If there are more records, `page` will get called again.
    // If there are no more records, `done` will get called.
    fetchNextPage();

  }, function done(error) {
	  console.warn('did not find organization');
    if (error) {
      console.warn('getOrganization error: ' + error);
	  //callback('Error: ' + error, null);
    } else {
      console.warn('no organization found for ' + organization);
	  addOrganization(profileJSON, profileRecord, response);
	}
  });

}

function addOrganization(profileJSON, profileRecord, response) {
  console.warn('adding organization');
  console.warn('adding organization: ' + profileJSON.organization);
  // add organziation to organziation table
  base('Organizations').create({
    "Name": profileJSON.organization,
    "People": [],
    "Positions": [],
    "Position Changes (from)": [],
    "Position Changes (to)": []
  }, function(err, record) {
	  console.warn('added organization');
    if (err) { 
      console.warn('addOrganization error: ' + err);
      //callback('addOrganization error: ' + err, null); 
    } else {
      console.warn('organization added: ' + profileJSON.organization);
	  //callback(null, record);
	  updateOrganization(profileJSON, profileRecord, record, response);
    }
  });
}

function updateOrganization(profileJSON, profileRecord, organizationRecord, response) {
  console.warn('updating organization');
  console.warn('preparing to update organization: ' + organizationRecord.get('Name') + ' for ' + profileRecord.get('Profile ID'));
  var people = organizationRecord.get('People');
  if (people.indexOf(profileRecord.get('id') == -1)) {
    people.push(profileRecord.get('id'));
  }

  base('Organizations').update(organizationRecord.get('id'), {
    "Name": profileJSON.organization,
    "People": people,
    "Positions": organizationRecord.get('Positions'),
    "Position Changes (from)": organizationRecord.get('Position Changes (from)'),
    "Position Changes (to)": organizationRecord.get('Position Changes (to)')
  }, function(err, record) {
    if (err) { 
	  console.warn('updateOrganization error:' + err);
      response.send('updateOrganization error:' + err);	  
	} else {
	  //response.send('Successfully added/updated record: ' + record.get('id'));
	  console.warn('updateOrganization successful:' + record.get('id'));
	  updateProfile(profileJSON, profileRecord, organizationRecord, response);
	}
  });
}
