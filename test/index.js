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
<w>pair, </w><w>the </w><w>pride </w><w>of </w><w>her </w><w>heart, </w><w>and </w><w>were </w><w>built </w><w>for </w><w>“style,” </w><w>not </w><w data-author="quote 1">service </w><w>— she </w>
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
    let check = '.<i><w>begin</w></i><sg data-suggestion="Chapter one"><w data-sugg="Chapter one">I.</w></sg><br> <w>Down </w><w>the </w><w>Rabbit-Hole</w><i><w>end.</w></i>';
    let tokenized = parser.tokenize(str, 'w');
    let rebuild = parser.rebuild(tokenized, 'w');//clean w
    let reWrap = parser.reWrap(rebuild, 'w');
    it('Dot does not brake HTML tags', () => expect(rebuild).to.be.equal(check))
    it('Dot does not brake HTML tags', () => expect(reWrap).to.be.equal(check))
  });
  describe('Suggestion and HTML tags', function() {
    let str = '.<i>begin</i><sg data-suggestion="Chapter one"><i>I</i></sg>.<br> Down the Rabbit-Hole<i>end</i>.';
    let check = '.<i><w>begin</w></i><sg data-suggestion="Chapter one"><i><w data-sugg="Chapter one">I.</w></i></sg><br> <w>Down </w><w>the </w><w>Rabbit-Hole</w><i><w>end.</w></i>';
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
  describe('Underlines and sup', function() {
    let str = 'Mírzá,<sup data-idx=\"26\">26</sup> <u>Sh</u>ay<u>kh</u> Aḥmad, freed from';
    let checkStr = '<w data-ipa="mi:rzA:">Mírzá,</w><sup data-idx="26"><w data-sugg="">26</w></sup> <w><u>Sh</u>ay<u>kh</u> </w><w data-ipa="ahmad">Aḥmad, </w><w>freed </w><w>from</w>';
    str = parser.reWrap(str, 'w');
    let tokens = parser.tokenize(str, 'w')
    let rebuild = parser.rebuild(tokens, 'w')
    it('u tags are not wrapped', () => expect(rebuild).to.be.equal(checkStr));
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
    strQuote = parser.reWrap(strQuote, 'w');
    it('Quotes in token with words it covers', () => expect(strQuote).to.be.equal(checkQuote));
    //console.log(strQuote);
    let strQuote2 = parser.reWrap(strQuote, 'w');
    let rebuildQuote = parser.rebuild(parser.tokenize(strQuote2, 'w'), 'w')
    it('Quotes in token with words it covers, rebuild', () => expect(rebuildQuote).to.be.equal(checkQuote));
    let strQuoteSingle = 'Test string \'<i>inside test</i>\' outside outside';
    let checkQuoteSingle = '<w>Test </w><w>string </w>\'<i><w>inside </w><w>test</w></i>\' <w>outside </w><w>outside</w>';
    strQuoteSingle = parser.reWrap(strQuoteSingle, 'w');
    it('Single Quotes in token with words it covers', () => expect(strQuoteSingle).to.be.equal(checkQuoteSingle));
    //console.log(str);
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
<i><w>you. — </w></i><w>Come, </w>
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
    str = parser.reWrap(str, 'w');
    it('Re wrap keeps line breaks', () => expect(str).to.be.equal(check_str));
    str = parser.reWrap(str, 'w');
    it('Double re wrap keeps line breaks', () => expect(str).to.be.equal(check_str));
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
  /*describe('Test', () => {
    //let text = `begin sentence (first case) on the bank, and of ( second case ) to do: once( third case )she had peeped`;
    let text = `par Bahá’u’lh. (Dans le saints furent) ses ( more test) and (.another) one`;
    let check = `<w>public </w><w>affa: [/] </w><w>public </w><w>affa</w>`
    let tokens = parser.tokenize(text, '');
    console.log(tokens)
    //let wrapped = parser.reWrap(tokens, 'w')
    //it('Slash does not create non word token', () => expect(check).to.be.equal(wrapped))
  })*/
  //First
  //<w data-map=\"0,1245\">The </w><f class=\"service-info\" data-flag=\"tgom-2_en_2s:jd5rdfre\" data-status=\"resolved\"><w data-map=\"1245,430\">Gift</w></f><w data-map=\"1675,455\"> of</w><p><f class=\"service-info\" data-flag=\"tgom-2_en_2s:jd5rdpsq\" data-status=\"resolved\"><w data-map=\"2130,290\">the</w></f><w data-map=\"2420,2300\"> Magi</w></p><div><w data-map=\"1675,455\"></w></div>
//First cleaned
//<w data-map="0,1245">The </w><f class="service-info" data-flag="tgom-2_en_2s:jd5rdfre" data-status="resolved"><w data-map="1245,430">Gift</w></f><w data-map="1675,455"> of</w><p><f class="service-info" data-flag="tgom-2_en_2s:jd5rdpsq" data-status="resolved"><w data-map="2130,290">the</w></f><w data-map="2420,2300"> Magi</w></p><div><w data-map="1675,455"></w></div>
//Second
//<w data-map=\"0,1360\">The </w><w data-map=\"1360,495\"><f data-flag=\"tgom-3_en_2s:jda3mun6\" data-status=\"resolved\">Gift</f> </w><w data-map=\"1855,925\">of </w><w data-map=\"2780,275\"><f data-flag=\"tgom-3_en_2s:jda3n32v\" data-status=\"resolved\">the</f> </w><w data-map=\"3055,1545\">Magi</w>
//Second cleaned
//<w data-map="0,1360">The </w><w data-map="1360,495"><f data-flag="tgom-3_en_2s:jda3mun6" data-status="resolved">Gift</f> </w><w data-map="1855,925">of </w><w data-map="2780,275"><f data-flag="tgom-3_en_2s:jda3n32v" data-status="resolved">the</f> </w><w data-map="3055,1545">Magi</w>
 

});



function __describe() {;}


      



