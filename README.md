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
// returns array of tokens, each an object with three properties: prefix, word and suffix. Prefix and suffix contain any punctuation or markup. Word contains the core word (which can also contain <u> markup).

parser.rebuild(tokens, options, dictionary, blockid)
// returns the reconstructed text with some options for inserting changes
```



### Implementation Example:
```Javascript
const parser = require('ocnparse')  

// For example, say we want to wrap each word in a <span>...</span>
let tokens = parser.tokenize("Four score!!!") 

tokens.forEach( (token) => token.word=`<span>${token.word}</span>` )

console.log( parser.rebuild(tokens) )
// "<span>Four</span> <span>score</span>!!!"
```

### Todo:
* clean up the code and strip out lots of unnecessary experiments 
* add option to fix unnecessary HTML entities
