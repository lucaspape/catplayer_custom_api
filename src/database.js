const Influx = require('influx');

module.exports = function(config){
  return new Influx.InfluxDB({host:config.influxdb.host, database:config.influxdb.database, username:config.influxdb.username, password:config.influxdb.password,
  schema: [
    {
      measurement: 'catalog',
      fields: {
        artistIds: Influx.FieldType.STRING,
        artistsTitle: Influx.FieldType.STRING,
        bpm: Influx.FieldType.INTEGER,
        creatorFriendly: Influx.FieldType.BOOLEAN,
        debutDate: Influx.FieldType.STRING,
        debutTime: Influx.FieldType.STRING,
        duration: Influx.FieldType.INTEGER,
        explicit: Influx.FieldType.BOOLEAN,
        genrePrimary: Influx.FieldType.STRING,
        genreSecondary: Influx.FieldType.STRING,
        isrc: Influx.FieldType.STRING,
        playlistSort: Influx.FieldType.INTEGER,
        releaseId: Influx.FieldType.STRING,
        tags: Influx.FieldType.STRING,
        title: Influx.FieldType.STRING,
        version: Influx.FieldType.STRING,
        inEarlyAccess: Influx.FieldType.BOOLEAN,
        downloadable: Influx.FieldType.BOOLEAN,
        streamable: Influx.FieldType.BOOLEAN,
        search: Influx.FieldType.STRING
      },
      tags: [
        'id'
      ]
    },
    {
      measurement: 'release',
      fields: {
        catalogId:Influx.FieldType.STRING,
        artistsTitle:Influx.FieldType.STRING,
        genrePrimary:Influx.FieldType.STRING,
        genreSecondary:Influx.FieldType.STRING,
        links:Influx.FieldType.STRING,
        releaseDate:Influx.FieldType.STRING,
        releaseTime:Influx.FieldType.STRING,
        title:Influx.FieldType.STRING,
        type:Influx.FieldType.STRING,
        version:Influx.FieldType.STRING
      },
      tags: [
        'id'
      ]
    },
    {
      measurement: 'session',
      fields: {

      },
      tags: [
        'id'
      ]
    },
    {
      measurement: 'user',
      fields: {
        password: Influx.FieldType.STRING
      },
      tags: [
        'id',
        'username'
      ]
    },
    {
      measurement: 'release_tracks',
      fields: {
        releaseId: Influx.FieldType.STRING,
        songId: Influx.FieldType.STRING
      },
      tags: [
        'id'
      ]
    },
    {
      measurement: 'playlist',
      fields: {
        name: Influx.FieldType.STRING
      },
      tags: [
        'id',
        'userId'
      ]
    },
    {
      measurement: 'playlist_tracks',
      fields: {
        songId: Influx.FieldType.STRING
      },
      tags: [
        'playlistId'
      ]
    }
  ]});
}
