const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
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

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

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
      add_release_objects_to_tracks(influxDB, result, (final_result)=>{
        res.send({results:final_result});
      });
    }).catch((error)=>{
      res.status(500).send(error.stack);
    });
  });
});

app.get(API_PREFIX + '/releases', (req,res) => {
  fixSkipAndLimit(req.query, (skip, limit)=>{
    var influxDB = database(config);

    influxDB.query('select * from release ORDER BY time desc LIMIT ' + limit + ' OFFSET ' + skip).then( (result)=>{
      res.send({results:result});
    }).catch((error)=>{
      res.status(500).send(error.stack);
    });
  });
});

app.get(API_PREFIX + '/catalog/release/:mcID', (req, res) => {
  const mcID = req.params.mcID;

  var influxDB = database(config);

  influxDB.query('select * from release where catalogId=~ /^' +  mcID + '/').then( (release_result)=>{
    var result_object = {};

    result_object.release = release_result[0];
    result_object.tracks = [];

    influxDB.query('select * from release_tracks where releaseId=~ /^' +  mcID + '/').then( (release_tracks_result)=>{
      var i = 0;

      var loop = function(){
        if(i<release_tracks_result.length){
          influxDB.query('select * from catalog where id=~ /^' +  release_tracks_result[i].songId + '/').then( (tracks_result)=>{
            tracks_result[0].release = release_result[0];
            result_object.tracks.push(tracks_result[0]);

            i++;
            loop();
          });
        }else{
          res.send(result_object);
        }
      }

      loop();
    });
  }).catch((error)=>{
    res.status(500).send(error.stack);
  });
});

app.post(API_PREFIX + '/related', (req, res) => {
  fixSkipAndLimit(req.query, function (skip, limit) {
    var influxDB = database(config);

    const tracks = req.body.tracks;
    const exclude = req.body.exclude;

    getSearchFromIds(tracks, influxDB, function (search) {
      if(search[0]){
        var catalogSongQuery = 'select id,search from catalog WHERE ' + 'id!=\'' + search[0].id + '\'';

        for (var i = 1; i < search.length; i++) {
          catalogSongQuery += 'AND id !=\'' + search[i].id + '\'';
        }

        if (exclude !== undefined) {
          for (var i = 0; i < exclude.length; i++) {
            catalogSongQuery += 'AND id !=\'' + exclude[i].id + '\'';
          }
        }

        console.log(catalogSongQuery);

        influxDB.query(catalogSongQuery).then( (tracks_result)=>{
          processRelated(search, tracks_result, (result)=>{
            res.send({results: result});
          });
        });
      }else{
        res.send({results: []});
      }

    });
  });
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
  var searchString = fixSearchString(req.query.term);

  fixSkipAndLimit(req.query, (skip, limit) => {
    var influxDB = database(config);

    const terms = searchString.split(' ');

    influxDB.query('select * from catalog WHERE search =~ /(?i)' + terms[0] + '/ ORDER BY time desc LIMIT ' + limit + ' OFFSET ' + skip).then( (result)=>{
      processCatalogSearch(influxDB, searchString, terms, result, skip, limit, (final_result)=>{
        res.send({results:final_result});
      });
    }).catch((error)=>{
      res.status(500).send(error.stack);
    });
  });
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

function fixSearchString(searchString) {
  if (searchString === undefined) {
    return '';
  } else {
    searchString = searchString.replace(/[^\x20-\x7E]/g, "");
    searchString = searchString.replace('(', '%7B');
    searchString = searchString.replace(')', '%7D');
    searchString = searchString.trim();

    return searchString;
  }
}

function add_release_objects_to_tracks(influxDB, track_array, callback){
  var final_track_array = [];
  var i = 0;

  var loop = function(){
    if(i<track_array.length){
      const track = track_array[i];

      influxDB.query('select * from release where id=~ /^' + track.releaseId + '/').then((release_result)=>{
        if(release_result[0]){
          track.release = release_result[0];
          track.artists = [];
          track.tags = [];

          final_track_array.push(track);
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
      callback(final_track_array);
    }
  }

  loop();
}

function processCatalogSearch(influxDB, searchString, terms, trackArray, skip, limit, callback) {
    for (var k = 1; k < terms.length; k++) {
        trackArray = trackArray.filter(track => new RegExp(terms[k], 'i').test(track.search));
    }

    for (var i = 0; i < trackArray.length; i++) {
        trackArray[i].similarity = similarity(trackArray[i].search.replace(trackArray[i].id, ''), searchString);
    }

    trackArray.sort(function (a, b) {
        if (a.similarity < b.similarity) return 1;
        if (a.similarity > b.similarity) return -1;
        return 0;
    });

    trackArray = trackArray.slice(skip, skip + limit);

    add_release_objects_to_tracks(influxDB, trackArray, callback)
}

function processReleasesSearch(searchString, terms, releaseArray, skip, limit, callback) {
    for (var k = 1; k < terms.length; k++) {
        releaseArray = releaseArray.filter(release => new RegExp(terms[k], 'i').test(release.search));
    }

    for (var i = 0; i < releaseArray.length; i++) {
        releaseArray[i].similarity = utils.similarity(releaseArray[i].search.replace(releaseArray[i].id, ''), searchString);
    }

    releaseArray.sort(function (a, b) {
        if (a.similarity < b.similarity) return 1;
        if (a.similarity > b.similarity) return -1;
        return 0;
    });

    releaseArray = releaseArray.slice(skip, skip + limit);

    for (var i = 0; i < releaseArray.length; i++) {
        releaseArray[i] = utils.addMissingReleaseKeys(releaseArray[i]);
    }

    callback(releaseArray);
}

function processRelated(searchArray, tracks, callback) {
    var arrayWithSimiliarity = [];

    for (var i = 0; i < searchArray.length; i++) {
        const firstSearch = searchArray[i].search.replace(searchArray[i].id, '');

        for(var k=0; k<tracks.length; k++){
            var secondSearch = tracks[k].search.replace(tracks[k].id, '');

            var track_similarity = similarity(firstSearch, secondSearch);
            const id = tracks[k].id;

            if (arrayWithSimiliarity[k] !== undefined) {
                track_similarity += arrayWithSimiliarity[k].similarity;
            }

            arrayWithSimiliarity[k] = {
                id: id,
                similarity: track_similarity
            };
        }
    }

    arrayWithSimiliarity.sort(function (a, b) {
        if (a.similarity < b.similarity) return 1;
        if (a.similarity > b.similarity) return -1;
        return 0;
    });

    callback(arrayWithSimiliarity);
}

function getSearchFromIds(tracks, influxDB, callback){
  var trackSearch = [];

  var i = 0;

  var influxCallback = function () {
    if (i < tracks.length) {
      influxDB.query('select id,search from catalog where id=~ /^' + tracks[i].id + '/').then((results)=>{
        trackSearch[i] = results[0];
        i++;
        influxCallback();
      });
    } else {
      //DONE
      callback(trackSearch);
    }
  }

  influxCallback();
}


function editDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();

  var costs = new Array();
  for (var i = 0; i <= s1.length; i++) {
    var lastValue = i;
    for (var j = 0; j <= s2.length; j++) {
      if (i == 0)
        costs[j] = j;
      else {
        if (j > 0) {
          var newValue = costs[j - 1];
          if (s1.charAt(i - 1) != s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue),
              costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0)
      costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

function similarity(s1, s2) {
  if (s1 !== undefined && s2 !== undefined) {
    var longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
      longer = s2;
      shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength == 0) {
      return 1.0;
    }
    return ((longerLength - editDistance(longer, shorter)) / parseFloat(longerLength)) * 100.0;
  } else {
    return 0.0;
  }
}
