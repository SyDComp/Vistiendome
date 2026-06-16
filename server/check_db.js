const { MongoClient } = require('mongodb');
async function run() {
    const client = new MongoClient('mongodb://root:vistiendome-root-pw-sydcomp-123@localhost:27017/vistiendome?authSource=admin');
    await client.connect();
    const db = client.db('vistiendome');
    const page = await db.collection('pages').findOne({ slug: 'ayuda' });
    if(page) {
        console.log(JSON.stringify(page.sections, null, 2));
    } else {
        console.log("Page not found");
    }
    await client.close();
}
run().catch(console.error);
