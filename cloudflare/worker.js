/* Juba QR Studio API — Cloudflare Workers edge version. MIT QR encoder, original SVG renderer.
 * GitHub Pages editor: https://juba-juba.github.io/Juba-QR-Studio/
 * Production API: https://juba-qr-studio-api.elprincedokdok0-048.workers.dev
 * Stateless API; no database, no login, QR content never stored.
 */
/* Offline QR encoder: Kazuhiko Arase, MIT license (see THIRD_PARTY_NOTICES.md) */
(function(root){
"use strict";
const factories={"QRMode":function(require,module,exports){
module.exports = {
    MODE_NUMBER :       1 << 0,
    MODE_ALPHA_NUM :    1 << 1,
    MODE_8BIT_BYTE :    1 << 2,
    MODE_KANJI :        1 << 3
};

},
"QRErrorCorrectLevel":function(require,module,exports){
module.exports = {
	L : 1,
	M : 0,
	Q : 3,
	H : 2
};


},
"QRMaskPattern":function(require,module,exports){
module.exports = {
	PATTERN000 : 0,
	PATTERN001 : 1,
	PATTERN010 : 2,
	PATTERN011 : 3,
	PATTERN100 : 4,
	PATTERN101 : 5,
	PATTERN110 : 6,
	PATTERN111 : 7
};

},
"QRMath":function(require,module,exports){
var QRMath = {

	glog : function(n) {
	
		if (n < 1) {
			throw new Error("glog(" + n + ")");
		}
		
		return QRMath.LOG_TABLE[n];
	},
	
	gexp : function(n) {
	
		while (n < 0) {
			n += 255;
		}
	
		while (n >= 256) {
			n -= 255;
		}
	
		return QRMath.EXP_TABLE[n];
	},
	
	EXP_TABLE : new Array(256),
	
	LOG_TABLE : new Array(256)

};
	
for (var i = 0; i < 8; i++) {
	QRMath.EXP_TABLE[i] = 1 << i;
}
for (var i = 8; i < 256; i++) {
	QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4]
		^ QRMath.EXP_TABLE[i - 5]
		^ QRMath.EXP_TABLE[i - 6]
		^ QRMath.EXP_TABLE[i - 8];
}
for (var i = 0; i < 255; i++) {
	QRMath.LOG_TABLE[QRMath.EXP_TABLE[i] ] = i;
}

module.exports = QRMath;

},
"QRPolynomial":function(require,module,exports){
var QRMath = require('./QRMath');

function QRPolynomial(num, shift) {
	if (num.length === undefined) {
		throw new Error(num.length + "/" + shift);
	}

	var offset = 0;

	while (offset < num.length && num[offset] === 0) {
		offset++;
	}

	this.num = new Array(num.length - offset + shift);
	for (var i = 0; i < num.length - offset; i++) {
		this.num[i] = num[i + offset];
	}
}

QRPolynomial.prototype = {

	get : function(index) {
		return this.num[index];
	},
	
	getLength : function() {
		return this.num.length;
	},
	
	multiply : function(e) {
	
		var num = new Array(this.getLength() + e.getLength() - 1);
	
		for (var i = 0; i < this.getLength(); i++) {
			for (var j = 0; j < e.getLength(); j++) {
				num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i) ) + QRMath.glog(e.get(j) ) );
			}
		}
	
		return new QRPolynomial(num, 0);
	},
	
	mod : function(e) {
	
		if (this.getLength() - e.getLength() < 0) {
			return this;
		}
	
		var ratio = QRMath.glog(this.get(0) ) - QRMath.glog(e.get(0) );
	
		var num = new Array(this.getLength() );
		
		for (var i = 0; i < this.getLength(); i++) {
			num[i] = this.get(i);
		}
		
		for (var x = 0; x < e.getLength(); x++) {
			num[x] ^= QRMath.gexp(QRMath.glog(e.get(x) ) + ratio);
		}
	
		// recursive call
		return new QRPolynomial(num, 0).mod(e);
	}
};

module.exports = QRPolynomial;

},
"QRRSBlock":function(require,module,exports){
var QRErrorCorrectLevel = require('./QRErrorCorrectLevel');

function QRRSBlock(totalCount, dataCount) {
	this.totalCount = totalCount;
	this.dataCount  = dataCount;
}

QRRSBlock.RS_BLOCK_TABLE = [

	// L
	// M
	// Q
	// H

	// 1
	[1, 26, 19],
	[1, 26, 16],
	[1, 26, 13],
	[1, 26, 9],
	
	// 2
	[1, 44, 34],
	[1, 44, 28],
	[1, 44, 22],
	[1, 44, 16],

	// 3
	[1, 70, 55],
	[1, 70, 44],
	[2, 35, 17],
	[2, 35, 13],

	// 4		
	[1, 100, 80],
	[2, 50, 32],
	[2, 50, 24],
	[4, 25, 9],
	
	// 5
	[1, 134, 108],
	[2, 67, 43],
	[2, 33, 15, 2, 34, 16],
	[2, 33, 11, 2, 34, 12],
	
	// 6
	[2, 86, 68],
	[4, 43, 27],
	[4, 43, 19],
	[4, 43, 15],
	
	// 7		
	[2, 98, 78],
	[4, 49, 31],
	[2, 32, 14, 4, 33, 15],
	[4, 39, 13, 1, 40, 14],
	
	// 8
	[2, 121, 97],
	[2, 60, 38, 2, 61, 39],
	[4, 40, 18, 2, 41, 19],
	[4, 40, 14, 2, 41, 15],
	
	// 9
	[2, 146, 116],
	[3, 58, 36, 2, 59, 37],
	[4, 36, 16, 4, 37, 17],
	[4, 36, 12, 4, 37, 13],
	
	// 10		
	[2, 86, 68, 2, 87, 69],
	[4, 69, 43, 1, 70, 44],
	[6, 43, 19, 2, 44, 20],
	[6, 43, 15, 2, 44, 16],

	// 11
	[4, 101, 81],
	[1, 80, 50, 4, 81, 51],
	[4, 50, 22, 4, 51, 23],
	[3, 36, 12, 8, 37, 13],

	// 12
	[2, 116, 92, 2, 117, 93],
	[6, 58, 36, 2, 59, 37],
	[4, 46, 20, 6, 47, 21],
	[7, 42, 14, 4, 43, 15],

	// 13
	[4, 133, 107],
	[8, 59, 37, 1, 60, 38],
	[8, 44, 20, 4, 45, 21],
	[12, 33, 11, 4, 34, 12],

	// 14
	[3, 145, 115, 1, 146, 116],
	[4, 64, 40, 5, 65, 41],
	[11, 36, 16, 5, 37, 17],
	[11, 36, 12, 5, 37, 13],

	// 15
	[5, 109, 87, 1, 110, 88],
	[5, 65, 41, 5, 66, 42],
	[5, 54, 24, 7, 55, 25],
	[11, 36, 12],

	// 16
	[5, 122, 98, 1, 123, 99],
	[7, 73, 45, 3, 74, 46],
	[15, 43, 19, 2, 44, 20],
	[3, 45, 15, 13, 46, 16],

	// 17
	[1, 135, 107, 5, 136, 108],
	[10, 74, 46, 1, 75, 47],
	[1, 50, 22, 15, 51, 23],
	[2, 42, 14, 17, 43, 15],

	// 18
	[5, 150, 120, 1, 151, 121],
	[9, 69, 43, 4, 70, 44],
	[17, 50, 22, 1, 51, 23],
	[2, 42, 14, 19, 43, 15],

	// 19
	[3, 141, 113, 4, 142, 114],
	[3, 70, 44, 11, 71, 45],
	[17, 47, 21, 4, 48, 22],
	[9, 39, 13, 16, 40, 14],

	// 20
	[3, 135, 107, 5, 136, 108],
	[3, 67, 41, 13, 68, 42],
	[15, 54, 24, 5, 55, 25],
	[15, 43, 15, 10, 44, 16],

	// 21
	[4, 144, 116, 4, 145, 117],
	[17, 68, 42],
	[17, 50, 22, 6, 51, 23],
	[19, 46, 16, 6, 47, 17],

	// 22
	[2, 139, 111, 7, 140, 112],
	[17, 74, 46],
	[7, 54, 24, 16, 55, 25],
	[34, 37, 13],

	// 23
	[4, 151, 121, 5, 152, 122],
	[4, 75, 47, 14, 76, 48],
	[11, 54, 24, 14, 55, 25],
	[16, 45, 15, 14, 46, 16],

	// 24
	[6, 147, 117, 4, 148, 118],
	[6, 73, 45, 14, 74, 46],
	[11, 54, 24, 16, 55, 25],
	[30, 46, 16, 2, 47, 17],

	// 25
	[8, 132, 106, 4, 133, 107],
	[8, 75, 47, 13, 76, 48],
	[7, 54, 24, 22, 55, 25],
	[22, 45, 15, 13, 46, 16],

	// 26
	[10, 142, 114, 2, 143, 115],
	[19, 74, 46, 4, 75, 47],
	[28, 50, 22, 6, 51, 23],
	[33, 46, 16, 4, 47, 17],

	// 27
	[8, 152, 122, 4, 153, 123],
	[22, 73, 45, 3, 74, 46],
	[8, 53, 23, 26, 54, 24],
	[12, 45, 15, 28, 46, 16],

	// 28
	[3, 147, 117, 10, 148, 118],
	[3, 73, 45, 23, 74, 46],
	[4, 54, 24, 31, 55, 25],
	[11, 45, 15, 31, 46, 16],

	// 29
	[7, 146, 116, 7, 147, 117],
	[21, 73, 45, 7, 74, 46],
	[1, 53, 23, 37, 54, 24],
	[19, 45, 15, 26, 46, 16],

	// 30
	[5, 145, 115, 10, 146, 116],
	[19, 75, 47, 10, 76, 48],
	[15, 54, 24, 25, 55, 25],
	[23, 45, 15, 25, 46, 16],

	// 31
	[13, 145, 115, 3, 146, 116],
	[2, 74, 46, 29, 75, 47],
	[42, 54, 24, 1, 55, 25],
	[23, 45, 15, 28, 46, 16],

	// 32
	[17, 145, 115],
	[10, 74, 46, 23, 75, 47],
	[10, 54, 24, 35, 55, 25],
	[19, 45, 15, 35, 46, 16],

	// 33
	[17, 145, 115, 1, 146, 116],
	[14, 74, 46, 21, 75, 47],
	[29, 54, 24, 19, 55, 25],
	[11, 45, 15, 46, 46, 16],

	// 34
	[13, 145, 115, 6, 146, 116],
	[14, 74, 46, 23, 75, 47],
	[44, 54, 24, 7, 55, 25],
	[59, 46, 16, 1, 47, 17],

	// 35
	[12, 151, 121, 7, 152, 122],
	[12, 75, 47, 26, 76, 48],
	[39, 54, 24, 14, 55, 25],
	[22, 45, 15, 41, 46, 16],

	// 36
	[6, 151, 121, 14, 152, 122],
	[6, 75, 47, 34, 76, 48],
	[46, 54, 24, 10, 55, 25],
	[2, 45, 15, 64, 46, 16],

	// 37
	[17, 152, 122, 4, 153, 123],
	[29, 74, 46, 14, 75, 47],
	[49, 54, 24, 10, 55, 25],
	[24, 45, 15, 46, 46, 16],

	// 38
	[4, 152, 122, 18, 153, 123],
	[13, 74, 46, 32, 75, 47],
	[48, 54, 24, 14, 55, 25],
	[42, 45, 15, 32, 46, 16],

	// 39
	[20, 147, 117, 4, 148, 118],
	[40, 75, 47, 7, 76, 48],
	[43, 54, 24, 22, 55, 25],
	[10, 45, 15, 67, 46, 16],

	// 40
	[19, 148, 118, 6, 149, 119],
	[18, 75, 47, 31, 76, 48],
	[34, 54, 24, 34, 55, 25],
	[20, 45, 15, 61, 46, 16]
];

QRRSBlock.getRSBlocks = function(typeNumber, errorCorrectLevel) {
	
	var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
	
	if (rsBlock === undefined) {
		throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectLevel:" + errorCorrectLevel);
	}

	var length = rsBlock.length / 3;
	
	var list = [];
	
	for (var i = 0; i < length; i++) {

		var count = rsBlock[i * 3 + 0];
		var totalCount = rsBlock[i * 3 + 1];
		var dataCount  = rsBlock[i * 3 + 2];

		for (var j = 0; j < count; j++) {
			list.push(new QRRSBlock(totalCount, dataCount) );	
		}
	}
	
	return list;
};

QRRSBlock.getRsBlockTable = function(typeNumber, errorCorrectLevel) {

	switch(errorCorrectLevel) {
	case QRErrorCorrectLevel.L :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
	case QRErrorCorrectLevel.M :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
	case QRErrorCorrectLevel.Q :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
	case QRErrorCorrectLevel.H :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
	default :
		return undefined;
	}
};

module.exports = QRRSBlock;

},
"QRBitBuffer":function(require,module,exports){
function QRBitBuffer() {
	this.buffer = [];
	this.length = 0;
}

QRBitBuffer.prototype = {

	get : function(index) {
		var bufIndex = Math.floor(index / 8);
		return ( (this.buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
	},
	
	put : function(num, length) {
		for (var i = 0; i < length; i++) {
			this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
		}
	},
	
	getLengthInBits : function() {
		return this.length;
	},
	
	putBit : function(bit) {
	
		var bufIndex = Math.floor(this.length / 8);
		if (this.buffer.length <= bufIndex) {
			this.buffer.push(0);
		}
	
		if (bit) {
			this.buffer[bufIndex] |= (0x80 >>> (this.length % 8) );
		}
	
		this.length++;
	}
};

module.exports = QRBitBuffer;

},
"QR8bitByte":function(require,module,exports){
var QRMode = require('./QRMode');

function QR8bitByte(data) {
	this.mode = QRMode.MODE_8BIT_BYTE;
	// Convert Unicode input to UTF-8 before putting bytes in QR segments.
	this.data = Array.from(new TextEncoder().encode(data), b => String.fromCharCode(b)).join('');
}

QR8bitByte.prototype = {

	getLength : function() {
		return this.data.length;
	},
	
	write : function(buffer) {
		for (var i = 0; i < this.data.length; i++) {
			// not JIS ...
			buffer.put(this.data.charCodeAt(i), 8);
		}
	}
};

module.exports = QR8bitByte;

},
"QRUtil":function(require,module,exports){
var QRMode = require('./QRMode');
var QRPolynomial = require('./QRPolynomial');
var QRMath = require('./QRMath');
var QRMaskPattern = require('./QRMaskPattern');

var QRUtil = {

    PATTERN_POSITION_TABLE : [
        [],
        [6, 18],
        [6, 22],
        [6, 26],
        [6, 30],
        [6, 34],
        [6, 22, 38],
        [6, 24, 42],
        [6, 26, 46],
        [6, 28, 50],
        [6, 30, 54],        
        [6, 32, 58],
        [6, 34, 62],
        [6, 26, 46, 66],
        [6, 26, 48, 70],
        [6, 26, 50, 74],
        [6, 30, 54, 78],
        [6, 30, 56, 82],
        [6, 30, 58, 86],
        [6, 34, 62, 90],
        [6, 28, 50, 72, 94],
        [6, 26, 50, 74, 98],
        [6, 30, 54, 78, 102],
        [6, 28, 54, 80, 106],
        [6, 32, 58, 84, 110],
        [6, 30, 58, 86, 114],
        [6, 34, 62, 90, 118],
        [6, 26, 50, 74, 98, 122],
        [6, 30, 54, 78, 102, 126],
        [6, 26, 52, 78, 104, 130],
        [6, 30, 56, 82, 108, 134],
        [6, 34, 60, 86, 112, 138],
        [6, 30, 58, 86, 114, 142],
        [6, 34, 62, 90, 118, 146],
        [6, 30, 54, 78, 102, 126, 150],
        [6, 24, 50, 76, 102, 128, 154],
        [6, 28, 54, 80, 106, 132, 158],
        [6, 32, 58, 84, 110, 136, 162],
        [6, 26, 54, 82, 110, 138, 166],
        [6, 30, 58, 86, 114, 142, 170]
    ],

    G15 : (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
    G18 : (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
    G15_MASK : (1 << 14) | (1 << 12) | (1 << 10)    | (1 << 4) | (1 << 1),

    getBCHTypeInfo : function(data) {
        var d = data << 10;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
            d ^= (QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) ) );    
        }
        return ( (data << 10) | d) ^ QRUtil.G15_MASK;
    },

    getBCHTypeNumber : function(data) {
        var d = data << 12;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
            d ^= (QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) ) );    
        }
        return (data << 12) | d;
    },

    getBCHDigit : function(data) {

        var digit = 0;

        while (data !== 0) {
            digit++;
            data >>>= 1;
        }

        return digit;
    },

    getPatternPosition : function(typeNumber) {
        return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
    },

    getMask : function(maskPattern, i, j) {
        
        switch (maskPattern) {
            
        case QRMaskPattern.PATTERN000 : return (i + j) % 2 === 0;
        case QRMaskPattern.PATTERN001 : return i % 2 === 0;
        case QRMaskPattern.PATTERN010 : return j % 3 === 0;
        case QRMaskPattern.PATTERN011 : return (i + j) % 3 === 0;
        case QRMaskPattern.PATTERN100 : return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 === 0;
        case QRMaskPattern.PATTERN101 : return (i * j) % 2 + (i * j) % 3 === 0;
        case QRMaskPattern.PATTERN110 : return ( (i * j) % 2 + (i * j) % 3) % 2 === 0;
        case QRMaskPattern.PATTERN111 : return ( (i * j) % 3 + (i + j) % 2) % 2 === 0;

        default :
            throw new Error("bad maskPattern:" + maskPattern);
        }
    },

    getErrorCorrectPolynomial : function(errorCorrectLength) {

        var a = new QRPolynomial([1], 0);

        for (var i = 0; i < errorCorrectLength; i++) {
            a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0) );
        }

        return a;
    },

    getLengthInBits : function(mode, type) {

        if (1 <= type && type < 10) {

            // 1 - 9

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 10;
            case QRMode.MODE_ALPHA_NUM  : return 9;
            case QRMode.MODE_8BIT_BYTE  : return 8;
            case QRMode.MODE_KANJI      : return 8;
            default :
                throw new Error("mode:" + mode);
            }

        } else if (type < 27) {

            // 10 - 26

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 12;
            case QRMode.MODE_ALPHA_NUM  : return 11;
            case QRMode.MODE_8BIT_BYTE  : return 16;
            case QRMode.MODE_KANJI      : return 10;
            default :
                throw new Error("mode:" + mode);
            }

        } else if (type < 41) {

            // 27 - 40

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 14;
            case QRMode.MODE_ALPHA_NUM  : return 13;
            case QRMode.MODE_8BIT_BYTE  : return 16;
            case QRMode.MODE_KANJI      : return 12;
            default :
                throw new Error("mode:" + mode);
            }

        } else {
            throw new Error("type:" + type);
        }
    },

    getLostPoint : function(qrCode) {
        
        var moduleCount = qrCode.getModuleCount();
        var lostPoint = 0;
        var row = 0; 
        var col = 0;

        
        // LEVEL1
        
        for (row = 0; row < moduleCount; row++) {

            for (col = 0; col < moduleCount; col++) {

                var sameCount = 0;
                var dark = qrCode.isDark(row, col);

                for (var r = -1; r <= 1; r++) {

                    if (row + r < 0 || moduleCount <= row + r) {
                        continue;
                    }

                    for (var c = -1; c <= 1; c++) {

                        if (col + c < 0 || moduleCount <= col + c) {
                            continue;
                        }

                        if (r === 0 && c === 0) {
                            continue;
                        }

                        if (dark === qrCode.isDark(row + r, col + c) ) {
                            sameCount++;
                        }
                    }
                }

                if (sameCount > 5) {
                    lostPoint += (3 + sameCount - 5);
                }
            }
        }

        // LEVEL2

        for (row = 0; row < moduleCount - 1; row++) {
            for (col = 0; col < moduleCount - 1; col++) {
                var count = 0;
                if (qrCode.isDark(row,     col    ) ) count++;
                if (qrCode.isDark(row + 1, col    ) ) count++;
                if (qrCode.isDark(row,     col + 1) ) count++;
                if (qrCode.isDark(row + 1, col + 1) ) count++;
                if (count === 0 || count === 4) {
                    lostPoint += 3;
                }
            }
        }

        // LEVEL3

        for (row = 0; row < moduleCount; row++) {
            for (col = 0; col < moduleCount - 6; col++) {
                if (qrCode.isDark(row, col) && 
                        !qrCode.isDark(row, col + 1) && 
                         qrCode.isDark(row, col + 2) && 
                         qrCode.isDark(row, col + 3) && 
                         qrCode.isDark(row, col + 4) && 
                        !qrCode.isDark(row, col + 5) && 
                         qrCode.isDark(row, col + 6) ) {
                    lostPoint += 40;
                }
            }
        }

        for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount - 6; row++) {
                if (qrCode.isDark(row, col) &&
                        !qrCode.isDark(row + 1, col) &&
                         qrCode.isDark(row + 2, col) &&
                         qrCode.isDark(row + 3, col) &&
                         qrCode.isDark(row + 4, col) &&
                        !qrCode.isDark(row + 5, col) &&
                         qrCode.isDark(row + 6, col) ) {
                    lostPoint += 40;
                }
            }
        }

        // LEVEL4
        
        var darkCount = 0;

        for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount; row++) {
                if (qrCode.isDark(row, col) ) {
                    darkCount++;
                }
            }
        }
        
        var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
        lostPoint += ratio * 10;

        return lostPoint;       
    }

};

module.exports = QRUtil;

},
"index":function(require,module,exports){
//---------------------------------------------------------------------
// QRCode for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//   http://www.opensource.org/licenses/mit-license.php
//
// The word "QR Code" is registered trademark of 
// DENSO WAVE INCORPORATED
//   http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------
// Modified to work in node for this project (and some refactoring)
//---------------------------------------------------------------------

var QR8bitByte = require('./QR8bitByte');
var QRUtil = require('./QRUtil');
var QRPolynomial = require('./QRPolynomial');
var QRRSBlock = require('./QRRSBlock');
var QRBitBuffer = require('./QRBitBuffer');

function QRCode(typeNumber, errorCorrectLevel) {
	this.typeNumber = typeNumber;
	this.errorCorrectLevel = errorCorrectLevel;
	this.modules = null;
	this.moduleCount = 0;
	this.dataCache = null;
	this.dataList = [];
}

QRCode.prototype = {
	
	addData : function(data) {
		var newData = new QR8bitByte(data);
		this.dataList.push(newData);
		this.dataCache = null;
	},
	
	isDark : function(row, col) {
		if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
			throw new Error(row + "," + col);
		}
		return this.modules[row][col];
	},

	getModuleCount : function() {
		return this.moduleCount;
	},
	
	make : function() {
		// Calculate automatically typeNumber if provided is < 1
		if (this.typeNumber < 1 ){
			var typeNumber = 1;
			for (typeNumber = 1; typeNumber < 40; typeNumber++) {
				var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel);

				var buffer = new QRBitBuffer();
				var totalDataCount = 0;
				for (var i = 0; i < rsBlocks.length; i++) {
					totalDataCount += rsBlocks[i].dataCount;
				}

				for (var x = 0; x < this.dataList.length; x++) {
					var data = this.dataList[x];
					buffer.put(data.mode, 4);
					buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
					data.write(buffer);
				}
				if (buffer.getLengthInBits() <= totalDataCount * 8)
					break;
			}
			this.typeNumber = typeNumber;
		}
		this.makeImpl(false, this.getBestMaskPattern() );
	},
	
	makeImpl : function(test, maskPattern) {
		
		this.moduleCount = this.typeNumber * 4 + 17;
		this.modules = new Array(this.moduleCount);
		
		for (var row = 0; row < this.moduleCount; row++) {
			
			this.modules[row] = new Array(this.moduleCount);
			
			for (var col = 0; col < this.moduleCount; col++) {
				this.modules[row][col] = null;//(col + row) % 3;
			}
		}
	
		this.setupPositionProbePattern(0, 0);
		this.setupPositionProbePattern(this.moduleCount - 7, 0);
		this.setupPositionProbePattern(0, this.moduleCount - 7);
		this.setupPositionAdjustPattern();
		this.setupTimingPattern();
		this.setupTypeInfo(test, maskPattern);
		
		if (this.typeNumber >= 7) {
			this.setupTypeNumber(test);
		}
	
		if (this.dataCache === null) {
			this.dataCache = QRCode.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
		}
	
		this.mapData(this.dataCache, maskPattern);
	},

	setupPositionProbePattern : function(row, col)  {
		
		for (var r = -1; r <= 7; r++) {
			
			if (row + r <= -1 || this.moduleCount <= row + r) continue;
			
			for (var c = -1; c <= 7; c++) {
				
				if (col + c <= -1 || this.moduleCount <= col + c) continue;
				
				if ( (0 <= r && r <= 6 && (c === 0 || c === 6) ) || 
                     (0 <= c && c <= 6 && (r === 0 || r === 6) ) || 
                     (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
					this.modules[row + r][col + c] = true;
				} else {
					this.modules[row + r][col + c] = false;
				}
			}		
		}		
	},
	
	getBestMaskPattern : function() {
	
		var minLostPoint = 0;
		var pattern = 0;
	
		for (var i = 0; i < 8; i++) {
			
			this.makeImpl(true, i);
	
			var lostPoint = QRUtil.getLostPoint(this);
	
			if (i === 0 || minLostPoint >  lostPoint) {
				minLostPoint = lostPoint;
				pattern = i;
			}
		}
	
		return pattern;
	},
	
	createMovieClip : function(target_mc, instance_name, depth) {
	
		var qr_mc = target_mc.createEmptyMovieClip(instance_name, depth);
		var cs = 1;
	
		this.make();

		for (var row = 0; row < this.modules.length; row++) {
			
			var y = row * cs;
			
			for (var col = 0; col < this.modules[row].length; col++) {
	
				var x = col * cs;
				var dark = this.modules[row][col];
			
				if (dark) {
					qr_mc.beginFill(0, 100);
					qr_mc.moveTo(x, y);
					qr_mc.lineTo(x + cs, y);
					qr_mc.lineTo(x + cs, y + cs);
					qr_mc.lineTo(x, y + cs);
					qr_mc.endFill();
				}
			}
		}
		
		return qr_mc;
	},

	setupTimingPattern : function() {
		
		for (var r = 8; r < this.moduleCount - 8; r++) {
			if (this.modules[r][6] !== null) {
				continue;
			}
			this.modules[r][6] = (r % 2 === 0);
		}
	
		for (var c = 8; c < this.moduleCount - 8; c++) {
			if (this.modules[6][c] !== null) {
				continue;
			}
			this.modules[6][c] = (c % 2 === 0);
		}
	},
	
	setupPositionAdjustPattern : function() {
	
		var pos = QRUtil.getPatternPosition(this.typeNumber);
		
		for (var i = 0; i < pos.length; i++) {
		
			for (var j = 0; j < pos.length; j++) {
			
				var row = pos[i];
				var col = pos[j];
				
				if (this.modules[row][col] !== null) {
					continue;
				}
				
				for (var r = -2; r <= 2; r++) {
				
					for (var c = -2; c <= 2; c++) {
					
						if (Math.abs(r) === 2 || 
                            Math.abs(c) === 2 ||
                            (r === 0 && c === 0) ) {
							this.modules[row + r][col + c] = true;
						} else {
							this.modules[row + r][col + c] = false;
						}
					}
				}
			}
		}
	},
	
	setupTypeNumber : function(test) {
	
		var bits = QRUtil.getBCHTypeNumber(this.typeNumber);
        var mod;
	
		for (var i = 0; i < 18; i++) {
			mod = (!test && ( (bits >> i) & 1) === 1);
			this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
		}
	
		for (var x = 0; x < 18; x++) {
			mod = (!test && ( (bits >> x) & 1) === 1);
			this.modules[x % 3 + this.moduleCount - 8 - 3][Math.floor(x / 3)] = mod;
		}
	},
	
	setupTypeInfo : function(test, maskPattern) {
	
		var data = (this.errorCorrectLevel << 3) | maskPattern;
		var bits = QRUtil.getBCHTypeInfo(data);
        var mod;
	
		// vertical		
		for (var v = 0; v < 15; v++) {
	
			mod = (!test && ( (bits >> v) & 1) === 1);
	
			if (v < 6) {
				this.modules[v][8] = mod;
			} else if (v < 8) {
				this.modules[v + 1][8] = mod;
			} else {
				this.modules[this.moduleCount - 15 + v][8] = mod;
			}
		}
	
		// horizontal
		for (var h = 0; h < 15; h++) {
	
			mod = (!test && ( (bits >> h) & 1) === 1);
			
			if (h < 8) {
				this.modules[8][this.moduleCount - h - 1] = mod;
			} else if (h < 9) {
				this.modules[8][15 - h - 1 + 1] = mod;
			} else {
				this.modules[8][15 - h - 1] = mod;
			}
		}
	
		// fixed module
		this.modules[this.moduleCount - 8][8] = (!test);
	
	},
	
	mapData : function(data, maskPattern) {
		
		var inc = -1;
		var row = this.moduleCount - 1;
		var bitIndex = 7;
		var byteIndex = 0;
		
		for (var col = this.moduleCount - 1; col > 0; col -= 2) {
	
			if (col === 6) col--;
	
			while (true) {
	
				for (var c = 0; c < 2; c++) {
					
					if (this.modules[row][col - c] === null) {
						
						var dark = false;
	
						if (byteIndex < data.length) {
							dark = ( ( (data[byteIndex] >>> bitIndex) & 1) === 1);
						}
	
						var mask = QRUtil.getMask(maskPattern, row, col - c);
	
						if (mask) {
							dark = !dark;
						}
						
						this.modules[row][col - c] = dark;
						bitIndex--;
	
						if (bitIndex === -1) {
							byteIndex++;
							bitIndex = 7;
						}
					}
				}
								
				row += inc;
	
				if (row < 0 || this.moduleCount <= row) {
					row -= inc;
					inc = -inc;
					break;
				}
			}
		}
		
	}

};

QRCode.PAD0 = 0xEC;
QRCode.PAD1 = 0x11;

QRCode.createData = function(typeNumber, errorCorrectLevel, dataList) {
	
	var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
	
	var buffer = new QRBitBuffer();
	
	for (var i = 0; i < dataList.length; i++) {
		var data = dataList[i];
		buffer.put(data.mode, 4);
		buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
		data.write(buffer);
	}

	// calc num max data.
	var totalDataCount = 0;
	for (var x = 0; x < rsBlocks.length; x++) {
		totalDataCount += rsBlocks[x].dataCount;
	}

	if (buffer.getLengthInBits() > totalDataCount * 8) {
		throw new Error("code length overflow. (" + 
            buffer.getLengthInBits() + 
            ">" +  
            totalDataCount * 8 + 
            ")");
	}

	// end code
	if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
		buffer.put(0, 4);
	}

	// padding
	while (buffer.getLengthInBits() % 8 !== 0) {
		buffer.putBit(false);
	}

	// padding
	while (true) {
		
		if (buffer.getLengthInBits() >= totalDataCount * 8) {
			break;
		}
		buffer.put(QRCode.PAD0, 8);
		
		if (buffer.getLengthInBits() >= totalDataCount * 8) {
			break;
		}
		buffer.put(QRCode.PAD1, 8);
	}

	return QRCode.createBytes(buffer, rsBlocks);
};

QRCode.createBytes = function(buffer, rsBlocks) {

	var offset = 0;
	
	var maxDcCount = 0;
	var maxEcCount = 0;
	
	var dcdata = new Array(rsBlocks.length);
	var ecdata = new Array(rsBlocks.length);
	
	for (var r = 0; r < rsBlocks.length; r++) {

		var dcCount = rsBlocks[r].dataCount;
		var ecCount = rsBlocks[r].totalCount - dcCount;

		maxDcCount = Math.max(maxDcCount, dcCount);
		maxEcCount = Math.max(maxEcCount, ecCount);
		
		dcdata[r] = new Array(dcCount);
		
		for (var i = 0; i < dcdata[r].length; i++) {
			dcdata[r][i] = 0xff & buffer.buffer[i + offset];
		}
		offset += dcCount;
		
		var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
		var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);

		var modPoly = rawPoly.mod(rsPoly);
		ecdata[r] = new Array(rsPoly.getLength() - 1);
		for (var x = 0; x < ecdata[r].length; x++) {
            var modIndex = x + modPoly.getLength() - ecdata[r].length;
			ecdata[r][x] = (modIndex >= 0)? modPoly.get(modIndex) : 0;
		}

	}
	
	var totalCodeCount = 0;
	for (var y = 0; y < rsBlocks.length; y++) {
		totalCodeCount += rsBlocks[y].totalCount;
	}

	var data = new Array(totalCodeCount);
	var index = 0;

	for (var z = 0; z < maxDcCount; z++) {
		for (var s = 0; s < rsBlocks.length; s++) {
			if (z < dcdata[s].length) {
				data[index++] = dcdata[s][z];
			}
		}
	}

	for (var xx = 0; xx < maxEcCount; xx++) {
		for (var t = 0; t < rsBlocks.length; t++) {
			if (xx < ecdata[t].length) {
				data[index++] = ecdata[t][xx];
			}
		}
	}

	return data;

};

module.exports = QRCode;

}};
const cache={};
function load(name){let clean=name.replace(/^\.\//,'').replace(/\.js$/,'');if(cache[clean])return cache[clean].exports;if(!factories[clean])throw Error('Unknown QR module: '+name);let m={exports:{}};cache[clean]=m;factories[clean](load,m,m.exports);return m.exports;}
root.QRCore={QRCode:load('index'),ErrorCorrectLevel:load('QRErrorCorrectLevel')};
if(typeof module==='object'&&module.exports)module.exports=root.QRCore;
})(typeof window!=='undefined'?window:globalThis);

/* Shared vector QR renderer for browser and Node. No network access. */
(function(root){
"use strict";
function roundedPath(x,y,w,h,r){r=Math.max(0,Math.min(w/2,h/2,r));return `M${x+r} ${y}H${x+w-r}Q${x+w} ${y} ${x+w} ${y+r}V${y+h-r}Q${x+w} ${y+h} ${x+w-r} ${y+h}H${x+r}Q${x} ${y+h} ${x} ${y+h-r}V${y+r}Q${x} ${y} ${x+r} ${y}Z`;}
function svgRect(x,y,w,h,fill,rx=0){return `<rect x="${x}" y="${y}" width="${w}" height="${h}"${rx?` rx="${rx}"`:''} fill="${fill}"/>`;}
function svgCircle(cx,cy,r,fill){return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;}
// Shape identifiers follow QRCode Monkey public API, with independently-drawn vector geometry.
// The reference service's proprietary vectors aren't published; the geometry here is original.
const MONKEY_BODIES=['square','mosaic','dot','circle','circle-zebra','circle-zebra-vertical','circular','edge-cut','edge-cut-smooth','japnese','leaf','pointed','pointed-edge-cut','pointed-in','pointed-in-smooth','pointed-smooth','round','rounded-in','rounded-in-smooth','rounded-pointed','star','diamond'];
const MONKEY_FRAMES=['frame0','frame1','frame2','frame3','frame4','frame5','frame6','frame7','frame8','frame10','frame11','frame12','frame13','frame14','frame16'];
const MONKEY_BALLS=['ball0','ball1','ball2','ball3','ball5','ball6','ball7','ball8','ball10','ball11','ball12','ball13','ball14','ball15','ball16','ball17','ball18','ball19'];
function polygon(points,fill){return `<polygon points="${points.map(p=>p.join(',')).join(' ')}" fill="${fill}"/>`;}
function shapePath(x,y,n,fill){return `<path d="${n}" fill="${fill}"/>`;}
function cornerRadiusPath(x,y,neighbors,rad){
  // Round exposed corners; connected modules share an unbroken flat edge.
  const u=!!neighbors?.u,d=!!neighbors?.d,l=!!neighbors?.l,r=!!neighbors?.r;
  const tl=(u||l)?0:rad,tr=(u||r)?0:rad,br=(d||r)?0:rad,bl=(d||l)?0:rad;
  return `M${x+tl} ${y}H${x+1-tr}Q${x+1} ${y} ${x+1} ${y+tr}V${y+1-br}Q${x+1} ${y+1} ${x+1-br} ${y+1}H${x+bl}Q${x} ${y+1} ${x} ${y+1-bl}V${y+tl}Q${x} ${y} ${x+tl} ${y}Z`;
}
function cutPoints(x,y,neighbors,cut=.27,inside=false){
 const n=neighbors||{},a=(!n.u&&!n.l)?cut:0,b=(!n.u&&!n.r)?cut:0,c=(!n.d&&!n.r)?cut:0,d=(!n.d&&!n.l)?cut:0;
 return inside?[[x,y+a],[x+a,y+a],[x+a,y],[x+1-b,y],[x+1-b,y+b],[x+1,y+b],[x+1,y+1-c],[x+1-c,y+1-c],[x+1-c,y+1],[x+d,y+1],[x+d,y+1-d],[x,y+1-d]]:
 [[x+a,y],[x+1-b,y],[x+1,y+b],[x+1,y+1-c],[x+1-c,y+1],[x+d,y+1],[x,y+1-d],[x,y+a]];
}
function moduleSVG(x,y,shape,fill,r=0,c=0,neighbors={}){
 const u=!!neighbors.u,d=!!neighbors.d,l=!!neighbors.l,rr=!!neighbors.r;
 switch(shape){
 case 'dot':return svgCircle(x+.5,y+.5,.23,fill);
 case 'circle':return svgCircle(x+.5,y+.5,.47,fill);
 case 'circle-zebra':{
   let x0=x+(l?0:.08), x1=x+1-(rr?0:.08);
   return svgRect(x0,y+.11,x1-x0,.32,fill,.15)+svgRect(x0,y+.57,x1-x0,.32,fill,.15);
 }
 case 'circle-zebra-vertical':{
   let y0=y+(u?0:.08),y1=y+1-(d?0:.08);
   return svgRect(x+.11,y0,.32,y1-y0,fill,.15)+svgRect(x+.57,y0,.32,y1-y0,fill,.15);
 }
 case 'circular':return svgCircle(x+.5,y+.5,.47,fill)+(l?svgRect(x,y+.35,.5,.3,fill):'')+(rr?svgRect(x+.5,y+.35,.5,.3,fill):'')+(u?svgRect(x+.35,y,.3,.5,fill):'')+(d?svgRect(x+.35,y+.5,.3,.5,fill):'');
 case 'round':return shapePath(x,y,cornerRadiusPath(x,y,neighbors,.42),fill);
 case 'edge-cut':return polygon(cutPoints(x,y,neighbors,.24),fill);
 case 'edge-cut-smooth':return shapePath(x,y,cornerRadiusPath(x,y,neighbors,.25),fill);
 case 'pointed':return polygon(cutPoints(x,y,neighbors,.36),fill);
 case 'pointed-edge-cut':return polygon(cutPoints(x,y,neighbors,.34),fill);
 case 'pointed-in':return polygon(cutPoints(x,y,neighbors,.25,true),fill);
 case 'pointed-in-smooth':return shapePath(x,y,cornerRadiusPath(x,y,neighbors,.16),fill);
 case 'pointed-smooth':return shapePath(x,y,cornerRadiusPath(x,y,neighbors,.32),fill);
 case 'rounded-in':return polygon(cutPoints(x,y,neighbors,.15,true),fill);
 case 'rounded-in-smooth':return shapePath(x,y,cornerRadiusPath(x,y,neighbors,.32),fill);
 case 'rounded-pointed':{
   // The selected angular-rounded style: joint-preserving core + tapered exposed corners.
   let points=cutPoints(x,y,neighbors,.26);
   let out=polygon(points,fill);
   if(!u&&!l)out+=polygon([[x+.26,y],[x,y+.35],[x+.34,y+.3]],fill);
   if(!u&&!rr)out+=polygon([[x+.74,y],[x+1,y+.32],[x+.71,y+.31]],fill);
   if(!d&&!rr)out+=polygon([[x+1,y+.66],[x+.74,y+1],[x+.72,y+.72]],fill);
   if(!d&&!l)out+=polygon([[x+.27,y+1],[x,y+.68],[x+.29,y+.7]],fill);
   return out;
 }
 case 'mosaic':return (r+c)%3===0?polygon(cutPoints(x,y,neighbors,.27),fill):shapePath(x,y,cornerRadiusPath(x,y,neighbors,.17),fill);
 case 'japnese':return polygon(cutPoints(x,y,neighbors,(r+c)%3===0?.36:.12),fill);
 case 'leaf':return `<path d="M${x+(l?0:.12)} ${y+(u?0:.08)}C${x+.7} ${y-.12} ${x+1.08} ${y+.25} ${x+(rr?1:.93)} ${y+(d?1:.87)}C${x+.56} ${y+1.06} ${x-.09} ${y+.7} ${x+(l?0:.12)} ${y+(u?0:.08)}Z" fill="${fill}"/>`;
 case 'star':{let p=[];for(let k=0;k<8;k++){const a=k*Math.PI/4-Math.PI/2,rad=k%2?.29:.49;p.push([x+.5+rad*Math.cos(a),y+.5+rad*Math.sin(a)]);}return polygon(p,fill);}
 case 'diamond':return polygon([[x+.5,y+.02],[x+.98,y+.5],[x+.5,y+.98],[x+.02,y+.5]],fill);
 default:return svgRect(x,y,1,1,fill);
 }
}
function frameSVG(x,y,style,fill){
 // 7x7 finder frame, center 5x5 is negative space. Each Monkey ID has its own outline.
 const ring=(ro=0,ri=0)=>`<path d="${roundedPath(x,y,7,7,ro)} ${roundedPath(x+1,y+1,5,5,ri)}" fill="${fill}" fill-rule="evenodd"/>`;
 if(style==='frame12'||style==='frame13')return `<path d="M${x+3.5} ${y}a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0 -7Z M${x+3.5} ${y+1}a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0 -5Z" fill="${fill}" fill-rule="evenodd"/>`;
 if(['frame5','frame8','frame10','frame11','frame16'].includes(style)){
  const dashed=style==='frame5'||style==='frame11'||style==='frame16';let s='';for(let i=0;i<7;i++)for(let j=0;j<7;j++){
   if(i&&i<6&&j&&j<6)continue;
   if(dashed&&((i*7+j)%((style==='frame11')?5:3)===1))continue;
   if(style==='frame10')s+=svgRect(x+j+.08,y+i+.08,.84,.84,fill,.16);
   else if(style==='frame5')s+=svgCircle(x+j+.5,y+i+.5,.42,fill);
   else s+=svgRect(x+j+.06,y+i+.06,.88,.88,fill,.06);
  }return s;
 }
 if(style==='frame14'){
  const outer=[[x+.42,y],[x+6.58,y+.17],[x+7,y+6.71],[x+.33,y+7],[x,y+.42]];
  const inner=[[x+1.25,y+1.16],[x+5.78,y+1.24],[x+5.91,y+5.8],[x+1.17,y+5.9],[x+1.14,y+1.17]];
  return `<path d="M${outer.map(p=>p.join(' ')).join('L')}Z M${inner.map(p=>p.join(' ')).join('L')}Z" fill="${fill}" fill-rule="evenodd"/>`;
 }
 if(style==='frame7')return `<path d="M${x+1.05} ${y}H${x+5.95}L${x+7} ${y+1.05}V${y+5.95}L${x+5.95} ${y+7}H${x+1.05}L${x} ${y+5.95}V${y+1.05}Z M${x+1.5} ${y+1.5}H${x+5.5}V${y+5.5}H${x+1.5}Z" fill="${fill}" fill-rule="evenodd"/>`;
 const rs={frame0:0,frame1:.95,frame2:.95,frame3:.95,frame4:.95,frame6:1.3,frame7:.4,frame13:3,frame14:.1};return ring(rs[style]??.45,Math.max(0,(rs[style]||.2)-.85));
}
function ballSVG(x,y,style,fill){const X=x+2,Y=y+2;switch(style){
 case 'ball0':return svgRect(X,Y,3,3,fill);
 case 'ball1':return shapePath(X,Y,`M${X+.8} ${Y}H${X+3}V${Y+3}H${X}V${Y+.8}Q${X} ${Y} ${X+.8} ${Y}Z`,fill);
 case 'ball2':return shapePath(X,Y,`M${X} ${Y}H${X+2.2}Q${X+3} ${Y} ${X+3} ${Y+.8}V${Y+3}H${X}Z`,fill);
 case 'ball3':return shapePath(X,Y,`M${X} ${Y}H${X+3}V${Y+3}H${X+.8}Q${X} ${Y+3} ${X} ${Y+2.2}Z`,fill);
 case 'ball5':return [0,1,2].flatMap(r=>[0,1,2].map(c=>svgCircle(X+c+.5,Y+r+.5,.42,fill))).join('');
 case 'ball6':return polygon([[X,Y],[X+2.36,Y],[X+3,Y+.64],[X+3,Y+3],[X,Y+3]],fill);
 case 'ball7':return shapePath(X,Y,`M${X+.1} ${Y+.1}H${X+2.88}V${Y+2.9}H${X+.1}Z`,fill);
 case 'ball8':return svgRect(X+.08,Y+.08,2.84,2.84,fill,.12);
 case 'ball10':return Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return svgCircle(X+1.5+Math.cos(a)*.86,Y+1.5+Math.sin(a)*.86,.65,fill);}).join('')+svgCircle(X+1.5,Y+1.5,.6,fill);
 case 'ball11':return shapePath(X,Y,`M${X+.55} ${Y+.12}H${X+2.5}Q${X+3} ${Y+.12} ${X+3} ${Y+.63}V${Y+2.2}L${X+2.28} ${Y+2.9}H${X+.55}Q${X} ${Y+2.9} ${X} ${Y+2.32}V${Y+.64}Q${X} ${Y+.12} ${X+.55} ${Y+.12}Z`,fill);
 case 'ball12':return [0,1,2].map(i=>svgRect(X+i+.04,Y,.85,3,fill,.42)).join('');
 case 'ball13':return [0,1,2].map(i=>svgRect(X,Y+i+.04,3,.85,fill,.42)).join('');
 case 'ball14':return svgCircle(X+1.5,Y+1.5,1.5,fill);
 case 'ball15':return svgRect(X,Y,3,3,fill,.77);
 case 'ball16':return polygon([[X+.05,Y+.14],[X+2.94,Y+.25],[X+2.77,Y+2.85],[X+.23,Y+2.92]],fill);
 case 'ball17':return polygon([[X,Y],[X+1.95,Y],[X+3,Y+1.05],[X+3,Y+3],[X,Y+3]],fill);
 case 'ball18':return shapePath(X,Y,`M${X} ${Y}Q${X+1.5} ${Y+.6} ${X+3} ${Y}Q${X+2.45} ${Y+1.5} ${X+3} ${Y+3}Q${X+1.5} ${Y+2.5} ${X} ${Y+3}Q${X+.48} ${Y+1.5} ${X} ${Y}Z`,fill);
 case 'ball19':return `<path d="M${X+.3} ${Y}h.9l.3 .7.3-.7h.9v1.2l-.7 .3.7 .3V${Y+3}h-.9l-.3-.7-.3 .7h-.9v-1.2l.7-.3-.7-.3Z" fill="${fill}"/>`;
 default:return svgRect(X,Y,3,3,fill);
}}
function flipGroup(svg,x,y,flips){const fx=flips?.includes('fh')?-1:1,fy=flips?.includes('fv')?-1:1;
 return fx===1&&fy===1?svg:`<g transform="translate(${fx<0?2*x+7:0} ${fy<0?2*y+7:0}) scale(${fx} ${fy})">${svg}</g>`;
}
function finder(r,c,n){return (r<7&&c<7)||(r<7&&c>=n-7)||(r>=n-7&&c<7);}
function buildSVG(matrix,settings,size=1000,withLogo=true){const n=matrix.length,m=4,unit=n+8;const bodyFill=settings.colorMode==='gradient'?'url(#qr-gradient)':settings.fg;let def='';if(settings.colorMode==='gradient')def=`<defs>${settings.gradientType==='radial'?`<radialGradient id="qr-gradient" cx="40%" cy="40%" r="76%">`:`<linearGradient id="qr-gradient" x1="0%" y1="0%" x2="100%" y2="100%">`}<stop offset="0%" stop-color="${settings.fg}"/><stop offset="100%" stop-color="${settings.fg2}"/>${settings.gradientType==='radial'?'</radialGradient>':'</linearGradient>'}</defs>`;
 const pieces=[`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 ${unit} ${unit}" role="img" aria-label="QR Code">`,def];
 if(!settings.transparent)pieces.push(svgRect(0,0,unit,unit,settings.bg));
 let rects='';for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(matrix[r][c]&&!finder(r,c,n))rects+=moduleSVG(c+m,r+m,settings.body,bodyFill,r,c,{u:r>0&&matrix[r-1][c]&&!finder(r-1,c,n),d:r<n-1&&matrix[r+1][c]&&!finder(r+1,c,n),l:c>0&&matrix[r][c-1]&&!finder(r,c-1,n),r:c<n-1&&matrix[r][c+1]&&!finder(r,c+1,n)});
 pieces.push(`<g>${rects}</g>`);
 [[m,m],[m+n-7,m],[m,m+n-7]].forEach(([x,y],i)=>{
 const f=settings.colorMode==='gradient'&&settings.gradientEyes?'url(#qr-gradient)':settings.customEyes?settings.eyeFrames[i]:settings.fg;
 const b=settings.colorMode==='gradient'&&settings.gradientEyes?'url(#qr-gradient)':settings.customEyes?settings.eyeBalls[i]:settings.fg;
 pieces.push(flipGroup(frameSVG(x,y,settings.frame,f),x,y,settings.eyeFlips?.[i]));pieces.push(flipGroup(ballSVG(x,y,settings.ball,b),x,y,settings.ballFlips?.[i]));
 });
 if(withLogo&&settings.logo&&settings.logo.data){const len=n*(settings.logoSize/100),x=m+(n-len)/2,y=x;const pad=settings.logoClean?.46:0;
 if(settings.logoClean)pieces.push(`<rect x="${(x-pad).toFixed(3)}" y="${(y-pad).toFixed(3)}" width="${(len+2*pad).toFixed(3)}" height="${(len+2*pad).toFixed(3)}" rx=".5" fill="${settings.transparent?'#FFFFFF':settings.bg}"/>`);
 pieces.push(`<image x="${x.toFixed(3)}" y="${y.toFixed(3)}" width="${len.toFixed(3)}" height="${len.toFixed(3)}" preserveAspectRatio="xMidYMid meet" href="${settings.logo.data}" />`);
 }
 pieces.push('</svg>');return pieces.join('');
}

const api={buildSVG,moduleSVG,frameSVG,ballSVG,MONKEY_BODIES,MONKEY_FRAMES,MONKEY_BALLS};
root.QRRenderer=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

/** Pure QR generation engine used by the public REST endpoints. */
'use strict';
const QRCore = globalThis.QRCore;
const QRRenderer = globalThis.QRRenderer;
const {MONKEY_BODIES:BODIES,MONKEY_FRAMES:FRAMES,MONKEY_BALLS:BALLS}=QRRenderer;
class InputError extends Error {constructor(message){super(message);this.statusCode=400;}}
function validColor(v,k){if(typeof v!=='string'||!/^#[0-9A-F]{6}$/i.test(v))throw new InputError(`${k} must be a #RRGGBB color`);return v.toUpperCase();}
function choice(value,arr,key){if(!arr.includes(value))throw new InputError(`${key} must be one of: ${arr.join(', ')}`);return value;}
function shape(v,arr,key){
 if(v==null||v==='')return arr[0];
 const aliases={body:{dots:'dot',circles:'circle',rounded:'round',rhombus:'rounded-pointed','extra-rounded':'round'},eye:{square:'frame0',rounded:'frame6',circle:'frame12','right-cut':'frame14'},eyeBall:{square:'ball0',rounded:'ball15',circle:'ball14','ball-edges':'ball16'}};
 if(aliases[key]?.[v])v=aliases[key][v];
 return choice(v,arr,key);
}
function flips(value,name){if(value===undefined)return [];if(!Array.isArray(value)||value.length>2||value.some(x=>x!=='fv'&&x!=='fh'))throw new InputError(name+' must contain only fv or fh');return [...new Set(value)];}
function settings(raw={}){
 if(raw==null)raw={};if(typeof raw!=='object'||Array.isArray(raw))throw new InputError('config must be a JSON object');
 const get=(k,f)=>raw[k]===undefined?f:raw[k];
 const fg=validColor(get('bodyColor',get('fg','#202E25')),'bodyColor');
 const bg=validColor(get('bgColor',get('bg','#FFFFFF')),'bgColor');
 const hasGradient=raw.gradientColor1!==undefined||raw.gradientColor2!==undefined||raw.colorMode==='gradient';
 const fg1=validColor(get('gradientColor1',fg),'gradientColor1');
 const fg2=validColor(get('gradientColor2',get('fg2','#5EAD49')),'gradientColor2');
 const safeBool=(v,k)=>{if(typeof v!=='boolean')throw new InputError(`${k} must be a boolean`);return v;};
 const gradientEyes=safeBool(get('gradientOnEyes',get('gradientEyes',false)),'gradientOnEyes');
 const transparent=safeBool(get('transparent',false),'transparent');
 const logoMode=get('logoMode',null);if(logoMode!==null&&!['clean','default'].includes(logoMode))throw new InputError('logoMode must be clean or default');const logoClean=logoMode!==null?logoMode==='clean':safeBool(get('logoClean',true),'logoClean');
 const logoSize=Number(get('logoSize',19));if(!Number.isFinite(logoSize)||logoSize<5||logoSize>28)throw new InputError('logoSize must be 5 to 28 percent');
 const e1=[1,2,3].map(i=>validColor(get(`eye${i}Color`,fg),`eye${i}Color`));
 const e2=[1,2,3].map(i=>validColor(get(`eyeBall${i}Color`,fg),`eyeBall${i}Color`));
 let logo=null;
 if(raw.logo!=null&&raw.logo!==''){
  const obj=typeof raw.logo==='string'?{data:raw.logo,name:'Uploaded logo'}:raw.logo;
  if(!obj||typeof obj.data!=='string'||!/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(obj.data)||obj.data.length>800000)throw new InputError('logo must be a PNG/JPEG/WebP data URL under 600 KB; external URLs are not accepted');
  logo={data:obj.data,name:String(obj.name||'Logo').slice(0,100)};
 }
 return {body:shape(get('body','square'),BODIES,'body'),frame:shape(get('eye',get('frame','frame0')),FRAMES,'eye'),ball:shape(get('eyeBall',get('ball','ball0')),BALLS,'eyeBall'),eyeFlips:[1,2,3].map(i=>flips(get('erf'+i,[]),'erf'+i)),ballFlips:[1,2,3].map(i=>flips(get('brf'+i,[]),'brf'+i)),fg:hasGradient?fg1:fg,fg2,bg,colorMode:hasGradient?'gradient':'single',gradientType:choice(get('gradientType','linear'),['linear','radial'],'gradientType'),gradientEyes,customEyes:true,eyeFrames:e1,eyeBalls:e2,transparent,logo,logoClean,logoSize};
}
function requestOptions(req={}){
 const data=req.data;
 if(typeof data!=='string'||data.length<1||new TextEncoder().encode(data).byteLength>2500)throw new InputError('data must be a nonempty UTF-8 string of at most 2500 bytes');
 const size=req.size===undefined?1000:Number(req.size);if(!Number.isInteger(size)||size<200||size>3000)throw new InputError('size must be an integer between 200 and 3000');
 const file=choice(String(req.file||'svg').toLowerCase(),['svg','png'],'file');
 const level=choice(String(req.level||'H').toUpperCase(),['L','M','Q','H'],'level');
 const cfg=settings(req.config||{});
 return {data,size,file,level,config:cfg,download:req.download===true||req.download==='true'};
}
function generateSVG(options){
 const qr = new QRCore.QRCode(-1,QRCore.ErrorCorrectLevel[options.level]);
 qr.addData(options.data);
 try{qr.make();}catch{throw new InputError('QR content is too long for the selected correction level');}
 const count=qr.getModuleCount();const matrix=Array.from({length:count},(_,r)=>Array.from({length:count},(_,c)=>!!qr.isDark(r,c)));
 return QRRenderer.buildSVG(matrix,options.config,options.size);
}


const API_VERSION='2.1.0';
const textHeaders={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'86400','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'};
function apiJson(status,payload){return new Response(JSON.stringify(payload),{status,headers:{...textHeaders,'Content-Type':'application/json; charset=utf-8'}});}
function payloadFromQuery(url){const input=Object.fromEntries(url.searchParams.entries());if(input.config!==undefined){try{input.config=JSON.parse(input.config);}catch{throw new InputError('config must be valid JSON');}}return input;}
const API_ENDPOINTS=['/qr/custom','/api/v1/qr'];
export default {
 async fetch(request,env,ctx){
  try {
   const url=new URL(request.url),path=url.pathname,method=request.method;
   if(method==='OPTIONS')return new Response(null,{status:204,headers:textHeaders});
   if(path==='/api/v1/health'&&method==='GET')return apiJson(200,{ok:true,name:'Juba QR Studio',version:API_VERSION,formats:['svg'],site:'https://juba-juba.github.io/Juba-QR-Studio/'});
   if(path==='/api/v1/shapes'&&method==='GET')return apiJson(200,{body:BODIES,eye:FRAMES,eyeBall:BALLS,formats:['svg'],limits:{size:{min:200,max:3000},dataBytes:2500}});
   if(API_ENDPOINTS.includes(path)){
     if(method!=='GET'&&method!=='POST')return apiJson(405,{error:'method_not_allowed'});
     let args;
     if(method==='GET')args=payloadFromQuery(url);
     else {
      if(!String(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))throw new InputError('Content-Type must be application/json');
      const length=Number(request.headers.get('content-length')||0);if(length>1024*1024)throw new InputError('Request is larger than 1 MB');
      const source=await request.text();if(new TextEncoder().encode(source).byteLength>1024*1024)throw new InputError('Request is larger than 1 MB');
      try{args=JSON.parse(source);}catch{throw new InputError('Malformed JSON');}
      if(!args||typeof args!=='object'||Array.isArray(args))throw new InputError('Request body must be a JSON object');
     }
     const opts=requestOptions(args);
     if(opts.file!=='svg')return apiJson(501,{error:'format_not_available',message:'Cloudflare edge endpoint currently supports SVG; for PNG use the web editor download or the Node/Docker API.',formats:['svg']});
     const svg=generateSVG(opts);
     return new Response(svg,{status:200,headers:{...textHeaders,'Content-Type':'image/svg+xml; charset=utf-8','Content-Disposition':`${opts.download?'attachment':'inline'}; filename="juba-qr-studio.svg"`}});
   }
   if(path==='/'&&method==='GET')return apiJson(200,{service:'Juba QR Studio API',version:API_VERSION,documentation:'https://juba-juba.github.io/Juba-QR-Studio/api-docs.html',endpoints:['/api/v1/qr','/qr/custom','/api/v1/shapes','/api/v1/health']});
   return apiJson(404,{error:'not_found'});
  } catch(e) {return apiJson(e.statusCode===400?400:500,{error:e.statusCode===400?'invalid_request':'internal_error',message:e.statusCode===400?e.message:'Unexpected rendering error'});}
 }
};
