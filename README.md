# OcnParse
OcnParse is a set of tokenizing tools compatible with Baha'i terms
Since \b in regex cannot deal with words that include unicode, dashes or single quotes

These tools are extracted from the diacritical.js library


### Install the interface module into your node project with:
```
npm install --save ocnparse
```

### Functionality
``` Javascript
parser.tokenize(str)
// returns array of tokens, each an object with three properties: prefix, word and suffix. Prefix and suffix contain any punctuation or markup. Word contains the core word (which can also contain <u> markup).

parser.rebuild(tokens, options, dictionary, blockid)
// returns the reconstructed text with some options for inserting changes
```



### Some Implementation Examples:
``` Javascript

// sample book and audio playlist
var bookURL = 'https://dl.dropboxusercontent.com/u/382588/ocean2.0/Library/books-work/4.%20proofed-done/abd-tn-en.html';

var fs = require('fs');
var path = require('path');

var parser = require('ocnparse');
```

### Todo:
* create mocha/chai tests covering English/Farsi/Mixed
* clean up the code and strip out lots of unnecessary experiments
* write up some examples and also publish examples on fiddle.js
* add option to fix unnecessary HTML entities
