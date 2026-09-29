// Usage: npm run seed
// Fills the database with a believable demo community. Safe to re-run: it removes the
// previous seed data (users flagged isSeed and everything they made) before recreating it.
//
// Env (optional): SEED_PASSWORD (default circl-demo-1234), ADMIN_PASSWORD (default: random, printed once).
import 'dotenv/config';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Post from '../src/models/Post.js';
import Comment from '../src/models/Comment.js';
import Report from '../src/models/Report.js';
import AdminLog from '../src/models/AdminLog.js';
import { extractTags } from '../src/utils/tags.js';

const SEED_PASSWORD = process.env.SEED_PASSWORD || 'circl-demo-1234';
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

// Deterministic randomness so every run produces the same community.
let s = 20260929;
const rand = () => {
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const sample = (arr, n) => [...arr].sort(() => rand() - 0.5).slice(0, n);

const PEOPLE = [
  ['maya_makes', 'Maya Okafor', 'Ceramics, long walks and bad puns. Sharing what comes out of the kiln.'],
  ['jonas_r', 'Jonas Reyes', 'Slow cyclist. Field notes from roads with no traffic lights.'],
  ['priya_bakes', 'Priya Nair', 'Sourdough evangelist. Rye is not a personality, it is a lifestyle.'],
  ['tomasz_films', 'Tomasz Kowal', 'Shooting 35mm on a camera older than me.'],
  ['ana_plants', 'Ana Lima', 'Forty-one houseplants and counting. Yes, they all have names.'],
  ['kwame_reads', 'Kwame Mensah', 'Reading a book a week, finishing about half of them.'],
  ['lena_runs', 'Lena Fischer', 'Marathon in spring. Coffee before, pastry after.'],
  ['omar_beats', 'Omar Haddad', 'Making music in a spare bedroom. Drum machines and field recordings.'],
  ['sofia_sketch', 'Sofia Marin', 'Sketchbook in my bag at all times.'],
  ['dev_cooks', 'Dev Malhotra', 'Weeknight cooking for two. Mostly dal, occasionally ambitious.'],
  ['hana_hikes', 'Hana Sato', 'Trail notes, wet boots, summit snacks.'],
  ['eli_codes', 'Eli Brandt', 'Building small tools nobody asked for.'],
  ['nora_thrifts', 'Nora Adeyemi', 'Thrift finds and mending. Buying nothing new this year.'],
  ['sam_swims', 'Sam Whitlock', 'Cold water, early mornings, questionable decisions.'],
];

// [author index, text, image index or -1]
const POSTS = [
  [0, 'Unloaded the kiln this morning. Two mugs cracked, one came out perfect. That one stays. #ceramics', -1],
  [0, 'Glaze test tiles, batch 7. The iron red finally behaves. #ceramics #glaze', 0],
  [0, 'Someone asked why I make things that break. Because the good ones are worth the ones that do not survive. #ceramics', -1],
  [1, 'Found a route with zero traffic lights for 40km. Not telling anyone where. #cycling', -1],
  [1, 'Chain lube opinions, go. #cycling', -1],
  [1, 'Golden hour on the gravel loop. Legs are done, head is full. #cycling #gravel', 1],
  [2, 'Day 4 starter is finally doing something. Bubbles at last. #sourdough', -1],
  [2, 'Crumb shot from this morning. I will not be taking questions. #sourdough #baking', 2],
  [2, 'Rye is hard. Rye is humbling. Rye is also delicious. #sourdough', -1],
  [3, 'Developed a roll from last summer. Half of it is light leaks and I love every frame. #filmphotography', 3],
  [3, 'Tip: meter for the shadows, let the highlights take care of themselves. #filmphotography', -1],
  [3, 'New rule: one roll per month, no chimping. It is working. #filmphotography', -1],
  [4, 'The monstera put out a new leaf overnight. I am not being dramatic, I am crying. #houseplants', 4],
  [4, 'Repotting day. Soil everywhere, joy everywhere. #houseplants', -1],
  [4, 'Overwatering is just love with bad boundaries. #houseplants', -1],
  [5, 'Finished the third one this month. Recommending it to everyone I meet. #books', -1],
  [5, 'Library card is the best subscription I have. #books #reading', -1],
  [5, 'Abandoned two books this week and feel great about it. #reading', -1],
  [6, 'Long run done. 28k, felt easy until km 24. Then it felt like life. #running', -1],
  [6, 'Race week. Nothing left to do but sleep and trust the work. #running #marathon', -1],
  [6, 'Post-run pastry is part of the training plan. Do not argue with me. #running', 5],
  [7, 'Layered four field recordings from the train into a loop. It is oddly soothing. #music', -1],
  [7, 'Drum machine and one bad microphone. Best session in weeks. #music #beatmaking', -1],
  [7, 'Finished a track at 2am. Will hate it at 9am. Posting anyway. #music', -1],
  [8, 'Sketched the whole bus ride. Nobody noticed, which is the whole point. #sketchbook', -1],
  [8, 'Ink and watercolor wash on the terrace. Coffee cup for scale. #sketchbook #art', 0],
  [9, 'Dal, rice, a squeeze of lime. Tuesday is sorted. #cooking', -1],
  [9, 'Attempted a layered thing with a recipe that had 19 steps. Survived. Barely. #cooking', -1],
  [9, 'Salt early, taste often. That is the entire secret. #cooking', -1],
  [10, 'Summit at 10:40, socks soaked by 10:45. Worth it. #hiking', 1],
  [10, 'Trail snack ranking: cheese > nuts > anything sweet after km 15. #hiking', -1],
  [10, 'Fog rolled in and the whole valley disappeared. Stayed an hour. #hiking #trails', -1],
  [11, 'Wrote a tiny CLI to rename my photo folders. Saved me nine minutes a week. Took eleven hours. #coding', -1],
  [11, 'Deleted 400 lines today and everything got faster. Best commit of the month. #coding', -1],
  [12, 'Found a wool coat for a tenth of its price. Mending the pocket tonight. #thrifting #slowfashion', -1],
  [12, 'Visible mending is my new hobby. Bright thread on dark denim. #slowfashion', 2],
  [13, 'Water was 9 degrees this morning. Do not recommend, will do again. #coldwater #swimming', -1],
  [13, 'Sunrise swim, empty lake, one very confused heron. #swimming', 3],
];

// Older, quieter posts that give the dashboard history to chart. Authors are assigned by join date.
const OLDER = [
  ['Slow morning, good coffee, nothing on the calendar.'],
  ['New here. Looking forward to seeing what everyone is making.'],
  ['Small win today: finished the thing I kept putting off.'],
  ['Rain all afternoon, which means an excuse to stay in and tinker. #ceramics'],
  ['Does anyone else keep a running list of books they will never actually read? #books'],
  ['Long ride with a headwind the whole way. Character building. #cycling'],
  ['Tried a new recipe and only mildly burned it. Progress. #cooking'],
  ['The light through the window at 5pm has been unreal this week. #filmphotography'],
  ['Repotted three plants and knocked one over. Even score. #houseplants'],
  ['Notes to self: drink water, go outside, call your mother.'],
  ['Found an old sketchbook from years ago. Cringe and pride in equal measure. #sketchbook'],
  ['Early swim, empty pool, the good kind of tired. #swimming'],
  ['Made a beat from a dripping tap. Not my proudest work, but it is mine. #music'],
  ['Someone at the market gave me a free tomato and it changed my week.'],
  ['Trying to write down one good thing each day. Day nine, still going.'],
  ['Hot take: the second half of a book is always better than the first. #reading'],
  ['Trail was closed so we made our own loop. No regrets. #hiking'],
  ['Sunday bread came out flat but tasted right. #sourdough'],
  ['Thrifted a jacket that fits like it was made for me. #thrifting'],
  ['Debugged for two hours. The fix was one character. #coding'],
  ['New rule: phone stays in the other room after 9pm. Day three.'],
  ['Autumn is officially here and I am officially unprepared.'],
  ['Practising patience with a very stubborn glaze. #glaze #ceramics'],
  ['Mended a hole in my favourite sweater. Bright thread on purpose. #slowfashion'],
  ['Marathon plan says rest day. Body agrees, brain does not. #running'],
  ['Made tea, forgot tea, found cold tea. Classic. '],
  ['Looking for book recommendations that are short and sad. #books'],
  ['Cold water this morning was a personal attack. Loved it. #coldwater'],
  ['Three things I learned this week and none of them are useful.'],
  ['Reminder that you do not have to reply to everything today.'],
  ['Just finished a roll of film. Terrified and excited to see it. #filmphotography'],
  ['The market had the first squash of the season. I bought four. #cooking'],
  ['Wrote a tiny script that renames my downloads. It changed my life a little. #coding'],
  ['Watched the fog burn off the hills from the summit. Worth the alarm. #hiking'],
  ['Working on something new. Not ready to share, but soon.'],
  ['Thank you to everyone who stopped by the stall. Sold out of mugs by noon. #ceramics'],
];

const COMMENTS = [
  'This is so good.', 'Saving this one.', 'Okay you have convinced me.', 'Needed this today.',
  'Love the light in this.', 'Tell me more!', 'Same, weirdly relatable.', 'That last line, yes.',
  'How long did this take?', 'Sending this to a friend.', 'Following for more of this.', 'Ha, accurate.',
];
const QUOTES = ['Exactly this.', 'Worth a read.', 'Adding to my list.', 'This, but louder.'];

// ---- tiny gradient PNGs (no image libraries needed) ----
const PALETTES = [
  [196, 96, 58, 0.06, 0.1, 0.05], [58, 110, 96, 0.08, 0.05, 0.1], [214, 160, 84, 0.05, 0.08, 0.12],
  [92, 76, 120, -0.02, 0.09, 0.06], [150, 60, 60, 0.09, 0.06, 0.05], [80, 120, 160, 0.1, 0.03, 0.05],
];
function makePng(idx) {
  const [r0, g0, b0, dr, dg, db] = PALETTES[idx % PALETTES.length];
  const W = 960, H = 600, raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0;
    for (let x = 0; x < W; x++) {
      const o = y * (W * 3 + 1) + 1 + x * 3;
      const ring = Math.abs(Math.hypot(x - W * 0.7, y - H * 0.4) - 150) < 26 ? 28 : 0;
      raw[o] = Math.min(255, r0 + x * dr * 0.25 + y * dr * 0.1 + ring);
      raw[o + 1] = Math.min(255, g0 + x * dg * 0.2 + y * dg * 0.1 + ring);
      raw[o + 2] = Math.min(255, b0 + x * db * 0.15 + y * db * 0.12 + ring);
    }
  }
  const table = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
  const crc = (b) => { let r = ~0; for (const x of b) r = table[(r ^ x) & 255] ^ (r >>> 8); return ~r >>> 0; };
  const chunk = (t, d) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(d.length);
    const td = Buffer.concat([Buffer.from(t), d]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

async function uploadImage(idx) {
  const { CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_API_KEY: key, CLOUDINARY_API_SECRET: secret } = process.env;
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'circl/seed';
  const signature = crypto.createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest('hex');
  const form = new FormData();
  form.append('file', new Blob([makePng(idx)], { type: 'image/png' }), `seed-${idx}.png`);
  Object.entries({ api_key: key, timestamp, folder, signature }).forEach(([k, v]) => form.append(k, v));
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Cloudinary upload failed (${res.status})`);
  return (await res.json()).secure_url;
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  // ---- clean previous seed data, keeping any uploaded images for reuse ----
  const old = await User.find({ isSeed: true }).select('_id');
  const oldIds = old.map((u) => u._id);
  const oldPosts = await Post.find({ author: { $in: oldIds }, image: { $ne: '' } }).select('image').lean();
  let images = [...new Set(oldPosts.map((p) => p.image))].slice(0, PALETTES.length);
  const oldPostIds = (await Post.find({ author: { $in: oldIds } }).select('_id').lean()).map((p) => p._id);
  await Promise.all([
    Comment.deleteMany({ $or: [{ author: { $in: oldIds } }, { post: { $in: oldPostIds } }] }),
    Post.deleteMany({ author: { $in: oldIds } }),
    Report.deleteMany({ $or: [{ reporter: { $in: oldIds } }, { user: { $in: oldIds } }, { post: { $in: oldPostIds } }] }),
    AdminLog.deleteMany({ admin: { $in: oldIds } }),
    User.updateMany({}, { $pull: { following: { $in: oldIds }, followers: { $in: oldIds }, saved: { $in: oldPostIds } } }),
  ]);
  await User.deleteMany({ isSeed: true });

  if (images.length < PALETTES.length) {
    console.log('Uploading sample images to Cloudinary...');
    images = [];
    for (let i = 0; i < PALETTES.length; i++) images.push(await uploadImage(i));
  }

  // ---- users ----
  const hash = await bcrypt.hash(SEED_PASSWORD, 12);
  // People joined over the last two months, so signup trends and period comparisons have something to show.
  const JOINED_DAYS_AGO = [58, 55, 51, 47, 42, 38, 34, 29, 24, 19, 14, 9, 5, 2];
  const t0 = Date.now();
  const joined = (i) => new Date(t0 - JOINED_DAYS_AGO[i] * DAY);
  const users = await User.insertMany(
    PEOPLE.map(([username, displayName, bio], i) => ({
      username, displayName, bio, email: `${username}@circl.local`, password: hash, isSeed: true,
      createdAt: joined(i), updatedAt: joined(i),
    })),
    { timestamps: false }
  );

  const adminPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
  await User.deleteOne({ username: 'circl_admin' });
  const admin = await User.create({
    username: 'circl_admin', displayName: 'Circl Admin', bio: 'Keeping the circle tidy.',
    email: 'admin@circl.local', password: await bcrypt.hash(adminPassword, 12), role: 'admin', isSeed: true,
  });
  await User.updateOne({ _id: admin._id }, { createdAt: new Date(t0 - 62 * DAY) }, { timestamps: false });

  // ---- follows: everyone follows a handful of others ----
  const follows = users.map(() => new Set());
  users.forEach((_, i) => {
    for (const j of sample(users.map((__, k) => k).filter((k) => k !== i), 4 + Math.floor(rand() * 5))) follows[i].add(j);
  });
  // Make the first user (demo login) follow a few people so the Following tab is populated.
  [1, 2, 3, 6].forEach((j) => follows[0].add(j));
  await Promise.all(users.map((u, i) => {
    const following = [...follows[i]].map((j) => users[j]._id);
    return User.updateOne({ _id: u._id }, { following });
  }));
  await Promise.all(users.map((u, j) => {
    const followers = users.filter((_, i) => follows[i].has(j)).map((x) => x._id);
    return User.updateOne({ _id: u._id }, { followers });
  }));

  // ---- posts spread over the last ~44 hours so trending has a live window ----
  const now = Date.now();
  const base = POSTS.map(([a, text, img], n) => ({
    author: users[a]._id,
    text,
    image: img >= 0 ? images[img % images.length] : '',
    tags: extractTags(text),
    createdAt: new Date(now - (POSTS.length - n) * (44 / POSTS.length) * HOUR + Math.floor(rand() * 30) * 60000),
  }));
  base.forEach((p) => { p.updatedAt = p.createdAt; });
  const posts = await Post.insertMany(base, { timestamps: false });

  // ---- older posts, weighted toward recent weeks, written only by people who had already joined ----
  const older = OLDER.map(([text], k) => {
    const daysAgo = 3 + Math.floor(56 * rand() ** 1.7);
    const eligible = users.map((u, i) => i).filter((i) => JOINED_DAYS_AGO[i] >= daysAgo);
    const author = users[pick(eligible.length ? eligible : [0])];
    const createdAt = new Date(now - daysAgo * DAY - Math.floor(rand() * 20) * HOUR);
    return { author: author._id, text, tags: extractTags(text), createdAt, updatedAt: createdAt, likes: sample(users, Math.floor(rand() * 7)).filter((u) => String(u._id) !== String(author._id)).map((u) => u._id), _k: k };
  });
  const madeOlder = await Post.insertMany(older, { timestamps: false });
  const olderComments = madeOlder.flatMap((p) => Array.from({ length: Math.floor(rand() * 3) }, () => ({
    post: p._id, author: pick(users)._id, text: pick(COMMENTS), createdAt: new Date(p.createdAt.getTime() + (0.5 + rand() * 20) * HOUR),
  })));
  await Comment.insertMany(olderComments.map((c) => ({ ...c, updatedAt: c.createdAt })), { timestamps: false });
  const olderCounts = new Map();
  olderComments.forEach((c) => olderCounts.set(String(c.post), (olderCounts.get(String(c.post)) || 0) + 1));
  for (const [id, n] of olderCounts) await Post.updateOne({ _id: id }, { commentsCount: n }, { timestamps: false });

  // ---- reshares and quotes ----
  const reposts = [];
  for (let n = 0; n < 8; n++) {
    const target = pick(posts.slice(0, POSTS.length));
    const who = pick(users);
    if (String(who._id) === String(target.author)) continue;
    const text = n % 2 ? pick(QUOTES) : '';
    reposts.push({
      author: who._id, repostOf: target._id, text, tags: extractTags(text),
      createdAt: new Date(target.createdAt.getTime() + (1 + rand() * 5) * HOUR),
    });
  }
  const madeReposts = await Post.insertMany(reposts.map((r) => ({ ...r, updatedAt: r.createdAt })), { timestamps: false });
  for (const r of madeReposts) await Post.updateOne({ _id: r.repostOf }, { $inc: { repostsCount: 1 } });

  // ---- likes, comments, saves ----
  const all = [...posts, ...madeReposts];
  for (const p of all) {
    const likers = sample(users, Math.floor(rand() * 9)).filter((u) => String(u._id) !== String(p.author));
    await Post.updateOne({ _id: p._id }, { likes: likers.map((u) => u._id) });
  }
  const comments = [];
  for (const p of sample(posts, 24)) {
    for (let k = 0; k < 1 + Math.floor(rand() * 3); k++) {
      const who = pick(users);
      comments.push({
        post: p._id, author: who._id, text: pick(COMMENTS),
        createdAt: new Date(p.createdAt.getTime() + (0.2 + rand() * 6) * HOUR),
      });
    }
  }
  const madeComments = await Comment.insertMany(comments.map((c) => ({ ...c, updatedAt: c.createdAt })), { timestamps: false });
  const perPost = new Map();
  madeComments.forEach((c) => perPost.set(String(c.post), (perPost.get(String(c.post)) || 0) + 1));
  for (const [id, n] of perPost) await Post.updateOne({ _id: id }, { commentsCount: n });
  for (const u of users) await User.updateOne({ _id: u._id }, { saved: sample(posts, Math.floor(rand() * 5)).map((p) => p._id) });

  // ---- a small moderation queue and audit trail so the admin dashboard has something to show ----
  const flagged = sample(posts.filter((p) => !p.repostOf), 5)
  const reportSpecs = [
    ['spam', 'Looks like promotion, not part of the conversation.', 'open'],
    ['misinformation', '', 'open'],
    ['inappropriate', 'Not something I want on my feed.', 'open'],
    ['harassment', '', 'dismissed'],
    ['other', 'Not sure, please check.', 'dismissed'],
  ]
  const reports = flagged.map((p, i) => {
    const reporter = users.find((u) => String(u._id) !== String(p.author) && u.username !== 'maya_makes') || users[0]
    const [reason, details, status] = reportSpecs[i]
    return {
      reporter: reporter._id, targetType: 'post', post: p._id, reason, details, status,
      ...(status === 'open' ? {} : { resolvedBy: admin._id, resolvedAt: new Date(now - 3 * HOUR), resolution: 'No violation found' }),
      createdAt: new Date(now - (2 + i * 5) * HOUR),
    }
  })
  const target = users[4]
  reports.push({ reporter: users[9]._id, targetType: 'user', user: target._id, reason: 'spam', details: 'Keeps replying with links.', status: 'open', createdAt: new Date(now - HOUR) })
  await Report.insertMany(reports.map((r) => ({ ...r, updatedAt: r.createdAt })), { timestamps: false });
  await AdminLog.insertMany([
    { admin: admin._id, action: 'Dismissed report', target: 'post report (harassment)', createdAt: new Date(now - 3 * HOUR) },
    { admin: admin._id, action: 'Dismissed report', target: 'post report (other)', createdAt: new Date(now - 6 * HOUR) },
    { admin: admin._id, action: 'Restored', target: '@sam_swims', createdAt: new Date(now - 20 * HOUR) },
  ], { timestamps: false });

  console.log(`Seeded ${users.length} users, ${all.length + madeOlder.length} posts (${madeReposts.length} reshares), ${madeComments.length + olderComments.length} comments.`);
  console.log(`\nDemo login:  maya_makes@circl.local  /  ${SEED_PASSWORD}   (all seed users share this password)`);
  console.log(`Admin login: admin@circl.local  /  ${adminPassword}${process.env.ADMIN_PASSWORD ? '' : '   (random, shown once; set ADMIN_PASSWORD to choose)'}`);
  await mongoose.disconnect();
}

main().catch(async (e) => { console.error(e); await mongoose.disconnect(); process.exit(1); });
