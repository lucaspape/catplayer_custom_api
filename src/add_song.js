const fs = require('fs');
const { exec } = require("child_process");
const Influx = require('influx');
const mm = require('music-metadata');
const { v4: uuidv4 } = require('uuid');
const database = require('./database.js');

var config = JSON.parse(fs.readFileSync('config.json'));

var song_filename = 'elevate.flac';

add_song(song_filename);

async function add_song(filename){
  const metadata = await mm.parseFile(filename);

  var influxDB = database(config);

  var songId = uuidv4();
  var catalogId = uuidv4();
  var releaseId = uuidv4();

  var artistsTitle = metadata.common.artist;
  var duration = metadata.format.duration;
  var isrc = metadata.common.isrc;
  var title = metadata.common.title;

  var genrePrimary = '';
  var genreSecondary = '';

  var type = 'single';

  var version = '';

  var tags = '';
  var links = '';

  var releaseDate = '';
  var releaseTime = '';

  var bpm = 0;

  save_cover_image(releaseId, metadata.common.picture[0].data, ()=>{
    convert_audio(filename, releaseId, songId, ()=>{
      influxDB.writePoints([
        {
          measurement: 'catalog',
          tags: {
            id: songId
          },
          fields: {
            artistIds: '',
            artistsTitle: artistsTitle,
            bpm: bpm,
            creatorFriendly: true,
            debutDate: releaseDate,
            debutTime: releaseTime,
            duration: duration,
            explicit: false,
            genrePrimary: genrePrimary,
            genreSecondary: genreSecondary,
            isrc: isrc,
            playlistSort: 0,
            releaseId: releaseId,
            tags: tags,
            title: title,
            version: version,
            inEarlyAccess: false,
            downloadable: true,
            streamable: true
          }
        },
        {
          measurement: 'release',
          tags: {
            id: releaseId
          },
          fields: {
            catalogId: catalogId,
            artistsTitle:artistsTitle,
            genrePrimary:genrePrimary,
            genreSecondary:genreSecondary,
            links:links,
            releaseDate:releaseDate,
            releaseTime:releaseTime,
            title:title,
            type:type,
            version:version
          }
        }
      ]);
    });
  });
}

function convert_audio(filename, releaseId, songid, callback){
  create_audio_dirs(releaseId, ()=>{
    convert_to_flac(filename, releaseId, songid, ()=>{
      convert_to_mp3(filename, releaseId, songid, ()=>{
        convert_to_wav(filename, releaseId, songid, callback);
      });
    });
  });
}

function create_audio_dirs(releaseId, callback){
  exec('mkdir -p songs/' + releaseId + '/flac & mkdir -p songs/' + releaseId + '/mp3 & mkdir -p songs/' + releaseId + '/wav', (error, stdout, stderr)=>{
    callback();
  });
}

function convert_to_flac(filename, releaseId, songid, callback){
  exec('ffmpeg -i ' + filename + ' songs/' + releaseId + '/flac/' + songid + '.flac', (error, stdout, stderr)=>{
    callback();
  });
}

function convert_to_mp3(filename, releaseId, songid, callback){
  exec('ffmpeg -i ' + filename + ' songs/' + releaseId + '/mp3/' + songid + '.mp3', (error, stdout, stderr)=>{
    callback();
  });
}

function convert_to_wav(filename, releaseId, songid, callback){
  exec('ffmpeg -i ' + filename + ' songs/' + releaseId + '/wav/' + songid + '.wav', (error, stdout, stderr)=>{
    callback();
  });
}

function save_cover_image(releaseId, coverImage, callback){
  if(coverImage){
    create_cover_image_dirs(releaseId, ()=>{
      var fs_stream = fs.createWriteStream('covers/' + releaseId + '.jpg');

      fs_stream.write(coverImage);
      fs_stream.end();
      callback();
    });
  }else{
    callback();
  }
}

function create_cover_image_dirs(releaseId, callback){
  exec('mkdir -p covers/' + releaseId, (error, stdout, stderr)=>{
    callback();
  });
}
