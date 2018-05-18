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
      expect(tokens.length).to.equal(167)
      if (dest!=src) {
        var diff = new Diff()
        console.log('Rebuild failed to match exactly', diff.main(src, dest))
      }
      expect(dest===src).to.be.true;
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
    let ipa = `@ b d @U ? l ? b @ h A:`
    //console.log(tt[0].info.data)
    it(`Token count should be correct (3)`, () => expect(tt.length).to.equal(3) )  
    if (tt.length===3) {
      it(`Correct soundex for 'Abdu'l-Bahá (A134)`, () => expect( tt[0].info.soundex ).to.equal(soundex) ) 
      it(`Correct soundex for ‘Abdu’l-Bahá (A134)`, () => expect( tt[1].info.soundex ).to.equal(soundex) ) 
      it(`Correct soundex for Abdu'l-Bahá (A134)`, () => expect( tt[2].info.soundex ).to.equal(soundex) ) 
      it(`Correct IPA for 'Abdu'l-Bahá (@ b d @U ? l ? b @ h A:)`, () => expect( tt[0].info.data.ipa ).to.equal(ipa) ) 
      it(`Correct IPA for ‘Abdu’l-Bahá (@ b d @U ? l ? b @ h A:)`, () => expect( tt[1].info.data.ipa ).to.equal(ipa) ) 
      it(`Correct IPA for Abdu'l-Bahá (@ b d @U ? l ? b @ h A:)`, () => expect( tt[2].info.data.ipa ).to.equal(ipa) )   
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
    let check_string = '<w>The </w><w>old </w><w>lady </w><f class="service-info" data-flag="ts1_en_39:j7r8udpr" data-status="open"><w>pulled</w></f><w> her </w><w>spectacles</w><sup class="js-footnote-el service-info" data-idx="1"><w class="service-info" data-sugg="">1</w></sup><w> down </w><w>and </w><w>looked </w><w>over </w><w>them </w><f class="service-info" data-flag="ts1_en_39:j7r8undm" data-status="open"><w>about </w><w>the </w><w>room</w></f><w>; then </w><w>she </w><w>put </w><w>them </w><w>up </w><w>and </w><w>looked </w><w>out </w><w>under </w><w>them. </w><w>She </w><w>seldom</w><sup class="js-footnote-el service-info" data-idx="2"><w class="service-info" data-sugg="">2</w></sup><w> or </w><w>never  </w><w>looked </w><i class="service-info"><w>through</w></i><w> them </w><w>for </w><w>so </w><w>small </w><w>a </w><w>thing </w><w>as </w><w>a </w><w>boy; </w><w>they </w><w>were </w><w>her </w><w>state  </w><w>pair, </w><w>the </w><w>pride </w><w>of </w><w>her </w><w>heart, </w><w>and </w><w>were </w><w>built </w><w>for </w><w>“style,</w><w>” </w><w>not </w><w data-author="quote 1">service </w><w>— she  </w><w>could </w><w>have </w><w>seen </w><w data-author="quote 2">through </w><w>a </w><w>pair </w><w>of </w><w>stove-lids </w><w>just </w><w>as </w><w>well. </w><w>She </w><w>looked  </w><w>perplexed </w><w>for </w><w>a </w><w>moment, </w><w>and </w><w>then </w><w>said, </w><w>not </w><w>fiercely, </w><w>but </w><w>still </w><w>loud </w><w>enough  </w><w>for </w><w>the </w><w>furniture </w><w>to </w><w>hear:</w>';
    
    it ('Wrapped string did not remove words after line breaks', () => expect(wrapped).to.equal(check_string))
  })
  
  describe('Adding service classes', function() {
    let str = '“There! <f id="flag1">I might<sup class="js-footnote-el" data-idx="1">1</sup> ‘a’ <qq data-author="quote123">thought</qq> of that closet</f>. What you been doing in there?”';
    let tokens = parser.tokenize(str, 'w');
    let wrapped = parser.rebuild(tokens, 'w')
    let check_string = '<w>“There! </w><f id="flag1" class="service-info"><w>I </w><w>might</w><sup class="js-footnote-el service-info" data-idx="1"><w class="service-info" data-sugg="">1</w></sup><w> ‘a’ </w><qq class="service-info" data-author="quote123"><w>thought</w></qq><w> of </w><w>that </w><w>closet</w></f><w>. What </w><w>you </w><w>been </w><w>doing </w><w>in </w><w>there?</w><w>”</w>';
    it ('Wrapped string contains service classes', () => expect(wrapped).to.equal(check_string))
  })
  
  describe('Blocks intersection', function() {
    let str = '<w data-map="0,1310">“My! </w><w data-map="1310,30">Look </w><w data-map="1340,720"><sg data-suggestion="vvvvvvv">behind</sg> </w><w data-map="2060,1240">you, </w><w data-map="3300,95">aunt!</w><w data-map="3395,125">”</w>'
    let check_str = '<w>“My! </w><w>Look </w><sg class="service-info" data-suggestion="vvvvvvv"><w data-sugg="vvvvvvv">behind</w></sg><w> you, </w><w>aunt!</w><w>”</w>'
    let clean_content = parser.rebuild(parser.tokenize(str, "w"), "");
    let reWrapped = parser.reWrap(clean_content, 'w');
    it('Re wrapped string still contains suggestion', () => expect(reWrapped).to.be.equal(check_str))
  });
  
  describe('Blocks inside', function() {
    let str = '<a>The</a> Yellow <b><f data-flag="yellow-wallpaper_en_2s:j81nafbq" data-status="resolved">Wallpaper</f></b>';
    let clean_content = parser.rebuild(parser.tokenize(str.replace(/(?:\r\n|\r|\n)/g, ""), "w"), "");
    let reWrapped = parser.reWrap(clean_content, 'w');
    let check = '<a class="service-info"><w>The</w></a><w> Yellow </w><b class="service-info"><f class="service-info" data-flag="yellow-wallpaper_en_2s:j81nafbq" data-status="resolved"><w>Wallpaper</w></f></b>';
    it('Re wrapped string still contains html', () => expect(reWrapped).to.be.equal(check))
  });
  describe('Flags and <br/>', function() {
    let str = '<w data-map="0,235">O.</w><br class="service-info"><f class="service-info" data-flag="tgom-3_en_2u:jda3nf1r" data-status="resolved"><w data-map="235,925">Henry</w></f>';
    let check = '<w>O.</w><br class="service-info"><f class="service-info" data-flag="tgom-3_en_2u:jda3nf1r" data-status="resolved"><w>Henry</w></f>';
    let tokenized = parser.tokenize(str, 'w');
    let rebuild = parser.rebuild(tokenized, '');//clean w
    let reWrap = parser.reWrap(rebuild, 'w');
    it('Re wrapped string still contains br', () => expect(reWrap).to.be.equal(check))
  });
  describe('Dot and HTML tags', function() {
    let str = '.<i>begin</i><sg data-suggestion=\"Chapter one\">I</sg>.<br> Down the Rabbit-Hole<i>end</i>.';
    let check = '<i class="service-info"><w>.begin</w></i><sg class="service-info" data-suggestion="Chapter one"><w data-sugg="Chapter one">I.</w></sg><br class="service-info"><w> Down </w><w>the </w><w>Rabbit-Hole</w><i class="service-info"><w>end.</w></i>';
    let tokenized = parser.tokenize(str, 'w');
    let rebuild = parser.rebuild(tokenized, '');//clean w
    let reWrap = parser.reWrap(rebuild, 'w');
    it('Dot does not brake HTML tags', () => expect(reWrap).to.be.equal(check))
  });
  describe('Suggestion and HTML tags', function() {
    let str = '.<i>begin</i><sg data-suggestion="Chapter one"><i>I</i></sg>.<br> Down the Rabbit-Hole<i>end</i>.';
    let check = '<i class="service-info"><w>.begin</w></i><sg class="service-info" data-suggestion="Chapter one"><w data-sugg="Chapter one"><i>I.</i></w></sg><br class="service-info"><w> Down </w><w>the </w><w>Rabbit-Hole</w><i class="service-info"><w>end.</w></i>';
    let tokenized = parser.tokenize(str, 'w');
    let rebuild = parser.rebuild(tokenized, '');//clean w
    let reWrap = parser.reWrap(rebuild, 'w');
    it('Suggestion does not brake HTML tags', () => expect(reWrap).to.be.equal(check))
  });
  describe('Suggestion and comma', function() {
    let str = '<w>her </w><w>sister <sg data-suggestion="on the bank">o-t-b</sg></w><w>, </w><w>and </w>';
    let check = '<w>her </w><w>sister </w><sg class="service-info" data-suggestion="on the bank"><w data-sugg="on the bank">o-t-b</w></sg><w>, and </w>';
    let tokens = parser.tokenize(str, "w")
    let rebuild = parser.rebuild(tokens, '');//clean w
    let reWrap = parser.reWrap(rebuild, 'w');
    it('Comma after suggestion does not brake HTML tags', () => expect(reWrap).to.be.equal(check))
  });
  describe('Check', function() {
    let str = 'Descendants of the <u>Sh</u>áhs were thrust';
    let check = '<w>Descendants </w><w>of </w><w>the </w><w data-ipa="s  A: h s"><u>Sh</u>áhs </w><w>were </w><w>thrust</w>';
    str = parser.rebuild(parser.tokenize(str, "w"), "");
    let reWrap = parser.reWrap(str, 'w');
    it('<u> at the beginning of term does not brake HTML tags', () => expect(reWrap).to.be.equal(check))
  });
  describe('Suggestions', function() {
    describe('Multi word suggestion', function() {
      let str = 'Some text <sg data-suggestion="some suggestion">inside <i>sugg</i> test.</sg> outside sugg';
      let check = '<w>Some </w><w>text </w><sg class="service-info" data-suggestion="some suggestion"><w data-sugg="some suggestion">inside <i>sugg</i> test.</w></sg><w> outside </w><w>sugg</w>';
      let tokens = parser.tokenize(str, "w");
      str = parser.rebuild(tokens, "");
      let reWrap = parser.reWrap(str, 'w');
      it('Multi word suggestion', () => expect(reWrap).to.be.equal(check))
    });
    describe('Single word suggestion', function() {
      let str = 'Some text <sg data-suggestion="some suggestion">inside </sg> outside sugg';
      let check = '<w>Some </w><w>text </w><sg class="service-info" data-suggestion="some suggestion"><w data-sugg="some suggestion">inside </w></sg><w> outside </w><w>sugg</w>';
      let tokens = parser.tokenize(str, "w");
      str = parser.rebuild(tokens, "");
      let reWrap = parser.reWrap(str, 'w');
      it('Single word suggestion', () => expect(reWrap).to.be.equal(check))
    });
    describe('Empty suggestion', function() {
      let str = 'Some text <sg data-suggestion="">inside sugg test </sg> outside sugg';
      let check = '<w>Some </w><w>text </w><sg class="service-info" data-suggestion=""><w data-sugg="">inside sugg test </w></sg><w> outside </w><w>sugg</w>';
      let tokens = parser.tokenize(str, "w");
      str = parser.rebuild(tokens, "");
      let reWrap = parser.reWrap(str, 'w');
      it('Empty suggestion', () => expect(reWrap).to.be.equal(check))
    })
  });
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


      



