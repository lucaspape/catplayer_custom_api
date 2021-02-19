const fs = require('fs');
const { exec } = require("child_process");
const Influx = require('influx');
const mm = require('music-metadata');
const { v4: uuidv4 } = require('uuid');
const database = require('./database.js');

var config = JSON.parse(fs.readFileSync('config.json'));

//dir structure: artistName/albumName/songs

var artist_dir = process.argv[2];

add_songs(artist_dir);

async function add_songs(artist_dir){
  var influxDB = database(config);

  const artist_files = fs.readdirSync(artist_dir);

  for(const artist_file of artist_files){
    var querys = [];

    var artist_name = artist_file;
    var artist_id = uuidv4();

    const album_files = fs.readdirSync(artist_dir + '/' + artist_name);

    for(const album_file of album_files){
      var album_name = album_file;
      var catalogId = uuidv4();
      var releaseId = uuidv4();

      var genre_primary = '';
      var genre_secondary = '';
      var links = '';
      var release_date = '';
      var release_time = '';
      var type = 'album';
      var version = '';

      querys.push({
        measurement: 'release',
        tags: {
          id: releaseId
        },
        fields: {
          catalogId: catalogId,
          artistsTitle:artist_name,
          genrePrimary:genre_primary,
          genreSecondary:genre_secondary,
          links:links,
          releaseDate:release_date,
          releaseTime:release_time,
          title:album_name,
          type:type,
          version:version
        }
      });

      const song_files = fs.readdirSync(artist_dir + '/' + artist_name + '/' + album_name);

      for(const song_file of song_files){
        var song_filename = artist_dir + '/' + artist_name + '/' + album_name + '/' + song_file;
        var songId = uuidv4();

        const metadata = await mm.parseFile(song_filename);

        var bpm = 0;
        var duration = metadata.format.duration;
        var isrc = metadata.common.isrc;
        var tags = '';
        var song_title = metadata.common.title;
        var song_version = '';

        var image_data = undefined;

        if(metadata.common.picture){
          if(metadata.common.picture[0]){
            image_data = metadata.common.picture[0].data;
          }
        }

        if(!image_data && process.argv[3]){
          image_data = fs.readFileSync(process.argv[3]);
        }

        await save_cover_image(releaseId, image_data);
        console.log('saved cover image!');
        await convert_audio('"' + song_filename + '"', releaseId, songId);
        console.log('converted audio!');

        querys.push({
          measurement: 'catalog',
          tags: {
            id: songId
          },
          fields: add_song_to_db('',artist_name,bpm,true,release_date,release_time,duration,false,genre_primary,genre_secondary,isrc,0,releaseId,tags,song_title,song_version,false,true,true)
        });

        querys.push(
        {
          measurement: 'release_tracks',
          tags: {
            releaseId: catalogId
          },
          fields: {
            songId: songId
          }
        });
      }
    }

    await influxDB.writePoints(querys);
  }

  console.log('Done!');
}

function add_song_to_db(artistIds, artistsTitle,bpm,creatorFriendly,debutDate,debutTime,duration,explicit,genrePrimary,genreSecondary,isrc,playlistSort,releaseId,tags,title,version,inEarlyAccess,downloadable,streamable){
  var search = artistsTitle + genrePrimary + genreSecondary + tags + title + version;

  return{
    artistIds: artistIds,
    artistsTitle: artistsTitle,
    bpm: bpm,
    creatorFriendly: creatorFriendly,
    debutDate: debutDate,
    debutTime: debutTime,
    duration: duration,
    explicit: explicit,
    genrePrimary: genrePrimary,
    genreSecondary: genreSecondary,
    isrc: isrc,
    playlistSort: playlistSort,
    releaseId: releaseId,
    tags: tags,
    title: title,
    version: version,
    inEarlyAccess: inEarlyAccess,
    downloadable: downloadable,
    streamable: streamable,
    search: search
  }
}

function convert_audio(filename, releaseId, songid){
  return new Promise((resolve,reject)=>{
    create_audio_dirs(releaseId, ()=>{
      convert_to_flac(filename, releaseId, songid, ()=>{
        convert_to_mp3(filename, releaseId, songid, ()=>{
          convert_to_wav(filename, releaseId, songid, ()=>{
            resolve();
          });
        });
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
  exec('ffmpeg -i ' + filename + ' -ab 320k songs/' + releaseId + '/mp3/' + songid + '.mp3', (error, stdout, stderr)=>{
    callback();
  });
}

function convert_to_wav(filename, releaseId, songid, callback){
  exec('ffmpeg -i ' + filename + ' songs/' + releaseId + '/wav/' + songid + '.wav', (error, stdout, stderr)=>{
    callback();
  });
}

function save_cover_image(releaseId, coverImage){
  return new Promise((resolve, reject)=>{
    if(coverImage){
      create_cover_image_dirs(releaseId, ()=>{
        var fs_stream = fs.createWriteStream('covers/' + releaseId + '/' + releaseId + '.jpg');

        fs_stream.write(coverImage);
        fs_stream.end();
        resolve();
      });
    }else{
      resolve();
    }
  });
}

function create_cover_image_dirs(releaseId, callback){
  exec('mkdir -p covers/' + releaseId, (error, stdout, stderr)=>{
    callback();
  });
}
