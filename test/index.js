var chai = require('chai'), expect = chai.expect, should = chai.should()

var Diff = require('text-diff')

var fs = require('fs')
var path = require('path')
var parser = require('../ocnparse')

// fetch an object with a bunch of test text blocks for testing
var tests = require('./testblocks.js')()


describe('Ocean Parser Behaviour Tests', function() {

  describe('Parse and rebuild English strings', function () {
    it('Tokenizing then rebuilding plaintext should result in identical block', function () {
      let src = tests.plaintext
      let tokens = parser.tokenize(src)
      let dest = parser.rebuild(tokens)
      expect(tokens.length).to.equal(45)
      expect(dest===src).to.be.true;
    })
    it('Tokenizing then rebuilding block with <q> wrapper should result in identical block', function () {
      let src = tests.spans
      let tokens = parser.tokenize(src)
      let dest = parser.rebuild(tokens)
      if (dest!=src) {
        var diff = new Diff()
        console.log('Rebuild failed to match exactly', diff.main(src, dest))
      }
      expect(dest===src).to.be.true;
    })
    it('Correctly wrap a simple block in <w> tags', function () {
      let src = tests.plaintext
      let cmp = tests.plaintext_wrapped
      let tokens = parser.tokenize(src)
      let wrapped = parser.rebuildWrap(tokens, 'w')
      if (wrapped!=cmp) console.log(wrapped) 
      expect(wrapped===cmp).to.be.true;
    })
    it('Correctly wrap a complex block in <w> tags', function () {
      let src = tests.spans
      let cmp = tests.spans_wrapped
      let tokens = parser.tokenize(src)
      let wrapped = parser.rebuildWrap(tokens, 'w')
      if (wrapped!=cmp)  console.log(wrapped) 
      expect(wrapped===cmp).to.be.true;
    })
  }) // Parse and rebuild English strings

  describe('Parse and rebuild Farsi strings', function () {
    it('Tokenizing then rebuilding Farsi plaintext should result in identical block', function () {
      let src = tests.plaintext_fa
      let tokens = parser.tokenize(src)
      let dest = parser.rebuild(tokens)
      expect(tokens.length).to.equal(165)
      if (dest!=src) console.log(tokens.length, dest)
      expect(dest===src).to.be.true;
    })
    it('Correctly wrap a farsi block in <w> tags', function () {
      let src = tests.plaintext_fa_short
      let cmp = tests.plaintext_fa_short_wrapped
      let tokens = parser.tokenize(src)
      let wrapped = parser.rebuildWrap(tokens, 'w')
      if (wrapped!=cmp) console.log(wrapped) 
      expect(wrapped===cmp).to.be.true;
    })
  }) // Parse and rebuild Farsi strings

  describe(`Test "isWord()" function`, function () {
    it(`Test word: "hello" `, () => expect(parser.isWord("hello")).to.be.true ) 
    it(`Test word: "'Abdu'l-Baha" `, () => expect(parser.isWord("'Abdu'l-Baha")).to.be.true ) 
    it(`Test word: "‘Abdu’l-Bahá" `, () => expect(parser.isWord("‘Abdu’l-Bahá")).to.be.true )    
    it(`Test word: "'hello'" `, () => expect(parser.isWord("'hello'")).to.be.false ) 
    it(`Test word: "!!hello" `, () => expect(parser.isWord("!!hello")).to.be.false ) 
    it(`Test word: "مردم" `, () => expect(parser.isWord("مردم")).to.be.true ) 
    it(`Test word: "'مردم'" `, () => expect(parser.isWord("'مردم'")).to.be.false ) 
    it(`Test word: "Ma<u>sh</u>riq’l-A<u>dh</u>kár" `, () => expect(parser.isWord("Ma<u>sh</u>riqu’l-A<u>dh</u>kár")).to.be.true ) 
  }) // Test ability to determine if a given string is a word

  describe(`Test "tokenizeWord()" returns a correct token`, function () {
    //console.log(parser.tokenizeWord(`Ma<u>sh</u>riqu’l-A<u>dh</u>kár!!`))
    it(`Test word: "Ma<u>sh</u>riqu’l-A<u>dh</u>kár!!" `, () => expect(
      parser.tokenizeWord(`Ma<u>sh</u>riqu’l-A<u>dh</u>kár!!`).word === `Ma<u>sh</u>riqu’l-A<u>dh</u>kár`
    ).to.be.true )  



  }) // Test ability to determine if a token is a word

  describe('Tokens correctly give same soundex for various states of utf8', function () {
    var tt = parser.tokenize(`'Abdu'l-Bahá ‘Abdu’l-Bahá Abdu'l-Bahá`)
    //console.log(tt)
    it(`Token count should be correct (3)`, () => expect(tt.length).to.equal(3) )  

    if (tt.length===3) {
      it(`Compare soundex of 'Abdu'l-Bahá ‘Abdu’l-Bahá Abdu'l-Bahá`, () => expect(
        tt[0].info.soundex === tt[1].info.soundex &&
        tt[1].info.soundex === tt[2].info.soundex
      ).to.be.true )  
      //console.log(tt[0].info.soundex, tt[1].info.soundex, tt[2].info.soundex)

      // todo, this test should go in bahai-terms-phonemes
      //console.log(tt[0].info.phoneme, tt[1].info.phoneme, tt[2].info.phoneme)
      it(`Compare phonemes of 'Abdu'l-Bahá ‘Abdu’l-Bahá Abdu'l-Bahá`, () => expect(
        tt[0].info.phoneme === tt[1].info.phoneme &&
        tt[1].info.phoneme === tt[2].info.phoneme
      ).to.be.true )  
      
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
        let tokens = parser.reTokenize(testString, tag) 
        let wrapped = parser.rebuildWrap(tokens, tag)  
        return expect(testString===wrapped).to.be.true
      })
      it(`Re-wrapped string with classes matches original`, () => {
        let testString = `<w>one </w><w class="pronoun">two </w><w class="number">three </w><w>four</w>`
        let tokens = parser.reTokenize(testString, tag) 
        let wrapped = parser.rebuildWrap(tokens, tag)  
        // if (testString!=wrapped) console.log('        '+testString, '\n', '       '+wrapped)
        return expect(testString===wrapped).to.be.true
      })

      it(`Re-wrapped string with data-attributes matching original`, () => {
        let testString = `<w>one </w><w data-pos="pronoun">two </w><w data-type="number">three </w><w>four</w>`
        let tokens = parser.reTokenize(testString, tag) 
        let wrapped = parser.rebuildWrap(tokens, tag)  
        if (testString!=wrapped) console.log('        '+testString, '\n', '       '+wrapped)
        return expect(testString===wrapped).to.be.true
      })    


      // it(`Re-wrapped string with inserted mid-words retokenizes correctly`, () => {
      //   let testString = `<w>one </w><w>two </w><w>three </w><w>four</w>`
      //   let tokens = parser.reTokenize(testString, tag) 
      //   let wrapped = parser.rebuildWrap(tokens, tag)  
      //   return expect(testString===wrapped).to.be.true
      // })



    })


  }) //  String with tokens correctly re-tokenizes

});


      



