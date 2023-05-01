
require("./utils.js");

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const saltRounds = 12;

const port = process.env.PORT || 3000;

const app = express();

const Joi = require("joi");


const expireTime = 60 * 60 * 1000; //expires after 1 hour ( minutes * seconds * millis)

/* secret information section */
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;
/* END secret section */

var { database } = include('databaseConnection');

const userCollection = database.db(mongodb_database).collection('users');

app.use(express.urlencoded({ extended: false }));

var mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
    crypto: {
        secret: mongodb_session_secret
    }
})

app.use(session({
    secret: node_session_secret,
    store: mongoStore, //default is memory store 
    saveUninitialized: false,
    resave: true
}
));

app.get('/', (req, res) => {
    if (!req.session.authenticated) {
        var html = `
        <h1>Welcome</h1><br>
        <div>
            <a href="/signup">Sign Up</a>
        </div> 
        
        <div>
            <a href="/login">Log In</a>
        </div>`
        res.send(html);
        return;

    } else {
        var html = `
        <h1>Hello, ${req.session.name}!</h1>
     <div> <a href="/members">Members area</a></div> 
     <div> <a href="/logout">Log out</a><div>
     
        `
        res.send(html);
    }


});



app.get('/about', (req, res) => {
    var color = req.query.color;

    res.send("<h1 style='color:" + color + ";'>Gurpinder kaur</h1>");
});






app.get("/signup", (req, res) => {

    var html = `
    Sign up
    <form action='/submitUser' method='post'>
        <input name = 'name' type = 'text' placeholder = 'name'><br><br>
        <input name = 'email' type = 'text' placeholder = 'email'><br><br>
        <input name = 'password' type = 'password' placeholder = 'password'><br>
        <button>Submit</button>
    </form>    
    `;
    res.send(html)
})



app.get('/login', (req, res) => {
    var html = `
    LOG IN 
    <form action='/loggingin' method='post'>
    
      <input type="email" name="email" placeholder="email"><br><br>
      
      <input type="password" name="password" placeholder="password"><br><br>
      <button>Submit</button>
    </form>
    `;
    res.send(html);
});





app.post('/submitUser', async (req, res) => {


    var name = req.body.name;
    if (!name) {
        res.redirect("")
    }

    var email = req.body.email;
    var password = req.body.password;
    req.session.name = name;
    var newsession = req.session;


    const schema = Joi.object(
        {
            name: Joi.string().alphanum().max(20).required(),
            email: Joi.string().email().required(),
            password: Joi.string().max(20).required()
        });

    const validationResult = schema.validate({ name, email, password });
    if (validationResult.error != null) {
        console.log(validationResult.error);
        res.redirect("/signup");
        return;
    }

    var hashedPassword = await bcrypt.hash(password, saltRounds);

    await userCollection.insertOne({ name: name, email: email, password: hashedPassword });
    req.session.name = name;
    req.session.email = email;
    req.session.authenticated = true;
    req.session.cookie.maxAge = expireTime;
    console.log("Inserted user");

    // var html = "successfully created user";
    res.redirect("/members");
});

app.post('/loggingin', async (req, res) => {

    var email = req.body.email;
    var password = req.body.password;
    // var name = req.body.name;
    // req.session.name = name;


    const schema = Joi.string().email().required();
    const validationResult = schema.validate(email);
    if (validationResult.error != null) {
        console.log(validationResult.error);
        res.redirect("/login");
        return;
    }

    const result = await userCollection.find({ email: email }).project({ name: 1, email: 1, password: 1, _id: 1 }).toArray();

    console.log(result);
    if (result.length != 1) {
        console.log("user not found");
        res.redirect("/login");
        return;
    }
    if (await bcrypt.compare(password, result[0].password)) {
        var name = result[0].name;
        console.log("correct password");
        req.session.authenticated = true;
        req.session.email = email;
        req.session.name = name;
        req.session.cookie.maxAge = expireTime;

        res.redirect('/loggedIn');
        return;
    }
    else {
        var html = `
        Incorrect email/password combination
        <a href = './login'>Try Again</a>`
        res.send(html);
        return;
    }
});

app.get('/loggedin', (req, res) => {
    if (!req.session.authenticated) {
        res.redirect('/login');
    }

    res.redirect('/members');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    var html = `
    You are logged out.
    `;
    res.redirect('/');
});

app.get("/members", (req, res) => {
    const name = req.session.name;
    if (!req.session.authenticated) {
        res.redirect('/');
        return;

    }
    console.log(req.session)

    const possibleValues = [1, 2, 3];
    const randomIndex = Math.floor(Math.random() * possibleValues.length);
    const randomNumber = possibleValues[randomIndex];
    console.log(randomNumber);



    let html = `<h1>Hello, ${name}!</h1>`;
    if (randomNumber == 1) {
        html += `<img src="/img1.gif">`;
    } else if (randomNumber == 2) {
        html += `<img src="/img2.gif">`;
    } else if (randomNumber == 3) {
        html += `<img src="/img3.gif">`;
    }
    html += `<div><a href="/logout">Log out</a></div>`

    // Send the response
    res.send(html);


})




app.use(express.static(__dirname + "/public"));

app.get("*", (req, res) => {
    res.status(404);
    res.send("Page not found - 404");
})

app.listen(port, () => {
    console.log("Node application listening on port " + port);
}); 