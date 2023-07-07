const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mysql = require('mysql2');
const alert = require('alert');
const md5 = require("md5");

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

let email, name;
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'SanthoshDB@2',
  database: 'cvb',
  connectionLimit: 10
});

app.get("/", function(req, res) {
    res.render("login");
});

app.get("/login", function(req, res) {
    res.render("login");
});

app.post("/login", function(req, res) {
    email = req.body.email;
    const password = md5(req.body.password);
    pool.query("select * from users where email = ? and password = ?;", [email, password], function(error, results, fields) {
        if(error) console.log(error);
        console.log(results);
        if(results.length == 0) 
            alert("Check your mail and password");
        else {
            if(results[0].Email == 'admin@gmail.com' && results[0].Name == 'Admin') {
                res.redirect("/admin");
            } else {
                name = results[0].Name;
                res.redirect("/home");
            }
        }
    });
    console.log(req.body.email);
    console.log(req.body.password);
});

app.get("/signup", function(req, res) {
    res.render("signup");
});

app.post("/signup", function(req, res) {
    email = req.body.email;
    name = req.body.username;
    const password = md5(req.body.password);
    pool.query("insert into users(Email,Name,Password) values ('"+email+"','"+name+"','"+password+"');", function(error, results, fields) {
        if(error) {
            console.log(error);
            alert('This email has already registered.');
        } else {
            res.redirect("/home");
        }
        console.log(results);
    });
});

app.get("/admin", function(req, res) {
    pool.query("select * from centers order by CenterId;", function(error, results, fields) {
        if (error) console.log(error);
        else {
            console.log(results);
            res.render("admin", {centers : results});
        }
    });
});

app.get("/addcenter", function(req, res) {
    res.render("addcenter");
});

app.post("/addcenter", function(req, res) {
    console.log(req.body);
    const centerid = req.body.centerid;
    const cname = req.body.name;
    const address = req.body.address;
    const wfrom = req.body.wfrom;
    const wto = req.body.wto;
    const contact = req.body.contact;
    pool.query("insert into centers(CenterId,Name,Address,WorkFrom,WorkTo,Contact) values ('"+centerid+"','"+cname+"','"+address+"','"+wfrom+"','"+wto+"','"+contact+"');", function(error, results, fields) {
        if (error) alert("Center with similar id was already there!");
        else {
            alert("Center added Successfully.");
            res.redirect("/addcenter");
        }
    });
});

app.get("/remove/:centerid", function(req, res) {
    const centerid = req.params.centerid;
    pool.query("delete from centers where CenterId = ?", [centerid], function(error, results, fields) {
        if (error) console.log(error);
        else {
            res.redirect("/admin");
        }
    });
});

app.get("/dosagedetail", function(req, res) {
    pool.query("select * from centers inner join dosages on centers.CenterId = dosages.CenterId order by centers.CenterId;", function(error, results, fields) {
        if (error) console.log(error);
        else {
            console.log(results);
            res.render("dosagedetail", {dosages: results});
        }
    });
});

app.get("/home", function(req, res) {
    res.render("home", {Name: name, content: "", centers: []});
});

app.post("/search", function(req, res) {
    const cname = req.body.cname;
    const fromtime = req.body.fromtime;
    const totime = req.body.totime;
    pool.query("select * from centers where Name = ? and WorkFrom <= ? and WorkTo >= ? order by CenterId;", [cname,fromtime,totime], function(error, results, fields) {
        if (error) console.log(error);
        else {
            console.log(results);
            res.render("home", {Name: name, content: "No Centers available for your search...", centers: results});
        }
    });
});

app.get("/book/:centerid", function(req, res) {
    const centerid = req.params.centerid;
    res.render("booking", {Name: name, center_id: centerid});
});

app.post("/book", function(req, res) {
    console.log(req.body);
    let slotCount, availDoses;
    pool.query("select * from slots where CenterId = ? and SlotDate = ?", [req.body.centerid,req.body.sdate], function(error, results, field) {
        if (error) console.log(error);
        else slotCount = results.length;
    });
    pool.query("select * from dosages where CenterId = ?;",[req.body.centerid], function(error, results, fields) {
        if (error) console.log(error);
        else availDoses = results[0].AvailDoses;
    });
    if(slotCount >= 10) alert("The selected slotdate was already filled. Please change your slot date.");
    else if(availDoses <= 0) alert("No doses available for selected center...");
    else {
        pool.query("update dosages set DosesAdministered = DosesAdministered + 1, AvailDoses = AvailDoses - 1 where CenterId = ?;",[req.body.centerid], function(error, results, fields) {
            if (error) console.log(error);
            else console.log(results);
        });
        pool.query("insert into slots(Email,CenterId,SlotDate,SlotTime) values ('"+email+"','"+req.body.centerid+"','"+req.body.sdate+"','"+req.body.stime+"')", function(error, results, fields) {
            if (error) console.log(error);
            else {
                res.redirect("/mybooking");
            }
        });
    }
});

app.get("/mybooking", function(req, res) {
    pool.query("select * from centers inner join slots on centers.CenterId = slots.CenterId where Email = ?;", [email], function(error, results, fields) {
        if (error) console.log(error);
        else {
            console.log(results);
            res.render("mybooking", {Name: name, bookings: results});
        }
    });
});

app.listen(3000, function() {
    console.log("Server started on port 3000.");
});