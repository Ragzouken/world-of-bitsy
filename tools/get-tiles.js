"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var BitsyWorld = /** @class */ (function () {
    function BitsyWorld() {
        this.palettes = {};
        this.tiles = {};
    }
    return BitsyWorld;
}());
var BitsyTile = /** @class */ (function () {
    function BitsyTile() {
    }
    return BitsyTile;
}());
var BitsyPalette = /** @class */ (function () {
    function BitsyPalette() {
        this.colors = [];
    }
    Object.defineProperty(BitsyPalette.prototype, "background", {
        get: function () { return this.colors[0]; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BitsyPalette.prototype, "tile", {
        get: function () { return this.colors[1]; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BitsyPalette.prototype, "sprite", {
        get: function () { return this.colors[2]; },
        enumerable: true,
        configurable: true
    });
    return BitsyPalette;
}());
var data = fs.readFileSync("tools/955B75C9.bitsy.txt", "UTF-8");
var lines = data.split("\r\n");
function parseBitsy(lines) {
    var lineCounter = 0;
    var world = new BitsyWorld();
    function done() {
        return lineCounter >= lines.length;
    }
    function checkLine(check) {
        return lines[lineCounter].startsWith(check);
    }
    function checkBlank() {
        return done() || lines[lineCounter].length == 0;
    }
    function skipLine() {
        takeLine();
    }
    function takeLine() {
        var line = lines[lineCounter];
        lines[lineCounter] = "";
        lineCounter += 1;
        return line;
    }
    function takeSplit(delimiter) {
        return takeLine().split(delimiter);
    }
    function takeSplitOnce(delimiter) {
        var line = takeLine();
        var i = line.indexOf(delimiter);
        return [line.slice(0, i), line.slice(i + delimiter.length)];
    }
    function takeColor() {
        var _a = takeSplit(","), r = _a[0], g = _a[1], b = _a[2];
        return (parseInt(r) << 24)
            | (parseInt(g) << 16)
            | (parseInt(b) << 8)
            | 255;
    }
    function tryTakeName(object) {
        object.name = checkLine("NAME") ? takeSplitOnce(" ")[1] : "";
    }
    function takePalette() {
        var palette = new BitsyPalette();
        palette.id = takeSplitOnce(" ")[1];
        tryTakeName(palette);
        while (!checkBlank()) {
            palette.colors.push(takeColor());
        }
        world.palettes[palette.id] = palette;
    }
    function takeFrame() {
        var frame = new Array(64).fill(false);
        for (var i = 0; i < 8; ++i) {
            var line = takeLine();
            for (var j = 0; j < 8; ++j) {
                frame[i * 8 + j] = line.charAt(j) == "1";
            }
        }
        return frame;
    }
    function takeGraphic() {
        var graphic = [];
        do {
            graphic.push(takeFrame());
        } while (checkLine(">"));
        return graphic;
    }
    function takeTile() {
        var tile = new BitsyTile();
        tile.id = takeSplitOnce(" ")[1];
        tile.graphic = takeGraphic();
        tryTakeName(tile);
        world.tiles[tile.id] = tile;
    }
    while (!done()) {
        if (checkLine("PAL"))
            takePalette();
        else if (checkLine("TIL"))
            takeTile();
        else {
            while (!checkBlank()) {
                skipLine();
            }
            skipLine();
        }
    }
    return world;
}
console.log(parseBitsy(lines));
