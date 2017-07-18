// parseblock is a set of tokenizing tools compatible with Baha'i terms
// since \b in regex cannot deal with words that include unicode, dashes or single quotes
// these tools are extracted from the diacritical.js library
//

// where is:
//  self.addTermSuggestions

var XRegExp = require('xregexp')
//var bterm = require('../bahai-term-phonemes/bahai-term-phonemes')
var bterm = require('bahai-term-phonemes')


var parser = {


  reWrap(str, srcTag='w', destTag='w') {
    let tokens = reTokenize(str, srcTag)
    return rebuildWrap(tokens, destTag)
  },

  reTokenize: function(str, tag='w') {
    let tokens = reTokenizeFromWrapper(str, tag)
    return tokens
    return this.tokenize(tokens, tag)
  },


  // pass in a string to tokenize
  // pass in a token list to re-split each token
  tokenize: function(str, preserveWrapperTag='', type='html') {
    if (!str) return [] 

    // if preservewrapper, first tokenize and extract class and data attributes
    if (preserveWrapperTag && (typeof str === 'string')) str = reTokenizeFromWrapper(str, preserveWrapperTag)

    // Initial splitting of all text blocks into tokens
    // We first split on HTML tags so that they will not be tokenized
    // then we split again on m-dashes
    // finally on pronunciation
    let delimiters = [
      '<span.*?>', '</span>', '<a.*?>', '</a>', '&.*?;', '<w.*?>', '</w>', '<q.*?>', '</q>',
      // all html tags except <u>
      '</?(?!u)\\w+((\\s+\\w+(\\s*=\\s*(?:".*?"|\'.*?\'|[^\'">\\s]+))?)+\\s*|\\s*)/?>',
      // m-dashes
      '[\\—]|[-]{2,3}',
      // white space and remaining punctuation
      "[\\s\\,\\.\\!\\—\\?\\;\\:\\[\\]\\+\\=\\(\\)\\*\\&\\^\\%\\$\\#\\@\\~\\|]+?"
    ]  
    let tokens = splitTokens(str, delimiters)
 
    // finally, if last token has no word, move it to previous token's suffix
    let lastt = tokens[tokens.length-1]
    if (tokens.length>1 && !this.isWord(lastt.word)) {
      let tkn = lastt.prefix + lastt.word + lastt.suffix
      tokens[tokens.length-2].suffix += tkn
      tokens.splice(tokens.length-1, 1)
    }
 
    return tokens 
  },
 
  // simple re-tokenizing of data that should be just one token
  tokenizeWord: function(word) { 
    var tokens = this.tokenize(word)
    return tokens[0]
  }, 

  // given an array of token objects, rebuild the original text block
  // dictionary is optional just in case you want to pass in a raw string in place of tokens
  rebuild: function(tokens, options, dictionary, blockid) {
    if (!tokens) return '';
    var self = this;
    // options: [clean], showall, suggest, original, spanwords
    if (!(['clean', 'showall', 'suggest', 'original', 'spanwords', 'spanwordsid'].indexOf(options)>-1)) {
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
        } else if (token.info.isPossibleTerm) {
          if (options ==='spanwords') newword = "<w class='term' data-phoneme='"+
            token.info.phoneme+"'>"+token.word+"</w>";
          else if (options != 'clean') newword = "<mark class='term unknown'>"+ token.word + "</mark>";
        } else if (options ==='spanwords') newword = "<w>"+token.word+"</w>";

      }
      words.push(token.prefix + newword + token.suffix);
    });
    return words.join('');
  },

  // simplified rebuild which wraps entire rebuilt token in an html tag.
  //  any values in the "token.classes" array are added as classes
  //  any properties in the 'token.data' object are added as data attributes
  rebuildWrap: function(tokens, tag='w') {
    var result = [] 
    tokens.map( (token) => {
      let data_attrs = ''
      let class_attr = ''
      if (token.hasOwnProperty('data')) Object.keys(token.data).map((key) => {
        data_attrs += ` data-${key}="${token.data[key]}"`
      })
      if (token.hasOwnProperty('class')) class_attr = ` class="${token.class.join(' ')}"`
      result.push(`<${tag}${class_attr}${data_attrs}>${token.prefix}${token.word}${token.suffix}</${tag}>`)
    })
    return result.join('')
  },

  // check if this content would be tokenized to a word or not
  isWord: function(word) {  
    var tt = this.tokenizeWord(word) 
    return !!(tt.prefix.trim().length==0 && tt.suffix.trim().length==0 && tt.word.length>0) 
  }

}
 

// This library has a legacy use for parsing books and identifying term misspellings. 
// We might want to split dictionary operations into a seperate module next time we 
//  need to use it.
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
      addToDictionary(term_strip_alpha(known_misspelling), term, dictionary);
    });
  });
  return dictionary;

  // =============================

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

  // ----------------------------------------
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
        word_data.base = term_strip_alpha(word);
      } else {
        word_data = {word: word, ref:[], original: '', definition:'', alternates:[], known_mispellings:[], verified: false, base: term_strip_alpha(word)};
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

function term_strip_alpha(word) {
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

function splitTokens(str, delimeters) {
  if (!str) return []
  let tokens = str
  if (typeof tokens==='string') tokens = [ {prefix:'', suffix:'', word: tokens} ]
  delimeters.map( (delimeter) => tokens = splitTokensRegex(tokens, delimeter) )
  return tokens
}

function splitTokensRegex(tokens, delimeter_regex_str) {
  var items = [],
      templist = [],
      token,
      newtoken; 
  // loop through array and split each word further based on delimiter regex 
  tokens.forEach(function(token) { 
    items = splitStringIntoTokens(token.word, delimeter_regex_str); 
    if (items.length>0) { // the delimiter matched this word block, it needs to be split further 
      templist.push({word: '', prefix: token.prefix, suffix: ''}); // these will be cleaned up at the end
      items.forEach(function(newtoken)  { templist.push(newtoken);  });
      templist.push({word:'', prefix: '', suffix: token.suffix});
    } else templist.push(token);
  });
  // clean up a little and return -- should we do this only once?
  return cleanTokenList(templist);
}
 
function splitStringIntoTokens (str, delimeter_regex_str) {
  // split any string by delimeter with delimeter suffixed to each
  var tokens = [],
      prevIndex = 0,
      match,
      divider_regex;

  divider_regex = new RegExp(delimeter_regex_str, 'g');
  while (match = divider_regex.exec(str)) {
    tokens.push({
      word: str.substring(prevIndex, match.index),
      suffix: match[0],
      prefix: ''
    });
    prevIndex = divider_regex.lastIndex;
  }
  // if there is no final delimiter, the last bit is ignored. Grab it into a token
  if (prevIndex < str.length) tokens.push({word: str.substring(prevIndex, str.length), prefix:'', suffix:''});
  return tokens;
}

function cleanTokenList(tokens) {
  // remove empty tokens and merge tokens without words
  var prefix = '',
      shortList = [],
      loc;
  // merge empty tokens pushing prefixes and suffixes forward to next non-empty word
  tokens.forEach(function(token, index) {
    if (token.word.length>0) {
      token.prefix = prefix+token.prefix;
      shortList.push(token);
      prefix = '';
    } else prefix = prefix + token.prefix + token.suffix;
  });
  if (prefix.length>0) {
    if (shortList.length>0) shortList[shortList.length-1].suffix = shortList[shortList.length-1].suffix + prefix;
      else shortList.push({word:'', prefix: prefix, suffix:''});
  }
  tokens = JSON.parse(JSON.stringify(shortList));

  // TODO: these two should be one loop like /^[\s]+|^[^\s]+[\s]+/gm
  // move back beginning spaces or beginning non-space plus space
  if (tokens.length>2) for (var i=1; i<tokens.length; i++) {
    if (loc = /^([\s]+|^[^\s]+[\s]+)(.*)$/gm.exec(tokens[i].prefix)) {
      tokens[i-1].suffix += loc[1];
      tokens[i].prefix = loc[2];
    }
  }

  // loop through array and cleanup edges, moving punctuation and tags 
  let tt, regex
  tokens.forEach(function(token, index) { 
    regex = XRegExp(`^(\\PL*)([\\pL\-\>\<\’\‘\'\`]+)(\\PL*)$`, 'mgu')  

    if (tt = regex.exec(token.word) && Array.isArray(tt) && (tt[1].length || tt[3].length)) { 
      token.prefix = token.prefix + tt[1];
      token.word = tt[2];
      token.suffix = tt[3] + token.suffix;
    } 

    // Remove single quotes only if they are on both sides
    regex = /^([\’\‘\'\`])(.*)([\’\‘\'\`])$/mg;
    if ((tt = regex.exec(token.word)) && (tt[1].length>0 || tt[3].length>0)) {
      token.prefix = token.prefix + tt[1];
      token.word = tt[2];
      token.suffix = tt[3] + token.suffix;
    }

    // If the word appears to be an html entity, push it back into prefix
    if ((token.prefix.slice(-1)==='&') && (token.suffix.slice(0,1)===';')) {
      token.prefix = token.prefix + token.word + ';';
      token.word = '';
      token.suffix = token.suffix.slice(1);
    } 

    // for each word, add some additional info
    token.info = tokenInfo(token);

    // replace list item with updated object
    tokens[index] = token;
  })
 
  return tokens;
}
 
function tokenInfo(token) {
  let info = {class: []}

  // if token already has class, keep
  if (token.class && token.class.length>0) {
    if (typeof token.class==='string') info.class=token.class.trim().split(' ')
      else info.class=token.class  
  }

  // now generate base version
  info.stripped = term_strip_alpha(token.word);
  // now determine if word is allcaps
  info.isAllCaps = (info.stripped === info.stripped.toUpperCase());

  //info.lookup = info.stripped.substr(0,3).toLowerCase();
  info.isPossibleTerm = bterm.isPossibleTerm(token.word);
  if (info.isPossibleTerm) {
    info.phoneme = bterm.phonemes(token.word)
    if (!token.data) token.data={}
    token.data.sug = info.phoneme
  } 
  info.html = glyph2HTML(token.word);
  info.glyph = HTML2glyph(token.word);
  info.ansi = glyph2ANSI(info.glyph);
  info.soundex = soundex(info.stripped);

  //if (info.isPossibleTerm) info.class = ['term'];
  return info;
}

function reTokenizeFromWrapper(str, tag='w') { 
  // split into array by end tag  
  let tokens = splitStringIntoTokens(str, `</${tag}>`)

  // when content is inserted between tags, move it to a new tag 
  for (let i=tokens.length-1; i >= 0; --i) {
    // if any data in token before <tag, split and insert <tag data to new token  
    if (tokens[i].word.indexOf(`<${tag}`)>0) {
      let str = tokens[i].word
      let index = str.indexOf(`<${tag}`)
      let l1 = str.substring(0, index)
      let l2 = str.substring(index+1)
      let wrd = {word: l2, suffix: tokens[i].suffix, prefix:''}
      arr.splice(index+1, 0, wrd)
      tokens[i].word = l1
      tokens[i].suffix = ''
    }  
  } 

  // remove all wrapper close-tags from suffixes, like </w>
  tokens.map((token) => token.suffix = token.suffix.replace(`</${tag}>`, ''))

  // remove all wrapper open tags and move values into token object 
  tokens.map((token, i) => { 
    if (token.word.indexOf(`<${tag}`)>-1) { 
      // remove wrapper open tag
      let wrapperTag = token.word.substring(0, token.word.indexOf(`>`)+1) 
      tokens[i].word = token.word.substring(token.word.indexOf(`>`)+1) 

      // pull out the class from the wrapper tag, if any
      let classreg = /class\s*=\s*['"]([^'"]+?)['"]/i, matches
      if ((matches = classreg.exec(wrapperTag)) !== null)  tokens[i].class = [ matches[1].trim() ] 

      // pull out data attributes from the wrapper tag, if any
      let datareg = /data-(.*?)\s*=\s*['"]([^'"]+?)['"]/ig
      while ((matches = datareg.exec(wrapperTag)) !== null) {
        if (!tokens[i].data) tokens[i].data = {} 
        tokens[i].data[matches[1]] = matches[2] 
      }  
    } 
  })  

  return tokens
}





module.exports = parser


