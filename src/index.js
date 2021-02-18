const fs = require('fs');
const express = require('express');
const Influx = require('influx');
const {stat, createReadStream} = require('fs');
const {pipeline} = require('stream');
const path = require('path')

const database = require('./database.js');

const PORT = 8180;
const PREFIX = '/monstercat-custom';
const API_PREFIX = PREFIX + '/v1';

const app = express();

var config = JSON.parse(fs.readFileSync('config.json'));

app.get(API_PREFIX + '/', (req,res) => {
  res.send('Hello world!');
});

app.get(PREFIX + '/features', async (req, res) => {
  try {
    res.send(JSON.parse(fs.readFileSync('api_features.json')));
  } catch (e) {
    res.status(500).send(e);
  }
});

app.get(API_PREFIX + '/catalog', (req,res) => {
  var influxDB = database(config);

  influxDB.query('select * from catalog').then( (result)=>{
    var final_result = [];

    var i = 0;

    var loop = function(){
      if(i<result.length){
        const track = result[i];

        influxDB.query('select * from release where id=~ /^' + track.releaseId + '/').then((release_result)=>{
          if(release_result[0]){
            track.release = release_result[0];
            track.artists = [];
            track.tags = [];

            final_result.push(track);
          }

          i++;
          loop();
        });

        i++;
      }else{
        res.send({results:final_result});
      }
    }

    loop();
  }).catch((error)=>{
    res.status(500).send(error);
  });
});

app.get(API_PREFIX + '/releases', (req,res) => {
  var influxDB = database(config);

  influxDB.query('select * from release').then( (result)=>{
    res.send({results:result});
  }).catch((error)=>{
    res.status(500).send(error);
  });
});

app.get(API_PREFIX + '/release/:releaseId/cover', async (req, res) => {
  const releaseId = req.params.releaseId;
  const image_width = req.query.image_width;

  const cover_image_file = path.resolve('covers/' + releaseId + '.jpg');

  res.sendFile(cover_image_file);
});


app.get(API_PREFIX+ '/release/:releaseId/track-stream/:songId', (req, res) =>{
  const releaseId = req.params.releaseId;
  const songId = req.params.songId;

  const song_file = 'songs/' + releaseId + '/mp3/' + songId + '.mp3';

  fs.stat(song_file, (err, stat) => {
    if(err){
      console.log(err);
      res.status(404).send(err);
    }

    const size = stat.size;

    const range = req.headers.range;

    if(range){
      /** Extracting Start and End value from Range Header */
      let [start, end] = range.replace(/bytes=/, "").split("-");
      start = parseInt(start, 10);
      end = end ? parseInt(end, 10) : size - 1;

      if (!isNaN(start) && isNaN(end)) {
        start = start;
        end = size - 1;
      }
      if (isNaN(start) && !isNaN(end)) {
        start = size - end;
        end = size - 1;
      }

      // Handle unavailable range request
      if (start >= size || end >= size) {
        // Return the 416 Range Not Satisfiable.
        res.writeHead(416, {
          "Content-Range": `bytes */${size}`
        });
        return res.end();
      }

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': 'audio/mp3'
      });

      let readable = createReadStream(song_file, {start:start, end:end});

      pipeline(readable, res, err => {
        if(err){
          console.log(err);
        }
      });
    }else{
      res.writeHead(200, {
        "Content-Length": size,
        "Content-Type": "audio/mp3"
      });

      let readable = createReadStream(song_file);
      pipeline(readable, res, err => {
        console.log(err);
      });
    }
  });
});

app.get(API_PREFIX + '/release/:releaseId/track-download/:songId', (req, res) =>{
  const releaseId = req.params.releaseId;
  const songId = req.params.songId;

  var format = req.query.format;

  if(!format){
    format = 'mp3';
  }

  const song_file = 'songs/' + releaseId + '/' + format + '/' + songId + '.' + format;

  console.log(song_file);

  fs.stat(song_file, (err, stat) => {
    if(err){
      console.log(err);
      res.status(404).send(err);
    }

    const size = stat.size;

    res.writeHead(200, {
      "Content-Length": size,
      "Content-Type": "audio/" + format
    });

    let readable = createReadStream(song_file);
    pipeline(readable, res, err => {
      if(err){
        console.log(err);
      }
    });
  });
});

app.listen(PORT, () => {
  console.log('Server started on port ' + PORT);
});
