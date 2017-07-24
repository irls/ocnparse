// parseblock is a set of tokenizing tools compatible with Baha'i terms
// since \b in regex cannot deal with words that include unicode, dashes or single quotes
//
 

var XRegExp = require('xregexp')
//var bterm = require('../bahai-term-phonemes/bahai-term-phonemes')
var bterm = require('bahai-term-phonemes')


var parser = {

  // helper function
  // pass in a string of wrapped words
  // words will be re-parsed, retaining class and data attributes from wrapper tags
  reWrap: function(str, srcTag='w', destTag='w') {
    let tokens = this.tokenize(str, srcTag) 
    return this.rebuild(tokens, destTag)
  },
 
  // pass in a string to tokenize
  // pass in tag to re-tokenize word-wrapped string
  // pass in a token list to re-calculate each token
  tokenize: function(str, tag='') {
    let tokens = splitTokens(str, tag)  
    tokens.map((token) => addTokenInfo(token) ) 
    return tokens 
  },
 
  // simple re-tokenizing of data that should be just one token
  tokenizeWord: function(word) { 
    let token = this.tokenize(word)[0] 
    addTokenInfo(token)
    return token
  }, 

  // given an array of token objects, rebuild the original text block
  // dictionary is optional just in case you want to pass in a raw string in place of tokens
  /*
  rebuild_old: function(tokens, options, dictionary, blockid) {
    if (!tokens) return '';
    var self = this;
    // options: [clean], showall, suggest, original, spanwords
    if ((['clean', 'showall', 'suggest', 'original', 'spanwords', 'spanwordsid'].indexOf(options)>-1)) {
      options = 'clean';
    }

    // allow passing in raw text strings for simplified use, including dictionary
    if (typeof tokens == 'string') {
      tokens = self.tokenize(tokens);
      if (dictionary) self.addTermSuggestions(tokens, dictionary);
    }

    var words = [], newword;
    tokens.forEach(function(token) {
      // default regular word
      newword = token.word;
      if (options != 'original') {
        // is a term

        if ('suggestion' in token) {
          if (token.suggestion.isMisspelled) {
            // correct and mistake, change token.word
            if ((options ==='showall')  && token.suggestion.isMisspelled) newword = "<mark class='term misspelled'>"+
              token.word + "</mark> <mark class='term correction'>" + token.suggestion.html + "</mark>";
            // correction only
            if ((options ==='suggest') && token.suggestion.isMisspelled) newword = "<mark class='term correction'>"+
              token.suggestion.html + "</mark>";
            // correction without markup
            if ((options === 'clean') && token.suggestion.isMisspelled) newword = token.suggestion.html;
            // wrap suggestion with span
            if (options ==='spanwords') newword = "<span class='w term correction'>"+token.suggestion.html+"</span>";
          } else {
            // no correction
            if (options ==='spanwords') newword = "<span class='w term correct'>"+token.suggestion.html+"</span>";
            else if ((options != 'clean')) newword = "<mark class='term correct'>"+ token.word + "</mark>";
          }
        } else if (token.info && token.info.isPossibleTerm) {
          if (options ==='spanwords') newword = "<w class='term' data-phoneme='"+
            token.info.phoneme+"'>"+token.word+"</w>";
          else if (options != 'clean') newword = "<mark class='term unknown'>"+ token.word + "</mark>";
        } else if (options ==='spanwords') newword = "<w>"+token.word+"</w>";

      }
      words.push(token.prefix + newword + token.suffix);
    });
    return words.join('');
  },
  */

  // simplified rebuild which wraps entire rebuilt token in an html tag.
  //  any values in the "token.classes" array are added as classes
  //  any properties in the 'token.data' object are added as data attributes
  rebuild: function(tokens, tag='') {
    var result = []  
    tokens.map( (token) => {
      let data_attrs = ''
      let class_attr = ''
      if (token.info) {
        //console.log(token.word, ':', token.info)
        // data attributes are stored as a keyed object: token.info.data = {attrName: attrValue}
        if (token.info.data) Object.keys(token.info.data).map((key) => {
          data_attrs += ` data-${key}="${token.info.data[key]}"`
        })
        // class is stored as a simple array in tokens:  token.info.class = []
        if (token.info.class && token.info.class.length>0) class_attr = ` class="${token.info.class.join(' ')}"`
      } 
      let openTag = (tag.length>0 ? `<${tag}${class_attr}${data_attrs}>` : '')
      let closeTag = (tag.length>0 ? `</${tag}>` : '')
      let wrappedToken = `${openTag}${token.prefix}${token.word}${token.suffix}${closeTag}`
      result.push(wrappedToken)
    })
    return result.join('')
  },

  // check if this content would be tokenized to a word or not
  isWord: function(word) {  
    return !!(this.tokenizeWord(word).word.length)  
  }

}
 

// This library has a legacy use for parsing books and identifying term misspellings. 
// We might want to split dictionary operations into a seperate module next time we 
//  need to use it.
/*
parser.prepareDictionary = function(wordList) {
  // exit is this is already a prepared dictionary object
  if (('terms' in wordList) && ('total' in wordList)) return wordList;
  var dictionary = {terms: {}, total: 0};
  // remove duplicates keeing the verified or most frequent version of each term
  var terms = removeDuplicateTerms(wordList);
  // now add each word to the replacelist. If word has known mispellings, add each seperately
  terms.forEach(function(term) {
    addToDictionary(term.base, term, dictionary);
    if (term.known_mispellings.length>0) term.known_mispellings.forEach(function(known_misspelling) {
      addToDictionary(stripNonAlpha(known_misspelling), term, dictionary);
    });
  });
  return dictionary;
  // ============================= not sure what these are... legacy
  function addToDictionary(base, term, replList) {
    if (!base || !term) { 
      return;
    }
    var lookup = base.toLowerCase();
    // here is where we want to add in our new fields
    // [ref], original, definition, [alternates], [known_mispellings] and verified
    var obj = {
      'glyph'     : term.word,
      'html'      : glyph2HTML(term.word),
      'stripped'  : base,
      'lookup'    : lookup,
      'ansi'      : glyph2ANSI(term.word),
      'ref'       : term.ref,
      'original'  : term.original,
      'definition': term.definition,
      'verified'  : term.verified,
      'ambiguous' : term.ambiguous
    };
    // add to list
    if (!replList.terms[lookup]) replList.terms[lookup] = {};
    if (!replList.terms[lookup][base]) {
      replList.terms[lookup][base] = obj;
      replList.total++;
    } 
  }
  function removeDuplicateTerms(words) {
    // given an array of terms, return a de-duplicated array
    // but in this case, it is unique to the base (stripped) version
    // and the one unique version returned for each base is the most frequent one
    // create an obect list by stripped base version and count of full version
    var is_accents_json = ('offset' in words);
    if (is_accents_json) words = words.rows;
    var word ='', stripped ='', list= {}, word_data = {};

    words.forEach(function(word) {
      if (is_accents_json) {
        word_data = word.value;
        word = word.key;
        word_data.word = word;
        word_data.base = stripNonAlpha(word);
      } else {
        word_data = {word: word, ref:[], original: '', definition:'', alternates:[], known_mispellings:[], verified: false, base: stripNonAlpha(word)};
      }
      var base = word_data.base;
      if (!(base in list)) list[base] = {};
      if (word in list[base]) { // increment existing item
        list[base][word]['count']++;
        // concat items from this word onto the cumulative list
        list[base][word]['data']['ref'] = list[base][word]['data']['ref'].concat(word_data.ref);
        list[base][word]['data']['ref'] = uniqueArray(list[base][word]['data']['ref']);
        list[base][word]['data']['original'] =  word_data.original?word_data.original:list[base][word]['data']['original'];
        list[base][word]['data']['definition'] =  word_data.definition?word_data.definition:list[base][word]['data']['definition'];
        list[base][word]['data']['alternates'] = list[base][word]['data']['alternates'].concat(word_data.alternates);
        list[base][word]['data']['known_mispellings'] = list[base][word]['data']['known_mispellings'].concat(word_data.known_mispellings);
        if (word_data.verified) list[base][word]['verified'] = true;
      } else { // create new entry
        list[base][word] = {word: word, count: 1};
        list[base][word]['data'] = word_data;
        list[base][word].verified = list[base][word].verified || word_data.verified;

      }
    });

    // iterate through each list and locate the version with the max, create newlist
    var newList = [], max, topword, has_verified;
    words = {};
    for (var index in list) {
      words = list[index];
      max=0; topword=''; has_verified=false;
      for (var index2 in words) {
        word = words[index2];
        if ((word.count>max && !has_verified) || word.verified) {
          topword = word.word;
          max = word.count;
          has_verified = true;
        }
      }
       //newList.push(topword);
       newList.push(list[index][topword]['data']);
    }
    return newList;
  }
  function uniqueArray(a) {
    return a.sort().filter(function(item, pos) {
        return !pos || item != a[pos - 1];
    })
  }
}
*/







// ============================================
// internal functions 

function glyph2HTML(term) {
  if (!term) return '';
  term = term.replace(/_([sdztgkc][h])/ig, "<u>$1</u>");
  return term;
}

function glyph2ANSI(term) {
  return term
    // remove underscores
    .replace(/_/g, '')
    // replace curly quotes with straight single quote
    .replace(/[\’\‘\`]/g, "'")
    // replace dot-unders with non-dotted
    .replace(/\Ḥ/g, 'H')
    .replace(/\ḥ/g, 'h')
    .replace(/\Ḍ/g, 'D')
    .replace(/\ḍ/g, 'd')
    .replace(/\Ṭ/g, 'T')
    .replace(/\ṭ/g, 't')
    .replace(/\Ẓ/g, 'Z')
    .replace(/\ẓ/g, 'z')
    .replace(/\Ṣ/g, 'S')
    .replace(/\ṣ/g, 's');
}

function soundex(s) {
  if (!s) return '';
  var a = s.toLowerCase().split('');
     f = a.shift(),
     r = '',
     codes = {
         a: '', e: '', i: '', o: '', u: '',
         b: 1, f: 1, p: 1, v: 1,
         c: 2, g: 2, j: 2, k: 2, q: 2, s: 2, x: 2, z: 2,
         d: 3, t: 3,
         l: 4,
         m: 5, n: 5,
         r: 6
     };

  r = f +
     a
     .map(function (v, i, a) { return codes[v]; })
     .filter(function (v, i, a) {
         return ((i === 0) ? v !== codes[f] : v !== a[i - 1]);
     })
     .join('');

  return (r + '000').slice(0, 4).toUpperCase();
}

function stripNonAlpha(word) {
  if (!word) return '';
  return word
    // replace accented vowels
    .replace(/\á/g, 'a')
    .replace(/\í/g, 'i')
    .replace(/\ú/g, 'u')
    .replace(/\Á/g, 'A')
    .replace(/\Í/g, 'I')
    .replace(/\Ú/g, 'U')

    // replace dot-unders with regular letters
    .replace(/\Ḥ/g, 'H')
    .replace(/\ḥ/g, 'h')
    .replace(/\Ḍ/g, 'D')
    .replace(/\ḍ/g, 'd')
    .replace(/\Ṭ/g, 'T')
    .replace(/\ṭ/g, 't')
    .replace(/\Ẓ/g, 'Z')
    .replace(/\ẓ/g, 'z')
    .replace(/\Ṣ/g, 'S')
    .replace(/\ṣ/g, 's')

    // remove all non alphas
    //.replace(/[^a-zA-Z\-]/g, '') // this fails with ansi characters, we'll have to re-think it

    // remove all HTML tags
    .replace(/<\/?\w+((\s+\w+(\s*=\s*(?:".*?"|'.*?'|[^'">\s]+))?)+\s*|\s*)\/?>/g, '')

    // delete quotes and line unders
    .replace(/[\’\‘\'\`\_\ʼ]/g, '')

    // delete dashes
    .replace(/[\-]/g, '')

    .trim(); // just in case
}

function HTML2glyph(term) {
  // replace underscore
  term = term.replace(/\<u\>([sdztgkc][h])\<\/u\>/ig, "_$1");
  // replace double underline
  term = term.replace(/\<u\>([sdztgkc][h])([sdztgkc][h])\<\/u\>/ig, "_$1_$2");
  // remove other tags
  term = term.replace(/(<([^>]+)>)/ig, '');
  // remove all non-legal character
  term = term.replace(/[^a-zA-ZáÁíÍúÚḤḥḌḍṬṭẒẓṢṣ\’\‘\_\-]/g, '');
  return term;
}

// takes a string or token list and splits up into properly tokenized list
function splitTokens(tokens, tag='') {
  //console.log(tokens)
  if (!tokens) return []   
 
  // if wrapper tag, first tokenize and extract class and data attributes
  if ((typeof tokens === 'string') && tag) { tokens = splitWrappedString(tokens, tag) }  
  else if (typeof tokens==='string') tokens = [ {prefix:'', suffix:'', word: tokens} ]

  // Initial splitting of all text blocks into tokens 
  let delimiters = [
    '<span.*?>', '</span>', '<a.*?>', '</a>', '&.*?;', '<w.*?>', '</w>', '<q.*?>', '</q>',
    // all html tags except <u>
    '</?(?!u)\\w+((\\s+\\w+(\\s*=\\s*(?:".*?"|\'.*?\'|[^\'">\\s]+))?)+\\s*|\\s*)/?>',
    // m-dashes
    '[\\—]|[-]{2,3}',
    // white space and remaining punctuation
    "[\\s\\,\\.\\!\\—\\?\\;\\:\\[\\]\\+\\=\\(\\)\\*\\&\\^\\%\\$\\#\\@\\~\\|]+?"
  ]   
  delimiters.map( (delimiterRegex) => {
    //tokens = splitTokensRegex(tokens, delimiter)
    // console.log('splitting token with new delimter', tokens[0], delimiterRegex)
    let items, newList = [] 
    tokens.map((token) => {   
      items = splitRegex(token.word, delimiterRegex)  
      //console.log('split: ',token.word, items)
      if (items.length>1) { // the delimiter matched this word block, it needs to be split further 
        // add the first token 
        let firstToken = items[0]
        if (token.info) firstToken.info = token.info
        firstToken.prefix = token.prefix + firstToken.prefix 
        newList.push(firstToken)
        // middle tokens 
        items.map((newToken, i) => { if (i>0 && i<items.length-1) newList.push(newToken) })
        // last token
        let lastToken = items[items.length-1]
        lastToken.suffix += token.suffix 
        newList.push(lastToken)
      } else {
        let newToken = items[0]
        newToken.prefix = token.prefix + newToken.prefix
        newToken.suffix += token.suffix
        newList.push(newToken)
      }
    }) 
    tokens = newList
  })

  //console.log (tokens)
  
  // clean up a little and return 
  tokens = cleanTokens(tokens) 
  return tokens
}

// splits word-wrapped string into tokens -- preserving class and data attributes
function splitWrappedString(str, tag) { 
  let tagSplitReg = new RegExp(`(<${tag}.*?>.*?<\/${tag}>)`, 'ig')
  let tokens = str.split(tagSplitReg).filter((str) => str.length>0)

  // format as tokens
  tokens.map((token, i)=> tokens[i] = {word: token, suffix: '', prefix: ''} )

  // tokens with wrapper tag need the tag removed and the attributes extracted 
  let tagDataReg = new RegExp(`^<${tag}(.*?)>(.*?)<\/${tag}>$`, 'i')  
  let classReg = /class\s*=\s*['"]([^'"]+?)['"]/i
  tokens.map((token, i)=> {
    let match 
    if ((match = tagDataReg.exec(token.word)) && (match.length>2)) { 
      token.word = match[2]
      let tagData = match[1]
      if (tagData.length>4) {
        // pull out the class from the wrapper tag, if any
        if ((matches = classReg.exec(tagData)) !== null)  tokens[i].info = {class: matches[1].trim().split(' ')}
        // pull out data attributes from the wrapper tag, if any
        let datareg = /data-(.*?)\s*=\s*['"]([^'"]+?)['"]/ig 
        while ((matches = datareg.exec(tagData)) !== null) {
          if (!tokens[i].info) tokens[i].info = {data:{}} 
          tokens[i].info.data[matches[1]] = matches[2] 
        }          
      } 
    }
  })

  return tokens 
}

// splits a string or array of strings into tokens with a regex delimiter
function splitRegex(str, delimiterRegex) {
  // split any string by delimiter suffixed to each
  var tokens = [], prevIndex = 0, match 

  // split into words
  let divider_regex = new RegExp(delimiterRegex, 'g')
  while (match = divider_regex.exec(str)) {
    tokens.push({
      word: str.substring(prevIndex, match.index),
      suffix: match[0],
      prefix: ''
    })
    prevIndex = divider_regex.lastIndex;
  }
  // if there is no final delimiter, the last chunk is ignored. Put it into a token
  if (prevIndex < str.length) tokens.push({word: str.substring(prevIndex, str.length), prefix:'', suffix:''})

  // safe cleanup and compression 
  //let before= JSON.stringify(tokens)
  tokens = cleanTokens(tokens)
  //let after= JSON.stringify(tokens)
  //if (before!= after) console.log('Modified tokens: ', '\n', before, '\n', after, delimiter_regex_str)

  //console.log('splitRegex', str, delimiterRegex, tokens)
  return tokens;
}
 
// cleanup word, suffix and prefix of token list & delete empty tokens
function cleanTokens(tokens) {  
  // remove empty tokens
  tokens = tokens.filter((tt) => (tt.info || tt.word.length || tt.prefix.length || tt.suffix.length) )

  // TODO: these two should be one loop like /^[\s]+|^[^\s]+[\s]+/gm
  // move back beginning spaces or beginning non-space plus space (if not an open tag)
  if (tokens.length>2) tokens.map((token, i) => { 
    let prevToken = tokens[i-1], tt, regex
    regex = /^([\s]+|^[^<]+[\s]+)(.*)$/gm
    if (tt = regex.exec(token.prefix)) {
      prevToken.suffix += tt[1];
      token.prefix = tt[2];
      //console.log('Move spaces back (suffix <- prefix)', `"${token.suffix}"`, `"${token.prefix}"`, tt)
      checkEmptyToken(tokens, index)
    }
  })

  // loop through array and cleanup edges, moving punctuation and tags  
  tokens.map((token, index) => { 
    let tt, regex

    // move non-word parts out into prefix and suffix
    regex = XRegExp(`^(\\PL*)([\\pL\-\>\<\’\‘\'\`]+)(\\PL*)$`, 'mgu')  
    if (tt = regex.exec(token.word) && Array.isArray(tt) && (tt[1].length || tt[3].length)) { 
      token.prefix = token.prefix + tt[1];
      token.word = tt[2];
      token.suffix = tt[3] + token.suffix;
      //console.log('Moving punctuation out of word',`"${token.suffix}" "${token.word}" "${token.prefix}"`,'\n',tt)
      checkEmptyToken(tokens, index)
    } 

    // Split out single quotes only if they are on both sides
    // 'Quoted' -> Quoted
    // ‘Abd -> ‘Abd
    regex = /^([\’\‘\'\`])(.*)([\’\‘\'\`])$/mg;
    if ((tt = regex.exec(token.word)) && (tt[1].length>0 && tt[3].length>0)) {
      token.prefix = token.prefix + tt[1];
      token.word = tt[2];
      token.suffix = tt[3] + token.suffix
      //console.log('Move out single quotes if on both sides of word: ', `"${token.prefix}" "${token.word}" "${token.suffix}"`, '\n', tt)
      checkEmptyToken(tokens, index)
    } 

    // for some reason we still sometimes have common punctuation on the ends of the word
    //  can create an empty token
    regex = /^([\!\?\@\#\$\%\^\*\(\)\~\,\.]*)([^\!\?\@\#\$\%\^\*\(\)\~\,\.]*)([[\!\?\@\#\$\%\^\*\(\)\~\,\.]*)$/mg;
    if ((tt = regex.exec(token.word)) && (tt[1].length>0 || tt[3].length>0)) {
      token.prefix = token.prefix + tt[1];
      token.word = tt[2];
      token.suffix = tt[3] + token.suffix
      console.log('Remove punctuation again because my regex sucks',`"${token.suffix}" "${token.word}" "${token.prefix}"`,'\n',tt)
      checkEmptyToken(tokens, index)
    }

    // If the entire word appears to be an html entity, push it back into prefix
    //  can create an empty token
    if ((token.prefix.slice(-1)==='&') && (token.suffix.slice(0,1)===';')) {
      token.prefix = token.prefix + token.word + ';';
      token.word = '';
      token.suffix = token.suffix.slice(1);
      //console.log('If word is an html entity, move to prefix',`"${token.suffix}" "${token.word}" "${token.prefix}"`,'\n',tt)
      checkEmptyToken(tokens, index)
    } 

    // if suffix ends with an open tag of some sort, move it to prefix of next word
    regex = /^(.*?)(<[a-zA-Z]+[^>]*?>)$/ig
    while (tokens.length>1 && index<tokens.length-1 && (match = regex.exec(token.suffix))) {
      let nextToken = tokens[index+1]
      token.suffix = match[1]
      nextToken.prefix = match[2] + nextToken.prefix 
      //console.log('If open tag in suffix, move to next prefix',`"${token}" -> "${nextToken.prefix}"`,'\n',tt)
      checkEmptyToken(tokens, index)
    }   
  })
 
  // remove empty tokens 
  tokens = tokens.filter((tt) => (tt.info || tt.word.length || tt.prefix.length || tt.suffix.length) )

  return tokens;
}
 
// check if token word is empty & move suffix/prefix forward or back
function checkEmptyToken(tokens, index) {
  let token = tokens[index], destToken
  if (token.word.trim().length) return
  if (index<tokens.length-1) { // move empty token forward
    destToken = tokens[index+1]
    destToken.prefix = token.prefix + token.word + token.suffix + destToken.prefix
  } else if (index>0) { // move empty token back
    destToken = tokens[index-1]
    destToken.suffix += token.prefix + token.word + token.suffix
  } 
  // move info, if exists
  if (token.info) {
    if (!destToken.info) destToken.info = token.info
    else {
      if (token.info.class) destToken.info.class = mergeArraysUniq(destToken.info.class, token.info.class)
      if (token.info.data) destToken.info.data = mergeObjects(destToken.info.data, token.info.data) 
    } 
  }
  // clear empty token
  tokens[index] = {word:'',prefix:'',suffix:''} // notice you cannot just assign this to token ;)
}

// gather additional info about token word (soundex etc.)
function addTokenInfo(token) {
  let info = {}
  // keep existing info if exists
  if (token.info) info = token.info 

  // generate base version of word with only alphanumerics
  info.stripped = stripNonAlpha(token.word);
  // determine if word is allcaps
  // TODO: make sure this works with all languages
  info.isAllCaps = (info.stripped === info.stripped.toUpperCase())
 
  info.isPossibleTerm = bterm.isPossibleTerm(token.word)
  if (info.isPossibleTerm) {
    if (!info.data) info.data = {}
    info.data.ipa = bterm.phonemes(token.word) 
  } 
  info.html = glyph2HTML(token.word)
  info.glyph = HTML2glyph(token.word)
  info.ansi = glyph2ANSI(info.glyph)
  info.soundex = soundex(info.stripped)
 
  token.info = info 
}

// returns a unique array of merged values, can merge to or with a null
function mergeArraysUniq(arr, arr2){
  if (!arr) arr = []
  if (!arr2) arr2 = []
  let result = [] 
  arr.map((item) => {if (result.indexOf(item)<0) result.push(item) })
  arr2.map((item) => {if (result.indexOf(item)<0) result.push(item) })
  return result
}

// merges properties from obj2 into obj if not already present, can merge to or with a null
function mergeObjects(obj, obj2) {
  if (!obj) obj = {}
  if (!obj2) obj2 = {}
  Object.keys(obj2).map((key) => { if (!obj[key]) obj[key] = obj2[key] })
  return obj
}
 


module.exports = parser


