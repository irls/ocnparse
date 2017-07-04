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
      let wrapped = parser.rebuild(tokens, 'spanwords')
      if (wrapped!=cmp) {
        //var diff = new Diff()
        //console.log('Rebuild failed to match exactly', diff.main(cmp, wrapped))
        console.log(wrapped)
      }
      expect(wrapped===cmp).to.be.true;
    })
    it('Correctly wrap a complex block in <w> tags', function () {
      let src = tests.spans
      let cmp = tests.spans_wrapped
      let tokens = parser.tokenize(src)
      let wrapped = parser.rebuild(tokens, 'spanwords')
      if (wrapped!=cmp) {
        //var diff = new Diff()
        // console.log('Rebuild failed to match exactly', diff.main(cmp, wrapped))
        console.log(wrapped)
      }
      expect(wrapped===cmp).to.be.true;
    })

  }) // Parse and rebuild English strings

  describe('Parse and rebuild Farsi strings', function () {
    it('Tokenizing then rebuilding Farsi plaintext should result in identical block', function () {
      let src = tests.plaintext_fa
      let tokens = parser.tokenize(src)
      let dest = parser.rebuild(tokens)
      expect(tokens.length).to.equal(164)
      //console.log(tokens.length)
      expect(dest===src).to.be.true;
    })
    it('Correctly wrap a farsi block in <w> tags', function () {
      let src = tests.plaintext_fa_short
      let cmp = tests.plaintext_fa_short_wrapped
      let tokens = parser.tokenize(src)
      let wrapped = parser.rebuild(tokens, 'spanwords')
      if (wrapped!=cmp) {
        // var diff = new Diff() 
        console.log(wrapped)
      }
      expect(wrapped===cmp).to.be.true;
    })
  }) // Parse and rebuild Farsi strings

  describe('Test ability to determine if a token is a word', function () {

    it('Test word: "hello" ', function () { 
      expect(parser.isWord("hello")).to.be.true;
    }) 
    it('Test word: "-hello" ', function () { 
      expect(parser.isWord("-hello")).to.be.false;
    }) 
    it('Test word: "\'hello\'" ', function () { 
      expect(parser.isWord("'hello'")).to.be.true;
    }) 
    it('Test word: "!!hello" ', function () { 
      expect(parser.isWord("!!hello")).to.be.false;
    }) 
    it('Test word: "مردم" ', function () { 
      expect(parser.isWord("مردم")).to.be.true;
    }) 
    it('Test word: "\'مردم\'" ', function () { 
      expect(parser.isWord("'مردم'")).to.be.true;
    }) 


  }) // Test ability to determine if a token is a word

});






