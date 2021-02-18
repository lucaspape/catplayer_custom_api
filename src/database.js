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
        streamable: Influx.FieldType.BOOLEAN
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
    }
  ]});
}
