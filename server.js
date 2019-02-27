var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");
var exphbs = require("express-handlebars");
var app = express();

app.engine("handlebars", exphbs({
  defaultLayout: "main"
}));
app.set("view engine", "handlebars");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

//var PORT = 3000;


// Initialize Express

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({
  extended: true
}));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Connect to the Mongo DB
// mongoose.connect("mongodb://localhost/nprScraper", {
//   useNewUrlParser: true
// });
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/nprScraper";

mongoose.connect(MONGODB_URI);


// =================================== ROUTES

// HOME
app.get("/", function (req, res) {
  res.render("index");
});

// ================== NPR SCRAPE
app.get("/scrape", function (req, res) {
  // Grab the body of the html with axios
  axios.get("https://www.npr.org/").then(function (response) {
    // Load NPR into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // grabbing class we want to scrape
    $(".story-text").each(function (i, element) {

      // Save an empty result object
      var result = {};

      // narrowing down what we want out of div class
      result.title = $(this).children("a").children("h3").text();
      result.link = $(this).children("a").attr("href");
      result.summary = $(this).children("a").children("p").text();

      // Create a new Article (linkingn to Article.js) using the `result` object built from scraping
      db.Article.create(result)
        .then(function (dbArticle) {
          // View the added result in the console
          console.log(dbArticle);
        })
        .catch(function (err) {
          // If an error occurred, log it
          console.log(err);
        });
    });

    // Send a message to the client
    res.send("Scrape Complete");
  });
});

// Route for getting all Articles from the db
app.get("/articles", function (req, res) {
  db.Article.find({})
    .then(function (dbScrape) {
      // If all Notes are successfully found, send them back to the client
      res.json(dbScrape);
    })
    .catch(function (err) {
      // If an error occurs, send the error back to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
  db.Article.findOne({
      _id: req.params.id
    })
    .populate("note")
    .then(function (dbScrapeInfo) {
      res.json(dbScrapeInfo);
    })
    .catch(function (error) {
      res.json(error);
    })
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function (req, res) {
  db.Note.create(req.body)
    .then(function (dbNote) {
      return db.Article.findOneAndUpdate({
        _id: req.params.id
      }, {
        note: dbNote._id
      }, {
        new: true
      });
    })
    .then(function (dbArticle) {
      // If the User was updated successfully, send it back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurs, send it back to the client
      res.json(err);
    });

});

// SEE ARTICLE NOTES
app.get("/notes/:id", function (req, res) {
  db.Article.findOne({
      _id: req.params.id
    })
    .populate("note")
    .then(function (dbScrapeInfo) {
      res.render("notes", {
        articleNotes: dbScrapeInfo
      });
    }).catch(function (error) {
      res.json(error);
    })
});

// SEE ALL NOTES
app.get("/notes/", function (req, res) {
  db.Note.find({})
    .populate("note")
    .then(function (dbScrapeInfo) {
      //res.json(dbScrapeInfo);
      res.render("allnotes", {
        articleNotes: dbScrapeInfo
      });
    }).catch(function (error) {
      res.json(error);
    })
});

// NOTES DELETE ROUTE
app.delete("/notes/:id", function (req, res) {
  console.log("DELTEROUTE");
  db.Note.findOne({
    _id: req.params.id
  }).deleteOne()
    //db.Saved.deleteOne({_id: req.params.id})
    .then(function (dbNotes) {
      // View the added result in the console
      console.log(dbNotes);
      return db.Saved.findOneAndUpdate({
        _id: req.params.id
      }, {
        note: dbNotes._id
      }, {
        new: true
      });
    })
    .then(function (dbNotes) {
      // If the User was updated successfully, send it back to the client
      //res.json(dbNotes);
      res.render("saved", {
        savedArticles: dbNotes
      });
    })
    .catch(function (err) {
      // If an error occurred, log it
      console.log(err);
    });
})

// SAVED POST ROUTE
app.post("/saved/:id", function (req, res) {
  db.Saved.create(req.body)
    .then(function (dbSaved) {
      // View the added result in the console
      console.log(dbSaved);
      return db.Article.findOneAndUpdate({
        _id: req.params.id
      }, {
        saved: dbSaved._id
      }, {
        new: true
      });
    })
    .then(function (dbSaved) {
      // If the User was updated successfully, send it back to the client
      //res.json(dbSaved);
      res.render("saved", {
        savedArticles: dbSaved
      });
    })
    .catch(function (err) {
      // If an error occurred, log it
      console.log(err);
    });
})

// INDIVIDUAL SAVED ROUTE GET FOR DELETE BUTTONS
app.get("/saved/:id", function (req, res) {
  db.Saved.findOne({
      _id: req.params.id
    })
    .populate("note")
    .then(function (dbScrapeInfo) {
      res.render("saved", {
        savedArticles: dbScrapeInfo
      });
    }).catch(function (error) {
      res.json(error);
    })
});

// SAVED GET ROUTE
app.get("/saved", function (req, res) {
  db.Saved.find({})
    .populate("saved")
    .then(function (dbScrapeInfo) {
      //res.json(dbScrapeInfo);
      console.log(dbScrapeInfo);
      res.render("saved", {
        savedArticles: dbScrapeInfo
      });

    })
    .catch(function (error) {
      res.json(error);
    })
})

// SAVED DELETE ROUTE
app.delete("/saved/:id", function (req, res) {
  console.log("DELTEROUTE");
  db.Saved.findOne({
    _id: req.params.id
  }).deleteOne()
    //db.Saved.deleteOne({_id: req.params.id})
    .then(function (dbSaved) {
      // View the added result in the console
      console.log(dbSaved);
      return db.Saved.findOneAndUpdate({
        _id: req.params.id
      }, {
        saved: dbSaved._id
      }, {
        new: true
      });
    })
    .then(function (dbSaved) {
      // If the User was updated successfully, send it back to the client
      //res.json(dbSaved);
      res.render("saved", {
        savedArticles: dbSaved
      });
    })
    .catch(function (err) {
      // If an error occurred, log it
      console.log(err);
    });
})

// Start the server
app.listen(process.env.PORT || 3000, function () {
  console.log("App running on port "  + "!");
});