/**
 * StiffEyes HackBar Crypto — pure-JS hash & encoding (no external dependencies).
 * Algorithms: MD5, SHA-1, SHA-256, ROT13, Base64, Hex.
 *
 * Ported from HackBar v2.3.1 Encrypt.js (www.farfarfar.com).
 */
var StiffEyesHackbarCrypto = (function () {
  var CHAR_BIT = 8;

  function rotateLeft(val, n) {
    return (val << n) | (val >>> (32 - n));
  }

  function rotateRight(val, n) {
    return (val >>> n) | (val << (32 - n));
  }

  function safeAdd(a, b) {
    var t = (a & 0xffff) + (b & 0xffff);
    return ((a >> 16) + (b >> 16) + (t >> 16)) << 16 | (t & 0xffff);
  }

  function strToLittleEndianArray(str) {
    var x = [];
    var mask = (1 << CHAR_BIT) - 1;
    for (var i = 0, j = 0; j < str.length; i += CHAR_BIT) {
      x[i >> 5] |= (str.charCodeAt(j++) & mask) << (i & 0x1f);
    }
    return x;
  }

  function strToBigEndianArray(str) {
    var x = [];
    var mask = (1 << CHAR_BIT) - 1;
    for (var i = 0, j = 0; j < str.length; i += CHAR_BIT) {
      x[i >> 5] |= (str.charCodeAt(j++) & mask) << (32 - CHAR_BIT - (i & 0x1f));
    }
    return x;
  }

  function littleEndianArrayToHex(ar) {
    var charHex = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'];
    var str = '';
    for (var i = 0, tmp = ar.length << 2; i < tmp; i++) {
      str += charHex[(ar[i >> 2] >> (((i & 3) << 3) + 4)) & 0xF] +
             charHex[(ar[i >> 2] >> ((i & 3) << 3)) & 0xF];
    }
    return str;
  }

  function bigEndianArrayToHex(ar) {
    var charHex = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'];
    var str = '';
    for (var i = 0, tmp = ar.length << 2; i < tmp; i++) {
      str += charHex[(ar[i >> 2] >> (((3 - (i & 3)) << 3) + 4)) & 0xF] +
             charHex[(ar[i >> 2] >> ((3 - (i & 3)) << 3)) & 0xF];
    }
    return str;
  }

  // ---- MD5 ----

  function md5(str) {
    return littleEndianArrayToHex(md5Binary(str));
  }

  function md5Binary(str) {
    var x = strToLittleEndianArray(str);
    var strBit = str.length * CHAR_BIT;
    x[strBit >> 5] |= 0x80 << (strBit & 0x1f);
    x[(((strBit + 64) >>> 9) << 4) + 14] = strBit;

    var a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
    var S11 = 7, S12 = 12, S13 = 17, S14 = 22;
    var S21 = 5, S22 = 9, S23 = 14, S24 = 20;
    var S31 = 4, S32 = 11, S33 = 16, S34 = 23;
    var S41 = 6, S42 = 10, S43 = 15, S44 = 21;

    var len = x.length;
    for (var k = 0; k < len; k += 16) {
      var aa = a, bb = b, cc = c, dd = d;
      a = ff(a,b,c,d,x[k+0], S11,0xd76aa478); d = ff(d,a,b,c,x[k+1], S12,0xe8c7b756);
      c = ff(c,d,a,b,x[k+2], S13,0x242070db); b = ff(b,c,d,a,x[k+3], S14,0xc1bdceee);
      a = ff(a,b,c,d,x[k+4], S11,0xf57c0faf); d = ff(d,a,b,c,x[k+5], S12,0x4787c62a);
      c = ff(c,d,a,b,x[k+6], S13,0xa8304613); b = ff(b,c,d,a,x[k+7], S14,0xfd469501);
      a = ff(a,b,c,d,x[k+8], S11,0x698098d8); d = ff(d,a,b,c,x[k+9], S12,0x8b44f7af);
      c = ff(c,d,a,b,x[k+10],S13,0xffff5bb1); b = ff(b,c,d,a,x[k+11],S14,0x895cd7be);
      a = ff(a,b,c,d,x[k+12],S11,0x6b901122); d = ff(d,a,b,c,x[k+13],S12,0xfd987193);
      c = ff(c,d,a,b,x[k+14],S13,0xa679438e); b = ff(b,c,d,a,x[k+15],S14,0x49b40821);
      a = gg(a,b,c,d,x[k+1], S21,0xf61e2562); d = gg(d,a,b,c,x[k+6], S22,0xc040b340);
      c = gg(c,d,a,b,x[k+11],S23,0x265e5a51); b = gg(b,c,d,a,x[k+0], S24,0xe9b6c7aa);
      a = gg(a,b,c,d,x[k+5], S21,0xd62f105d); d = gg(d,a,b,c,x[k+10],S22,0x2441453);
      c = gg(c,d,a,b,x[k+15],S23,0xd8a1e681); b = gg(b,c,d,a,x[k+4], S24,0xe7d3fbc8);
      a = gg(a,b,c,d,x[k+9], S21,0x21e1cde6); d = gg(d,a,b,c,x[k+14],S22,0xc33707d6);
      c = gg(c,d,a,b,x[k+3], S23,0xf4d50d87); b = gg(b,c,d,a,x[k+8], S24,0x455a14ed);
      a = gg(a,b,c,d,x[k+13],S21,0xa9e3e905); d = gg(d,a,b,c,x[k+2], S22,0xfcefa3f8);
      c = gg(c,d,a,b,x[k+7], S23,0x676f02d9); b = gg(b,c,d,a,x[k+12],S24,0x8d2a4c8a);
      a = hh(a,b,c,d,x[k+5], S31,0xfffa3942); d = hh(d,a,b,c,x[k+8], S32,0x8771f681);
      c = hh(c,d,a,b,x[k+11],S33,0x6d9d6122); b = hh(b,c,d,a,x[k+14],S34,0xfde5380c);
      a = hh(a,b,c,d,x[k+1], S31,0xa4beea44); d = hh(d,a,b,c,x[k+4], S32,0x4bdecfa9);
      c = hh(c,d,a,b,x[k+7], S33,0xf6bb4b60); b = hh(b,c,d,a,x[k+10],S34,0xbebfbc70);
      a = hh(a,b,c,d,x[k+13],S31,0x289b7ec6); d = hh(d,a,b,c,x[k+0], S32,0xeaa127fa);
      c = hh(c,d,a,b,x[k+3], S33,0xd4ef3085); b = hh(b,c,d,a,x[k+6], S34,0x4881d05);
      a = hh(a,b,c,d,x[k+9], S31,0xd9d4d039); d = hh(d,a,b,c,x[k+12],S32,0xe6db99e5);
      c = hh(c,d,a,b,x[k+15],S33,0x1fa27cf8); b = hh(b,c,d,a,x[k+2], S34,0xc4ac5665);
      a = ii(a,b,c,d,x[k+0], S41,0xf4292244); d = ii(d,a,b,c,x[k+7], S42,0x432aff97);
      c = ii(c,d,a,b,x[k+14],S43,0xab9423a7); b = ii(b,c,d,a,x[k+5], S44,0xfc93a039);
      a = ii(a,b,c,d,x[k+12],S41,0x655b59c3); d = ii(d,a,b,c,x[k+3], S42,0x8f0ccc92);
      c = ii(c,d,a,b,x[k+10],S43,0xffeff47d); b = ii(b,c,d,a,x[k+1], S44,0x85845dd1);
      a = ii(a,b,c,d,x[k+8], S41,0x6fa87e4f); d = ii(d,a,b,c,x[k+15],S42,0xfe2ce6e0);
      c = ii(c,d,a,b,x[k+6], S43,0xa3014314); b = ii(b,c,d,a,x[k+13],S44,0x4e0811a1);
      a = ii(a,b,c,d,x[k+4], S41,0xf7537e82); d = ii(d,a,b,c,x[k+11],S42,0xbd3af235);
      c = ii(c,d,a,b,x[k+2], S43,0x2ad7d2bb); b = ii(b,c,d,a,x[k+9], S44,0xeb86d391);
      a = safeAdd(a,aa); b = safeAdd(b,bb); c = safeAdd(c,cc); d = safeAdd(d,dd);
    }
    return [a, b, c, d];
  }

  function f(x,y,z) { return (x & y) | ((~x) & z); }
  function g(x,y,z) { return (x & z) | (y & (~z)); }
  function h(x,y,z) { return (x ^ y ^ z); }
  function i(x,y,z) { return (y ^ (x | (~z))); }
  function ff(a,b,c,d,x,s,ac) { return safeAdd(rotateLeft(safeAdd(a, safeAdd(safeAdd(f(b,c,d), x), ac)), s), b); }
  function gg(a,b,c,d,x,s,ac) { return safeAdd(rotateLeft(safeAdd(a, safeAdd(safeAdd(g(b,c,d), x), ac)), s), b); }
  function hh(a,b,c,d,x,s,ac) { return safeAdd(rotateLeft(safeAdd(a, safeAdd(safeAdd(h(b,c,d), x), ac)), s), b); }
  function ii(a,b,c,d,x,s,ac) { return safeAdd(rotateLeft(safeAdd(a, safeAdd(safeAdd(i(b,c,d), x), ac)), s), b); }

  // ---- SHA-1 ----

  function sha1(str) {
    return bigEndianArrayToHex(sha1Binary(str));
  }

  function sha1Binary(str) {
    var w = new Array(80);
    var a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476, e = 0xc3d2e1f0;
    var x = strToBigEndianArray(str);
    var strBit = str.length * CHAR_BIT;
    x[strBit >> 5] |= 0x80 << (24 - (strBit & 0x1f));
    x[((strBit + 64 >> 9) << 4) + 15] = strBit;

    var len = x.length;
    for (var i = 0; i < len; i += 16) {
      var aa = a, bb = b, cc = c, dd = d, ee = e;
      var j = 0;
      for (; j < 16; j++) {
        w[j] = x[i + j];
        var t = safeAdd(safeAdd(rotateLeft(a, 5), (b & c) | ((~b) & d)), safeAdd(safeAdd(e, w[j]), 0x5A827999));
        e = d; d = c; c = rotateLeft(b, 30); b = a; a = t;
      }
      for (; j < 20; j++) {
        w[j] = rotateLeft(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
        var t = safeAdd(safeAdd(rotateLeft(a, 5), (b & c) | ((~b) & d)), safeAdd(safeAdd(e, w[j]), 0x5A827999));
        e = d; d = c; c = rotateLeft(b, 30); b = a; a = t;
      }
      for (; j < 40; j++) {
        w[j] = rotateLeft(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
        var t = safeAdd(safeAdd(rotateLeft(a, 5), b ^ c ^ d), safeAdd(safeAdd(e, w[j]), 0x6ED9EBA1));
        e = d; d = c; c = rotateLeft(b, 30); b = a; a = t;
      }
      for (; j < 60; j++) {
        w[j] = rotateLeft(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
        var t = safeAdd(safeAdd(rotateLeft(a, 5), (b & c) | (d & (b | c))), safeAdd(safeAdd(e, w[j]), 0x8F1BBCDC));
        e = d; d = c; c = rotateLeft(b, 30); b = a; a = t;
      }
      for (; j < 80; j++) {
        w[j] = rotateLeft(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
        var t = safeAdd(safeAdd(rotateLeft(a, 5), b ^ c ^ d), safeAdd(safeAdd(e, w[j]), 0xCA62C1D6));
        e = d; d = c; c = rotateLeft(b, 30); b = a; a = t;
      }
      a = safeAdd(a,aa); b = safeAdd(b,bb); c = safeAdd(c,cc); d = safeAdd(d,dd); e = safeAdd(e,ee);
    }
    return [a, b, c, d, e];
  }

  // ---- SHA-256 ----

  function sha256(str) {
    return bigEndianArrayToHex(sha256Binary(str));
  }

  function sha256Binary(str) {
    var K = [
      0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
      0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
      0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
      0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
      0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
      0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
      0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
      0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
    ];
    var w = new Array(64);
    var a = 0x6A09E667, b = 0xBB67AE85, c = 0x3C6EF372, d = 0xA54FF53A;
    var e = 0x510E527F, f = 0x9B05688C, g = 0x1F83D9AB, h = 0x5BE0CD19;
    var x = strToBigEndianArray(str);
    var strBit = str.length * CHAR_BIT;
    x[strBit >> 5] |= 0x80 << (24 - (strBit & 0x1f));
    x[((strBit + 64 >> 9) << 4) + 15] = strBit;

    var len = x.length;
    for (var i = 0; i < len; i += 16) {
      var aa = a, bb = b, cc = c, dd = d, ee = e, ff = f, gg = g, hh = h;
      var j = 0;
      for (; j < 16; j++) {
        w[j] = x[i + j];
        var S0 = rotateRight(a,2) ^ rotateRight(a,13) ^ rotateRight(a,22);
        var t0 = safeAdd(S0, (a & b) | (b & c) | (c & a));
        var S1 = rotateRight(e,6) ^ rotateRight(e,11) ^ rotateRight(e,25);
        var t1 = safeAdd(safeAdd(safeAdd(safeAdd(h, S1), (e & f) | ((~e) & g)), K[j]), w[j]);
        h = g; g = f; f = e; e = safeAdd(d, t1); d = c; c = b; b = a; a = safeAdd(t0, t1);
      }
      for (; j < 64; j++) {
        w[j] = safeAdd(safeAdd(safeAdd(w[j-16],
          rotateRight(w[j-15],7) ^ rotateRight(w[j-15],18) ^ (w[j-15] >>> 3)),
          w[j-7]),
          rotateRight(w[j-2],17) ^ rotateRight(w[j-2],19) ^ (w[j-2] >>> 10));
        var S0 = rotateRight(a,2) ^ rotateRight(a,13) ^ rotateRight(a,22);
        var t0 = safeAdd(S0, (a & b) | (b & c) | (c & a));
        var S1 = rotateRight(e,6) ^ rotateRight(e,11) ^ rotateRight(e,25);
        var t1 = safeAdd(safeAdd(safeAdd(safeAdd(h, S1), (e & f) | ((~e) & g)), K[j]), w[j]);
        h = g; g = f; f = e; e = safeAdd(d, t1); d = c; c = b; b = a; a = safeAdd(t0, t1);
      }
      a = safeAdd(a,aa); b = safeAdd(b,bb); c = safeAdd(c,cc); d = safeAdd(d,dd);
      e = safeAdd(e,ee); f = safeAdd(f,ff); g = safeAdd(g,gg); h = safeAdd(h,hh);
    }
    return [a, b, c, d, e, f, g, h];
  }

  // ---- ROT13 ----

  function rot13(str) {
    return str.replace(/[a-zA-Z]/g, function (c) {
      return String.fromCharCode((c <= 'Z' ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
  }

  // ---- Base64 ----

  function base64Encode(str) {
    var charBase64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var out = '';
    var chr1, chr2, chr3;
    var i = 0;
    var len = str.length;
    while (i < len) {
      chr1 = str.charCodeAt(i++);
      chr2 = str.charCodeAt(i++);
      chr3 = str.charCodeAt(i++);
      var enc1 = chr1 >> 2;
      var enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      var enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      var enc4 = chr3 & 63;
      out += charBase64.charAt(enc1) + charBase64.charAt(enc2);
      if (isNaN(chr2)) out += '==';
      else if (isNaN(chr3)) out += charBase64.charAt(enc3) + '=';
      else out += charBase64.charAt(enc3) + charBase64.charAt(enc4);
    }
    return out;
  }

  function base64Decode(str) {
    var indexBase64 = new Array(256);
    for (var i = 0; i < 256; i++) indexBase64[i] = -1;
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    for (var j = 0; j < 64; j++) indexBase64[chars.charCodeAt(j)] = j;

    str = str.replace(/^[^a-zA-Z0-9\+\/\=]+|[^a-zA-Z0-9\+\/\=]+$/g, '');
    var out = '';
    var i = 0;
    var len = str.length;
    while (i < len) {
      var enc1 = indexBase64[str.charCodeAt(i++)];
      var enc2 = indexBase64[str.charCodeAt(i++)];
      var enc3 = indexBase64[str.charCodeAt(i++)];
      var enc4 = indexBase64[str.charCodeAt(i++)];
      var chr1 = (enc1 << 2) | (enc2 >> 4);
      var chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      var chr3 = ((enc3 & 3) << 6) | enc4;
      out += String.fromCharCode(chr1);
      if (enc3 !== -1) out += String.fromCharCode(chr2);
      if (enc4 !== -1) out += String.fromCharCode(chr3);
    }
    return out;
  }

  // ---- Hex ----

  function hexEncode(str) {
    var charHex = '0123456789abcdef';
    var out = '';
    for (var i = 0; i < str.length; i++) {
      var s = str.charCodeAt(i);
      out += charHex.charAt(s >> 4) + charHex.charAt(s & 0xf);
    }
    return out;
  }

  function hexDecode(str) {
    var charHex = '0123456789abcdef';
    str = String(str).toLowerCase();
    if (str.length % 2 === 1) str += '0';
    var out = '';
    for (var i = 0; i < str.length; i += 2) {
      var index1 = charHex.indexOf(str.charAt(i));
      var index2 = charHex.indexOf(str.charAt(i + 1));
      if (index1 === -1 || index2 === -1) return '';
      out += String.fromCharCode((index1 << 4) | index2);
    }
    return out;
  }

  return {
    md5: md5,
    sha1: sha1,
    sha256: sha256,
    rot13: rot13,
    base64Encode: base64Encode,
    base64Decode: base64Decode,
    hexEncode: hexEncode,
    hexDecode: hexDecode
  };
})();
