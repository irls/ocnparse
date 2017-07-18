# Ocnparse
OcnParse is a set of tokenizing tools compatible with Baha'i terms
Since \b in regex cannot deal with words that include unicode, dashes or single quotes 

### Install the interface module into your node project with:
```
npm install --save ocnparse
```

### Functionality
``` Javascript
// import the parser 
const parser = require('ocnparse')  

parser.tokenize(str)
// returns array of tokens, each an object with three properties: prefix, word and suffix. 
// .prefix and .suffix contain any punctuation or markup. 
// .word contains the core word (which can also contain <u> markup).

parser.rebuild(tokens)
// returns the reconstructed text with some options for inserting changes

parser.rebuildWrap(tokens, tag='w')
// simplified rebuild which wraps each rebuilt token in an html tag.
//  any values in the "token.classes" array are added as classes
//  any properties in the 'token.data' object are added as data attributes

parser.reTokenize(str, tag='w')
// tokenizes a string already containing 'wrapped' words without losing class or data attrs
// this is important in case the html string has been edited. editing might: 
//     1) add strings outside the word wrappers, 
//     2) delete words inside a wrapper or 
//     3) add words inside a word wrapper

parser.reWrap(str, srcTag='w', destTag='w')
// helper function to parse wrapped text, correct tokens and output new word-wrapped string 
// user can use this whenever text is edited -- or change the wrapper tags easily 
// preserves wrapper class and data attributes

```



### Implementation Example:
```Javascript
const parser = require('ocnparse')  

// For example, say we want to wrap each word in a <span>...</span>
let tokens = parser.tokenize("Four score!!!") 
let result = parser.rebuildWrap(tokens, 'span')
// result: "<span>Four</span> <span>score</span>!!!"
```

### Todo: 
* add option to fix unnecessary HTML entities
