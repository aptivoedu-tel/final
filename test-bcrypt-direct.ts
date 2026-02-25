import bcrypt from 'bcryptjs';

async function test() {
    const pw = 'Aptivo2026';
    const hashed = await bcrypt.hash(pw, 12);
    console.log('Hashed:', hashed);
    const match = await bcrypt.compare(pw, hashed);
    console.log('Match:', match);

    const match2 = await bcrypt.compare('Aptivo2026', '$2b$12$LzESX440/3x7xiKzuaykH.rIx3iITnp0w8FyimpV2.b86I8QSdy7G');
    console.log('Match with DB hash:', match2);
}

test();
