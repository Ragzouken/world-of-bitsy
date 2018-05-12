"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
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
    var palettes = {};
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
    function takePalette() {
        var palette = new BitsyPalette();
        palette.id = takeSplitOnce(" ")[1];
        palette.name = checkLine("NAME") ? takeSplitOnce(" ")[1] : "";
        while (!checkBlank()) {
            console.log(lines[lineCounter]);
            palette.colors.push(takeColor());
        }
        palettes[palette.id] = palette;
        console.log(palette);
    }
    while (!done()) {
        if (checkLine("PAL")) {
            takePalette();
        }
        else {
            while (!checkBlank()) {
                skipLine();
            }
            skipLine();
        }
    }
}
parseBitsy(lines);
