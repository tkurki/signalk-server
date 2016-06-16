var Bacon = require('baconjs');

var StreamBundle = require('../streambundle');


module.exports = function(app) {
  var api = {};

  var streamBundle = new StreamBundle();

  api.start = function() {
    var pushToStreamBundle = streamBundle.pushDelta.bind(streamBundle);
    var selfContext = 'vessels.' + app.selfId;
    app.signalk.on('delta', function(delta) {
      if (delta.context && delta.context === selfContext ) {
        pushToStreamBundle(delta);
      }
    });

    function mapToNmea(encoder) {
      Bacon.combineWith(encoder.f, encoder.keys.map(streamBundle.getStream, streamBundle))
        .changes()
        .debounceImmediate(20)
        .onValue(nmeaString => {
          app.signalk.emit('nmea0183out', nmeaString)
        });
    }

    mapToNmea(MWV);
    mapToNmea(APB_GC);
    mapToNmea(RMC);
  };

  api.stop = function() {
    app.signalk.removeListener(onDelta);
  };

  return api;
};


/*
=== MWV - Wind Speed and Angle ===

------------------------------------------------------------------------------
        1   2 3   4 5
        |   | |   | |
 $--MWV,x.x,a,x.x,a*hh<CR><LF>
------------------------------------------------------------------------------

Field Number:

1. Wind Angle, 0 to 360 degrees
2. Reference, R = Relative, T = True
3. Wind Speed
4. Wind Speed Units, K/M/N
5. Status, A = Data Valid
6. Checksum
*/

var MWV = {
  keys: [
    'environment.wind.angleApparent',
    'environment.wind.speedApparent'
  ],
  f: function mwv(angle, speed) {
    return toSentence([
      '$SKMWV',
      angle.toFixed(1),
      'R',
      speed.toFixed(1),
      'M',
      'A'
    ]);
  }
};

/*
------------------------------------------------------------------------------
                                        13    15
       1 2 3   4 5 6 7 8   9 10   11  12|   14|
       | | |   | | | | |   | |    |   | |   | |
$--APB,A,A,x.x,a,N,A,A,x.x,a,c--c,x.x,a,x.x,a*hh<CR><LF>
------------------------------------------------------------------------------

Field Number:

1. Status
V = LORAN-C Blink or SNR warning
V = general warning flag or other navigation systems when a reliable
fix is not available
2. Status
V = Loran-C Cycle Lock warning flag
A = OK or not used
3. Cross Track Error Magnitude
4. Direction to steer, L or R
5. Cross Track Units, N = Nautical Miles
6. Status
A = Arrival Circle Entered
7. Status
A = Perpendicular passed at waypoint
8. Bearing origin to destination
9. M = Magnetic, T = True
10. Destination Waypoint ID
11. Bearing, present position to Destination
12. M = Magnetic, T = True
13. Heading to steer to destination waypoint
14. M = Magnetic, T = True
15. Checksum

Example: $GPAPB,A,A,0.10,R,N,V,V,011,M,DEST,011,M,011,M*82
*/
var APB_GC = {
  keys: [
    'navigation.courseGreatCircle.crossTrackError',
    'navigation.courseGreatCircle.bearingTrackTrue',
    'navigation.courseGreatCircle.nextPoint.bearingTrue'
  ],
  f: function(xte, originToDest, toDestination) {
    return toSentence([
      '$SKAPB',
      'A',
      'A',
      Math.abs(xte),
      xte > 0 ? 'R' : 'L',
      'M',
      'V',
      'V',
      originToDest.toFixed(0),
      'T',
      '00',
      toDestination.toFixed(0),
      'T',
      toDestination.toFixed(0),
      'T'
    ]);
  }
}


/*
RMC - Recommended Minimum Navigation Information
This is one of the sentences commonly emitted by GPS units.

                                                          12
        1         2 3       4 5        6  7   8   9    10 11|  13
        |         | |       | |        |  |   |   |    |  | |   |
 $--RMC,hhmmss.ss,A,llll.ll,a,yyyyy.yy,a,x.x,x.x,xxxx,x.x,a,m,*hh<CR><LF>
Field Number:
1 UTC Time
2 Status, V=Navigation receiver warning A=Valid
3 Latitude
4 N or S
5 Longitude
6 E or W
7 Speed over ground, knots
8 Track made good, degrees true
9 Date, ddmmyy
10 Magnetic Variation, degrees
11 E or W
12 FAA mode indicator (NMEA 2.3 and later)
13 Checksum
*/

var RMC = {
  keys: [
    'navigation.datetime',
    'navigation.speedOverGround',
    'navigation.courseOverGroundTrue'
  ],
  f: function(datetime8601, sog, cog) {
    var datetime = new Date(datetime8601);
    var hours = ('00' + datetime.getHours()).slice(-2);
    var minutes = ('00' + datetime.getMinutes()).slice(-2);
    var seconds = ('00' + datetime.getSeconds()).slice(-2);
    return toSentence([
      '$SKRMC',
      hours + minutes + seconds + '.020',
      'A',
      '0000.00',
      'N',
      '0000.00',
      'E',
      (sog * 1.94384).toFixed(1),
      cog.toFixed(1),
      '0000',
      '8.0'
    ]);
  }
}

//===========================================================================

function toSentence(parts) {
  var base = parts.join(',');
  return base + computeChecksum(base);
}
var m_hex = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];

function computeChecksum(sentence) {
  var c1;
  var i;

  // skip the $
  i = 1;

  // init to first character    var count;

  c1 = sentence.charCodeAt(i);

  // process rest of characters, zero delimited
  for (i = 2; i < sentence.length; ++i) {
    c1 = c1 ^ sentence.charCodeAt(i);
  }

  return '*' + toHexString(c1);
};


function toHexString(v) {
  var lsn;
  var msn;

  msn = (v >> 4) & 0x0f;
  lsn = (v >> 0) & 0x0f;
  return m_hex[msn] + m_hex[lsn];
};
