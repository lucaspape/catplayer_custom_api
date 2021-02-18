const fs = require('fs');
const express = require('express');
const Influx = require('influx');
const {stat, createReadStream} = require('fs');
const {pipeline} = require('stream');
const path = require('path')

const database = require('./database.js');

var config = JSON.parse(fs.readFileSync('config.json'));

const PORT = config.port;
const PREFIX = config.prefix;
const API_PREFIX = PREFIX + '/v1';
const API_NEXT_PREFIX = PREFIX + '/v2';

const app = express();

app.get(PREFIX + '/stats', (req, res) => {
  res.status(500).send('NOT IMPLEMENTED');

  //TODO IMPLEMENT
});

app.get(PREFIX + '/features', async (req, res) => {
  try {
    res.send(JSON.parse(fs.readFileSync('api_features.json')));
  } catch (e) {
    res.status(500).send(e);
  }
});

app.get(API_PREFIX + '/', (req,res) => {
  res.send('Hello world!');
});

app.get(API_NEXT_PREFIX + '/session', (req, res) => {
  res.status(500).send('NOT IMPLEMENTED');

  //TODO IMPLEMENT
});

app.post(API_NEXT_PREFIX + '/register', (req, res) => {
  res.status(500).send('NOT IMPLEMENTED');

  //TODO IMPLEMENT
});

app.post(API_NEXT_PREFIX + '/signin', (req, res) => {
  res.status(500).send('NOT IMPLEMENTED');

  //TODO IMPLEMENT
});

app.get(API_PREFIX + '/catalog', (req,res) => {
  fixSkipAndLimit(req.query, (skip, limit)=>{
    var influxDB = database(config);

    influxDB.query('select * from catalog ORDER BY time desc LIMIT ' + limit + ' OFFSET ' + skip).then( (result)=>{
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
            }else{
              console.log('No release found!');
            }

            i++;
            loop();
          }).catch((error)=>{
            console.log(error);
            i++;
            loop();
          });
        }else{
          res.send({results:final_result});
        }
      }

      loop();
    }).catch((error)=>{
      res.status(500).send(error);
    });
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

app.get(API_PREFIX + '/catalog/release/:mcID', (req, res) => {
  const mcID = req.params.mcID;

  res.status(500).send('NOT IMPLEMENTED');

  //TODO IMPLEMENT
});

app.post(API_PREFIX + '/related', (req, res) => {
  res.status(500).send('NOT IMPLEMENTED');

  //TODO IMPLEMENT
});

app.get(API_NEXT_PREFIX + '/playlist', (req, res) => {
  res.status(500).send('NOT IMPLEMENTED');

  //TODO IMPLEMENT
});

app.get(API_NEXT_PREFIX + '/playlists', (req, res) => {
  res.status(500).send('NOT IMPLEMENTED');

  //TODO IMPLEMENT
});

app.post(API_NEXT_PREFIX + '/playlist', (req, res) => {
  res.status(500).send('NOT IMPLEMENTED');

  //TODO IMPLEMENT
});

app.delete(API_NEXT_PREFIX + '/playlist/:playlistId', (req, res) => {
  res.status(500).send('NOT IMPLEMENTED');

  //TODO IMPLEMENT
});

app.patch(API_NEXT_PREFIX + '/playlist/:playlistId', (req, res) => {
  res.status(500).send('NOT IMPLEMENTED');

  //TODO IMPLEMENT
});

app.get(API_NEXT_PREFIX + '/playlist/:playlistId', (req, res) => {
  res.status(500).send('NOT IMPLEMENTED');

  //TODO IMPLEMENT
});

app.get(API_NEXT_PREFIX + '/playlist/:playlistId/catalog', (req, res) => {
  res.status(500).send('NOT IMPLEMENTED');

  //TODO IMPLEMENT
});

app.delete(API_NEXT_PREFIX + '/playlist/:playlistId/record', (req, res) => {
  res.status(500).send('NOT IMPLEMENTED');

  //TODO IMPLEMENT
});

app.patch(API_NEXT_PREFIX + '/playlist/:playlistId/record', (req, res) => {
  res.status(500).send('NOT IMPLEMENTED');

  //TODO IMPLEMENT
});

app.get(API_PREFIX + '/release/:releaseId/cover', async (req, res) => {
  const releaseId = req.params.releaseId;
  const image_width = req.query.image_width;

  const cover_image_file = path.resolve('covers/' + releaseId + '/' + releaseId + '.jpg');

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
        if(err){
          console.log(err);
        }
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

app.get(API_PREFIX + '/artists', (req, res) => {
  res.status(500).send('NOT IMPLEMENTED');

  //TODO IMPLEMENT
});

app.get(API_PREFIX + '/catalog/search', (req, res) => {
  res.status(500).send('NOT IMPLEMENTED');

  //TODO IMPLEMENT
});

app.get(API_PREFIX + '/releases/search', (req, res) => {
  res.status(500).send('NOT IMPLEMENTED');

  //TODO IMPLEMENT
});

app.get(API_PREFIX + '/artists/search', (req, res) => {
  res.status(500).send('NOT IMPLEMENTED');

  //TODO IMPLEMENT
});

app.listen(PORT, () => {
  console.log('Server started on port ' + PORT);
});

function fixSkipAndLimit(reqQuery, callback) {
  var skip = 0;
  var limit = 50;

  if (reqQuery.skip !== undefined) {
    skip = parseInt(reqQuery.skip);
  }

  if (reqQuery.limit !== undefined) {
    limit = parseInt(reqQuery.limit);

    if (limit > 50) {
      limit = 50;
    }
  }

  callback(skip, limit);
}
