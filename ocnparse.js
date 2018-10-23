// parseblock is a set of tokenizing tools compatible with Baha'i terms
// since \b in regex cannot deal with words that include unicode, dashes or single quotes
//
 

var XRegExp = require('xregexp')
//var bterm = require('../bahai-term-phonemes/bahai-term-phonemes')
var bterm = require('bahai-term-phonemes')

let html_open_regex = '<((?!(u>|u |\\/)))[^><]+>', html_close_regex = '<\\/((?!(u>|\\W)).)+>';


var parser = {

  // helper function
  // pass in a string of wrapped words
  // words will be re-parsed, retaining class and data attributes from wrapper tags
  reWrap: function(str, srcTag='w', destTag='') {
    let tokens = this.tokenize(str, srcTag) 
    if (!destTag) destTag = srcTag
    return this.rebuild(tokens, destTag)
  },
 
  // pass in a string to tokenize
  // pass in tag to re-tokenize word-wrapped string
  // pass in a token list to re-calculate each token
  tokenize: function(str, tag='') {
    let tokens = splitTokens(str, tag)  
    let open_tag = []
    tokens.map((token, i) => {
      addTokenInfo(token) 
      if (token.info.type === 'html') {
        //token.prefix = token.prefix.trim();
        //token.suffix = token.suffix.trim();
        token.info.class = token.info.class || []
        if (token.info.class.indexOf('service-info') === -1) {
          token.info.class.push('service-info')
        }
        if (token.prefix) {
          if (token.prefix === 'sg' && token.info && token.info.data && typeof token.info.data.suggestion !== 'undefined') {
            //token.info.data.sugg = token.info.data.suggestion;
            let next_index = i + 1;
            let next_token = null;
            let group_token = null;
            let group_index = null;
            let prepend_text = '';
            do {
              next_token = tokens[next_index];
              if (typeof next_token !== 'undefined' && (!next_token.suffix || next_token.suffix.trim() !== 'sg')) {
                if (!group_token && next_token.info && next_token.info.type === 'html') {
                  delete tokens[next_index];
                  ++next_index;
                  prepend_text+='<' + next_token.prefix + '>';
                  continue;
                }
                if (!group_token) {
                  next_token.info = next_token.info || {};
                  let next_data = next_token.info.data || {};
                  next_data.sugg = token.info.data.suggestion;
                  tokens[next_index].info.data = next_data;
                  group_token = next_token;
                  group_token.word=prepend_text+group_token.word;
                  group_index = next_index;
                  //group_token.word+=group_token.suffix;
                } else {
                  if (next_token.info && next_token.info.type === 'html') {
                    //console.log(next_token)
                    if(next_token.prefix) {
                      next_token.prefix = '<' + next_token.prefix + '>';
                    }
                    if (next_token.suffix) {
                      next_token.suffix = '</' + next_token.suffix + '>';
                    }
                    //console.log(next_token)
                  }
                  group_token.word+=group_token.suffix + next_token.prefix + next_token.word;
                  group_token.suffix = next_token.suffix;
                  delete tokens[next_index];
                }
                //break;
              } else {
                break;
              }
              ++next_index;
            } while (next_token);
            //console.log('GROUP TOKEN')
            //console.log(group_token)
            if (group_index) {
              tokens[group_index] = group_token;
            }
          }
          open_tag.push(token.prefix);
        } else if (open_tag[open_tag.length - 1] && token.suffix.trim() === open_tag[open_tag.length - 1].trim()) {
          open_tag.pop();
        }
      } else if (open_tag.length) {
        if (['sup', 'sub'].indexOf(open_tag[open_tag.length - 1]) !== -1) {
          token.info.data = token.info.data || {}
          token.info.data.sugg = ''
          token.info.class = token.info.class || []
          if (token.info.class.indexOf('service-info') === -1) {
            token.info.class.push('service-info')
          }
        }
      }
    }) 
    tokens.forEach((token, index) => {
      if (['(', '[', '{'].indexOf(token.suffix.trim()) !== -1) {
        let nextToken = tokens[index + 1];
        if (nextToken) {
          if (nextToken.info && nextToken.info.type === 'html') {
            if (typeof nextToken.before === 'undefined') {
              nextToken.before = '';
            }
            nextToken.before = token.suffix.trim() + nextToken.before;
          } else {
            nextToken.prefix = token.suffix.trim() + nextToken.prefix;
          }
          token.suffix = token.suffix.replace(token.suffix.trim(), '');
          //tokens[index + 1] = nextToken;
        }
      }
      if ([')', ']', '}'].indexOf(token.prefix.trim()) !== -1) {
        let prevToken = tokens[index - 1];
        if (prevToken) {
          if (prevToken.info && prevToken.info.type === 'html') {
            if (typeof prevToken.after === 'undefined') {
              prevToken.after = '';
            }
            prevToken.after+= token.prefix.trim();
          } else {
            prevToken.suffix+= token.prefix.trim();
          }
          token.prefix = token.prefix.replace(token.prefix.trim(), '');;
          //console.log(token, prevToken)
          //tokens[index - 1] = prevToken;
        }
      }
      if (/^["'“”‘’]+$/.test(token.word.trim())) {
        let quote = token.word.trim();
        let direction = 0;
        if (/[“‘]/.test(quote)) {
          direction = 1;
        } else if (/[”’]/.test(quote)) {
          direction = -1;
        } else {
          let quotes = 0;
          let ind = index - 1;
          let prev = tokens[ind];//
          while (prev) {
            if ((prev.suffix && prev.suffix.indexOf(quote) !== -1) || 
                    (prev.prefix && prev.prefix.indexOf(quote) !== -1) || 
                    (prev.before && prev.before.indexOf(quote) !== -1) || 
                    (prev.after && prev.after.indexOf(quote) !== -1)) {
              ++quotes;
            }
            --ind;
            prev = tokens[ind];
          }
          if (quotes === 0 || quotes % 2 === 0) {
            direction = 1;
          } else {
            direction = -1;
          }
        }
        if (direction === 1) {
          let next = tokens[index + 1];
          if (next) {
            //console.log(token, next)
            if (next.info && next.info.type === 'html') {
              if (typeof next.before === 'undefined') {
                next.before = '';
              }
              next.before = token.prefix + token.word + token.suffix + next.before;
            } else {
              next.prefix = token.prefix + token.word + token.suffix + next.prefix;
            }
            tokens.splice(index, 1);
          }
        } else if (direction === -1) {
          let prev = tokens[index - 1];
          if (prev) {
            //console.log(token, prev)
            if (prev.info && prev.info.type === 'html') {
              if (typeof prev.after === 'undefined') {
                prev.after = '';
              }
              prev.after = prev.after + token.prefix + token.word + token.suffix;
            } else {
              prev.suffix = prev.suffix + token.prefix + token.word + token.suffix;
            }
            tokens.splice(index, 1);
          }
        }
      }
    })
    tokens.forEach((token, index) => {
      if (/(?:\r\n|\r|\n)/.test(token.suffix)) {
        let next = tokens[index + 1];
        if (next && next.info && next.info.type === 'html') {
          if (!next.after) {
            next.after = '';
          }
          next.after += "\n";
          token.suffix = token.suffix.replace(/(?:\r\n|\r|\n)/img, '');
          tokens[index + 1] = next;
        } else {
          let suff = token.suffix.split(/(?:\r\n|\r|\n)/);
          token.after = "\n";
          token.suffix = suff[0];
          if (suff[suff.length - 1]) {
            if (next) {
              next.prefix+= suff[suff.length - 1];
            }
          }
        }
      }
    });
    return tokens 
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
    tokens.map( (token, index) => {
      let data_attrs = ''
      let class_attr = ''
      let class_id = ''
      let attrs = '';
      if (token.info) {
        //console.log(token.word, ':', token.info)
        // data attributes are stored as a keyed object: token.info.data = {attrName: attrValue}
        if (token.info.data) Object.keys(token.info.data).map((key) => {
          data_attrs += ` data-${key}="${token.info.data[key]}"`
        })
        // class is stored as a simple array in tokens:  token.info.class = []
        if (token.info.class && token.info.class.length>0) class_attr = ` class="${token.info.class.join(' ')}"`
        // add id 
        if (token.info.id) class_id = ` id="${token.info.id}"`
        if (token.info.href) {
          attrs = ` href="${token.info.href}"`;
        }
      } 
      if (token.info.type === 'html') {// special type of token, meaning opening or closing HTML tag
        if (token.suffix.indexOf(' ') !== -1) {
          //after_close_tag = ' ';
          let i = index + 1;
          while(tokens[i]) {
            if (!tokens[i].info || tokens[i].info.type !== 'html') {
              tokens[i].prefix+= ' ';
              break;
            }
            ++i;
          }
        }
        token.prefix = token.prefix.trim();
        token.suffix = token.suffix.trim();
        let openTag = (token.prefix.length>0 ? `<${token.prefix}${class_id}${class_attr}${data_attrs}${attrs}>` : '')
        let closeTag = (token.suffix.length>0 ? `</${token.suffix}>` : '')
        let before = token.before ? token.before : '';
        let after = token.after ? token.after : '';
        let wrappedToken = `${before}${openTag}${token.word}${closeTag}${after}`
        result.push(wrappedToken)
      } else {
        let openTag = (tag.length>0 ? `<${tag}${class_id}${class_attr}${data_attrs}>` : '')
        let closeTag = (tag.length>0 ? `</${tag}>` : '')
        let before = token.before ? token.before : '';
        let after = token.after ? token.after : '';
        let wrappedToken = `${before}${openTag}${token.prefix}${token.word}${token.suffix}${closeTag}${after}`
        result.push(wrappedToken)
      }
    })
    return result.join('')
  },

  // check if this content would be tokenized to a word or not
  isWord: function(word) {  
    return !!(this.tokenizeWord(word).word.length)  
  },

 // simple re-tokenizing of data that should be just one token
  tokenizeWord: function(word) { 
    let token = this.tokenize(word)[0] 
    addTokenInfo(token)
    return token
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
  //console.log('before split',tokens)
  if (!tokens) return []   
 
  // if wrapper tag, first tokenize and extract class and data attributes
  if ((typeof tokens === 'string') && tag)  tokens = splitWrappedString(tokens, tag)      
  else if (typeof tokens==='string') tokens = splitUnWrappedString(tokens) 
  
  // Initial splitting of all text blocks into tokens 
  let delimiters = [
    // first, split on line breaks
    '[\n\r]+',
    // next on most common legit inline tags which are not part of a word
    '&.*?;', html_open_regex, html_close_regex,
    // all html tags except <u>
    '</?(?!u)\\w+((\\s+\\w+(\\s*=\\s*(?:".*?"|\'.*?\'|[^\'">\\s]+))?)+\\s*|\\s*)/?>',
    // m-dashes
    '[\\—]|[-]{2,3}',
    // white space and remaining punctuation
    "[\\s\\,\\.\\!\\—\\?\\;\\:\\[\\]\\+\\=\\(\\)\\*\\&\\^\\%\\$\\#\\@\\~\\|]+?"
  ]   
  delimiters.map( (delimiterRegex) => {
    let items, newList = [] 
    tokens.map((token) => {   
      items = splitRegex(token.word, delimiterRegex)   
      if (items.length>1) { // the delimiter matched this word block, it needs to be split further 
        // add the first token 
        let firstToken = items[0]
        if (token.info) {
          if (!firstToken.info || firstToken.info.type !== 'html') {
            firstToken.info = token.info
          }
        }
        firstToken.prefix = token.prefix + firstToken.prefix 
        newList.push(firstToken)
        // middle tokens 
        items.map((newToken, i) => { if (i>0 && i<items.length-1) newList.push(newToken) })
        // last token
        let lastToken = items[items.length-1]
        lastToken.suffix += token.suffix 
        newList.push(lastToken)
      } else if (items.length>0)  { // single word token, but possibly modified with regard to prefix and suffix
        let newToken = items[0] 
        newToken.prefix = token.prefix + newToken.prefix
        newToken.suffix += token.suffix
        if (token.info) newToken.info = token.info
        newList.push(newToken)
      } else newList.push(token) // empty word token, usually with \n in suffix
      //cleanTokens(newList)
    }) 
    tokens = newList 
  }) 
  
  tokens = cleanTokens(tokens)  
  tokens = prepareHtmlTokens(tokens);
  return tokens
}

function splitUnWrappedString(str) {
  // split by line break (line breaks mess with javascript regex multiline parsing)
  let tagSplitReg = new RegExp(`([\n\r]+)`, 'g')
  htmlOpenReg = new RegExp(html_open_regex, 'img');
  htmlCloseReg = new RegExp(html_close_regex, 'img');
  htmlReg = new RegExp('(<[^>]+>)', 'img');
  let tokens = [];
  str.split(tagSplitReg).filter((str) => str.length>0).map((word) => {
    let token = {word: word, suffix: '', prefix: ''};
    if (htmlOpenReg.test(token.word) || htmlCloseReg.test(token.word)) {
      let words = token.word.split(htmlReg).filter((_s, i)=>_s.length>0);
      words.map((w, i) => {
        let t = {word: w, suffix: token.suffix === " " && i == words.length - 1 ? ' ' : '', prefix: token.prefix === " " && i == 0 ? ' ' : ''};
        tokens.push(t);
      });
    } else {
      tokens.push(trimToken(token))
    }
  })  
  tokens = packEmptyTokens(tokens)
  //console.log('Initial split', tokens)
  return tokens
}

// splits word-wrapped string into tokens -- preserving class and data attributes
function splitWrappedString(str, tag='w') {  
  // split by wrapper tag and line break (line breaks mess with javascript regex multiline parsing)
  let matches, tokens = []  
  // let tagSplitReg = new RegExp(`<${tag}.*?>[\\s\\S]*?<\\/${tag}>`, 'img')
  // while (matches = tagSplitReg.exec(str)) tokens.push({word: matches[0], prefix:'', suffix:''})  
  // this approach rquires an extra step but is more clear
  tagSplitReg = new RegExp(`(<${tag}.*?>[\\s\\S]*?<\\/${tag}>)`, 'img')
  //tokens = str.split(tagSplitReg).filter((item)=>item.length>0)
  //tokens.map((token, i)=> tokens[i] = {word: token, suffix: '', prefix: ''} )
  htmlOpenReg = new RegExp(html_open_regex, 'img');
  htmlCloseReg = new RegExp(html_close_regex, 'img');
  htmlReg = new RegExp('<(?!\/?(u)(?=>|\s?.*>))\/?.*?>', 'img');
  str.split(tagSplitReg).filter((s)=>s.length>0).map((_word)=>{  
    let _words = _word.split(/(?:\r\n|\r|\n)/);
    if (_words.length > 0) {
      _words.forEach((w, i) => {
        if (i < _words.length - 1) {
          _words[i]+="\n";
        }
      })
    } else {
      _words = [_word];
    }
    _words.forEach(word => {
      let token = {word: word, suffix: '', prefix: ''}// need to replace line breaks, otherwise text after line break is lost
      token = extractWrapperTag(token, tag)
      token = trimToken(token)
      if (htmlOpenReg.test(token.word) || htmlCloseReg.test(token.word)) {
        let words = [];
        let matchPos = 0;
        while ((matches = htmlReg.exec(token.word))) {
          if (matches.index > 0) {
            words.push(matches.input.substr(matchPos, matches.index - matchPos));
          }
          words.push(matches[0]);
          matchPos = matches.index + matches[0].length;
        }
        if (matchPos < token.word.length) {
          words.push(token.word.substr(matchPos, token.word.length - matchPos))
        }
        words.map((w, i) => {
          let t = {word: w, suffix: i == words.length - 1 ? token.suffix : '', prefix: token.prefix === " " && i == 0 ? ' ' : ''};
          tokens.push(t);
        });
        //console.log('=============', "'" + token.suffix + "'")
      } else {
        tokens.push(token) 
      }
    });
  })
  //console.log('Initial split', tokens) 
  tokens = packEmptyTokens(tokens)
  return tokens 
}

// extracts wrapper tag and attribute data (class, data-attrs and id)
function extractWrapperTag(token, tag='w') {
  let tagDataReg = new RegExp(`<${tag}(.*?)>([\\s\\S]*?)<\\/${tag}>`, 'im')  
  let classReg = /class\s*=\s*['"]([^'"]+?)['"]/im
  let idReg = /id\s*=\s*['"]([^'"]+?)['"]/im
  let match 
  if ((match = tagDataReg.exec(token.word)) && (match.length>2)) { 
    token.word = match[2]
    token = trimToken(token) // split out whitespace in word
    // word may still contain illegal internal line-breaks and will need re-split
    let tagData = match[1]
    if (tagData.length>4) {
      // pull out the class from the wrapper tag, if any
      if ((matches = classReg.exec(tagData)) !== null)  token.info = {class: matches[1].trim().split(' ')}
      // pull out the wrapper tag id, if any
      if ((matches = idReg.exec(tagData)) !== null) {
        if (!token.info) token.info = {}
        token.info.id = matches[1].trim()   
        //console.log('match found', matches)
      }      
      // pull out data attributes from the wrapper tag, if any
      let datareg = /data-(.*?)\s*=\s*['"]([^'"]+?)['"]/img 
      while ((matches = datareg.exec(tagData)) !== null) {
        if (!token.info) token.info = {data:{}} 
        if (!token.info.data) token.info.data = {};
        token.info.data[matches[1]] = matches[2] 
      }          
    } 
  } 

  return token
}

// move any whitespace on edges of word in word to suffix and prefix -- works with multiline whitespace
// TODO: update to use multiline begin and end anchors
function trimToken(token) { 
  //console.log('pre-trimmed token', token) 
  //let padReg = XRegExp(`\\A(\\s*?)(\\S[\\s\\S]*?)(\\s*?)\\z`, 'imgus') // fails, does not accept \A
  //let padReg = new RegExp(`^(\\s*?)(\\S[\\S\\s]+?\\S)(\\s*)$`, 'gmu')
  let padReg = XRegExp(`^(\\s*?)(\\S[\\S\\s]+?\\S)(\\s*)$`, 'imgus') // does not accept \A
  if (match = padReg.exec(token.word)) {  
    token.prefix += match[1]
    token.word = match[2]
    token.suffix = match[3] + token.suffix
  }
  //console.log('trimmed token', token)
  return token
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
  let before= JSON.stringify(tokens)
  tokens = cleanTokens(tokens)
  let after= JSON.stringify(tokens)
  //if (before!= after) console.log('Modified tokens: ', '\n', before, '\n', after, delimiterRegex)
  
  //console.log('splitRegex', str, delimiterRegex, tokens)
  return tokens;
}
 
// cleanup word, suffix and prefix of token list & delete empty tokens
function cleanTokens(tokens) {  
  tokens = prepareHtmlTokens(tokens)
  tokens = packEmptyTokens(tokens)

  // TODO: these two should be one loop like /^[\s]+|^[^\s]+[\s]+/gm
  // move back beginning spaces or beginning non-space plus space (if not an open tag)
  if (tokens.length>2) tokens.map((token, i) => { 
    if (i>0) { // we cannot do move back for first token
      let prevToken = tokens[i-1], tt, regex
      if (!prevToken.info || prevToken.info.type !== 'html') {
        if (!prevToken) console.error('Corrupt token list', i, tokens)
        regex = /^([\s]+|^[^<]+[\s]+)(.*)$/gm
        if (tt = regex.exec(token.prefix)) {
          prevToken.suffix += tt[1];
          token.prefix = tt[2];
          //console.log('Move spaces back (suffix <- prefix)', `"${token.suffix}"`, `"${token.prefix}"`, tt)
          if (!token.word.length) moveEmptyToken(tokens, i)
        }
      }
    }
  })
  
  let open_tag_regex = new RegExp('^' + html_open_regex + '$', 'g')
  let close_tag_regex = new RegExp('^' + html_close_regex + '$', 'g')

  // loop through array and cleanup edges, moving punctuation and tags  
  for (let index = 0; index < tokens.length; ++index) { 
    let token = tokens[index];
    let tt, regex

    // check token word to match HTML tag. If matches - move it to separate special tag
    if (open_tag_regex.test(token.word)) {
      token.prefix = token.word;
      token.word = '';
      token.info = token.info || {};
      token.info.type = 'html';
    }
    if (close_tag_regex.test(token.word)) {
      if (!token.suffix) {
        token.suffix = token.word;
        token.word = '';
        token.info = token.info || {};
        token.info.type = 'html';
      } else {
        tokens.splice(index, 0, {
          suffix: token.word,
          prefix: '',
          word: '',
          info: {type: 'html'}
        });
        //++index;
        token.word = ''
      }
    }
    // move non-word parts out into prefix and suffix
    regex = XRegExp(`^(\\PL*)([\\pL\-\>\<\’\‘\'\`]+)(\\PL*)$`, 'mgu')  
    if (tt = regex.exec(token.word) && Array.isArray(tt) && (tt[1].length || tt[3].length)) { 
      token.prefix = token.prefix + tt[1];
      token.word = tt[2];
      token.suffix = tt[3] + token.suffix;
      //console.log('Moving punctuation out of word',`"${token.suffix}" "${token.word}" "${token.prefix}"`,'\n',tt)
      if (!token.word.length) moveEmptyToken(tokens, index)
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
      if (!token.word.length) moveEmptyToken(tokens, index)
    } 

    // for some reason we still sometimes have common punctuation on the ends of the word
    //  can create an empty token
    regex = /^([\!\?\@\#\$\%\^\*\(\)\~\,\.]*)([^\!\?\@\#\$\%\^\*\(\)\~\,\.]*)([[\!\?\@\#\$\%\^\*\(\)\~\,\.]*)$/mg;
    if ((tt = regex.exec(token.word)) && (tt[1].length>0 || tt[3].length>0)) {
      token.prefix = token.prefix + tt[1];
      token.word = tt[2];
      token.suffix = tt[3] + token.suffix
      //console.log('Remove punctuation again because my regex sucks',`"${token.suffix}" "${token.word}" "${token.prefix}"`,'\n',tt)
      if (!token.word.length) moveEmptyToken(tokens, index)
      //console.log('after checkEmptyToken',`"${token.suffix}" "${token.word}" "${token.prefix}"`)
    }

    // If the entire word appears to be an html entity, push it back into prefix
    //  can create an empty token
    if ((token.prefix.slice(-1)==='&') && (token.suffix.slice(0,1)===';')) {
      token.prefix = token.prefix + token.word + ';';
      token.word = '';
      token.suffix = token.suffix.slice(1);
      //console.log('If word is an html entity, move to prefix',`"${token.suffix}" "${token.word}" "${token.prefix}"`,'\n',tt)
      if (!token.word.length) moveEmptyToken(tokens, index)
    } 

    // if suffix ends with an open tag of some sort, move it to prefix of next word
    regex = /^(.*?)(<[a-zA-Z]+[^>]*?>)$/ig
    while (tokens.length>1 && index<tokens.length-1 && (match = regex.exec(token.suffix)) && (!token.info || token.info.type !== 'html')) {
      let nextToken = tokens[index+1]
      token.suffix = match[1]
      //nextToken.prefix = match[2] + nextToken.prefix 
      tokens.splice(index + 1, 0, {
        prefix: match[2],
        suffix: '',
        word: ''
      })
      //console.log('If open tag in suffix, move to next prefix',`"${token}" -> "${nextToken.prefix}"`,'\n',tt)
      if (!token.word.length) moveEmptyToken(tokens, index)
    }   
  }
  
  tokens = prepareHtmlTokens(tokens);
  tokens = packEmptyTokens(tokens)

  return tokens;
}

function packEmptyTokens(tokens) {
  if (!tokens || !Array.isArray(tokens) || tokens.length<1) return []
  
  let intialCount = tokens.length
  for (i=intialCount-1; i>=1; i--) {
    let token = tokens[i]
    //if (!token.hasOwnProperty('word')) console.log('error token', token)
    if ((!token.word.length || !token.word.trim().length) && (!token.info || token.info.type !== 'html')) {
        if (!tokens[i-1].info || tokens[i-1].info.type !== 'html') {
          let prevToken = tokens[i-1]
          let token = tokens[i]
          //console.log('empty token', i, token)
          prevToken.suffix += token.prefix + token.word + token.suffix 
          tokens.splice(i, 1);  //delete(tokens[i])
        }
    }
  }  
  // now check token#1
  if (tokens.length) moveEmptyToken(tokens, 0)
  // remove empty tokens 
  // return tokens.filter((tt) => (tt.info || tt.word.length || tt.prefix.length || tt.suffix.length) )
  return tokens
}

// check if token word is empty & move suffix/prefix forward or back
function moveEmptyToken(tokens, index) {
  if (!tokens[index]) return tokens
  let token = tokens[index], destToken
  if (token.word.trim().length || (token.info && token.info.type === 'html')) return
  if (index<tokens.length-1) { // move empty token forward
    destToken = tokens[index+1]
    if (destToken && (!destToken.info || destToken.info.type !== 'html')) {
      destToken.prefix = token.prefix + token.word + token.suffix + destToken.prefix
    }
  } else if (index>0) { // move empty token back
    destToken = tokens[index-1]
    if (destToken && (!destToken.info || destToken.info.type !== 'html')) {
      destToken.suffix += token.prefix + token.word + token.suffix
    }
  } 
  if (destToken && destToken.info && destToken.info.type === 'html') {
    let direction = token.prefix && index > 0 ? -1 : 1;
    let dt = null;
    let i = index + direction;
    do {
      dt = typeof tokens[i] === 'undefined' ? null : tokens[i];
      if (dt && (!dt.info || dt.info.type !== 'html')) {
        destToken = dt;
        if (direction == -1) {
          destToken.suffix = token.prefix + token.word + token.suffix + destToken.suffix
        } else {
          destToken.prefix = token.prefix + token.word + token.suffix + destToken.prefix;
        }
        break;
      }
      i+=direction;
    } while (dt);
  }
  // move info, if exists
  if (token.info && destToken) {
    if (!destToken.info) destToken.info = token.info
    else {
      if (token.info.class) destToken.info.class = mergeArraysUniq(destToken.info.class, token.info.class)
      if (token.info.data) destToken.info.data = mergeObjects(destToken.info.data, token.info.data) 
    } 
  }
  // clear empty token
  tokens.splice(index, 1);  //delete(tokens[i])
  // tokens[index] = {word:'',prefix:'',suffix:''} // notice you cannot just assign this to token ;)
  return tokens
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
    info.data.ipa = _escapeHTML(bterm.phonemes(token.word)) 
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

// Chack all tokens. If token prefix or suffix matches HTML tag then move it to special token
function prepareHtmlTokens(tokens, log) {
  //console.log('Entering', tokens);
  let rg_open = new RegExp(html_open_regex);
  let rg_close = new RegExp(html_close_regex);
  for (let i = 0; i < tokens.length; ++i) {
    let t = tokens[i];
    if (!t.prefix && t.suffix && rg_open.test(t.suffix.trim())) {
      t.prefix = t.suffix;
      t.suffix = '';
    }
    if (t.prefix) {
      //console.log('Checking prefix ', t.prefix);
      //console.log(rg_open.test(t.prefix))
      if (rg_open.test(t.prefix)) {
        let html_attributes_regex = new RegExp('<(\\w+)([^>]*)>', 'gu');
        let html_attribute_regex = new RegExp('[^ ]+=["\']{1}[^"\']*["\']{1}', 'gu');
        //console.log('++++++++++Found open tag', t);
        let token = {
          word: '',
          prefix: t.prefix,
          suffix: '',
          info: {
            type: 'html'
          }
        };
        let attributes = html_attributes_regex.exec(t.prefix);
        //console.log('Checking attributes');
        //console.log(attributes)
        
        if (attributes && attributes[1] && attributes[2]) {
          //console.log('Parsed attributes for', token, attributes)
          token.prefix = attributes[1];
          while (attr = html_attribute_regex.exec(attributes[2])) {
            let name = attr[0].substr(0, attr[0].indexOf('='));
            let value = attr[0].substr(attr[0].indexOf('=') + 1, attr[0].length);
            if (name && value) {
              value = value.replace(/"|'/g, '')
              if (name.indexOf('data-') === 0) {
                if (!token.info.data) {
                  token.info.data = {};
                }
                token.info.data[name.substr(5, name.length)] = value;
              } else if (name === 'class') {
                if (!token.info.class) {
                  token.info.class = [];
                }
                let classes = value.split(' ')
                classes.forEach(c => {
                  token.info.class.push(c);
                })
              } else {
                token.info[name] = value;
              }
            }
          }
        } else {
          let open_tag = /<(\w+)/u.exec(t.prefix);
          if (open_tag && open_tag[1]) {
            token.prefix = open_tag[1];
          }
        }
        if (t.word) {
          tokens[i].prefix = '';
          tokens.splice(i, 0, token);
        } else {
          tokens[i] = token;
        }
      }
    }
    if (t.suffix) {
      if (rg_close.test(t.suffix.trim())) {
        //console.log('++++++++++Found close tag', t)
        let close_tag = /<\/(\w+)>/gu.exec(t.suffix);
        if (close_tag && close_tag[1]) {
          t.suffix = close_tag[1];
        }
        let token = {
          word: '',
          prefix: '',
          suffix: t.suffix,
          info: {
            type: 'html'
          }
        };
        if (t.word) {
          tokens[i].suffix = '';
          tokens.splice(i + 1, 0, token);
        } else {
          tokens[i] = token;
        }
      }
    }
  }
  return tokens;
}

function _escapeHTML(str) {
  let htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  
  let reg_str = '[';
  for (let i in htmlEscapes) {
    reg_str+=i;
  }
  reg_str+=']';
  // Regex containing the keys listed immediately above.
  let htmlEscaper = new RegExp(reg_str, 'g');
  return str.replace(htmlEscaper, function(match) {
    return htmlEscapes[match];
  });
}
 


module.exports = parser


