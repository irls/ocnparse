// parseblock is a set of tokenizing tools compatible with Baha'i terms
// since \b in regex cannot deal with words that include unicode, dashes or single quotes
//

var XRegExp = require("xregexp");
//var bterm = require('../bahai-term-phonemes/bahai-term-phonemes')
var bterm = require("bahai-term-phonemes");

let html_open_regex = "<((?!(u>|u |\\/|b>|b |i>|i )))[^><]+>",
  html_close_regex = "<\\/((?!(u>|\\W|b>|(?<!l)i>)).)+>";
// arrays with different character types to control
let control_character_codes = [173, 8194, 8195, 8201, 8204, 8206, 8207, 8288];
let punctuation_characters = [".", ":", ";", "!", "?", ",", "؟", "؛", "،", "…", "—", "–", "‒"];
let quotes_open = [`“`, `‘`, `«`];
let quotes_close = [`”`, `’`, `»`];
let quotes_bidirectional = [`"`, `'`];
let brackets_open = ["(", "[", "{", "﴿"];
let brackets_close = [")", "]", "}", "﴾"];

//regular expressions for checks
let punctuation_string = "";
punctuation_characters.forEach(pc => {
  punctuation_string += `\\${pc}`;
});
let punctuation_end_regex = new RegExp(`[${punctuation_string}]`);

let quotes_string = "";
quotes_open
  .concat(quotes_close)
  .concat(quotes_bidirectional)
  .forEach(qc => {
    quotes_string += `\\${qc}`;
  });
let quotes_regex = new RegExp(`^[${quotes_string}]+$`);

let quotes_open_string = "";
quotes_open.forEach(qo => {
  quotes_open_string += `\\${qo}`;
});
let quotes_open_regex = new RegExp(`[${quotes_open_string}]`);

let quotes_close_string = "";
quotes_close.forEach(qc => {
  quotes_close_string += `\\${qc}`;
});
let quotes_close_regex = new RegExp(`[${quotes_close_string}]`);

let all_punctuation_and_brackets = `\\${punctuation_characters.join('\\')}\\${quotes_open.join('\\')}\\${quotes_close.join('\\')}\\${brackets_open.join('\\')}\\${brackets_close.join('\\')}\\${quotes_bidirectional.join('\\')}`;

let openUnderlineRegexWord = new RegExp(`[${all_punctuation_and_brackets} ]*((<(u|b|i)[^>]*>(<(u|b|i)[^>]*>)?(<(u|b|i)[^>]*>)?)[${all_punctuation_and_brackets} ]*)`, 'img');
let closeUnderlineRegexWord = new RegExp(`([${all_punctuation_and_brackets} ]*(<\/(u|b|i)>(<\/(u|b|i)>)?(<\/(u|b|i)>)?))[${all_punctuation_and_brackets} ]*`, 'img');

const keepHtmlBeginRegex = new RegExp(`^[${all_punctuation_and_brackets} ]*(<(u|b|i)[^>]*>[${all_punctuation_and_brackets} ]*)`, 'img');
const keepHtmlEndRegex = new RegExp(`([${all_punctuation_and_brackets} ]*<\/(u|b|i)>)[${all_punctuation_and_brackets} ]*$`, 'img');

const bracketsOpenRegex = new RegExp(`([\\${brackets_open.join('\\')}]+)`, 'img');
const bracketsCloseRegex = new RegExp(`([\\${brackets_close.join('\\')}]+)`, 'img');

let controlCharacterCodesString = ``;
control_character_codes.forEach(control_char => {
  controlCharacterCodesString+= String.fromCharCode(control_char);
});
const controlCharacterRegex = new RegExp(`^[${controlCharacterCodesString}]+$`, 'img');

const keepHtmlTags = ['u', 'b', 'i'];

var parser = {
  // helper function
  // pass in a string of wrapped words
  // words will be re-parsed, retaining class and data attributes from wrapper tags
  reWrap: function(str, srcTag = "w", destTag = "") {
    let tokens = this.tokenize(str, srcTag);
    //console.log(`==========IN reWrap==========`);
    //tokens.forEach(t => {
      //console.log(JSON.stringify(t));
    //});
    //console.log(`========//IN reWrap==========`);
    if (!destTag) destTag = srcTag;
    return this.rebuild(tokens, destTag);
  },

  // pass in a string to tokenize
  // pass in tag to re-tokenize word-wrapped string
  // pass in a token list to re-calculate each token
  tokenize: function(str, tag = "", addIds = false) {
    let tokens = splitTokens(str, tag);
    //logTokens(tokens, `=`, `INIT`);
    tokens = mergeAddedWords(tokens);
    //let open_tag = [];
    tokens.map((token, i) => {
      addTokenInfo(token);
    });
    let coupletSeparatorRegex = /\S*([ ]{3,}\/[ ]{3,})$/img;
    tokens.forEach((token, i) => {// move suggestion tag to correct token
      if (
        token.after &&
        /[^\w]*sg[^\w]*/i.test(token.after) &&
        !/[^\w]*\/sg[^\w]*/i.test(token.after)
      ) {
        let next = tokens[i + 1];
        if (next) {
          next.before = token.after;
        }
        delete token.after;
        //if (token.info && token.info.data && typeof token.info.data.sugg !== 'undefined') {
          //
        //}
      }
      if (token.suffix && !token.after) {
        let entity_match = /\&\#?\w+\;$/.exec(token.suffix);
        if (entity_match && entity_match[0]) {
          let next = tokens[i + 1];
          if (next && !(next.prefix || '' + next.word || '').match(/^\s/) && !next.before) {
            next.prefix = entity_match[0] + (next.prefix || '');
            token.suffix = token.suffix.replace(entity_match[0], '');
          }
        }
      }
      let slashMatch = coupletSeparatorRegex.exec(token.word);
      if (slashMatch && slashMatch[1]) {
        token.after = slashMatch[1] + (token.after || '');
        token.word = token.word.replace(slashMatch[1], '');
        if (token.word.trim().length === 0) {
          moveEmptyToken(tokens, i);
        }
      }
      if (token.suffix) {
        slashMatch = coupletSeparatorRegex.exec(token.suffix);
        if (slashMatch && slashMatch[1]) {
          token.after = slashMatch[1] + (token.after || '');
          token.suffix = token.suffix.replace(slashMatch[1], '');
        }
      }
      if (token.before && /<\/sg>/i.test(token.before) && !/<sg/i.test(token.before)) {// close suggestion to previous token
        let match = /^([\s\S]*?)(<\/sg>\s*)([\s\S]*)$/img.exec(token.before);
        if (match && match[2]) {
          let before = tokens[i - 1];
          if (before) {
            before.after = (before.after || "") + (match[1] || "") + match[2];
            token.before = (match[3] || "");
          }
        }
      }
    });
    tokens.forEach((token, i) => {
      if (
        (token.before &&
          (/[^\w]*sup[^\w]*/i.test(token.before) &&
            !/\/sup[^\w]*/i.test(token.before))) ||
        (/[^\w]*sub[^\w]*/i.test(token.before) &&
          !/\/sub[^\w]*/i.test(token.before))
      ) {
        token.info.data = token.info.data || {};
        token.info.data.sugg = "";
        if (
          !(
            /[^\w]*sup[^\w]*/i.test(token.after) ||
            /[^\w]*sub[^\w]*/i.test(token.after)
          )
        ) {
          let _i = i + 1;
          let next = false;
          do {
            next = tokens[_i];
            if (next && next.before && /<\/sup>/.test(next.before)) {
              next = false;
            }
            if (next) {
              next.info = next.info || {};
              next.info.data = next.info.data || {};
              next.info.data.sugg = "";
              if (
                next.after &&
                (/[^\w]*sup[^\w]*/i.test(next.after) ||
                  /[^\w]*sub[^\w]*/i.test(next.after))
              ) {
                next = false;
              }
            }
            _i++;
          } while (next);
        }
      }
      let hasSuggestion = false;
      if (token.before) {
        let openSg = token.before.lastIndexOf('<sg');
        let closeSg = token.before.lastIndexOf('<\/sg>');
        hasSuggestion = openSg !== -1 && openSg > closeSg;
      }
      if (hasSuggestion) {
        let suggestion = /data-suggestion(="([^"]*)")?/gi.exec(token.before);
        if (suggestion) {
          suggestion = suggestion[1] && suggestion[2] ? suggestion[2] : "";
          if (token.word) {
            token.info = token.info || {};
            token.info.data = token.info.data || {};
            token.info.data.sugg = suggestion;
            //tokens[i].data = token.data;
          }
        }
      }
    });
    let checkForCompleteSuggestion = /(<sg data-suggestion(=\"[^\"]*\")>)(.*?)(<\/sg>)(.*?)$/img;
    tokens.forEach((token, i) => {
      if (token.before) {
        checkForCompleteSuggestion.lastIndex = 0;
        let suggestionMatch = checkForCompleteSuggestion.exec(token.before);
        if (suggestionMatch && suggestionMatch[1] && suggestionMatch[3] && suggestionMatch[4]) {// suggestion inside suggestion, second suggestion on non word character
          token.before = '';
          let addToken = {
            before: suggestionMatch[1],
            prefix: '',
            word: suggestionMatch[3],
            suffix: '',
            after: suggestionMatch[4],
          };
          if (suggestionMatch[5]) {
            let tokenBefore = suggestionMatch[5];
            if (/<\/sg>/.test(tokenBefore)) {
              addToken.after+= tokenBefore;
              tokenBefore = '';
            }
            token.before = tokenBefore;
          }
          tokens.splice(i, 0, addToken);
        }
      }
    });
    let checkHtml = /<\/?\w+[^>]*>/;
    let testForSuggestionAfter = new RegExp(`<\\/sg>[\\s${all_punctuation_and_brackets}]*$`, 'i');
    tokens.forEach((token, i) => {
      let hasSuggestion = false;
      if (token.before) {
        let openSg = token.before.lastIndexOf('<sg');
        let closeSg = token.before.lastIndexOf('<\/sg');
        let hasCloseSuggestion = token.after && /\/sg[^\w]*/i.test(token.after);
        hasSuggestion = openSg !== -1 && openSg > closeSg && !hasCloseSuggestion;
      }
      if (hasSuggestion) {
        let openedSuggestions = 0;// for checking opened suggestions inside suggestions
        token.suffix = token.suffix || "";
        token.after = token.after || "";
        token.word += token.suffix + token.after;
        token.suffix = "";
        token.after = "";
        let index = i;
        let next = false;
        do {
          ++index;
          next = tokens[index];
          if (next) {
            if (next.before && /<sg/i.test(next.before)) {
              ++openedSuggestions;
            }
            if (!next.after || !/\/sg[^\w]*/i.test(next.after)) {
              /*next.info = next.info || {}
              next.info.data = next.info.data || {}
              next.info.data.sugg = suggestion;
              tokens[index].info = next.info;*/
              next.before = next.before || "";
              next.prefix = next.prefix || "";
              next.suffix = next.suffix || "";
              next.after = next.after || "";
              next.word = next.word || "";
              token.word +=
                next.before +
                next.prefix +
                next.word +
                next.suffix +
                next.after;
              delete tokens[index];
              let endsWithTag = /(<(?!sg)\w+[^>]*>\s*)$/.exec(token.before);
              if (endsWithTag && endsWithTag[1]) {
                token.word = endsWithTag[1] + token.word;
                token.before = token.before.substring(0, endsWithTag.index);
              }
            } else if (/\/sg[^\w]*/i.test(next.after)) {
              next.before = next.before || "";
              next.prefix = next.prefix || "";
              next.suffix = next.suffix || "";
              next.after = next.after || "";
              if (token.suffix) {
                token.word+= token.suffix;
                token.suffix = "";
              }
              if (token.after) {
                token.word+= token.after;
                token.after = "";
              }
              token.word += next.before + next.prefix + next.word;
              token.suffix += next.suffix;
              if (token.after || testForSuggestionAfter.test(next.after) || (/<\/sg>.*?(<\/\w+>|<br\s*\/?>).*?$/.test(next.after) && openedSuggestions === 0)) {
                let checkDoubleSg = /([ \r\n]*<\/sg>[ \r\n]*)(<\/sg>[\s\S]*)/.exec(next.after);// double closing sg tag
                if (!token.after && checkDoubleSg && checkDoubleSg[1] && checkDoubleSg[2] && /<sg/.test(token.word)) {
                  token.word+= checkDoubleSg[1];
                  token.after = (token.after || "") + checkDoubleSg[2];
                } else {
                  token.after = (token.after || '') + next.after;
                }
              } else {
                token.after+= next.after;
              }
              delete tokens[index];
              let endsWithTag = /^(\s*<\/(?!sg)\w+>)/.exec(token.after);
              if (endsWithTag && endsWithTag[1]) {
                if (token.suffix) {
                  token.suffix+= endsWithTag[1];
                } else {
                  token.word+= endsWithTag[1];
                }
                token.after = token.after.substring(endsWithTag[1].length);
              }
              token = cleanupBeforeTags(token);
              if (openedSuggestions === 0) {
                break;
              }
            } else {
            }
              if (next.after && /<\/sg/i.test(next.after)) {
                openedSuggestions-= (next.after.match(/<\/sg/img) || []).length;
                //--openedSuggestions;
                if (openedSuggestions < 0) {// double closing sg tag, all suggestions closed
                  break;
                }
              }
          }
        } while (next);
      }
    });
    tokens = tokens.filter(token => {
      return token instanceof Object && Object.keys(token).length > 0;
    });
    for (let i = 0; i < tokens.length; ++i) {
      let token = tokens[i]; 
      if (!token) {
        break;
      }
      if (bracketsOpenRegex.test(token.suffix)) {
        let nextToken = tokens[i + 1];
        if (nextToken) {
          let split = token.suffix.split(bracketsOpenRegex);
          if (Array.isArray(split) && split[1]) {
            token.suffix = split.shift();
            if (nextToken.before) {
              nextToken.before = 
                split.join('') + (token.after || "") + (nextToken.before || "");
            } else {
              nextToken.prefix = split.join('') + (token.after || "") + (nextToken.prefix || "");
            }
            token.after = '';
            //
            //nextToken.prefix = token.suffix.trim() + nextToken.prefix;
            //}
            //tokens[i + 1] = nextToken;
          }
        }
      }
      /*if (bracketsOpenRegex.test(token.prefix)) {
        let split = token.prefix.split(bracketsOpenRegex);
        if (Array.isArray(split) && split[1]) {
          let before = split.shift() + split.shift();
          token.before = (token.before || "") + before;
          token.prefix = split.join('');
        }
      }*/
      if (brackets_close.indexOf(token.prefix.trim()) !== -1) {
        let prevToken = tokens[i - 1];
        if (prevToken) {
          if (prevToken.after) {
            prevToken.after += token.prefix;
          } else {
            prevToken.suffix += token.prefix;
          }
          token.prefix = "";
          //console.log(token, prevToken)
          //tokens[i - 1] = prevToken;
        }
      }
      if (quotes_regex.test(token.word.trim())) {
        let quote = token.word.trim();
        let direction = 0;
        if (quotes_open_regex.test(quote)) {
          direction = 1;
        } else if (quotes_close_regex.test(quote)) {
          direction = -1;
        } else {
          let quotes = 0;
          let ind = i - 1;
          let prev = tokens[ind]; //
          while (prev) {
            if (
              (prev.suffix && prev.suffix.indexOf(quote) !== -1) ||
              (prev.prefix && prev.prefix.indexOf(quote) !== -1) ||
              (prev.before && prev.before.indexOf(quote) !== -1) ||
              (prev.after && prev.after.indexOf(quote) !== -1)
            ) {
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
          let next = tokens[i + 1];
          if (next) {
            //console.log(token, next)
            let addBefore = `${token.before || ''}${token.prefix || ''}${token.word || ''}${token.suffix || ''}${token.after || ''}`;
            if (next.before || (token.before)) {
              next.before =
                addBefore + (next.before || ``);
            } else {
              next.prefix =
                addBefore + next.prefix;
            }
            if (token.info && token.info.data && token.info.data.map) {
              if (!next.info) {
                next.info = token.info;
              } else if (!next.info.data) {
                next.info.data = token.info.data;
              } else if (!next.info.data.map) {
                next.info.data.map = token.info.data.map;
              }
            }
            if (token.info && token.info.id && (!next.info || !next.info.id)) {
              next.info = next.info || {};
              next.info.id = token.info.id;
            }
            tokens.splice(i, 1);
            --i;
          } else {
            // keep quote with previous token
            let prev = tokens[i - 1];
            if (prev) {
              let append =
                (token.before || "") +
                (token.prefix || "") +
                token.word +
                (token.suffix || "");
              if (prev.after) {
                prev.after += append +
                  (token.after || "");
              } else {
                prev.suffix = (prev.suffix || "") + append;
                if (token.after) {
                  prev.after = (prev.after || "") + token.after;
                }
              }
              if (token.info && token.info.data && token.info.data.map) {
                if (!prev.info) {
                  prev.info = token.info;
                } else if (!prev.info.data) {
                  prev.info.data = token.info.data;
                } else if (!prev.info.data.map) {
                  prev.info.data.map = token.info.data.map;
                }
              }
              tokens.splice(i, 1);
              --i;
            }
          }
        } else if (direction === -1) {
          let prev = tokens[i - 1];
          if (prev) {
            //console.log(token, prev)
            token.after = token.after || "";
            if (prev.after) {
              prev.after =
                prev.after +
                (token.before || '') +
                token.prefix +
                token.word +
                token.suffix +
                token.after;
            } else {
              prev.suffix =
                prev.suffix + (token.before || "") + token.prefix + token.word + token.suffix;
              prev.after = token.after;
            }
            if (token.info && token.info.data && token.info.data.map) {
              if (!prev.info) {
                prev.info = token.info;
              } else if (!prev.info.data) {
                prev.info.data = token.info.data;
              } else if (!prev.info.data.map) {
                prev.info.data.map = token.info.data.map;
              }
            }
            tokens.splice(i, 1);
            --i;
          } else {
            // keep this quote with next token
            let next = tokens[i + 1];
            if (next) {
              let prepend =
                (token.before || "") +
                (token.prefix || "") +
                token.word +
                (token.suffix || "") +
                (token.after || "");
              if (next.before) {
                next.before = prepend + next.before;
              } else {
                next.prefix = prepend + (next.prefix || "");
              }
              if (token.info && token.info.data && token.info.data.map) {
                if (!next.info) {
                  next.info = token.info;
                } else if (!next.info.data) {
                  next.info.data = token.info.data;
                } else if (!next.info.data.map) {
                  next.info.data.map = token.info.data.map;
                }
              }
              tokens.splice(i, 1);
              --i;
            }
          }
        }
      } else {
      }
    }
    tokens = tokens.filter(t => {
      return typeof t !== 'undefined';
    });
    // if prefix contains close tag then move it to previous token
    let closeTagRegex = /<\/([^>]+)>/;
    tokens.forEach((token, tokenIdx) => {
      let closeTagMatch = closeTagRegex.exec(token.prefix);
      if (closeTagMatch && closeTagMatch[1]) {
        let openTagMatch = (new RegExp(`<${closeTagMatch[1]}[^>]*>`)).exec(token.prefix);
        if (!openTagMatch || openTagMatch.index > closeTagMatch.index) {
          let prev = tokens[tokenIdx - 1];
          if (prev) {
            prev.after = (prev.after || "") + (token.before || "") + token.prefix;
            token.before = "";
            token.prefix = "";
          }
        }
      }
    });
    let quoteOpenInWordRegex = new RegExp(`^(\\s*[\\${quotes_open.join(`\\`) + `\\` + quotes_bidirectional.join(`\\`)}]+)`, `img`);
    let quoteCloseInWordRegex = new RegExp(`([\\${quotes_close.join(`\\`)}]\\s*)$`, `img`);
    tokens.forEach(token => {
      let quotesOpenMatch = token.word.split(quoteOpenInWordRegex);
      if (quotesOpenMatch && quotesOpenMatch[1] && quotesOpenMatch[2]) {
        token.prefix = (token.prefix || ``) + quotesOpenMatch[0] + quotesOpenMatch[1];
        token.word = quotesOpenMatch[2];
        addTokenInfo(token);
      }
      let quotesCloseMatch = token.word.split(quoteCloseInWordRegex);
      if (quotesCloseMatch && quotesCloseMatch[1]) {
        token.suffix = quotesCloseMatch[1] + quotesCloseMatch[2] + (token.suffix || ``);
        token.word = quotesCloseMatch[0];
        addTokenInfo(token);
      }
    });
    let underlineMatch;
    let underlineMatchClose;
    for (let index = 0; index < tokens.length; ++index) {
      let token = tokens[index];
      if (/(?:\r\n|\r|\n)/.test(token.suffix)) {
        let next = tokens[index + 1];
        let suff = token.suffix.split(/(?:\r\n|\r|\n)/);
        token.after = token.after || "";
        token.after += "\n".repeat(suff.length - 1);
        token.suffix = suff[0];
        if (suff[suff.length - 1]) {
          if (next) {
            next.prefix = suff[suff.length - 1] + next.prefix;
          }
        }
      }
      if (!token.info || !token.info.data || !token.info.data.ipa) {
        openUnderlineRegexWord.lastIndex = 0;
        closeUnderlineRegexWord.lastIndex = 0;
        underlineMatch = openUnderlineRegexWord.exec(token.word);
        underlineMatchClose = closeUnderlineRegexWord.exec(token.word);
        if (underlineMatch && underlineMatch.index === 0 && !underlineMatchClose) {// move u, b, i tags from word to before or after
          /*let before = underlineMatch[0];
          while ((underlineMatch = openUnderlineRegexWord.exec(token.word))) {
            console.log('MORE MATCH');
            console.log(underlineMatch);
            if (underlineMatch.index !== 0) {
              break;
            }
            before+= underlineMatch[0];
          }
          token.before = ((token.before || '') + (token.prefix || "") + before).replace('</u><u>', '');
          token.word = token.word.replace(before, '');*/
          token.before = ((token.before || '') + (token.prefix || "") + underlineMatch[0]).replace('</u><u>', '');
          token.word = token.word.replace(underlineMatch[0], '');
          token.prefix = "";
          if (!token.word.trim()) {
            let next = tokens[index + 1];
            if (next) {
              next.before = (token.before || '') + (token.prefix || '') + (token.suffix || '') + (token.after || '') + (next.before || '');
              tokens.splice(index, 1);
              --index;
            }
          }
        } else if (underlineMatchClose && underlineMatchClose[0].length + underlineMatchClose.index === token.word.length && !underlineMatch) {
          let appendAfter = underlineMatchClose[0];
          if (token.suffix) {
            appendAfter+= token.suffix;
            token.suffix = "";
          }
          token.after = appendAfter + (token.after || '');
          token.word = token.word.replace(underlineMatchClose[0], '');
        } else {
          //underlineMatch = _openUnderlineRegexWord.exec(token.word);
          if (underlineMatch && underlineMatch[0].length + underlineMatch.index === token.word.length) {
            let next = tokens[index + 1];
            if (next) {
              next.before = (underlineMatch[1] + (token.suffix || '') + (token.after || '') + (next.before || '')).replace('</u><u>', '');
              token.suffix = '';
              token.after = '';
              token.word = token.word.replace(underlineMatch[1], '');
              addTokenInfo(token);
            }
          } else {
          }
          //underlineMatchClose = _closeUnderlineRegexWord.exec(token.word);
          if (underlineMatchClose && underlineMatchClose.index === 0) {
            let previous = tokens[index - 1];
            if (previous) {
              previous.after = (previous.after || '') + underlineMatchClose[1];
              token.word = token.word.replace(underlineMatchClose[1], '');
              addTokenInfo(token);
            }
          }
        }
      }
    }
  let checkForHTML = /^(\s*<\w+[^>]*?>)([^<]*?)(<\/\w>\s*)$/i;
  tokens.forEach(t => {
    if (t.word && checkForHTML.test(t.word)) {
      let match = t.word.match(checkForHTML);
      if (match && match[1]) {
        if (match[2]) {
          t.before = (t.before || "") + (t.prefix || "") + match[1];
          t.prefix = "";
          t.word = match[2];
          t.after = match[3] + (t.suffix || "") + (t.after || "");
          t.suffix = "";
        } else {
          if (t.suffix) {
            t.suffix = (t.suffix || "") + t.word;
          } else {
            t.before = (t.before || "") + t.word;
          }
          t.word = "";
        }
      }
    }
  });
  tokens.forEach((token, tokenIdx) => {
    if (token.suffix && /\&$/.test(token.suffix)) {
      let next = tokens[tokenIdx + 1];
      if (next && next.word === 'amp' && next.suffix && /^;/.test(next.suffix)) {
        //let suffixParts = /^(.*?)\&$/.exec(token.suffix);
        let nextSuffixParts = /^;(.*?)$/.exec(next.suffix);
        token.suffix+= `amp;`
        next.word = '';
        next.suffix = nextSuffixParts[1];
      }
    }
    if (token.prefix && token.prefix.indexOf(`&amp;`) !== -1 && !/^[c]$/.test(token.word)) {
      let previous = tokens[tokenIdx - 1];
      if (previous) {
        previous.suffix = (previous.suffix || '') + token.prefix;
        token.prefix = '';
      }
    }
  });
  //logTokens(tokens, `=`, `After move`);
  //tokens = cleanTokens(tokens);
  tokens = cleanTokens(tokens);
  let openedSuggestions = 0;
  let suggestionTexts = [];
  let getSg = /<(\/?)sg([^>]*?data-suggestion="([^"]*)")?[^>]*>/img;
  tokens.forEach((token, i) => {
    let openSgCountBefore = token.before ? (token.before.match(/<sg/img) || []).length : 0;
    let closeSgCountBefore = token.before ? (token.before.match(/<\/sg/img) || []).length : 0;
    let openSgCountAfter = token.after ? (token.after.match(/<sg/img) || []).length : 0;
    let closeSgCountAfter = token.after ? (token.after.match(/<\/sg/img) || []).length : 0;
    openedSuggestions+= openSgCountBefore - closeSgCountBefore;
    if (token.before) {
      let sgMatch = null;
      while ((sgMatch = getSg.exec(token.before))) {
        //match[1] - has close tag
        //match[3] - suggestion text
        //console.log(sgMatch);
        if (!sgMatch[1]) {
          suggestionTexts.push(sgMatch[3] ? sgMatch[3] : '');
        } else {
          suggestionTexts.pop();
        }
      }
    }
    if (openedSuggestions > 0) {
      token.info = token.info || {data: {}};
      token.info.data = token.info.data || {};
      if (suggestionTexts.length > 0) {
        token.info.data.sugg = suggestionTexts[suggestionTexts.length - 1];
      } else {
        token.info.data.sugg = '';
      }
    }
    openedSuggestions+= openSgCountAfter - closeSgCountAfter;
    if (token.after) {
      let sgMatch = null;
      while ((sgMatch = getSg.exec(token.after))) {
        //console.log(sgMatch);
        if (!sgMatch[1]) {
          suggestionTexts.push(sgMatch[3] ? sgMatch[3] : "");
        } else {
          suggestionTexts.pop();
        }
      }
    }
  });
    
    if (addIds) {
      let maxId = tokens.reduce((acc, token) => {
        if (token.info 
            && token.info.data
            && token.info.data.pid) {
          if (acc < 1*token.info.data.pid) {
            return 1*token.info.data.pid;
          }
        }
        return acc;
      }, 0);
      
      tokens.forEach((token, i) => { // set words id's
        if (!token.info || !token.info.data) {
          token.info.data = token.info.data || {};
        }
        if (!token.info.data.pid) token.info.data.pid = ++maxId;
      })
    }
    
    return tokens;
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
  rebuild: function(tokens, tag = "") {
    var result = [];

    tokens.map((token, index) => {
      let data_attrs = "";
      let class_attr = "";
      let class_id = "";
      let attrs = "";
      if (token.info) {
        //console.log(token.word, ':', token.info)
        // data attributes are stored as a keyed object: token.info.data = {attrName: attrValue}
        if (token.info.data)
          Object.keys(token.info.data).map(key => {
            data_attrs += ` data-${key}="${token.info.data[key]}"`;
          });
        // class is stored as a simple array in tokens:  token.info.class = []
        if (token.info.class && token.info.class.length > 0)
          class_attr = ` class="${token.info.class.join(" ")}"`;
        // add id
        if (token.info.id) class_id = ` id="${token.info.id}"`;
        if (token.info.href) {
          attrs = ` href="${token.info.href}"`;
        }
      }
      let openTag =
        tag.length > 0 ? `<${tag}${class_id}${class_attr}${data_attrs}>` : "";
      if (token.html_prefix) {
        openTag = token.html_prefix + openTag;
      }
      let closeTag = tag.length > 0 ? `</${tag}>` : "";
      if (token.html_suffix) {
        closeTag += token.html_suffix;
      }
      let before = token.before ? token.before : "";
      let after = token.after ? token.after : "";
      let wrappedToken = `${before}${openTag}${token.prefix}${token.word}${
        token.suffix
      }${closeTag}${after}`;

      result.push(wrappedToken);
    });
    let response = result.join("");
    let openCloseTag = /<\/(i|u|b)><(i|u|b)>/img;
    while (openCloseTag.test(response)) {// replace double tags, e.g. </u><u>
      let replaced = 0;
      response = response.replace(openCloseTag, (item, close, open) => {
        if (close === open) {
          ++replaced;
          return '';
        }
        return item;
      });
      if (replaced === 0) {
        break;
      }
    }
    return response;
  },

  // check if this content would be tokenized to a word or not
  isWord: function(word) {
    return !!this.tokenizeWord(word).word.length;
  },

  // simple re-tokenizing of data that should be just one token
  tokenizeWord: function(word) {
    let token = this.tokenize(word)[0];
    addTokenInfo(token);
    return token;
  }
};

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
  if (!term) return "";
  term = term.replace(/_([sdztgkc][h])/gi, "<u>$1</u>");
  return term;
}

function glyph2ANSI(term) {
  return (
    term
      // remove underscores
      .replace(/_/g, "")
      // replace curly quotes with straight single quote
      .replace(/[\’\‘\`]/g, "'")
      // replace dot-unders with non-dotted
      .replace(/\Ḥ/g, "H")
      .replace(/\ḥ/g, "h")
      .replace(/\Ḍ/g, "D")
      .replace(/\ḍ/g, "d")
      .replace(/\Ṭ/g, "T")
      .replace(/\ṭ/g, "t")
      .replace(/\Ẓ/g, "Z")
      .replace(/\ẓ/g, "z")
      .replace(/\Ṣ/g, "S")
      .replace(/\ṣ/g, "s")
  );
}

function soundex(s) {
  if (!s) return "";
  var a = s.toLowerCase().split("");
  (f = a.shift()),
    (r = ""),
    (codes = {
      a: "",
      e: "",
      i: "",
      o: "",
      u: "",
      b: 1,
      f: 1,
      p: 1,
      v: 1,
      c: 2,
      g: 2,
      j: 2,
      k: 2,
      q: 2,
      s: 2,
      x: 2,
      z: 2,
      d: 3,
      t: 3,
      l: 4,
      m: 5,
      n: 5,
      r: 6
    });

  r =
    f +
    a
      .map(function(v, i, a) {
        return codes[v];
      })
      .filter(function(v, i, a) {
        return i === 0 ? v !== codes[f] : v !== a[i - 1];
      })
      .join("");

  return (r + "000").slice(0, 4).toUpperCase();
}

function stripNonAlpha(word) {
  if (!word) return "";
  return (
    word
      // replace accented vowels
      .replace(/\á/g, "a")
      .replace(/\í/g, "i")
      .replace(/\ú/g, "u")
      .replace(/\Á/g, "A")
      .replace(/\Í/g, "I")
      .replace(/\Ú/g, "U")

      // replace dot-unders with regular letters
      .replace(/\Ḥ/g, "H")
      .replace(/\ḥ/g, "h")
      .replace(/\Ḍ/g, "D")
      .replace(/\ḍ/g, "d")
      .replace(/\Ṭ/g, "T")
      .replace(/\ṭ/g, "t")
      .replace(/\Ẓ/g, "Z")
      .replace(/\ẓ/g, "z")
      .replace(/\Ṣ/g, "S")
      .replace(/\ṣ/g, "s")

      // remove all non alphas
      //.replace(/[^a-zA-Z\-]/g, '') // this fails with ansi characters, we'll have to re-think it

      // remove all HTML tags
      .replace(
        /<\/?\w+((\s+\w+(\s*=\s*(?:".*?"|'.*?'|[^'">\s]+))?)+\s*|\s*)\/?>/g,
        ""
      )

      // delete quotes and line unders
      .replace(/[\’\‘\'\`\_\ʼ]/g, "")

      // delete dashes
      .replace(/[\-]/g, "")

      .trim()
  ); // just in case
}

function HTML2glyph(term) {
  // replace underscore
  term = term.replace(/\<u\>([sdztgkc][h])\<\/u\>/gi, "_$1");
  // replace double underline
  term = term.replace(/\<u\>([sdztgkc][h])([sdztgkc][h])\<\/u\>/gi, "_$1_$2");
  // remove other tags
  term = term.replace(/(<([^>]+)>)/gi, "");
  // remove all non-legal character
  term = term.replace(/[^a-zA-ZáÁíÍúÚḤḥḌḍṬṭẒẓṢṣ\’\‘\_\-]/g, "");
  return term;
}

// takes a string or token list and splits up into properly tokenized list
function splitTokens(tokens, tag = "") {
  //console.log('before split',tokens)
  if (!tokens) return [];

  // if wrapper tag, first tokenize and extract class and data attributes
  if (typeof tokens === "string" && tag)
    tokens = splitWrappedString(tokens, tag);
  else if (typeof tokens === "string") tokens = splitUnWrappedString(tokens);
  //logTokens(tokens, `=`, `splitWrappedString`);

  // Initial splitting of all text blocks into tokens
  let delimiters = [
    // first, split on line breaks
    "[\n\r]+",
    // next on most common legit inline tags which are not part of a word
    "&\\#?\\w+;", //html_open_regex, html_close_regex,
    "\<(u|b|i)[^>]*><\/(u|b|i)>",// empty u, b, i tags, e. g. <i class="pin"></i>
    // all html tags except <u>
    "</?(?!u|b|i)\\w+((\\s+\\w+(\\s*=\\s*(?:\".*?\"|'.*?'|[^'\">\\s]+))?)+\\s*|\\s*)/?>",
    // m-dashes
    "[\\—]|[-]{2,3}"
  ];
  // white space and remaining punctuation
  let delimiter_punctuation = "\\s\\—\\+\\=\\*\\&\\^\\%\\$\\#\\~\\|";
  punctuation_characters
    .concat(brackets_open)
    .concat(brackets_close)
    //.concat(quotes_open)
    //.concat(quotes_close)
    //.concat(quotes_bidirectional)
    .forEach(cc => {
      delimiter_punctuation += `\\${cc}`;
    });
  delimiters.push(`(?<!<\\w|<(u|i|b) class)[${delimiter_punctuation}]+`);
  delimiters.map(delimiterRegex => {
    let items,
      newList = [];
    tokens.map(token => {
      items = splitRegex(token.word, delimiterRegex);
      //console.log(`==================FROM "${token.word}"`);
      //console.log(`WITH "${delimiterRegex}"`);
      //console.log(JSON.stringify(items));
      //console.log(`//====================================`);
      if (items.length > 1) {
        // the delimiter matched this word block, it needs to be split further
        // add the first token
        let firstToken = items[0];
        if (token.info) {
          if (!firstToken.info || firstToken.info.type !== "html") {
            firstToken.info = token.info;
          }
        }
        if (token.html_prefix) {
          firstToken.html_prefix = token.html_prefix;
        }
        if (token.before) {
          firstToken.before = token.before;
        }
        firstToken.prefix = token.prefix + firstToken.prefix;
        newList.push(firstToken);
        // middle tokens
        items.map((newToken, i) => {
          if (i > 0 && i < items.length - 1) newList.push(newToken);
        });
        // last token
        let lastToken = items[items.length - 1];
        lastToken.suffix += token.suffix;
        if (token.html_suffix) {
          lastToken.html_suffix = token.html_suffix;
        }
        if (token.after) {
          lastToken.after = token.after;
        }
        newList.push(lastToken);
      } else if (items.length > 0) {
        // single word token, but possibly modified with regard to prefix and suffix
        let newToken = items[0];
        newToken.prefix = token.prefix + newToken.prefix;
        newToken.suffix += token.suffix;
        if (token.info) newToken.info = token.info;
        if (token.html_prefix) {
          newToken.html_prefix = token.html_prefix;
        }
        if (token.html_suffix) {
          newToken.html_suffix = token.html_suffix;
        }
        if (token.before) {
          newToken.before = token.before;
        }
        if (token.after) {
          newToken.after = token.after;
        }
        newList.push(newToken);
      } else newList.push(token); // empty word token, usually with \n in suffix
      //cleanTokens(newList)
    });
    tokens = newList;
  });
  tokens = cleanTokens(tokens);
  return tokens;
}

function splitUnWrappedString(str) {
  // split by line break (line breaks mess with javascript regex multiline parsing)
  let tagSplitReg = new RegExp(`([\n\r]+)`, "g");
  htmlOpenReg = new RegExp(html_open_regex, "img");
  htmlCloseReg = new RegExp(html_close_regex, "img");
  htmlReg = new RegExp("(<[^>]+>)", "img");
  let tokens = [];
  str
    .split(tagSplitReg)
    .filter(str => str.length > 0)
    .map(word => {
      let token = { word: word, suffix: "", prefix: "" };
      if (htmlOpenReg.test(token.word) || htmlCloseReg.test(token.word)) {
        let words = token.word.split(htmlReg).filter((_s, i) => _s.length > 0);
        words.map((w, i) => {
          let t = {
            word: w,
            suffix: token.suffix === " " && i == words.length - 1 ? " " : "",
            prefix: token.prefix === " " && i == 0 ? " " : ""
          };
          tokens.push(t);
        });
      } else {
        tokens.push(trimToken(token));
      }
    });
  tokens = packEmptyTokens(tokens);
  //console.log('Initial split', tokens)
  return tokens;
}

// splits word-wrapped string into tokens -- preserving class and data attributes
function splitWrappedString(str, tag = "w") {
  // split by wrapper tag and line break (line breaks mess with javascript regex multiline parsing)
  let matches,
    tokens = [];
  // let tagSplitReg = new RegExp(`<${tag}.*?>[\\s\\S]*?<\\/${tag}>`, 'img')
  // while (matches = tagSplitReg.exec(str)) tokens.push({word: matches[0], prefix:'', suffix:''})
  // this approach rquires an extra step but is more clear
  tagSplitReg = new RegExp(`(<${tag}.*?>[\\s\\S]*?<\\/${tag}>)`, "img");//(<(u(?!l)|(?<!l)i|b(?!r))[^>]*>)?
  //tokens = str.split(tagSplitReg).filter((item)=>item.length>0)
  //tokens.map((token, i)=> tokens[i] = {word: token, suffix: '', prefix: ''} )
  htmlOpenReg = new RegExp(html_open_regex, "img");
  htmlCloseReg = new RegExp(html_close_regex, "img");
  htmlReg = new RegExp("<(?!/?(u(?!l)|b(?!r)|i)(?=>|s?.*>))/?.*?>", "img");
  str
    .split(tagSplitReg)
    .filter(s => s.length > 0)
    .map(_word => {
      let _words = _word.split(/(?:\r\n|\r|\n)(?![\s\S]*?<\/w>)/);
      if (_words.length > 0) {
        _words.forEach((w, i) => {
          if (i < _words.length - 1) {
            _words[i] += "\n";
          }
        });
      } else {
        _words = [_word];
      }
      _words.forEach(word => {
        let token = { word: word, suffix: "", prefix: "" }; // need to replace line breaks, otherwise text after line break is lost
        token = extractWrapperTag(token, tag);
        token = trimToken(token);
        if (
          htmlOpenReg.test(token.word) ||
          htmlOpenReg.test(token.word) ||
          htmlCloseReg.test(token.word) ||
          htmlCloseReg.test(token.word)
        ) {
          let info = token.info ? Object.assign({}, token.info) : false;
          let words = [];
          let matchPos = 0;
          while ((matches = htmlReg.exec(token.word))) {
            if (matches.index > 0) {
              words.push(
                matches.input.substr(matchPos, matches.index - matchPos)
              );
            }
            words.push(matches[0]);
            matchPos = matches.index + matches[0].length;
          }
          if (matchPos < token.word.length) {
            words.push(
              token.word.substr(matchPos, token.word.length - matchPos)
            );
          }
          words.map((w, i) => {
            let t = {
              word: w,
              suffix: i === words.length - 1 ? token.suffix : "",
              prefix: i === 0 ? token.prefix : ""
            };
            if (!w.match(htmlOpenReg)) {
              if (info !== false) {
                t.info = Object.assign({}, info);
                info = false;
              }
            }
            tokens.push(t);
          });
          //console.log('=============', "'" + token.suffix + "'")
        } else {
          tokens.push(token);
        }
      });
    });
  //console.log(`++++++++++++++++++++++++++++++++++++++++++++`);
  //tokens.forEach(t => {
    //console.log(JSON.stringify(t));
  //});
  //console.log(`++++++++++++++++++++++++++++++++++++++++++++`);
  let checkForHTML = /^(\s*(<.*>\s*)?<\w+[^>]*?>)([^<]*?)(<\/\w>(\s*<.*>)?\s*)$/i;
  let closeHtmlAtStart = new RegExp(`^(\\s*<\\/\\w+>)+[${punctuation_string}]*`, 'i');
  tokens.forEach((t, i) => {
    if (t.word && checkForHTML.test(t.word)) {
      let match = t.word.match(checkForHTML);
      //console.log(`MATCHHTML: "${t.word}"`);
      if (match && match[1] && !/<\w+[^>]*>[^<]+<\/\w+>/.test(match[1])) {// matches an html tag, but not words
        if (match[3]) {
          t.before = (t.before || "") + (t.prefix || "") + match[1];
          t.prefix = "";
          t.word = match[3];
          t.after = match[4] + (t.suffix || "") + (t.after || "");
          t.suffix = "";
        } else {
          if (t.suffix) {
            t.suffix = (t.suffix || "") + t.word;
          } else {
            t.before = (t.before || "") + t.word;
          }
          t.word = "";
        }
      }
    }
    closeHtmlAtStart.lastIndex = 0;
    if (t.word && closeHtmlAtStart.test(t.word)) {
      let match = t.word.match(closeHtmlAtStart);// check if word starts with closing html tag
      //console.log(`matchClose`);
      //console.log(JSON.stringify(t));
      if (match && match[0]) {
        let previous = tokens[i - 1];
        if (previous) {
          previous.after = (previous.after || "") + match[0];
          //console.log(JSON.stringify(previous));
          t.word = t.word.replace(closeHtmlAtStart, '');
        }
      }
      //console.log(JSON.stringify(t));
    }
  });
  //console.log(`++++++++++++++++++++++++++++++++++++++++++++`);
  //tokens.forEach(t => {
    //console.log(JSON.stringify(t));
  //});
  //console.log(`++++++++++++++++++++++++++++++++++++++++++++`);
  tokens = packEmptyTokens(tokens);
  tokens = extractHtmlTokens(tokens);
  //console.log(`++++++++++++++++++++++++++++++++++++++++++++`);
  //tokens.forEach(t => {
    //console.log(JSON.stringify(t));
  //});
  //console.log(`++++++++++++++++++++++++++++++++++++++++++++`);
  return tokens;
}

// extracts wrapper tag and attribute data (class, data-attrs and id)
function extractWrapperTag(token, tag = "w") {
  let tagDataReg = new RegExp(`<${tag}(.*?)>([\\s\\S]*?)<\\/${tag}>`, "im");
  let classReg = /\sclass\s*=\s*['"]([^'"]+?)['"]/im;
  let idReg = /\sid\s*=\s*['"]([^'"]+?)['"]/im;
  let match;
  if ((match = tagDataReg.exec(token.word)) && match.length > 2) {
    token.word = match[2];
    token = trimToken(token); // split out whitespace in word
    // word may still contain illegal internal line-breaks and will need re-split
    let tagData = match[1];
    if (tagData.length > 4) {
      // pull out the class from the wrapper tag, if any
      if ((matches = classReg.exec(tagData)) !== null)
        token.info = { class: matches[1].trim().split(" ") };
      // pull out the wrapper tag id, if any
      if ((matches = idReg.exec(tagData)) !== null) {
        if (!token.info) token.info = {};
        token.info.id = matches[1].trim();
        //console.log('match found', matches)
      }
      // pull out data attributes from the wrapper tag, if any
      let datareg = /data-(.*?)\s*=\s*['"]([^'"]+?)['"]/gim;
      while ((matches = datareg.exec(tagData)) !== null) {
        if (!token.info) token.info = { data: {} };
        if (!token.info.data) token.info.data = {};
        token.info.data[matches[1]] = matches[2];
      }
    }
    let suffixMatch;
    if ((suffixMatch = /(&lt;|&gt;)$/.exec(token.word))) {
      token.suffix = suffixMatch[0] + (token.suffix || '');
      token.word = token.word.replace(new RegExp(`${suffixMatch[0]}$`), '');
    }
  }

  return token;
}

// move any whitespace on edges of word in word to suffix and prefix -- works with multiline whitespace
// TODO: update to use multiline begin and end anchors
function trimToken(token) {
  //console.log('pre-trimmed token', token)
  //let padReg = XRegExp(`\\A(\\s*?)(\\S[\\s\\S]*?)(\\s*?)\\z`, 'imgus') // fails, does not accept \A
  //let padReg = new RegExp(`^(\\s*?)(\\S[\\S\\s]+?\\S)(\\s*)$`, 'gmu')
  let padReg = XRegExp(`^(\\s*?)(\\S[\\S\\s]+?\\S)(\\s*)$`, "imgus"); // does not accept \A
  let matches = [];
  let match;
  while ((match = padReg.exec(token.word))) {
    matches.push(match);
  }
  if (Array.isArray(matches) && matches.length === 1) {
    match = matches[0];
    token.prefix += match[1];
    token.word = match[2];
    token.suffix = match[3] + token.suffix;
  }
  //console.log('trimmed token', token)
  return token;
}

// splits a string or array of strings into tokens with a regex delimiter
function splitRegex(str, delimiterRegex) {
  // split any string by delimiter suffixed to each
  var tokens = [],
    prevIndex = 0,
    match,
    oldPrefix = "",
    keepHtmlRegex = new RegExp(`^\\s*((<\\/(u(?!l)|(?<!l)i|b(?!r))[^>]*>)+?|(<(u(?!l)|(?<!l)i|b(?!r))[^>]*>)+?)\\s*$`, 'img');// checking for opening or closing html tags, repeated once or more

  // split into words
  let divider_regex = new RegExp(delimiterRegex, "img");
  //console.log(`split: "${str}"`);
  while ((match = divider_regex.exec(str))) {
    let matchString = str.substring(prevIndex, match.index);
    //console.log(`matchString: "${matchString}"`);
    //console.log(`match[0]: "${match[0]}"`);
    if (!keepHtmlRegex.test(matchString) && !keepHtmlRegex.test(match[0])) {
      tokens.push({
        word: matchString,
        suffix: match[0],
        prefix: oldPrefix
      });
      oldPrefix = '';
    } else {
      matchString+= match[0];
      if (tokens.length > 0) {
        let prevToken = tokens[tokens.length - 1];
        prevToken.after = (prevToken.after || '') + matchString;
      } else {
        oldPrefix+= matchString;
      }
    }
    prevIndex = divider_regex.lastIndex;
  }
  // if there is no final delimiter, the last chunk is ignored. Put it into a token
  if (prevIndex < str.length) {
    let lastPart = str.substring(prevIndex, str.length);
    let matchKeepHtml = keepHtmlRegex.test(lastPart);
    if (!matchKeepHtml || tokens.length === 0) {
      tokens.push({
        word: lastPart,
        prefix: "",
        suffix: ""
      });
    } else {
      let prevToken = tokens[tokens.length - 1];
      if (!matchKeepHtml) {
        prevToken.after = (prevToken.after || '') + lastPart;
      } else {
        prevToken.word+= (prevToken.suffix || "") + lastPart;
        prevToken.suffix = "";
      }
    }
  }

  // safe cleanup and compression
  let before = JSON.stringify(tokens);
  tokens = cleanTokens(tokens);
  let after = JSON.stringify(tokens);
  //if (before!= after) console.log('Modified tokens: ', '\n', before, '\n', after, delimiterRegex)

  //console.log('splitRegex', str, delimiterRegex, tokens)
  return tokens;
}

// cleanup word, suffix and prefix of token list & delete empty tokens
function cleanTokens(tokens) {
  tokens = packEmptyTokens(tokens);

  // TODO: these two should be one loop like /^[\s]+|^[^\s]+[\s]+/gm
  // move back beginning spaces or beginning non-space plus space (if not an open tag)
  if (tokens.length > 2)
    tokens.map((token, i) => {
      if (i > 0) {
        // we cannot do move back for first token
        let prevToken = tokens[i - 1],
          tt,
          regex;
        if (!prevToken) console.error("Corrupt token list", i, tokens);
        regex = /^([\s]+|^[^<]+[\s]+)(.*)$/gm;
        if ((tt = regex.exec(token.prefix)) && !bracketsOpenRegex.test(token.prefix)) {
          if (token.before && !punctuation_end_regex.test(token.prefix) && !/[\r\n]/.test(token.before)) {
            prevToken.after = prevToken.after || "";
            prevToken.after = prevToken.after + token.before + tt[1];
            token.before = "";
            token.prefix = tt[2];
            if (/[\r\n]/.test(prevToken.after) && !/<[^>]+>/.test(prevToken.after)) {
              let suff = prevToken.after.split(/(?:\r\n|\r|\n)/);
              if (suff) {
                prevToken.after = suff[0] + "\n".repeat(suff.length - 1);
                if (suff.length > 1) {
                  token.prefix = suff[suff.length - 1] + token.prefix;
                }
              }
            }
          } else {
            if (prevToken.after && (!punctuation_end_regex.test(token.prefix) || /<\/sup>/.test(prevToken.after))) {
              if (!/[\r\n]/.test(prevToken.after)) {
                prevToken.after += tt[1];
                token.prefix = tt[2];
              }
            } else {
              if (!token.before) {
                prevToken.suffix += tt[1];
                token.prefix = tt[2];
              }
            }
          }
          //console.log('Move spaces back (suffix <- prefix)', `"${token.suffix}"`, `"${token.prefix}"`, tt)
          if (!token.word.length) moveEmptyToken(tokens, i);
        }
      }
    });

  let open_tag_regex = new RegExp("^" + html_open_regex + "$", "img");
  let close_tag_regex = new RegExp("^" + html_close_regex + "$", "img");

  // loop through array and cleanup edges, moving punctuation and tags
  for (let index = 0; index < tokens.length; ++index) {
    let token = tokens[index];
    let tt, regex;

    // check token word to match HTML tag. If matches - move it to separate special tag
    if (open_tag_regex.test(token.word)) {
      token.prefix = token.word;
      token.word = "";
      token.info = token.info || {};
      token.info.type = "html";
    }
    if (close_tag_regex.test(token.word)) {
      if (!token.suffix) {
        token.suffix = token.word;
        token.word = "";
        token.info = token.info || {};
        token.info.type = "html";
      } else {
        tokens.splice(index, 0, {
          suffix: token.word,
          prefix: "",
          word: "",
          info: { type: "html" }
        });
        //++index;
        token.word = "";
      }
    }
    // move non-word parts out into prefix and suffix
    regex = XRegExp(`^(\\PL*)([\\pL\-\>\<\’\‘\'\`]+)(\\PL*)$`, "mgu");
    if (
      (tt =
        regex.exec(token.word) &&
        Array.isArray(tt) &&
        (tt[1].length || tt[3].length))
    ) {
      token.prefix = token.prefix + tt[1];
      token.word = tt[2];
      token.suffix = tt[3] + token.suffix;
      //console.log('Moving punctuation out of word',`"${token.suffix}" "${token.word}" "${token.prefix}"`,'\n',tt)
      if (!token.word.length) moveEmptyToken(tokens, index);
    }

    // Split out single quotes only if they are on both sides
    // 'Quoted' -> Quoted
    // ‘Abd -> ‘Abd
    regex = /^([\’\‘\'\`])(.*)([\’\‘\'\`])$/gm;
    if (
      (tt = regex.exec(token.word)) &&
      (tt[1].length > 0 && tt[3].length > 0)
    ) {
      token.prefix = token.prefix + tt[1];
      token.word = tt[2];
      token.suffix = tt[3] + token.suffix;
      //console.log('Move out single quotes if on both sides of word: ', `"${token.prefix}" "${token.word}" "${token.suffix}"`, '\n', tt)
      if (!token.word.length) moveEmptyToken(tokens, index);
    }

    // for some reason we still sometimes have common punctuation on the ends of the word
    //  can create an empty token
    let check_characters_string = "";
    ["@", "#", "$", "%", "^", "*", "~", "\\", "/", "-", "—", "<", ">", "`"]
      .concat(punctuation_characters)
      .concat(brackets_open)
      .concat(brackets_close)
      .forEach(cc => {
        check_characters_string += `\\${cc}`;
      });
    // possible change to [a-zA-Zа-яА-Я0-9\u0600-\u06FF]
    regex = new RegExp(
      `^([${check_characters_string}]*)([^${check_characters_string}]*)([[${check_characters_string}]*)$`,
      "mg"
    );
    if (
      (tt = regex.exec(token.word)) &&
      (tt[1].length > 0 || tt[3].length > 0)
      && !token.word.match(/\&\#?\w+;\s*$/)
    ) {
      //let hasSuggestion = token.before && /<sg/.test(token.before) && token.after && /<\/sg>/.test(token.after);
      //if (!hasSuggestion) {// this check will create token for non word character inside suggestion
      token.prefix = token.prefix + tt[1];
      token.word = token.word.substring(0, tt.index) + tt[2];
      token.suffix = tt[3] + token.suffix;
      if (!token.word.trim().length && token.before) {
        token.before =
          token.before +
          token.prefix +
          token.word +
          token.suffix +
          (token.after || "");
        token.after = "";
        token.suffix = "";
        token.word = "";
        token.prefix = "";
      }
      //console.log('Remove punctuation again because my regex sucks',`"${token.suffix}" "${token.word}" "${token.prefix}"`,'\n',tt)
      if (!token.word.length) moveEmptyToken(tokens, index);
      //console.log('after checkEmptyToken',`"${token.suffix}" "${token.word}" "${token.prefix}"`)
      //}
    }

    // If the entire word appears to be an html entity, push it back into prefix
    //  can create an empty token
    if (token.prefix.slice(-1) === "&" && token.suffix.slice(0, 1) === ";") {
      token.prefix = token.prefix + token.word + ";";
      token.word = "";
      token.suffix = token.suffix.slice(1);
      //console.log('If word is an html entity, move to prefix',`"${token.suffix}" "${token.word}" "${token.prefix}"`,'\n',tt)
      if (!token.word.length) moveEmptyToken(tokens, index);
    }

    // if suffix ends with an open tag of some sort, move it to prefix of next word
    regex = /^(.*?)(<[a-zA-Z]+[^>]*?>)$/gi;
    while (
      tokens.length > 1 &&
      index < tokens.length - 1 &&
      (match = regex.exec(token.suffix)) &&
      (!token.info || token.info.type !== "html")
    ) {
      let nextToken = tokens[index + 1];
      token.suffix = match[1];
      //nextToken.prefix = match[2] + nextToken.prefix
      tokens.splice(index + 1, 0, {
        prefix: match[2],
        suffix: "",
        word: ""
      });
      //console.log('If open tag in suffix, move to next prefix',`"${token}" -> "${nextToken.prefix}"`,'\n',tt)
      if (!token.word.length) moveEmptyToken(tokens, index);
    }
  }

  tokens = packEmptyTokens(tokens);

  return tokens;
}

function packEmptyTokens(tokens) {
  if (!tokens || !Array.isArray(tokens) || tokens.length < 1) return [];

  let intialCount = tokens.length;
  for (i = intialCount - 1; i >= 0; i--) {
    let token = tokens[i];
    //if (!token.hasOwnProperty('word')) console.log('error token', token)
    if (
      !token.word.length ||
      !token.word.trim().length ||
      controlCharacterRegex.test(token.word)
    ) {
      if (
        tokens[i - 1] &&
        (!tokens[i - 1].info || tokens[i - 1].info.type !== "html") && 
        !openUnderlineRegexWord.test(token.word) && 
        !openUnderlineRegexWord.test(token.before)
      ) {
        let prevToken = tokens[i - 1];
        let token = tokens[i];
        //console.log('empty token', i, token)
        let wordAppend = token.prefix + token.word + token.suffix;
        if (prevToken.after) {
          prevToken.after+= (token.before || "") + wordAppend + (token.after || "");
        } else {
          prevToken.suffix += (token.before || "") + wordAppend;
          prevToken.after = (prevToken.after || "") + (token.after || "");
        }
        tokens.splice(i, 1); //delete(tokens[i])
      } else if(tokens[i + 1] && !openUnderlineRegexWord.test(token.word) && 
        !openUnderlineRegexWord.test(token.before)) {
        let nextToken = tokens[i + 1];
        let token = tokens[i];
        let wordAppend = (token.prefix || "") + token.word + (token.suffix || "") + (token.after || "");
        if (nextToken.before) {
          nextToken.before = (token.before || "") + wordAppend + nextToken.before;
        } else {
          nextToken.prefix = wordAppend + nextToken.prefix;
          nextToken.before = token.before || "";
        }
        tokens.splice(i, 1);
      }
    } else {
      htmlOpenReg = new RegExp(html_open_regex, "img");
      htmlCloseReg = new RegExp(html_close_regex, "img");
      let checkSuggestionOpen = /<sg[^>]*>/;
      let checkSuggestionClose = /<\/sg>/;
      if (htmlOpenReg.test(token.word) && (!checkSuggestionOpen.test(token.before))) {
        let nextToken = tokens[i + 1];
        let prevToken = tokens[i - 1];
        //let token = tokens[i]
        let nextPrefix = '';
        let checkCloseTag = `${token.word}${token.suffix}${token.after || ""}`;
        if (prevToken && htmlCloseReg.test(checkCloseTag)) {
          prevToken.after = (prevToken.after || "") + (token.prefix || "") + checkCloseTag;
          tokens.splice(i, 1);
        } else {
          if (prevToken) {
            if (prevToken.after) {
              prevToken.after+= (token.prefix || '');
            } else {
              prevToken.suffix = (prevToken.suffix || '') + (token.prefix || '');
            }
          } else {
            nextPrefix = token.prefix || '';
          }
          if (nextToken) {
            nextToken.before = `${token.word}${token.suffix}${token.after ||
              ""}${nextToken.before || ""}`;
            nextToken.suffix += nextPrefix;
            //nextToken.after = nextToken.after || ''
            //nextToken.after+=  token.suffix
            tokens.splice(i, 1); //delete(tokens[i])
          } else {
            token.before = token.before || "";
            token.before = token.word + token.suffix;
            token.word = "";
            //nextToken.after = nextToken.after || ''
            //nextToken.after+=  token.suffix
          }
        }
      }
      if (htmlCloseReg.test(token.word) && (!checkSuggestionClose.test(token.after))) {
        let prevToken = tokens[i - 1];
        //let token = tokens[i]
        if (prevToken) {
          prevToken.after = prevToken.after || "";
          token.after = token.after || "";
          prevToken.after += token.word + token.after;
          prevToken.suffix += token.prefix;
          prevToken.after = prevToken.after || "";
          prevToken.after += token.suffix;
          tokens.splice(i, 1); //delete(tokens[i])
        } else {
        }
      }
    }
  }
  // now check token#1
  if (tokens.length) moveEmptyToken(tokens, 0);
  // remove empty tokens
  // return tokens.filter((tt) => (tt.info || tt.word.length || tt.prefix.length || tt.suffix.length) )
  return tokens;
}

// check if token word is empty & move suffix/prefix forward or back
function moveEmptyToken(tokens, index) {
  if (!tokens[index]) return tokens;
  let token = tokens[index],
    destToken;
  if (token.word.trim().length || (token.info && token.info.type === "html"))
    return;
  if (
    index < tokens.length - 1 &&
    (!punctuation_end_regex.test(token.prefix) || index == 0)
  ) {
    // move empty token forward
    destToken = tokens[index + 1];
    if (destToken && (!destToken.info || destToken.info.type !== "html")) {
      if (token.after && /<\/\w+[^>]*>/.test(token.after) && !/<\w+[^>]*>/.test(token.after)) {// if token has close html tag move it to dest before
        destToken.before = token.after + (destToken.before || "");
        token.after = "";
      }
      if (destToken.before) {
        destToken.before =
          token.prefix + token.word + token.suffix + destToken.before;
      } else {
        destToken.prefix =
          token.prefix + token.word + token.suffix + destToken.prefix;
      }
      destToken.before = destToken.before || "";
      destToken.before =
        (token.before || "") + (token.after || "") + destToken.before;
      //destToken.before = (token.before || '') + (token.prefix || '') + (token.word || '') + (token.suffix || '') + (token.after || '') + (destToken.before || '')
    }
  } else if (index > 0) {
    // move empty token back
    destToken = tokens[index - 1];
    if (destToken && (!destToken.info || destToken.info.type !== "html")) {
      if (destToken.after && (!punctuation_end_regex.test(token.prefix) || /<\/(sup|sg|sub|i|b|u)>/.test(destToken.after))) {
        destToken.after += token.prefix + token.word + token.suffix;
      } else {
        destToken.suffix += token.prefix + token.word + token.suffix;
      }
      destToken.after = destToken.after || "";
      destToken.after += (token.before || "") + (token.after || "");
    }
  }
  if (destToken && destToken.info && destToken.info.type === "html") {
    let direction = token.prefix && index > 0 ? -1 : 1;
    let dt = null;
    let i = index + direction;
    do {
      dt = typeof tokens[i] === "undefined" ? null : tokens[i];
      if (dt && (!dt.info || dt.info.type !== "html")) {
        destToken = dt;
        if (direction == -1) {
          destToken.suffix =
            token.prefix + token.word + token.suffix + destToken.suffix;
        } else {
          destToken.prefix =
            token.prefix + token.word + token.suffix + destToken.prefix;
        }
        break;
      }
      i += direction;
    } while (dt);
  }
  // move info, if exists
  if (token.info && destToken) {
    if (!destToken.info) destToken.info = token.info;
    else {
      if (token.info.class)
        destToken.info.class = mergeArraysUniq(
          destToken.info.class,
          token.info.class
        );
      if (token.info.data) {
        destToken.info.data = mergeObjects(
          destToken.info.data,
          token.info.data
        );
      }
    }
  }
  // clear empty token
  tokens.splice(index, 1); //delete(tokens[i])
  // tokens[index] = {word:'',prefix:'',suffix:''} // notice you cannot just assign this to token ;)
  return tokens;
}

// gather additional info about token word (soundex etc.)
function addTokenInfo(token) {
  let info = {};
  // keep existing info if exists
  if (token.info) info = token.info;

  // generate base version of word with only alphanumerics
  info.stripped = stripNonAlpha(token.word);
  // determine if word is allcaps
  // TODO: make sure this works with all languages
  info.isAllCaps = info.stripped === info.stripped.toUpperCase();

  info.isPossibleTerm = bterm.isPossibleTerm(token.word);
  if (info.isPossibleTerm && !(info.data && info.data.hasOwnProperty('sugg'))) {
    if (!info.data) info.data = {};
    info.data.ipa = _escapeHTML(bterm.phonemes(token.word));
  }
  info.html = glyph2HTML(token.word);
  info.glyph = HTML2glyph(token.word);
  info.ansi = glyph2ANSI(info.glyph);
  info.soundex = soundex(info.stripped);

  token.info = info;
}


/**
 * extract html tags from words
 * @param {Array} tokens
 * @returns {Array|extractHtmlTokens.tokens}
 */
function extractHtmlTokens(tokens, log = false) {
  if (!tokens || !Array.isArray(tokens) || tokens.length < 1) return [];

  let intialCount = tokens.length;
  let match = '';
  for (let i = 0; i < tokens.length; ++i) {
    keepHtmlBeginRegex.lastIndex = 0;
    let t = tokens[i];
    match = keepHtmlBeginRegex.exec(t.word);
    //console.log(`t.word: ${t.word}`);
    //console.log(match);
    if (match && match[0]) {
      //let matched = match[0];
      let after = t.word.replace(keepHtmlBeginRegex, '');
      //t.before = (t.before || "") + (t.prefix || "") + matched;
      //t.prefix = "";
      //t.word = after;
      if (after.trim().length === 0) {
        let next = tokens[i + 1];
        if (next) {
          next.before = (t.before || "") + (t.prefix || "") + t.word + (t.suffix || "") + (t.after || "") + (next.before || "");
          t.word = "";
          t.before = "";
          t.prefix = "";
          t.suffix = "";
          t.after = "";
          //tokens.splice(i, 1);
          //--i;
        }
      }
    }
    keepHtmlEndRegex.lastIndex = 0;
    match = keepHtmlEndRegex.exec(t.word);
    if (match && match[0]) {
      let after = t.word.replace(keepHtmlEndRegex, '');
      //t.after = match[0] + (t.suffix || "") + (t.after || "");
      //t.word = t.word.replace(match[0], '');
      if (after.trim().length === 0) {
        let previous = tokens[i - 1];
        if (previous) {
          previous.after = (previous.after || "") + (t.before || "") + (t.prefix || "") + (t.word) + (t.suffix || "") + (t.after || "");
          //tokens.splice(i, 1);
          //--i;
          t.word = "";
          t.before = "";
          t.prefix = "";
          t.suffix = "";
          t.after = "";
        }
      }
    }
  }
  //let openRegex = new RegExp(`^`);
  tokens.forEach((t, i) => {
    t = extractStartHtml(t);
    if (!t.word.trim().length) {
      let next = tokens[i + 1];
      if (next) {
        next.before = (t.before || "") + (t.prefix || "") + (t.word || "") + (t.suffix || "") + (t.after || "") + (next.before || "");
        t.before = "";
        t.prefix = "";
        t.word = "";
        t.suffix = "";
        t.after = "";
      }
    }
    t = extractEndHtml(t);
    if (!t.word.trim().length) {
      let previous = tokens[i - 1];
      if (previous) {
        previous.after = (previous.after || "") + (t.before || "") + (t.prefix || "") + (t.word || "") + (t.suffix || "") + (t.after || "");
        t.before = "";
        t.prefix = "";
        t.word = "";
        t.suffix = "";
        t.after = "";
      }
    }
    //t.word = word;
  });
  tokens = packEmptyTokens(tokens, true);
  // now check token#1
  //if (tokens.length) moveEmptyToken(tokens, 0);
  // remove empty tokens
  // return tokens.filter((tt) => (tt.info || tt.word.length || tt.prefix.length || tt.suffix.length) )
  return tokens;
}

/**
 * extract opening html tags from word begin
 * @param {Object} token
 * @returns {Object} token
 */
function extractStartHtml(token) {
  keepHtmlBeginRegex.lastIndex = 0;
  //console.log(keepHtmlBeginRegex.toString());
  let beginMatch = keepHtmlBeginRegex.exec(token.word);
  if (beginMatch && beginMatch[0]) {
  //console.log(`2 t.word: "${token.word}"`);
    //console.log(beginMatch);
    //console.log(token.word.indexOf(`</${beginMatch[2]}`), `</${beginMatch[2]}`)
    if (beginMatch[2] && token.word.indexOf(`<\/${beginMatch[2]}`) > beginMatch.index) {
      return token;
    }
    token.before = (token.before || "") + (token.prefix || "") + beginMatch[0];
    token.prefix = "";
    token.word = token.word.replace(keepHtmlBeginRegex, '');
    return extractStartHtml(token);
  } else {
    return token;
  }
}

/**
 * extract closing html tag from word end
 * @param {Object} token
 * @returns {Object} token
 */
function extractEndHtml(token) {
  keepHtmlEndRegex.lastIndex = 0;
  let endMatch = keepHtmlEndRegex.exec(token.word);
  //console.log(`2.1 token.word: "${token.word}"`);
  //console.log(endMatch)
  if (endMatch && endMatch[0]) {
    let openIndex = token.word.indexOf(`<${endMatch[2]}`);
    if (endMatch[2] && openIndex !== -1 && openIndex < endMatch.index) {
      return token;
    }
    token.after = endMatch[0] + (token.suffix || "")  + (token.after || "");
    token.suffix = "";
    token.word = token.word.replace(keepHtmlEndRegex, '');
    return extractEndHtml(token);
  } else {
    return token;
  }
}

/**
 * if token.before contains open tag, and token.word contains same close tag, than move it to word.
 * call recursive until all cleaned
 * @param Object token
 * @returns Object same token, cleaned
 */
function cleanupBeforeTags(token) {
  let match = /(<(?!sg)(\w+)[^>]*>\s*)$/.exec(token.before)
  if (match && match[2]) {
    let checkForCloseTag = new RegExp(`<\\/${match[2]}>`);
    if (checkForCloseTag.test(token.word)) {
      token.before = token.before.substring(0, match.index);
      token.word = match[1] + token.word;
      return cleanupBeforeTags(token);
    }
  }
  return token;
}

// returns a unique array of merged values, can merge to or with a null
function mergeArraysUniq(arr, arr2) {
  if (!arr) arr = [];
  if (!arr2) arr2 = [];
  let result = [];
  arr.map(item => {
    if (result.indexOf(item) < 0) result.push(item);
  });
  arr2.map(item => {
    if (result.indexOf(item) < 0) result.push(item);
  });
  return result;
}

// merges properties from obj2 into obj if not already present, can merge to or with a null
function mergeObjects(obj, obj2) {
  if (!obj) obj = {};
  if (!obj2) obj2 = {};
  Object.keys(obj2).map(key => {
    if (!obj[key]) obj[key] = obj2[key];
  });
  return obj;
}

function _escapeHTML(str) {
  let htmlEscapes = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;"
  };

  let reg_str = "[";
  for (let i in htmlEscapes) {
    reg_str += i;
  }
  reg_str += "]";
  // Regex containing the keys listed immediately above.
  let htmlEscaper = new RegExp(reg_str, "g");
  return str.replace(htmlEscaper, function(match) {
    return htmlEscapes[match];
  });
}

/**
 * Merge words, added before or after existing words 
 * without whitespace or punctuation
 * @param Array tokens
 * @returns Array
 */
function mergeAddedWords(tokens) {
  let checkAddedWord = new RegExp(`^[^ ${all_punctuation_and_brackets}\\r\\n\\t<>]+$`, 'img');
  let checkLineBreak = /[\r\n]/;
  tokens.forEach((t, tIdx) => {
    if (tokens[tIdx + 1]) {
      let tokenWord = t.word + t.suffix + (t.after || "");
      checkAddedWord.lastIndex = 0;
      if (checkAddedWord.test(tokenWord) && (!t.info || (!t.info.id && (!t.info.data || !t.info.data.pid))) && !checkLineBreak.test(tokenWord)) {// check if word does not end with whitespace or punctuation and does not contain id
        //console.log('HERE1')
        let next = tokens[tIdx + 1];
        let afterWord = (next.before || "") + next.prefix + next.word;
        checkAddedWord.lastIndex = 0;
        if (checkAddedWord.test(afterWord) && !checkLineBreak.test(afterWord)) {// check that next word does not start with whitespace or punctuation
          next.word = (t.before || "") + (t.prefix || "") + t.word + (t.suffix || "") + (t.after || "") + (next.before || "") + (next.prefix || "") + next.word;
          next.before = "";
          next.prefix = "";
          tokens.splice(tIdx, 1);
        }
      }
    }
  });
  return tokens;
}

function logTokens(tokens, line = '+', header = 'TOKENS') {
  console.log(line.repeat(20) + header + line.repeat(20));
  tokens.forEach(token => {
    console.log(JSON.stringify(token));
  });
  console.log(line.repeat(18) + '//' + header + line.repeat(20));
}

module.exports = parser;
