const colors     = require('colors'),
request	   = require('request'),
cheerio	   = require("cheerio"),
js2xmlparser = require("js2xmlparser"),
fs = require('fs'),
CronJob = require('cron').CronJob,
express = require('express'),
app = express(),
xml2js = require('xml2js'),
parser = new xml2js.Parser();

// [ Configuration Server web ]
app.use(express.static(__dirname +  '/views'));
app.set('views', __dirname + '/views');
//app.set('json spaces', 4);

// SVG
// app.get('/datas', function(req, res){
// 	//res.send('views/datas.xml');
// 	console.log("data!!!");
// 	res.set('Content-Type', 'text/xml');
// 	fs.readFile( 'views/datas.xml',{encoding: 'utf8'}, function(err, data) {
// 		parser.parseString(data, function (err, result) {
// 			console.log(err);
// 			res.send(result);
// 		});
// 	});
// });
// SVG FIN

app.get('/datas', function(req, res){
	//res.send('views/datas.xml');
	console.log("data!!!");
	res.set('Content-Type', 'text/xml');
	fs.readFile( 'views/datas.xml',{encoding: 'utf8'}, function(err, data) {
		res.send(data);
	});
});

app.get('/datasdwl', function(req, res){
	console.log("data download");
    res.download('views/datas.xml');
});

app.listen(80, function () {
  console.log('Ready on port 80');
});

var intervalID;
var cpt;
var result;

var url ="http://gallery-aaldering.com/stocklist-en/";
var debut = "var cars = ";
var fin = "}];";
var construct = {
	"@":{
		"xmlns":"http://www.w3.org/2005/Atom",
		"xmlns:g":"http://base.google.com/ns/1.0"
	},
	"title" : "Gallery Aaldering",
	"link" : {
		"@": {
			"href": "http://gallery-aaldering.com/",
			"rel" : "self"
		}

	},
	"updated" : "new Date()"
};

//FONNCTIONS
function scrapDatas(){
	request(url, function (error, response, body) {
		// console.log(body);
		if (!error) {
			var pos_debut = body.indexOf(debut) + debut.length;
			var pos_fin = body.indexOf(fin) + fin.length - 1;
			result = body.substring(pos_debut, pos_fin);
			result = JSON.parse(result);
			var resultlgenth=result.length;
			console.log(result.length);
			var b = 0;
			result.forEach(function(element,index){
				element["g:price"] = element.price;
				delete element.price;
				element["g:brand"] = element.brand;
				delete element.brand;
				//AFFICHE 4 IMAGES
				var tab_img = []
				var racine = element.image.substring(0, element.image.length - 5);
				for(var i=1; i<5;i++){
					var lien_img = "http://gallery-aaldering.com" + racine + i + ".jpg";
					tab_img.push(lien_img);
				}
				element["g:image_link"] = tab_img;
				delete element.image;
				element["id"] = element.hexon_number;
				delete element.hexon_number;
				element["g:condition"] = '{"refurbished"}';
				element["g:availability"] = '{availability: "in stock"}';
				var href = "http://gallery-aaldering.com" + element.slug;
				element["link"] = {
					"@": {
						"href": href
					}
				};
				element["elementnbr"] = index;
				if(b == resultlgenth-1){
					cpt = 0;
					console.log("RESULT".red)
					console.dir(result);
					console.log("---FIN RESULT---");
					intervalID = setInterval(chercheDescr, 18000);
				}
				b++;

			});
			return;
		} else {
			console.log("request error on scrapping: ".red + error);
		}
	});
}

function chercheDescr(){
	console.log("chercheDescr cpt : ".blue + cpt);
	if (cpt <= ( result.length-1 )) {
		var url = "http://gallery-aaldering.com" + result[cpt].slug;
		request(url,{timeout: 6000}, function (error, response, body) {
			if (!error) {
				var $ = cheerio.load(body);
				// console.log("no error cheerio cpt " + cpt);
				var description = $('.desc').text();
				result[cpt]["summary"] = description.trim();
				cpt++;
			} else {
				console.log("request error on scrapping desc: ".red + error);
			}
		});
	} else {
		clearInterval(intervalID);
		//console.dir(xml_file);
		console.log("xml_file----end----".green);
		construct.updated = new Date();
		construct.entry = result;
		var xml_file = js2xmlparser("feed", construct);
		var path = "views/datas.xml";
		fs.writeFile(path, xml_file, function(error) {
			if (error) {
				console.error("write error:  ".red + error.message);
				//SI LE FICHIER NE S'ECRIT PAS REPETITION DE LA FONCTION:
				scrapDatas();
			} else {
				console.log("Successful Write to ".green + path);
			}
		});
	}
}

// function verifNews(){
// 	console.log("verifNews");
// 	var tab_id = [];
// 	fs.readFile('views/datas.xml','utf8', function(error,data){
// 		if(error){
// 			console.log(error);
// 		}else{
// 			//console.log(data);
// 			parser.parseString(data, function (err, result) {
// 				if(error){
// 					console.log(err);
// 				}else {
// 					console.log("result".green);
// 					console.dir(result.feed.entry);
// 					console.log("------".green);
// 					result.feed.entry.forEach(function(elem,index){
// 						console.log(elem.id[0]);
// 						tab_id.push(elem.id[0]);
// 					});
// 					console.log("tab id".yellow);
// 					console.dir(tab_id);

// 				}
// 			});
// 		}
// 	});

// 	// var contents = fs.readFileSync('views/datas.xml', 'utf8');
// 	// console.log(contents);
// }



scrapDatas();
//verifNews();


// At 00:05 every day.
new CronJob('5 0 * * *', function() {
	console.log("cronjob Scrapping".blue);

	scrapDatas();

}, null, true, 'Europe/Brussels');

