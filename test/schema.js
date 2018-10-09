const {
    test
} = require('ava');
const mock = require('mock-require');
const Schema = require('../lib/schema');
const Query = require('../lib/query');
const Parser = require('../lib/parser');


test('get schema', async t => {

    let schema =  new Schema();
    let query = new Query();
    schema.query = query;
    schema.parser = new Parser()

    const result = await schema.getSchema('TEST');

    t.pass()

})