const bcrypt = require('bcryptjs');

async function testBcrypt() {
    const pass = 'test1234';
    const hash = await bcrypt.hash(pass, 12);
    console.log('Hash:', hash);
    const match = await bcrypt.compare(pass, hash);
    console.log('Match:', match);
    if (match) console.log('BCRYPT SUCCESS');
    else console.log('BCRYPT FAILURE');
}

testBcrypt();
