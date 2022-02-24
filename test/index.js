var chai = require('chai'), expect = chai.expect, should = chai.should()

var Diff = require('text-diff')

var fs = require('fs')
var path = require('path')
var parser = require('../ocnparse')

// fetch an object with a bunch of test text blocks for testing
var tests = require('./testblocks.js')()
 

describe('Ocean Parser Behaviour Tests', function() {

  describe('Parse and rebuild English strings', function () {
    // it('Tokenizing then rebuilding plaintext should result in identical block', function () {
    //   let src = tests.plaintext  
    //   let tokens = parser.tokenize(src)
    //   let dest = parser.rebuild(tokens)
    //   if (dest!=src) console.log(`"${dest}"`)
    //   expect(tokens.length).to.equal(45)
    //   expect(dest===src).to.be.true;
    // })
    // it('Tokenizing then rebuilding block with <q> wrapper should result in identical block', function () {
    //   let src = tests.spans
    //   //src = `This,\n.`
    //   let tokens = parser.tokenize(src)
    //   //console.log('Final tokens', tokens)
    //   let dest = parser.rebuild(tokens)
    //   if (dest!=src) {
    //     var diff = new Diff()
    //     console.log('Rebuild failed to match exactly', diff.main(src, dest))
    //   }
    //   expect(dest===src).to.be.true;
    // })
    // it('Correctly wrap a simple block in <w> tags', function () {
    //   let src = tests.plaintext
    //   let cmp = tests.plaintext_wrapped 
    //   let tokens = parser.tokenize(src)
    //   let wrapped = parser.rebuild(tokens, 'w') 
    //   if (wrapped!=cmp) console.log(tokens, wrapped, '\n', cmp) 
    //   expect(wrapped).to.equal(cmp)
    // })
    it('Correctly wrap a complex block in <w> tags', function () {
      let src = tests.spans
      let cmp = tests.spans_wrapped
      // src =`words: <q class="abd">“How great, how very great is the Cause!`
      // cmp=`<w>words: </w><w><q class="abd">“How </w><w>great, </w><w>how </w><w>very </w><w>great </w><w>is </w><w>the </w><w>Cause!</w>`
      let tokens = parser.tokenize(src)
      let wrapped = parser.rebuild(tokens, 'w')
      if (wrapped!=cmp)  console.log(' should be: ', cmp, '\n', 'result:  ', wrapped) 
      if (wrapped!=cmp) {
        var diff = new Diff()
         console.log('Rebuild failed to match exactly', '\n\n should be:  ', cmp, '\n actually is:', wrapped)
      }
      expect(wrapped===cmp).to.be.true;
    })

  }) // Parse and rebuild English strings

  describe('Parse and rebuild Farsi strings', function () {
    it('Tokenizing then rebuilding Farsi plaintext should result in identical block', function () {
      let src = tests.plaintext_fa
      let tokens = parser.tokenize(src)
      let dest = parser.rebuild(tokens) 
      //expect(tokens.length).to.equal(165)
      if (dest!=src) {
        var diff = new Diff()
        console.log('Rebuild failed to match exactly', diff.main(src, dest))
      }
      expect(dest).to.be.equal(src);
    })

    it('Correctly wrap a farsi block in <w> tags', function () {
      let src = tests.plaintext_fa_short
      let cmp = tests.plaintext_fa_short_wrapped
      let tokens = parser.tokenize(src)
      let wrapped = parser.rebuild(tokens, 'w')
      if (wrapped!=cmp) console.log(wrapped) 
      expect(wrapped===cmp).to.be.true;
    })
  }) // Parse and rebuild Farsi strings


  describe(`Test "tokenize('!!hello!!')"`, function () {
    let token = parser.tokenize('!!hello!!')[0]
    // console.log('token:', token, token.word)
    it(`token.word === 'hello'`, () => expect(token.word).to.equal(`hello`))
  })

  describe(`Test "tokenizeWord()" returns a correct token`, function () {
    //console.log(parser.tokenizeWord(`Ma<u>sh</u>riqu’l-A<u>dh</u>kár!!`))
    it(`Test word: "Ma<u>sh</u>riqu’l-A<u>dh</u>kár!!" `, () => expect(
      parser.tokenizeWord(`Ma<u>sh</u>riqu’l-A<u>dh</u>kár!!`).word === `Ma<u>sh</u>riqu’l-A<u>dh</u>kár`
    ).to.be.true )  
  }) // Test ability to determine if a token is a word

  describe('Tokens correctly give same phonemes for different versions of terms', function () {
    var tt = parser.tokenize(`'Abdu'l-Bahá ‘Abdu’l-Bahá Abdu'l-Bahá`)
    let soundex = `A134`
    let ipa = `abdoU?l?bahA:`
    //console.log(tt[0].info.data)
    it(`Token count should be correct (3)`, () => expect(tt.length).to.equal(3) )  
    if (tt.length===3) {
      it(`Correct soundex for 'Abdu'l-Bahá (A134)`, () => expect( tt[0].info.soundex ).to.equal(soundex) ) 
      it(`Correct soundex for ‘Abdu’l-Bahá (A134)`, () => expect( tt[1].info.soundex ).to.equal(soundex) ) 
      it(`Correct soundex for Abdu'l-Bahá (A134)`, () => expect( tt[2].info.soundex ).to.equal(soundex) ) 
      it(`Correct IPA for 'Abdu'l-Bahá (abdoU?l?bahA:)`, () => expect( tt[0].info.data.ipa ).to.equal(ipa) ) 
      it(`Correct IPA for ‘Abdu’l-Bahá (abdoU?l?bahA:)`, () => expect( tt[1].info.data.ipa ).to.equal(ipa) ) 
      it(`Correct IPA for Abdu'l-Bahá (abdoU?l?bahA:)`, () => expect( tt[2].info.data.ipa ).to.equal(ipa) )   
    }
  }) // Test ability to determine if a token is a word


  describe('String with tokens correctly re-tokenizes', function () {
    let testString, tag 

    describe('Sending a token list through tokenize() should work', function () { 
      let tokens = parser.tokenize("Jack jumped over the bean stalk")
      let wrapped = parser.rebuild(tokens)
      let tokens2 = parser.tokenize(wrapped)
      tokens2 = parser.tokenize(tokens2)
      tokens2 = parser.tokenize(tokens2)
      let wrapped2 = parser.rebuild(tokens2)
      it(`Wrapped strings match`, () => expect(wrapped===wrapped2).to.be.true)  
    })

    testString = `one two three four` 
    describe('Manipulate tokens and re run tokenize. ', function () {
      tag = 'w'
      let tokens = parser.tokenize(testString)  
      let tokenCount = tokens.length
      it(`Intially has 4 tokens`, () => expect(tokenCount).to.equal(4)) 

      // inject a couple extra words into the middle of a token
      tokens[1].word += ` extra words` 
      tokens = parser.tokenize(tokens)  
      if (tokens.length!=6) console.log(tokens.length, tokens) 
      it(`After re-tokenize, has 6 tokens`, () => expect(tokens.length).to.equal(6))  
    })

    
    describe('Re-tokenize complex string ', function () {
      let tag = 'w' 

      it(`Re-wrapped string matches original`, () => {
        let testString = `<w>one </w><w>two </w><w>three </w><w>four</w>` 
        let wrapped = parser.reWrap(testString, tag) 
        if (testString!=wrapped) console.log('        '+testString, '\n', '       '+wrapped)
        return expect(testString===wrapped).to.be.true
      })

      it(`Re-wrapped string with classes matches original`, () => {
        let testString = `<w>one </w><w class="pronoun">two </w><w class="number">three </w><w>four</w>` 
        //let tokens = parser.tokenize(testString, tag)
        //console.log(tokens)
        //let wrapped = parser.rebuild(tokens, tag)
        let wrapped = parser.reWrap(testString, tag)  
        if (testString!=wrapped) console.log('        '+testString, '\n', '       '+wrapped)
        return expect(testString===wrapped).to.be.true
      })

      it(`Re-wrapped string with data-attributes matching original`, () => {
        let testString = `<w>one </w><w data-pos="pronoun">two </w><w data-type="number">three </w><w>four</w>` 
        let wrapped = parser.reWrap(testString)  
        if (testString!=wrapped) console.log('        '+testString, '\n', '       '+wrapped)
        return expect(testString===wrapped).to.be.true
      })    

      it(`Re-wrapped string with inserted mid-words`, () => {
        let tag = 'w'
        let src  = `<w>one </w><w class="pronoun">two three </w><w data-type="number">four. </w>`
        let dest = `<w>one </w><w class="pronoun">two </w><w>three </w><w data-type="number">four. </w>`
        let wrapped = parser.reWrap(src, tag) 
        if (dest!=wrapped) console.log('          '+dest, '\n', '         '+wrapped)
        return expect(dest===wrapped).to.be.true
      })

      it(`Re-wrapped simple string requiring word split`, () => {
        let tag = 'w' 
        let src  = `<w class="first">one two </w>`
        let dest = `<w class="first">one </w><w>two </w>`
        let wrapped = parser.reWrap(src, tag) 
        if (dest!=wrapped) console.log('\n  Source:      '+src, '\n', ' Should be:   '+dest, '\n', ' Actually is: '+wrapped, '\n')
        return expect(dest===wrapped).to.be.true 
      })      

      it(`Re-wrapped string with inserted at beginning`, () => {
        let tag = 'w'
        let src  = `zero <w class="first">one two </w><w>three </w><w data-type="number">four.</w>`
        let dest = `<w>zero </w><w class="first">one </w><w>two </w><w>three </w><w data-type="number">four.</w>`
        let wrapped = parser.reWrap(src, tag) 
        if (dest!=wrapped) console.log('\n  Source:      '+src, '\n', ' Should be:   '+dest, '\n', ' Actually is: '+wrapped, '\n')
        return expect(dest===wrapped).to.be.true 
      })      

      it(`Re-wrapped string to replace <w> tag with <span>`, () => {
        let src  = `<w>one </w><w class="pronoun">two three </w><w data-type="number">four. </w>`
        let dest = `<span>one </span><span class="pronoun">two </span><span>three </span><span data-type="number">four. </span>`
        let wrapped = parser.reWrap(src, 'w', 'span') 
        if (dest!=wrapped) console.log('      '+src, '\n      '+wrapped, '\n      '+dest)
        return expect(wrapped===dest).to.be.true
      })
    })
  }) //  String with tokens correctly re-tokenizes

  describe('Add IDs to tags', function () {
    let testString, tag 

    describe('Sending a token list through tokenize() should work', function () { 
      let tokens = parser.tokenize("Jack jumped over the bean stalk")
      let cmp = `<w id="word_1">Jack </w><w id="word_2">jumped </w><w id="word_3">over </w><w id="word_4">the </w><w id="word_5">bean </w><w id="word_6">stalk</w>`
      // console.log(tokens)
      tokens.map((token, index) => token.info.id = 'word_'+(index+1))
      let wrapped = parser.rebuild(tokens, 'w') 
      it(`ID injected words match expectations`, () => expect(wrapped).to.equal(cmp))  
    })

    describe('Rewrapping string with id values should match original', function () { 
      //let tokens = parser.tokenize("Jack jumped over the bean stalk")
      let cmp = `<w id="word_1">Jack </w><w id="word_2">jumped </w><w id="word_3">over </w><w id="word_4">the </w><w id="word_5">bean </w><w id="word_6">stalk</w>`
      let wrapped = parser.reWrap(cmp, 'w') 
      it(`Rewrapping tags with ids exactly matched original string`, () => expect(wrapped).to.equal(cmp))  
    })


  }) //  String with tokens correctly re-tokenizes


  describe('Multiple reparse does not distort text', function () {
    let testString, tag, src, tokens, wrapped, rewrapped
  
    tokens = parser.tokenize("Jack jumped over the bean stalk") 
    wrapped = parser.rebuild(tokens, 'w')
    rewrapped = parser.reWrap(parser.reWrap(parser.reWrap(wrapped)))  
    it(`Multiple rewrap of short phrase several times`, () => expect(wrapped).to.equal(rewrapped))  

    src = tests.spans 
    tokens = parser.tokenize(src, 'w')  
    wrapped = parser.rebuild(tokens, 'w') 
    retokenized = parser.tokenize(wrapped, 'w') 
    rewrapped = parser.reWrap(parser.reWrap(wrapped, 'w'), 'w')  
    if (wrapped!=rewrapped) {
      var diff = new Diff()
      console.log('Multiple rebuild failed to match exactly', diff.main(wrapped, rewrapped))
    }
    it(`Multiple rewrap of long phrase`, () => expect(wrapped).to.equal(rewrapped))  
  }) //  String with tokens correctly re-tokenizes
  
  describe('Wrapping text with HTML', function() {
    let string = 'Plain text with <p data-attribute="test" data-attr="attr2">paragraph in the text</p> and <f>custom data</f>';
    let tokens = parser.tokenize(string, 'w');
    let wrapped = parser.rebuild(tokens, 'w');
    let reWrapped = parser.reWrap(wrapped, 'w');
    let reWrapped_ = parser.reWrap(wrapped, 'w');
    it(`Wrapped and rewrapped HTML strings are equal`, () => expect(wrapped).to.equal(reWrapped));
    it(`Rewrapped twice text is equal`, () => expect(reWrapped).to.equal(reWrapped_));
  })
  
  describe('Wrapping multiline text', function() {
    let string = 'The old lady <f data-flag="ts1_en_39:j7r8udpr" data-status="open">pulled</f> her spectacles<sup class="js-footnote-el" data-idx="1">1</sup> down and looked over them <f data-flag="ts1_en_39:j7r8undm" data-status="open">about the\n' +
'room</f>; then she put them up and looked out under them. She seldom<sup class="js-footnote-el" data-idx="2">2</sup> or never \n'+
'looked <i>through</i> them for so small a thing as a boy; they were her state \n' +
'pair, the pride of her heart, and were built for “style,” not <w data-author="quote 1">service</w> — she \n'+
'could have seen <w data-author="quote 2">through</w> a pair of stove-lids just as well. She looked \n'+
'perplexed for a moment, and then said, not fiercely, but still loud enough \n'+
'for the furniture to hear:';
    
    let wrapped = parser.rebuild(parser.tokenize(string, 'w'), 'w')
    let check_string = `<w>The </w><w>old </w><w>lady </w><f data-flag="ts1_en_39:j7r8udpr" data-status="open"><w>pulled</w></f> <w>her </w><w>spectacles</w><sup class="js-footnote-el" data-idx="1"><w data-sugg="">1</w></sup> <w>down </w><w>and </w><w>looked </w><w>over </w><w>them </w><f data-flag="ts1_en_39:j7r8undm" data-status="open"><w>about </w><w>the</w>
<w>room; </w></f><w>then </w><w>she </w><w>put </w><w>them </w><w>up </w><w>and </w><w>looked </w><w>out </w><w>under </w><w>them. </w><w>She </w><w>seldom</w><sup class="js-footnote-el" data-idx="2"><w data-sugg="">2</w></sup> <w>or </w><w>never </w>
<w>looked </w><i><w>through</w></i> <w>them </w><w>for </w><w>so </w><w>small </w><w>a </w><w>thing </w><w>as </w><w>a </w><w>boy; </w><w>they </w><w>were </w><w>her </w><w>state </w>
<w>pair, </w><w>the </w><w>pride </w><w>of </w><w>her </w><w>heart, </w><w>and </w><w>were </w><w>built </w><w>for </w><w>“style,” </w><w>not </w><w data-author="quote 1">service — </w><w>she </w>
<w>could </w><w>have </w><w>seen </w><w data-author="quote 2">through </w><w>a </w><w>pair </w><w>of </w><w>stove-lids </w><w>just </w><w>as </w><w>well. </w><w>She </w><w>looked </w>
<w>perplexed </w><w>for </w><w>a </w><w>moment, </w><w>and </w><w>then </w><w>said, </w><w>not </w><w>fiercely, </w><w>but </w><w>still </w><w>loud </w><w>enough </w>
<w>for </w><w>the </w><w>furniture </w><w>to </w><w>hear:</w>`;

    it ('Wrapped string did not remove words after line breaks', () => expect(wrapped).to.equal(check_string))
  })
  
  describe('Adding service classes', function() {
    let str = '“There! <f id="flag1">I might<sup class="js-footnote-el" data-idx="1">1</sup> ‘a’ <qq data-author="quote123">thought</qq> of that closet</f>. What you been doing in there?”';
    let tokens = parser.tokenize(str, 'w');
    let wrapped = parser.rebuild(tokens, 'w')
    let check_string = '<w>“There! </w><f id="flag1"><w>I </w><w>might</w><sup class="js-footnote-el" data-idx="1"><w data-sugg="">1</w></sup> <w>‘a’ </w><qq data-author="quote123"><w>thought</w></qq> <w>of </w><w>that </w><w>closet. </w></f><w>What </w><w>you </w><w>been </w><w>doing </w><w>in </w><w>there?”</w>';
    it ('Wrapped string contains service classes', () => expect(wrapped).to.equal(check_string))
  })
  
  describe('Blocks intersection', function() {
    let str = '<w data-map="0,1310">“My! </w><w data-map="1310,30">Look </w><w data-map="1340,720"><sg data-suggestion="vvvvvvv">behind</sg> </w><w data-map="2060,1240">you, </w><w data-map="3300,95">aunt!</w><w data-map="3395,125">”</w>'
    let check_str = '<w>“My! </w><w>Look </w><sg data-suggestion="vvvvvvv"><w data-sugg="vvvvvvv">behind</w></sg> <w>you, </w><w>aunt!”</w>'
    let clean_content = parser.rebuild(parser.tokenize(str, "w"), "");
    let reWrapped = parser.reWrap(clean_content, 'w');
    it('Re wrapped string still contains suggestion', () => expect(reWrapped).to.be.equal(check_str))
  });
  
  describe('Blocks inside', function() {
    let str = '<a>The</a> Yellow <b><f data-flag="yellow-wallpaper_en_2s:j81nafbq" data-status="resolved">Wallpaper</f></b>';
    let clean_content = parser.rebuild(parser.tokenize(str.replace(/(?:\r\n|\r|\n)/g, ""), "w"), "");
    let reWrapped = parser.reWrap(clean_content, 'w');
    let check = '<a><w>The</w></a> <w>Yellow </w><b><f data-flag="yellow-wallpaper_en_2s:j81nafbq" data-status="resolved"><w>Wallpaper</w></f></b>';
    it('Re wrapped string still contains html', () => expect(reWrapped).to.be.equal(check))
  });
  describe('Flags and <br/>', function() {
    let str = '<w data-map="0,235">O.</w><br><f data-flag="tgom-3_en_2u:jda3nf1r" data-status="resolved"><w data-map="235,925">Henry</w></f>';
    let check = '<w>O.</w><br><f data-flag="tgom-3_en_2u:jda3nf1r" data-status="resolved"><w>Henry</w></f>';
    let tokenized = parser.tokenize(str, 'w');
    let rebuild = parser.rebuild(tokenized, '');//clean w
    let reWrap = parser.reWrap(rebuild, 'w');
    it('Re wrapped string still contains br', () => expect(reWrap).to.be.equal(check))
  });
  describe('Dot and HTML tags', function() {
    let str = '.<i>begin</i><sg data-suggestion=\"Chapter one\">I</sg>.<br> Down the Rabbit-Hole<i>end</i>.';
    let check = '.<i><w>begin</w></i><sg data-suggestion="Chapter one"><w data-sugg="Chapter one">I.</w></sg><br> <w>Down </w><w>the </w><w>Rabbit-Hole<i>end</i>.</w>';
    let tokenized = parser.tokenize(str, 'w');
    let rebuild = parser.rebuild(tokenized, 'w');//clean w
    let reWrap = parser.reWrap(rebuild, 'w');
    it('Dot does not brake HTML tags', () => expect(rebuild).to.be.equal(check))
    it('Dot does not brake HTML tags', () => expect(reWrap).to.be.equal(check))
  });
  describe('Suggestion and HTML tags', function() {
    let str = '.<i>begin</i><sg data-suggestion="Chapter one"><i>I</i></sg>.<br> Down the Rabbit-Hole<i>end</i>.';
    let check = '.<i><w>begin</w></i><sg data-suggestion="Chapter one"><i><w data-sugg="Chapter one">I.</w></i></sg><br> <w>Down </w><w>the </w><w>Rabbit-Hole<i>end</i>.</w>';
    let tokenized = parser.tokenize(str, 'w');
    let rebuild = parser.rebuild(tokenized, '');//clean w
    let reWrap = parser.reWrap(rebuild, 'w');
    it('Suggestion does not brake HTML tags', () => expect(reWrap).to.be.equal(check))
  });
  describe('Suggestion and comma', function() {
    let str = '<w>her </w><w>sister <sg data-suggestion="on the bank">o-t-b</sg></w><w>, </w><w>and </w>';
    let check = '<w>her </w><w>sister </w><sg data-suggestion="on the bank"><w data-sugg="on the bank">o-t-b, </w></sg><w>and </w>';
    let tokens = parser.tokenize(str, "w")
    let rebuild = parser.rebuild(tokens, '');//clean w
    let reWrap = parser.reWrap(rebuild, 'w');
    it('Comma after suggestion does not brake HTML tags', () => expect(reWrap).to.be.equal(check))
  });
  describe('Check', function() {
    let str = 'Descendants of the <u>Sh</u>áhs were thrust';
    let check = '<w>Descendants </w><w>of </w><w>the </w><w data-ipa="SA:hs"><u>Sh</u>áhs </w><w>were </w><w>thrust</w>';
    str = parser.rebuild(parser.tokenize(str, "w"), "");
    let reWrap = parser.reWrap(str, 'w');
    it('<u> at the beginning of term does not brake HTML tags', () => expect(reWrap).to.be.equal(check))
  });
  describe('Suggestions', function() {
    describe('Multi word suggestion', function() {
      let str = 'Some text <sg data-suggestion="some suggestion">inside <i>sugg</i> test.</sg> outside sugg';
      let check = '<w>Some </w><w>text </w><sg data-suggestion="some suggestion"><w data-sugg="some suggestion">inside <i>sugg</i> test.</w></sg> <w>outside </w><w>sugg</w>';
      let tokens = parser.tokenize(str, "w");
      str = parser.rebuild(tokens, "");
      let reWrap = parser.reWrap(str, 'w');
      it('Multi word suggestion', () => expect(reWrap).to.be.equal(check))
    });
    describe('Single word suggestion', function() {
      let str = 'Some text <sg data-suggestion="some suggestion">inside </sg> outside sugg';
      let check = '<w>Some </w><w>text </w><sg data-suggestion="some suggestion"><w data-sugg="some suggestion">inside </w></sg> <w>outside </w><w>sugg</w>';
      let tokens = parser.tokenize(str, "w");
      str = parser.rebuild(tokens, "");
      let reWrap = parser.reWrap(str, 'w');
      it('Single word suggestion', () => expect(reWrap).to.be.equal(check))
    });
    describe('Empty suggestion', function() {
      let str = 'Some text <sg data-suggestion="">inside sugg test </sg> outside sugg';
      let check = '<w>Some </w><w>text </w><sg data-suggestion=""><w data-sugg="">inside sugg test </w></sg> <w>outside </w><w>sugg</w>';
      let tokens = parser.tokenize(str, "w");
      str = parser.rebuild(tokens, "");
      let reWrap = parser.reWrap(str, 'w');
      it('Empty suggestion', () => expect(reWrap).to.be.equal(check))
    })
    describe('Non word suggestion', () => {
      let text = `<sg data-suggestion="">^</sg> We perceive none`;
      let check = `<sg data-suggestion="">^</sg> <w>We </w><w>perceive </w><w>none</w>`
      let tokens = parser.tokenize(text, '');
      let wrapped = parser.reWrap(tokens, 'w')
      it('Suggestion on non word creates correct wrap', () => expect(check).to.be.equal(wrapped));
    })
    describe('Suggestion and data-attributes', () => {
      let str = `<w data-map="1165,369">Test </w><w data-map="1534,341">two </w><w data-map="1875,340">two </w><w data-sugg="two" data-map="2215,305" class=""><sg data-suggestion="two">twos</sg></w>`;
      let tokens = parser.tokenize(str, 'w');
      let t = tokens.pop();
      let map = t.info && t.info.data && t.info.data.map ? t.info.data.map : false;
      it('Suggestion does not remove alignment from token', () => expect(map).to.be.equal('2215,305'));
      //console.log(t);
      //console.log(parser.reWrap(tokens, 'w'))
    });
    describe('Empty suggestion not set', () => {
      let text = `<p><sg data-suggestion>Test</sg> two</p>`;
      let tokens = parser.tokenize(text, 'w');
      //let wrapped = parser.rebuild(tokens, 'w')
      //console.log(wrapped)
      it('Empty suggestion not set', () => expect(tokens[0].info.data.sugg).to.be.equal(''));
    });
    describe('Suggestion parsing', () => {
      let text = `Test<sg data-suggestion=""> for sug</sg>gestion alignment`;
      let check = `<w>Test</w><sg data-suggestion=""> <w data-sugg="">for sug</w></sg><w>gestion </w><w>alignment</w>`;
      let tokens = parser.tokenize(text, 'w');
      let wrapped = parser.reWrap(tokens, 'w');
      let suggestionToken = tokens[1];
      it('Second token contains suggestion', () => expect(suggestionToken.info.data).to.have.property('sugg'));
      it('Suggestion parsed correctly', () => expect(check).to.be.equal(wrapped));
    });
    describe('Superscript in suggestion', () => {
      let text = `<w id="1qweyc">The </w><w id="1qAqHe" data-ipa="bahA:?i:">Bahá’í </w><sg data-suggestion=""><w id="1qECQg">Movement</w><sup data-pg="xxiii"><w id="1qIOZi" data-sugg="">pg </w><w id="1qN18k" data-sugg="">xxiii</w></sup>  <w id="1qRdhm">is</w></sg><w id="1qRdhm"> </w><w id="1qVpqo">now </w>`;
      let check = `<w id="1qweyc">The </w><w id="1qAqHe" data-ipa="bahA:?i:">Bahá’í </w><sg data-suggestion=""><w id="1qECQg" data-sugg="">Movement<sup data-pg="xxiii">pg xxiii</sup>  is</w></sg> <w id="1qVpqo">now </w>`;
      let tokens = parser.tokenize(text, 'w');
      let rebuild = parser.rebuild(tokens, 'w')
      let wrapped = parser.reWrap(rebuild, 'w');
      it('Suggestion around superscript is parsed correctly', () => expect(rebuild).to.be.equal(check));
      it('Suggestion around superscript is parsed correctly, rewrap', () => expect(wrapped).to.be.equal(check));
    });
    describe('Footnote in superscript', () => {
      let text = `<w id="z3tsI" data-map="0,950">Alice </w><w id="z7FBK" data-map="950,360">was </w><sg data-suggestion=""><w id="zbRKM" data-sugg="">beginning to<sup data-idx="1">1</sup> get</w></sg> <w id="zosbS" data-map="1310,645">very </w><w id="zsEkU" data-map="1955,575">tired </w>`;
      let check = `<w id="z3tsI" data-map="0,950">Alice </w><w id="z7FBK" data-map="950,360">was </w><sg data-suggestion=""><w id="zbRKM" data-sugg="">beginning to<sup data-idx="1">1</sup> get</w></sg> <w id="zosbS" data-map="1310,645">very </w><w id="zsEkU" data-map="1955,575">tired </w>`;
      let tokens = parser.tokenize(text, 'w');
      let rebuild = parser.rebuild(tokens, 'w');
      let wrapped = parser.reWrap(rebuild, 'w');
      it('Footnote inside suggestion is parsed correctly', () => expect(rebuild).to.be.equal(check));
      it('Footnote inside suggestion is parsed correctly, rewrap', () => expect(wrapped).to.be.equal(check));
    });
  });
  describe('Double rebuild', function() {
    let str = '<span>So</span> <span>she</span> <span>was</span> <span>considering</span>.';
    let check = '<span><w>So</w></span> <span><w>she</w></span> <span><w>was</w></span> <span><w>considering.</w></span>'   
    str = parser.reWrap(str, 'w');
    let tokens = parser.tokenize(str, 'w')
    let rebuild = parser.rebuild(tokens, 'w')
    let rebuild_check = parser.rebuild(tokens, 'w')
    it('Double rebuild', () => expect(rebuild_check).to.be.equal(check));
  });
  describe('Underlines', function() {
    describe('Underlines and sup', function() {
      let str = 'Mírzá,<sup data-idx=\"26\">26</sup> <u>Sh</u>ay<u>kh</u> Aḥmad, freed from';
      let checkStr = '<w data-ipa="mi:rzA:">Mírzá,</w><sup data-idx="26"><w data-sugg="">26</w></sup> <w><u>Sh</u>ay<u>kh</u> </w><w data-ipa="ahmad">Aḥmad, </w><w>freed </w><w>from</w>';
      str = parser.reWrap(str, 'w');
      let tokens = parser.tokenize(str, 'w')
      let rebuild = parser.rebuild(tokens, 'w')
      it('u tags are not wrapped', () => expect(rebuild).to.be.equal(checkStr));
    });
    describe('Underlined several words', () => {
      //let text = `begin sentence (first case) on the bank, and of ( second case ) to do: once( third case )she had peeped`;
      //let text = `original <u>page images with</u> text may`;
      let text = `<w data-map="0,380">Copies </w><w data-map="380,75">of </w><w data-map="455,170">the </w><w data-map="625,610">original </w><u><w data-map="1235,310">page </w><w data-map="1545,480">images </w></u>,<w data-map="2025,220"><u>with</u> </w><w data-map="2245,385">text </w><w data-map="2630,450">may</w>`;
      //let text = `original <u>page images with</u> text of the <u>Sh</u>áhs were thrust <u>Sh</u>ay<u>kh</u>`;
      let check = `<w data-map="0,380">Copies </w><w data-map="380,75">of </w><w data-map="455,170">the </w><w data-map="625,610">original </w><u><w data-map="1235,310">page </w><w data-map="1545,480">images </w></u>,<u><w data-map="2025,220">with</w> </u><w data-map="2245,385">text </w><w data-map="2630,450">may</w>`;
      let tokens = parser.tokenize(text, 'w');
      //tokens.forEach(t => {
        //console.log(t)
      //})
      let wrapped = parser.reWrap(tokens, 'w')
      //console.log(text)
      //console.log(wrapped)
      it('Rebuild with underlined words does not create tokens', () => expect(wrapped).to.be.equal(check));
    })
    describe('Underline tag and space', () => {
      //let text = `begin sentence (first case) on the bank, and of ( second case ) to do: once( third case )she had peeped`;
      let text = `content for<u> some </u>underline`;
      let check = `<w>content </w><w>for</w><u> <w>some </w></u><w>underline</w>`;
      let tokens = parser.tokenize(text, '');
      let wrapped = parser.reWrap(tokens, 'w');
      it('Underline with space with correct token', () => expect(check).to.be.equal(wrapped));
    });
    describe('Underline with punctuation', () => {
      let text = `I imagine,<u> be attributed concubines </u>and children.`;
      let check = `<w>I </w><w>imagine,</w><u> <w>be </w><w>attributed </w><w>concubines </w></u><w>and </w><w>children.</w>`
      let tokens = parser.tokenize(text, '');
      //console.log(tokens)
      let wrapped = parser.reWrap(tokens, 'w')
      //console.log(wrapped)
      it('Underline with punctuation', () => expect(check).to.be.equal(wrapped));
    });
    describe('Underline and rebuild with space', () => {
      let text = `<w data-map="285,285">block<u> </u></w><w data-map="570,235"><u>for </u></w><w data-map="805,575">underlined </w>`;
      let check = `<w data-map="285,285">block<u> </u></w><u><w data-map="570,235">for </w></u><w data-map="805,575">underlined </w>`;
      let tokens = parser.tokenize(text, 'w');
      let rebuild = parser.rebuild(tokens, 'w');
      let tokens_rebuild = parser.tokenize(rebuild, 'w');
      let wrapped = parser.reWrap(tokens, 'w');
      it('Underline and rebuild with space', () => expect(wrapped).to.be.equal(check));
    });
    describe('Tags b and i also not parsed', () => {
      let text = `<w id="z3tsI">Alice </w><w id="z7FBK">was </w><w id="zbRKM">be<b>gin</b>ning </w><w id="zg3TO">to </w><w id="zkg2Q">g<i>et</i> </w><w id="zosbS">very </w><w id="zsEkU">ti<u>re</u>d </w><w id="zwQtW">of </w><w id="zB2CY">sitt<b>ing </b></w><w id="zFeM0"><b>b</b>y </w><w id="zJqV2">he<i>r </i></w><w id="zND44"><i>sist</i>er </w><w id="zRPd6">on </w><w id="zW1m8">th<u>e </u></w><u>
</u><w id="A0dva"><u>ba</u>nk, </w><w id="A4pEc">and </w>`;
      let tokens = parser.tokenize(text, 'w');
      let rebuilt = parser.rebuild(tokens, 'w');
      let reWrap = parser.reWrap(rebuilt, 'w');
      it('Tags b and u not parsed, rebuild', () => expect(rebuilt).to.be.equal(text));
      it('Tags b and u not parsed, reWrap', () => expect(reWrap).to.be.equal(text));
    });
    describe('Tag i inside w', () => {
      let text = `<w>one </w><w>two<i class="pin"></i> </w><w>three </w><w>four</w>`;
      let check = `<w>one </w><w>two<i class="pin"></i> </w><w>three </w><w>four</w>`;
      let tokens = parser.tokenize(text, 'w');
      let rebuilt = parser.rebuild(tokens, 'w');
      let reWrap = parser.reWrap(rebuilt, 'w');
      it('Tag i inside w does not create new word, rebuilt', () => expect(rebuilt).to.be.equal(check));
      it('Tag i inside w does not create new word, rewrapped', () => expect(reWrap).to.be.equal(check));
    });
    describe('Tag i inside w and b', () => {
      let text = `<w id="z3tsI">Alice </w><w id="z7FBK"><b>was<i class="pin"></i></b> </w><w id="zbRKM"><b>beginning</b> </w><w id="zg3TO">to </w><w id="zkg2Q">get </w>`;
      let checkWrapped = `<w id="z3tsI">Alice </w><w id="z7FBK"><b>was<i class="pin"></i></b> </w><b><w id="zbRKM">beginning</w></b> <w id="zg3TO">to </w><w id="zkg2Q">get </w>`;
      let checkRebuilt = `<w id="z3tsI">Alice </w><w id="z7FBK"><b>was<i class="pin"></i></b> </w><b><w id="zbRKM">beginning</w> </b><w id="zg3TO">to </w><w id="zkg2Q">get </w>`;
      let tokens = parser.tokenize(text, 'w');
      let rebuilt = parser.rebuild(tokens, 'w');
      let reWrap = parser.reWrap(rebuilt, 'w');
      it('Tag i inside w and b does not create new word, rebuilt', () => expect(checkRebuilt).to.be.equal(rebuilt));
      it('Tag i inside w and b does not create new word, rewrapped', () => expect(checkWrapped).to.be.equal(reWrap));
    });
    describe('multiple tags in w, case 1', () => {
      let text = `<w id="CzF2o" data-map="15580,380">Alice </w><w id="CDRbq" data-map="15960,430">with<u><i><b>out </b></i></u></w><w id="CI3ks" data-map="16390,525"><u><i><b>pict</b></i></u>ures </w><w id="CMftu" data-map="16915,125">or </w>`;
      let check = `<w id="CzF2o" data-map="15580,380">Alice </w><w id="CDRbq" data-map="15960,430">with<u><i><b>out </b></i></u></w><w id="CI3ks" data-map="16390,525"><u><i><b>pict</b></i></u>ures </w><w id="CMftu" data-map="16915,125">or </w>`;
      let tokens = parser.tokenize(text, 'w');
      let rebuilt = parser.rebuild(tokens, 'w');
      let reWrap = parser.reWrap(rebuilt, 'w');
      it('Mutliply tags do not create new words, rebuilt', () => expect(rebuilt).to.be.equal(check));
      it('multiple tags do not create new words, rewrapped', () => expect(reWrap).to.be.equal(check));
    });
    describe('One tag, multiple words, case one', () => {
      let text = `<w>nothing </w><i><w>so </w><w>very </w></i><w><i>remarkable </i></w><w>in </w>`;
      let check = `<w>nothing </w><i><w>so </w><w>very </w></i><i><w>remarkable </w></i><w>in </w>`;
      let tokens = parser.tokenize(text, 'w');
      let rebuilt = parser.rebuild(tokens, 'w');
      let reWrap = parser.reWrap(rebuilt, 'w');
      it('One tag around multiple words parsed correctly, rebuilt', () => expect(rebuilt).to.be.equal(check));
      it('One tag around multiple words parsed correctly, rewrapped', () => expect(reWrap).to.be.equal(check));
    });
    describe('One tag, multiple words, case two', () => {
      let text = `<w>no<i>thing </i></w><i><w>so </w><w>very </w></i><w><i>remark</i>able </w><w>in </w>`;
      let check = `<w>no<i>thing </i></w><i><w>so </w><w>very </w></i><w><i>remark</i>able </w><w>in </w>`;
      let tokens = parser.tokenize(text, 'w');
      let rebuilt = parser.rebuild(tokens, 'w');
      let reWrap = parser.reWrap(rebuilt, 'w');
      it('One tag around multiple words parsed correctly, rebuilt', () => expect(rebuilt).to.be.equal(check));
      it('One tag around multiple words parsed correctly, rewrapped', () => expect(reWrap).to.be.equal(check));
    });
    describe('One tag, multiple words, case three', () => {
      let text = `<w id="zW1m8">the </w><w id="A0dva">b<b>ank, </b></w><w id="A4pEc"><b>an</b>d </w><w id="A8BNe">of </w>`;
      let check = `<w id="zW1m8">the </w><w id="A0dva">b<b>ank, </b></w><w id="A4pEc"><b>an</b>d </w><w id="A8BNe">of </w>`;
      let tokens = parser.tokenize(text, 'w');
      let rebuilt = parser.rebuild(tokens, 'w');
      let reWrap = parser.reWrap(rebuilt, 'w');
      it('One tag around multiple words parsed correctly, rebuilt', () => expect(rebuilt).to.be.equal(check));
      it('One tag around multiple words parsed correctly, rewrapped', () => expect(reWrap).to.be.equal(check));
    });
  });
  describe('Parenthesis', function () {
    let str = 'Test string (inside test) outside outside';
    let check = '<w>Test </w><w>string </w><w>(inside </w><w>test) </w><w>outside </w><w>outside</w>';
    str = parser.reWrap(str, 'w');
    it('Parenthesis in token with words it covers', () => expect(check).to.be.equal(str));
    str = parser.reWrap(str, 'w');
    let rebuild = parser.rebuild(parser.tokenize(str, 'w'), 'w')
    it('Parenthesis in token with words it covers, rebuild', () => expect(check).to.be.equal(rebuild));
    //console.log(str);
    //let strQuote = 'Test string "inside test" outside outside';
    //strQuote = parser.reWrap(strQuote, 'w');
    //console.log(strQuote);
    //let strQuote = 'Test string \'inside test\' outside outside';
    //strQuote = parser.reWrap(strQuote, 'w');
    //console.log(strQuote);
    let strTag = 'Test string (<i>inside test</i>) outside outside';
    let checkTag = '<w>Test </w><w>string </w>(<i><w>inside </w><w>test</w></i>) <w>outside </w><w>outside</w>';
    strTag = parser.reWrap(strTag, 'w');
    it('Parenthesis in token with word it covers, HTML', () => expect(strTag).to.be.equal(checkTag));
    let strTag2 = parser.reWrap(strTag, 'w');
    let rebuildTag = parser.rebuild(parser.tokenize(strTag2, 'w'), 'w')
    it('Parenthesis in token with word it covers, HTML rebuild', () => expect(rebuildTag).to.be.equal(checkTag));
    //console.log(str);
    let strQuote = 'Test string "<i>inside test</i>" outside outside';
    let checkQuote = '<w>Test </w><w>string </w>"<i><w>inside </w><w>test</w></i>" <w>outside </w><w>outside</w>';
    let strQuoteRewrap = parser.reWrap(strQuote, 'w');
    it('Quotes in token with words it covers', () => expect(strQuoteRewrap).to.be.equal(checkQuote));
    //console.log(strQuote);
    let strQuote2 = parser.reWrap(strQuoteRewrap, 'w');
    let rebuildQuote = parser.rebuild(parser.tokenize(strQuote2, 'w'), 'w')
    it('Quotes in token with words it covers, rebuild', () => expect(rebuildQuote).to.be.equal(checkQuote));
    let strQuoteSingle = 'Test string \'<i>inside test</i>\' outside outside';
    let checkQuoteSingle = '<w>Test </w><w>string </w>\'<i><w>inside </w><w>test</w></i>\' <w>outside </w><w>outside</w>';
    strQuoteSingle = parser.reWrap(strQuoteSingle, 'w');
    it('Single Quotes in token with words it covers', () => expect(strQuoteSingle).to.be.equal(checkQuoteSingle));
    //console.log(str);
  });
  describe('Links', () => {
    let str = 'test2 test2 <a href="http://mysite.com">block link</a> content <i><a href="www.google.com/search">link</a></i>';
    let checkStr = '<w>test2 </w><w>test2 </w><a href="http://mysite.com"><w>block </w><w>link</w></a> <w>content </w><i><a href="www.google.com/search"><w>link</w></a></i>';
    let reWrap = parser.reWrap(str, 'w');
    it('Re wrap keeps links with ref', () => expect(reWrap).to.be.equal(checkStr));
    let reWrapRe = parser.reWrap(reWrap, 'w');
    it('Re wrap keeps links with ref', () => expect(reWrapRe).to.be.equal(checkStr));
  });
  describe('Suggestion after superscript', () => {
    let str = 'Test block test<sup>1</sup> <sg data-suggestion="test suggestion">block</sg> test block';
    let reWrap = parser.reWrap(str, 'w');
    let secondReWrap = parser.reWrap(reWrap, 'w');
    let checkStr = '<w>Test </w><w>block </w><w>test</w><sup><w data-sugg="">1</w></sup> <sg data-suggestion="test suggestion"><w data-sugg="test suggestion">block</w></sg> <w>test </w><w>block</w>';
    it('Correctly parsing closing tags', () => expect(reWrap).to.be.equal(checkStr));
    it('Correctly parsing closing tags after second re wrap', () => expect(secondReWrap).to.be.equal(checkStr))
  });
  describe('Line breaks', () => {
    describe('Line breaks inside list', () => {
      let str = `Among them,

  <ul>
<li> Mullá Muḥammad ‘Alíy-i-Zanjání
</li><li> Mullá ‘Alíy-i-Basṭámí
</li><li> Mullá Sa‘íd-i-Bárfurú<u>sh</u>í
</li><li> Mullá Ni‘matu’lláh-i-Mázindarání
</li><li> Mullá Yúsuf-i-Ardibílí
</li></ul>`
      let check_str = `<w>Among </w><w>them,</w><ul>
<li> 

<w data-ipa="moUllA:">Mullá </w><w data-ipa="moUhammad">Muḥammad </w><w data-ipa="ali:je?zandZA:ni:">‘Alíy-i-Zanjání</w></li><li> 
<w data-ipa="moUllA:">Mullá </w><w data-ipa="ali:je?bastA:mi:">‘Alíy-i-Basṭámí</w></li><li> 
<w data-ipa="moUllA:">Mullá </w><w data-ipa="sa?i:de?bA:rfoUru:Si:">Sa‘íd-i-Bárfurú<u>sh</u>í</w></li><li> 
<w data-ipa="moUllA:">Mullá </w><w data-ipa="ne?matoU?llA:he?mA:zendarA:ni:">Ni‘matu’lláh-i-Mázindarání</w></li><li> 
<w data-ipa="moUllA:">Mullá </w><w data-ipa="ju:soUfe?ardebi:li:">Yúsuf-i-Ardibílí</w></li></ul>
`
      let tokens = parser.tokenize(str, "w")
      let reWrap = parser.reWrap(tokens, 'w');
      it('Correctly parsing closing tags', () => expect(reWrap).to.be.equal(check_str));
      let secondReWrap = parser.reWrap(reWrap, 'w');
      it('Correctly parsing closing tags', () => expect(secondReWrap).to.be.equal(check_str));
      //let text = `<ol><li><w data-map="0,315">Test </w><w data-map="315,685">HEADER</w></li><li><w data-map="315,685">Test HEADER<br></w></li><li><w data-map="315,685">Test HEADER<br></w></li></ol>`;
      let text = `<ol><li>Test HEADER1</li><li>Test HEADER2<br></li><li>Test HEADER3<br></li></ol>`;
      let check = `<ol><li>Test HEADER1</li><li>Test HEADER2<br></li><li>Test HEADER3<br></li></ol>`
      tokens = parser.tokenize(text, '');
      let wrapped = parser.reWrap(tokens, '');
      it('Correctly parsing <br>', () => expect(wrapped).to.be.equal(check));
    });
    describe('Line break inside <w></w>', () => {
      //let text = `begin sentence (first case) on the bank, and of ( second case ) to do: once( third case )she had peeped`;
      //let text = `begin sentence (first case) on the bank, and of ( second case ) to do: once( third case )she had peeped`;
      let text = `<w id="1iq7N">By </w><w id="1lUUF">Lewis </w><w id="1ppHx">Carroll
</w>`;
      let check = `<w id="1iq7N">By </w><w id="1lUUF">Lewis </w><w id="1ppHx">Carroll</w>
`
      let tokens = parser.tokenize(text, 'w');
      //console.log(tokens)
      let wrapped = parser.rebuild(tokens, 'w');
      //console.log(`"${wrapped}"`, wrapped === check)
      //});
      it('Line break inside wrapper does not create extra <w></w> wrappers', () => expect(check).to.be.equal(wrapped));
    });
    describe('Line breaks', function () {
      let str = `‘Fury said to a 
mouse, That he 
met in the 
house, 
“Let us 
both go to 
law: <i>I</i> will 
prosecute 
<i>you</i>. — Come, 
I’ll take no 
denial; We 
must have a 
trial: For 
really this 
morning I’ve 
nothing 
to do.” 
Said the 
mouse to the 
cur, “Such 
a trial, 
dear Sir, 
With 
no jury 
or judge, 
would be 
wasting 
our 
breath.” 
“I’ll be 
judge, I’ll 
be jury,” 
Said 
cunning 
old Fury: 
“I’ll 
try the 
whole 
cause, 
and 
condemn 
you 
to 
death.”’`;
      let check_str = `<w>‘Fury </w><w>said </w><w>to </w><w>a </w>
<w>mouse, </w><w>That </w><w>he </w>
<w>met </w><w>in </w><w>the </w>
<w>house, </w>
<w>“Let </w><w>us </w>
<w>both </w><w>go </w><w>to </w>
<w>law: </w><i><w>I</w></i> <w>will </w>
<w>prosecute </w>
<i><w>you</w></i>. — <w>Come, </w>
<w data-ipa="e?ll">I’ll </w><w>take </w><w>no </w>
<w>denial; </w><w>We </w>
<w>must </w><w>have </w><w>a </w>
<w>trial: </w><w>For </w>
<w>really </w><w>this </w>
<w>morning </w><w data-ipa="e?ve">I’ve </w>
<w>nothing </w>
<w>to </w><w>do.” </w>
<w>Said </w><w>the </w>
<w>mouse </w><w>to </w><w>the </w>
<w>cur, </w><w>“Such </w>
<w>a </w><w>trial, </w>
<w>dear </w><w>Sir, </w>
<w>With </w>
<w>no </w><w>jury </w>
<w>or </w><w>judge, </w>
<w>would </w><w>be </w>
<w>wasting </w>
<w>our </w>
<w>breath.” </w>
<w data-ipa="e?ll">“I’ll </w><w>be </w>
<w>judge, </w><w data-ipa="e?ll">I’ll </w>
<w>be </w><w>jury,” </w>
<w>Said </w>
<w>cunning </w>
<w>old </w><w>Fury: </w>
<w data-ipa="e?ll">“I’ll </w>
<w>try </w><w>the </w>
<w>whole </w>
<w>cause, </w>
<w>and </w>
<w>condemn </w>
<w>you </w>
<w>to </w>
<w>death.”’</w>`;
      let strWrap = parser.reWrap(str, 'w');
      it('Re wrap keeps line breaks', () => expect(check_str).to.be.equal(strWrap));
      let strReWrap = parser.reWrap(str, 'w');
      it('Double re wrap keeps line breaks', () => expect(check_str).to.be.equal(strReWrap));
    });
    describe('Line break at the beginning of the <w></w>', () => {
      let str = `<w id="hnFGH" data-map="0,290">
Down </w><w id="hwJJn" data-map="290,95">the </w><w id="hOdFG" data-map="385,2390">Rabbit-Hole </w>

<w id="i5HBZ" data-map="2775,380">CHAPTER </w><w id="inbyi" data-map="3155,555">II.</w>`;
      let check = `<w id="hnFGH" data-map="0,290">
Down </w><w id="hwJJn" data-map="290,95">the </w><w id="hOdFG" data-map="385,2390">Rabbit-Hole </w>

<w id="i5HBZ" data-map="2775,380">CHAPTER </w><w id="inbyi" data-map="3155,555">II.</w>`;
      let tokens = parser.tokenize(str, 'w');
      let rebuilt = parser.rebuild(tokens, 'w');
      it('Correctly parsing line break', () => expect(rebuilt).to.be.equal(check));
    });
  });
  describe('Suggestions for data-pg', () => {
    let str = `the saintly heroic<sup data-pg="xxiv">pg xxiv</sup> figure`
    let check_str = `<w>the </w><w>saintly </w><w>heroic</w><sup data-pg="xxiv"><w data-sugg="">pg </w><w data-sugg="">xxiv</w></sup> <w>figure</w>`
    let tokens = parser.tokenize(str, "w")
    let reWrap = parser.reWrap(tokens, 'w');
    it('Correctly parsing data-pg', () => expect(reWrap).to.be.equal(check_str));
    let secondReWrap = parser.reWrap(reWrap, 'w');
    it('Correctly parsing data-pg', () => expect(secondReWrap).to.be.equal(check_str));
  });
  
  describe('Suggestions for data-pg, CamelCase', () => {
    let str = `“aḥmad Begins His Search” <Sup Data-Pg=" 1">pg  1</sup>  `
    let check_str = `<w data-ipa="ahmad">“aḥmad </w><w>Begins </w><w>His </w><w>Search” </w><Sup Data-Pg=" 1"><w data-sugg="">pg  </w><w data-sugg="">1</w></sup>  `
    let tokens = parser.tokenize(str, "w")
    let reWrap = parser.reWrap(tokens, 'w');
    it('Correctly parsing data-pg', () => expect(reWrap).to.be.equal(check_str));
    let secondReWrap = parser.reWrap(reWrap, 'w');
    it('Correctly parsing data-pg', () => expect(secondReWrap).to.be.equal(check_str));
  });
  describe('Empty HTML string', () => {
    let str = '<p><br></p>';
    let checkStr = '';
    let tokens = parser.tokenize(str, "w")
    let reWrap = parser.reWrap(tokens)
    it('<br> is not converted', () => expect(reWrap).to.be.equal(checkStr))
  });
  describe('Unicode right-to-left mark', () => {
    let str = "وَكَانَ كُلَّمَا صَارَ لِلْغُرَابِ فِرَاخٌ أَكَلَتْهَا الْحَيَّةُ، فَحَزِنَ الْغُرَابُ حُزْنًا شَدِيدًا عَلَى فِراخِهِ، وَفِي أَحَدِ الْأَيَّامِ، مَرَّ بِهِ صَدِيقُهُ الثَّعْلَبُ، وَرَآهُ حَزِينًا، فَسَأَلَهُ عَنْ سَبَبِ حُزْنِهِ، فَأَخْبَرُهُ الْغُرَابُ عَنْ الْحَيَّةِ الَّتِي تَأْكُلُ فِرَاخَهُ. ‏";
    let tokens = parser.tokenize(str, "w")
    it('RTL mark at the end does not create empty token', () => expect(tokens[tokens.length - 1].word.length > 1).to.be.true);
    let rtl_u = "test1 test2‏";
    let tokens_rtl_u = parser.tokenize(rtl_u, 'w');
    it('RTL usual', () => expect(tokens_rtl_u[tokens_rtl_u.length - 1].word === 'test2‏').to.be.true);
    let rtl_s = "test1 test2 ‏";
    let checkWrapped = "<w>test1 </w><w>test2 ‏</w>";
    let tokens_rtl_s = parser.tokenize(rtl_s, 'w');
    it('RTL with space', () => expect(tokens_rtl_s[tokens_rtl_s.length - 1].word === 'test2').to.be.true);
    let reWrap = parser.reWrap(tokens_rtl_s, 'w');
    it('RTL with space reWrap', () => expect(reWrap).to.be.equal(checkWrapped));
    let secondReWrap = parser.reWrap(reWrap, 'w');
    it('RTL with space second reWrap', () => expect(secondReWrap).to.be.equal(checkWrapped));
    let rtl_sd = "test1 test2 .‏";
    let tokens_rtl_sd = parser.tokenize(rtl_sd, 'w');
    it('RTL with space and dot', () => expect(tokens_rtl_sd[tokens_rtl_sd.length - 1].word === 'test2').to.be.true);
    let rtl_sds = "test1 test2 . ‏";
    let tokens_rtl_sds = parser.tokenize(rtl_sds, 'w');
    it('RTL with space and dot and space', () => expect(tokens_rtl_sds[tokens_rtl_sds.length - 1].word === 'test2').to.be.true);
    
    let ltr_u = "test1 test2‎";
    let tokens_ltr_u = parser.tokenize(ltr_u, 'w');
    it('LTR usual', () => expect(tokens_ltr_u[tokens_ltr_u.length - 1].word === "test2‎").to.be.true);
    let ltr_s = "test1 test2 ‎";
    let tokens_ltr_s = parser.tokenize(ltr_s, 'w');
    it('LTR with space', () => expect(tokens_ltr_s[tokens_ltr_s.length - 1].word === "test2").to.be.true);
    let ltr_sd = "test1 test2 .‎";
    let tokens_ltr_sd = parser.tokenize(ltr_sd, 'w');
    it('LTR with space and dot', () => expect(tokens_ltr_sd[tokens_ltr_sd.length - 1].word === "test2").to.be.true);
    let ltr_sds = "test1 test2 . ‎";
    let tokens_ltr_sds = parser.tokenize(ltr_sds, 'w');
    it('LTR with space and dot and space', () => expect(tokens_ltr_sds[tokens_ltr_sds.length - 1].word === "test2").to.be.true);

  })
  
  describe('Arabic punctuation', () => {
    let str_with_brackets = 'وت المخلصين ﴿ وَ اَيَّامَا تَدْعُوا فَلَهُ الاَسْمَاءُ الحُسْنَی ﴾ فی قلوب العارفين و';
    let str_with_brackets_check = '<w>وت </w><w>المخلصين ﴿ </w><w>وَ </w><w>اَيَّامَا </w><w>تَدْعُوا </w><w>فَلَهُ </w><w>الاَسْمَاءُ </w><w>الحُسْنَی </w>﴾ <w>فی </w><w>قلوب </w><w>العارفين </w><w>و</w>';
    let str_question = 'چه ميکنی ؟ گفت ليلی';
    let str_question_check = '<w>چه </w><w>ميکنی ؟ </w><w>گفت </w><w>ليلی</w>';
    let str_quotes = `” کفر کافر را و دين ديندار را	ذرّه دردت دل عطّار را“`
    let str_quotes_check = `<w>” کفر </w><w>کافر </w><w>را </w><w>و </w><w>دين </w><w>ديندار </w><w>را	</w><w>ذرّه </w><w>دردت </w><w>دل </w><w>عطّار </w><w>را“</w>`;
    let str_semicolon = '.إن الناس لاينظرون إلى الزمن الذي عمل فيه العمل ؛ وإنما ينظرون إلى مقدار جودته وإتقانه';
    let str_semicolon_check = '<w>.إن </w><w>الناس </w><w>لاينظرون </w><w>إلى </w><w>الزمن </w><w>الذي </w><w>عمل </w><w>فيه </w><w>العمل ؛ </w><w>وإنما </w><w>ينظرون </w><w>إلى </w><w>مقدار </w><w>جودته </w><w>وإتقانه</w>';
    let str_comma = 'يا محمد، أجب على السؤال.';
    let str_comma_check = '<w>يا </w><w>محمد، </w><w>أجب </w><w>على </w><w>السؤال.</w>';
    //let str = `“ test1 test2 ”`
    let tokens_brackets = parser.tokenize(str_with_brackets, 'w');
    let wrapped_brackets = parser.reWrap(tokens_brackets, 'w');
    it('Ornate brackets do not create separate token', () => expect(str_with_brackets_check).to.be.equal(wrapped_brackets));
    
    let tokens_question = parser.tokenize(str_question, 'w');
    let wrapped_question = parser.reWrap(tokens_question, 'w');
    it('Question mark does not create separate token', () => expect(str_question_check).to.be.equal(wrapped_question));
    
    let tokens_quotes = parser.tokenize(str_quotes, 'w');
    let wrapped_quotes = parser.reWrap(tokens_quotes, 'w');
    it('Quotes do not create separate token', () => expect(str_quotes_check).to.be.equal(wrapped_quotes));
    
    let tokens_semicolon = parser.tokenize(str_semicolon, 'w');
    let wrapped_semicolon = parser.reWrap(tokens_semicolon, 'w');
    it('Semicolon does not create separate token', () => expect(str_semicolon_check).to.be.equal(wrapped_semicolon));
    
    let tokens_comma = parser.tokenize(str_comma, 'w');
    let wrapped_comma = parser.reWrap(tokens_comma);
    it('Comma does not create separate token', () => expect(str_comma_check).to.be.equal(wrapped_comma));
  });
  describe('Non word tokens', () => {
    let text = `public affa: [/] public affa`;
    let check = `<w>public </w><w>affa: [/] </w><w>public </w><w>affa</w>`
    let tokens = parser.tokenize(text, '');
    let wrapped = parser.reWrap(tokens, 'w')
    it('Slash does not create non word token', () => expect(check).to.be.equal(wrapped))
  })
  describe('Bulleted list, split wrapped string', () => {
    let text = `test Content<ul><li><w>Item </w><w>one</w></li><li><w>item </w><w>two</w></li></ul>Teas after`;
    let check = `<w>test </w><w>Content</w><ul><li><w>Item </w><w>one</w></li><li><w>item </w><w>two</w></li></ul><w>Teas </w><w>after</w>`;
    let tokens = parser.tokenize(text, 'w');
    let wrapped = parser.reWrap(tokens, 'w');
    it('Bulleted list without <br> is parsed correctly', () => expect(check).to.be.equal(wrapped));
  });
  describe('Tokens with html entities', () => {
    describe('Tokens with &lt;', () => {
      let text = `<p>New &lt;test block <i>with some</i> text</p>`;
      let check = `<p><w>New </w><w>&lt;test </w><w>block </w><i><w>with </w><w>some</w></i> <w>text</w></p>`;
      let tokens = parser.tokenize(text, 'w');
      let rebuild = parser.rebuild(tokens, 'w');
      it('Rebuild keeps &lt; with word', () => expect(check).to.be.equal(rebuild));
      let retokenize = parser.tokenize(rebuild, 'w');
      let wrapped = parser.reWrap(retokenize, 'w');
      it('Second re wrap keeps &lt; with word', () => expect(check).to.be.equal(wrapped));
      //rebuild.foreach(t => {
        //console.log(t)
      //})
      //it('Bulleted list without <br> is parsed correctly', () => expect(check).to.be.equal(wrapped));
    })
    describe('Tokens with html entities and punctuation', () => {
      let str = 'POEMS, &amp;c. LATIN &amp;c. Composed&#8230;';
      let check = '<w>POEMS, </w><w>&amp;c. </w><w>LATIN </w><w>&amp;c. </w><w>Composed&#8230;</w>';
      let tokens = parser.tokenize(str, "w", false, false);
      let rebuild = parser.rebuild(tokens, 'w');
      it('Rebuild keeps html entity with word', () => expect(check).to.be.equal(rebuild));
      let reWrapped = parser.tokenize(rebuild, 'w');
      let tokensReWrapped = parser.tokenize(parser.rebuild(reWrapped, 'w'), 'w');
      let secondRebuild = parser.rebuild(tokensReWrapped, 'w');
      it('Second rebuild keeps html entity with word, ()', () => expect(check).to.be.equal(secondRebuild));
    });
  });
  describe('Keep carriage returns for verlse, list text', () => {
    let text = `one 



two 



three`;
    let check = `<w>one </w>



<w>two </w>



<w>three</w>`
    let tokens = parser.tokenize(text, '');
    let wrapped = parser.reWrap(tokens, 'w');
    //console.log(tokens);
    it('Number of carriage returns is the same', () => expect(check).to.be.equal(wrapped));
  })
  //First
  //<w data-map=\"0,1245\">The </w><f class=\"service-info\" data-flag=\"tgom-2_en_2s:jd5rdfre\" data-status=\"resolved\"><w data-map=\"1245,430\">Gift</w></f><w data-map=\"1675,455\"> of</w><p><f class=\"service-info\" data-flag=\"tgom-2_en_2s:jd5rdpsq\" data-status=\"resolved\"><w data-map=\"2130,290\">the</w></f><w data-map=\"2420,2300\"> Magi</w></p><div><w data-map=\"1675,455\"></w></div>
//First cleaned
//<w data-map="0,1245">The </w><f class="service-info" data-flag="tgom-2_en_2s:jd5rdfre" data-status="resolved"><w data-map="1245,430">Gift</w></f><w data-map="1675,455"> of</w><p><f class="service-info" data-flag="tgom-2_en_2s:jd5rdpsq" data-status="resolved"><w data-map="2130,290">the</w></f><w data-map="2420,2300"> Magi</w></p><div><w data-map="1675,455"></w></div>
//Second
//<w data-map=\"0,1360\">The </w><w data-map=\"1360,495\"><f data-flag=\"tgom-3_en_2s:jda3mun6\" data-status=\"resolved\">Gift</f> </w><w data-map=\"1855,925\">of </w><w data-map=\"2780,275\"><f data-flag=\"tgom-3_en_2s:jda3n32v\" data-status=\"resolved\">the</f> </w><w data-map=\"3055,1545\">Magi</w>
//Second cleaned
//<w data-map="0,1360">The </w><w data-map="1360,495"><f data-flag="tgom-3_en_2s:jda3mun6" data-status="resolved">Gift</f> </w><w data-map="1855,925">of </w><w data-map="2780,275"><f data-flag="tgom-3_en_2s:jda3n32v" data-status="resolved">the</f> </w><w data-map="3055,1545">Magi</w>
 

  describe('Verification of correct id`s assignment', () => {
    let text =  tests.plaintext_without_ids;
    let check = tests.plaintext_wrapped_ids;
    let tokens = parser.tokenize(text, 'w', true);
    let wrapped = parser.reWrap(tokens, 'w');
    it('Id`s assigned correctly', () => expect(check).to.be.equal(wrapped));
  });
  
  describe('Verification of correct id`s for new words', () => {
    let text =  tests.plaintext_with_ids;
    let check = tests.plaintext_wrapped_new_ids;
    let tokens = parser.tokenize(text, 'w', true);
    let wrapped = parser.reWrap(tokens, 'w');
    it('Id`s added correctly', () => expect(check).to.be.equal(wrapped));
  });
  describe('Space added between wrap tag and HTML tag', () => {
    //let text = `begin sentence (first case) on the bank, and of ( second case ) to do: once( third case )she had peeped`;
    let text = `<w>Block </w><w>one.</w> <b><w>Block </w></b><w>two.</w>`;
    let check = `<w>Block </w><w>one.</w> <b><w>Block </w></b><w>two.</w>`;
    let tokens = parser.tokenize(text, 'w');
    let rebuild = parser.rebuild(tokens, 'w');
    //let wrapped = parser.reWrap(tokens, 'w')
    it('Space before HTML tag is kept after tokenize and rebuild', () => expect(check).to.be.equal(rebuild))
  })
  describe('Dash after footnote', () => {
    let dashChecks = [
      {
        text: `<w id="1L5MQ">By<sup data-idx="1">1</sup>-</w><w id="1PhVS">Lewis </w><w id="1Tu4U">Carroll</w>`,//—
        check: `<w id="1L5MQ">By</w><sup data-idx="1"><w data-sugg="">1</w></sup><w id="1PhVS">-Lewis </w><w id="1Tu4U">Carroll</w>`,
        name: 'hyphen',
      },
      {
        text: `<w id="1L5MQ">By<sup data-idx="1">1</sup> -</w><w id="1PhVS">Lewis </w><w id="1Tu4U">Carroll</w>`,//—
        check: `<w id="1L5MQ">By</w><sup data-idx="1"><w data-sugg="">1</w></sup> -<w id="1PhVS">Lewis </w><w id="1Tu4U">Carroll</w>`,
        name: 'hyphen with left space',
      },
      {
        text: `<w id="1L5MQ">By<sup data-idx="1">1</sup>- </w><w id="1PhVS">Lewis </w><w id="1Tu4U">Carroll</w>`,//—
        check: `<w id="1L5MQ">By</w><sup data-idx="1"><w data-sugg="">1</w></sup>- <w id="1PhVS">Lewis </w><w id="1Tu4U">Carroll</w>`,
        name: 'hyphen with rigth space',
      },
      {
        text: `<w id="1L5MQ">By<sup data-idx="1">1</sup> - </w><w id="1PhVS">Lewis </w><w id="1Tu4U">Carroll</w>`,//—
        check: `<w id="1L5MQ">By</w><sup data-idx="1"><w data-sugg="">1</w></sup> - <w id="1PhVS">Lewis </w><w id="1Tu4U">Carroll</w>`,
        name: 'hyphen with two spaces',
      },
      {
        text: `<w id="1L5MQ">By<sup data-idx="1">1</sup>—</w><w id="1PhVS">Lewis </w><w id="1Tu4U">Carroll</w>`,//—
        check: `<w id="1L5MQ">By</w><sup data-idx="1"><w data-sugg="">1</w></sup>—<w id="1PhVS">Lewis </w><w id="1Tu4U">Carroll</w>`,
        name: 'dash',
      },
      {
        text: `<w id="1L5MQ">By<sup data-idx="1">1</sup> —</w><w id="1PhVS">Lewis </w><w id="1Tu4U">Carroll</w>`,//—
        check: `<w id="1L5MQ">By</w><sup data-idx="1"><w data-sugg="">1</w></sup> —<w id="1PhVS">Lewis </w><w id="1Tu4U">Carroll</w>`,
        name: 'dash with left space',
      },
      {
        text: `<w id="1L5MQ">By<sup data-idx="1">1</sup>— </w><w id="1PhVS">Lewis </w><w id="1Tu4U">Carroll</w>`,//—
        check: `<w id="1L5MQ">By</w><sup data-idx="1"><w data-sugg="">1</w></sup>— <w id="1PhVS">Lewis </w><w id="1Tu4U">Carroll</w>`,
        name: 'dash with rigth space',
      },
      {
        text: `<w id="1L5MQ">By<sup data-idx="1">1</sup> — </w><w id="1PhVS">Lewis </w><w id="1Tu4U">Carroll</w>`,//—
        check: `<w id="1L5MQ">By</w><sup data-idx="1"><w data-sugg="">1</w></sup> — <w id="1PhVS">Lewis </w><w id="1Tu4U">Carroll</w>`,
        name: 'dash with two spaces',
      },
      {
        text: `<w id="1L5MQ">By<sup data-idx="1">1</sup>–</w><w id="1PhVS">Lewis </w><w id="1Tu4U">Carroll</w>`,//—
        check: `<w id="1L5MQ">By</w><sup data-idx="1"><w data-sugg="">1</w></sup>–<w id="1PhVS">Lewis </w><w id="1Tu4U">Carroll</w>`,
        name: 'dash 8211',
      },
      {
        text: `<w id="1L5MQ">By<sup data-idx="1">1</sup> –</w><w id="1PhVS">Lewis </w><w id="1Tu4U">Carroll</w>`,//—
        check: `<w id="1L5MQ">By</w><sup data-idx="1"><w data-sugg="">1</w></sup> –<w id="1PhVS">Lewis </w><w id="1Tu4U">Carroll</w>`,
        name: 'dash 8211 with left space',
      },
      {
        text: `<w id="1L5MQ">By<sup data-idx="1">1</sup>– </w><w id="1PhVS">Lewis </w><w id="1Tu4U">Carroll</w>`,//—
        check: `<w id="1L5MQ">By</w><sup data-idx="1"><w data-sugg="">1</w></sup>– <w id="1PhVS">Lewis </w><w id="1Tu4U">Carroll</w>`,
        name: 'dash 8211 with rigth space',
      },
      {
        text: `<w id="1L5MQ">By<sup data-idx="1">1</sup> – </w><w id="1PhVS">Lewis </w><w id="1Tu4U">Carroll</w>`,//—
        check: `<w id="1L5MQ">By</w><sup data-idx="1"><w data-sugg="">1</w></sup> – <w id="1PhVS">Lewis </w><w id="1Tu4U">Carroll</w>`,
        name: 'dash 8211 with two spaces',
      }
    ];
    dashChecks.forEach(d => {
      let tokens = parser.tokenize(d.text, "w");
      let rebuild = parser.rebuild(tokens, "w");
      //console.log(d.text);
      //console.log(rebuild)
      //let wrapped = parser.reWrap(tokens, 'w');
      //console.log(wrapped, wrapped === rebuild);
      //console.log(wrapped, d.name);
      it(`Dash or hyphen does not move to superscript, case "${d.name}"`, () => expect(rebuild).to.be.equal(d.check));
      //it(`Dash or hyphen does not move to superscript, rewrapped, case "${d.name}"`, () => expect(d.check).to.be.equal(wrapped));
    });
  });
  describe('Slash should be out of <w></w> wrapper, used four couplets', () => {
    //let text = `begin sentence (first case) on the bank, and of ( second case ) to do: once( third case )she had peeped`;
    let text = `Alice was beginning to get very tired   /   of sitting by her sister on the
bank, and of having nothing to do:   /    once or twice she had peeped into the
book her sister was reading, but it had   /   no pictures or conversations in
it, &lsquo;and what is the use of a book,&rsquo; thought Alice &lsquo;without pictures or
conversations?&rsquo;`;
    let check = `<w>Alice </w><w>was </w><w>beginning </w><w>to </w><w>get </w><w>very </w><w>tired</w>   /   <w>of </w><w>sitting </w><w>by </w><w>her </w><w>sister </w><w>on </w><w>the</w>
<w>bank, </w><w>and </w><w>of </w><w>having </w><w>nothing </w><w>to </w><w>do:</w>   /    <w>once </w><w>or </w><w>twice </w><w>she </w><w>had </w><w>peeped </w><w>into </w><w>the</w>
<w>book </w><w>her </w><w>sister </w><w>was </w><w>reading, </w><w>but </w><w>it </w><w>had</w>   /   <w>no </w><w>pictures </w><w>or </w><w>conversations </w><w>in</w>
<w>it, </w><w>&lsquo;and </w><w>what </w><w>is </w><w>the </w><w>use </w><w>of </w><w>a </w><w>book,&rsquo; </w><w>thought </w><w>Alice </w><w>&lsquo;without </w><w>pictures </w><w>or</w>
<w>conversations?&rsquo;</w>`;
    let tokens = parser.tokenize(text, '');
    //console.log(tokens);
    let wrapped = parser.reWrap(tokens, 'w');
    let rebuild = parser.rebuild(tokens, 'w');
    //console.log(wrapped);
    //console.log(rebuild);
    let reWrapped = parser.tokenize(rebuild, 'w');
    let tokensReWrapped = parser.tokenize(parser.rebuild(reWrapped, 'w'), 'w');
    let secondRebuild = parser.rebuild(tokensReWrapped, 'w');
    //console.log(secondRebuild);
    it('Slash as a couplet separator is outside <w></w>', () => expect(check).to.be.equal(wrapped));
    it('Slash as a couplet separator is outside <w></w> after second rewrap', () => expect(secondRebuild).to.be.equal(check));
  });
  describe('HTML in superscript', () => {
    let text = `<w id="1Is99K" data-map="0,1385">Either </w><w id="1IwliM" data-map="1385,510">the </w><w id="1IAxrO" data-map="1895,70">well</w><sup data-idx="1"><w data-sugg="">1</w><i class="pin"></i></sup> <w id="1IEJAQ" data-map="1965,495" data-sugg="">was </w><w id="1IIVJS" data-map="2460,350" data-sugg="">very </w><w id="1IN7SU" data-map="2810,350" data-sugg="">deep, </w>`;
    let tokens = parser.tokenize(text, 'w');
    let rebuilt = parser.rebuild(tokens, 'w');
    let check = '<w id="1Is99K" data-map="0,1385">Either </w><w id="1IwliM" data-map="1385,510">the </w><w id="1IAxrO" data-map="1895,70">well</w><sup data-idx="1"><w data-sugg="">1</w><i class="pin"></i></sup> <w id="1IEJAQ" data-map="1965,495">was </w><w id="1IIVJS" data-map="2460,350">very </w><w id="1IN7SU" data-map="2810,350">deep, </w>';
    it('HTML tags in superscript does not add empty suggestion to the end of sentence', () => expect(check).to.be.equal(rebuilt));
  });
  describe('Line break in suggestion', () => {
    let text = `<w id="zJqV2">her </w><w id="zND44">sister </w><sg data-suggestion=""><w id="zRPd6">on </w><w id="zW1m8">the </w>
<w id="A0dva">bank,</w></sg><w id="A0dva"> </w><w id="A4pEc">and </w><w id="A8BNe">of </w><w id="AcNWg">having </w><w id="Ah05i">nothing </w><w id="Alcek">to </w><w id="Aponm">do</w>`;
    let check = `<w id="zJqV2">her </w><w id="zND44">sister </w><sg data-suggestion=""><w id="zRPd6" data-sugg="">on the 
bank,</w></sg> <w id="A4pEc">and </w><w id="A8BNe">of </w><w id="AcNWg">having </w><w id="Ah05i">nothing </w><w id="Alcek">to </w><w id="Aponm">do</w>`;
    let tokens = parser.tokenize(text, 'w');
    let rebuilt = parser.rebuild(tokens, 'w');
    let reWrap = parser.reWrap(rebuilt, 'w');
    it('Line break inside suggestion does not break words, rewrap', () => expect(check).to.be.equal(reWrap));
    it('Line break inside suggestion does not break words, rebuilt', () => expect(check).to.be.equal(rebuilt));
  });
  describe('Split position in arabic after quote', () => {
    let text = `<w id="7SH2S" data-map="0,1065">قُلْ </w><w id="7UchT" data-map="1065,525">إِنَّ </w><w id="7VHwU" data-map="1590,690">هَذَا </w><w id="7XcLV" data-map="2280,530">لَمَنْظَرُ </w><w id="7YI0W" data-map="2810,335">ٱلْأَكْبَرُ </w><w id="80dfX" data-map="3145,990">ٱلَّذِي </w><w id="81IuY" data-map="4135,485">سُطِرَ </w><w id="83dJZ" data-map="4620,560">فِي </w><w id="84IZ0" data-map="5180,640">أَلْوَاحِ </w><w id="86ee1" data-map="5820,1715">ٱلْمُرْسَلِينَ * </w><w id="87Jt2" data-map="7535,1015">وَبِهِ </w><w id="89eI3" data-map="8550,635">يُفْصَلُ </w><w id="8aJX4" data-map="9185,480">ٱلْحَقُّ </w><w id="8cfc5" data-map="9665,300">عَنِ </w><w id="8dKr6" data-map="9965,2240">ٱلْبَاطِلِ </w><w id="8ffG7" data-map="12205,685">"<i class="pin"></i> وَيُفْرَقُ </w><w id="8gKV8" data-map="12890,635">كُلُّ </w><w id="8iga9" data-map="13525,510">أَمْرٍ </w><w id="8jLpa" data-map="14035,665">حَكِيْمٍ * </w><w id="8lgEb" data-map="14700,1375">قُلْ </w><w id="8mLTc" data-map="16075,660">إِنَّهُ </w><w id="8oh8d" data-map="16735,1025">لَشَجَرُ </w><w id="8pMne" data-map="17760,815">ٱلْرُّوْحِ </w><w id="8rhCf" data-map="18575,565">ٱلَّذِي </w><w id="8sMRg" data-map="19140,615">أَثْمَرَ </w><w id="8ui6h" data-map="19755,1090">بِفَوَاكِهِ </w><w id="8vNli" data-map="20845,1020">اللهِ </w><w id="8xiAj" data-map="21865,115">ٱلْعَلِي </w><w id="8yNPk" data-map="21980,190">ٱلْمُقْتَدِرِ </w><w id="8Aj4l" data-map="22170,470">ٱلْعَظِيْمِ "</w>`;
    let tokens = parser.tokenize(text, 'w');
    let rebuilt = parser.rebuild(tokens, 'w');
    it('Split position does not disappear after rebuild', () => expect(text).to.be.equal(rebuilt));
  });
  describe('HTML regular expressions are case insensitive', () => {
    let text = `<B>Alice</B> <I>was</I> <U>beginning</U> to get very tired`;
    
    let check = `<B><w>Alice</w></B> <I><w>was</w></I> <U><w>beginning</w></U> <w>to </w><w>get </w><w>very </w><w>tired</w>`;
    
    let tokens = parser.tokenize(text, 'w');
    let rebuilt = parser.rebuild(tokens, 'w');
    let reWrap = parser.reWrap(rebuilt, 'w');
    it('HTML regular expression case insensitive, rebuild', () => expect(rebuilt).to.be.equal(check));
    it('HTML regular expressions case insensitive, rewrap', () => expect(reWrap).to.be.equal(check));
  });
  describe('Text added before word', () => {
    let text = `<w id="z3tsI">Alice added</w><w id="z7FBK">was </w><w id="sdfe">b</w><w id="zbRKM">beginning to</w>
<w id="zkg2Q">get</w>`;
    let check = `<w id="z3tsI">Alice </w><w id="z7FBK">addedwas </w><w id="sdfe">b</w><w id="zbRKM">beginning </w><w>to</w>
<w id="zkg2Q">get</w>`;
    let tokens = parser.tokenize(text, 'w');
    let rebuilt = parser.rebuild(tokens, 'w');
    let reWrap = parser.reWrap(rebuilt, 'w');
    it('Text added before word without space or punctuation does not create new token, rebuilt', () => expect(rebuilt).to.be.equal(check));
    it('Text added before word without space or punctuation does not create new token, rewrap', () => expect(reWrap).to.be.equal(check));
  });
  describe('Keep zwnj character', () => {
    let text = `In the mid‌dle, after:‌ and ‌before`;
    let check = `<w>In </w><w>the </w><w>mid‌dle, </w><w>after:‌ </w><w>and </w><w>‌before</w>`;
    let tokens = parser.tokenize(text, 'w');
    let rebuilt = parser.rebuild(tokens, 'w');
    let reWrap = parser.reWrap(rebuilt, 'w');
    it('Character zwnj does not create new token, rebuilt', () => expect(rebuilt).to.be.equal(check));
    it('Character zwnj does not create new token, rewrap', () => expect(reWrap).to.be.equal(check));
  });
  /*describe('Test', () => {
    //let text = `begin sentence (first case) on the bank, and of ( second case ) to do: once( third case )she had peeped`;
    let text = `par Bahá’u’lh. (Dans le saints furent) ses ( more test) and (.another) one`;
    let check = `<w>public </w><w>affa: [/] </w><w>public </w><w>affa</w>`
    let tokens = parser.tokenize(text, '');
    console.log(tokens)
    //let wrapped = parser.reWrap(tokens, 'w')
    //it('Slash does not create non word token', () => expect(check).to.be.equal(wrapped))
  })*/
  
});



function __describe() {;}


      



