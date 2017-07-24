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

parser.tokenize(str, tag='')
// returns array of tokens, each an object with three properties: prefix, word and suffix. 
// .prefix and .suffix contain any punctuation or markup. 
// .word contains the core word (which can also contain <u> markup).
// include a tag if the string being parsed is already word-wrapped (this preserves wrapper tag attributes)

parser.rebuild(tokens, tag='')
// returns the reconstructed text with some options for inserting changes
// include a tag if you want to wrap each word 
// wrapper tags contain any classes in token.info.class[] and data attrs in token.data.data{}

parser.reWrap(str, srcTag='w', destTag='')
// helper function to parse wrapped text, correct tokens and output new word-wrapped string 
// user can use this whenever text is edited -- or change the wrapper tags easily 
// preserves wrapper class and data attributes

```



### Implementation Example:
```Javascript
const parser = require('ocnparse')  

// For example, say we want to wrap each word in a <span>...</span>
let tokens = parser.tokenize("Four score!!!") 
let result = parser.rebuild(tokens, 'span')
// result: "<span>Four </span><span>score!!!</span>"

// For example, say we want to rewrap words wrapped in <span>...</span> to <w>...</w>
let str = `<span class='first'>Four </span><span data-whatever='12'>score!!!</span>`
let result = parser.rewrap(str, 'span', 'w')
// result: `<w class="first">Four </w><w data-whatever="12">score!!!</w>`

// Or our wrapped phrase has been edited and we need to re-wrap to correct it
let str = `Hmm. <span class="first">Four three </span><span data-whatever="12">score!!!</span>`
let result = parser.rewrap(str, 'span')
// result: `<span>Hmm. </span><span class="first">Four </span><span>three </span><span data-whatever="12">score!!!</span>`

```

 
