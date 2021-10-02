const express = require("express");
const serverless = require("serverless-http");

const app = express();
const router = express.Router();

// imports
require('encoding')
const fetch = require('cross-fetch');
// routes

router.get("/prayertimes/:latitude/:longitude", async (req, res) => {

  const {latitude, longitude} = req.params;

  const data = await getTimes(latitude, longitude)
  const times = data[0]
  const loca = data[1]

  console.log(times)

  res.json({
    times: times,
    location: loca
  })

});

// functions

async function getTimes(lat, long)
{
    //console.log("Calculating...")
    // variables
    let countryName;
    let countryCode;
    let townCity;

    let prayersJson = {};

    // fetching - reverse geocode
    await fetch("https://api.opencagedata.com/geocode/v1/json?q="+lat+"+"+long+"&key=3d43121eee16488ab66d5b0e587df6fa")
        .then(response => response.json())
        .then(data => {
            countryName = data.results[0].components.country
            countryCode = data.results[0].components.country_code
            townCity = data.results[0].components.town
    })

    // fetching - html code (includes prayer data) 
    let url = "https://www.muslimpro.com/en/locate?country_code="+countryCode+"&country_name="+countryName+"&city_name="+townCity+"&coordinates="+lat+","+long+""

    await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`)
        .then(response => {
            if (response.ok) return response.json()
            throw new Error('Network response was not ok.')
        })
        // pulling out orayer time data
        .then(data => {
            let contentPage = data.contents
            let newContent = contentPage.split('praytime')

            for (const textInd in newContent)
            {
                if(textInd != 0)
                {
                    let dataText = newContent[textInd]

                    let time = dataText.split(' mx-3">')[1].split('<')[0]
                    
                    if(textInd == 1) {prayersJson["Fajr"] = time}
                    if(textInd == 2) {prayersJson["Sunrise"] = time}
                    if(textInd == 3) {prayersJson["Zuhr"] = time}
                    if(textInd == 4) {prayersJson["Asr"] = time}
                    if(textInd == 5) {prayersJson["Maghrib"] = time}
                    if(textInd == 6) {prayersJson["Isha"] = time}
                }
            }
            //console.log(newContent[6])1
        });

    // returning
    //console.log("Calculated!")
    //console.log(prayersJson)
    return [prayersJson, [countryCode, townCity]]
}

app.use(`/.netlify/functions/api`, router);

module.exports = app;
module.exports.handler = serverless(app);

// startup

// npm install express netlify-lambda serverless-http encoding - install default packages
// npm start - start development
// http://localhost:9000/.netlify/functions/api - /routename
// chromebook change
