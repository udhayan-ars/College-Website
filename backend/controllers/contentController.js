const Content = require('../models/Content');
const v = require('../utils/validate');
const { AppError, asyncHandler } = require('../utils/errors');

exports.listNotices = asyncHandler(async (req, res) => {
  const hostel = req.user.role === 'admin' ? null : req.user.hostel;
  res.json({ notices: await Content.notices(hostel) });
});

exports.createNotice = asyncHandler(async (req, res) => {
  const message = v.str(req.body.message, 'Message', { max: 1000 });
  let hostel;
  if (req.user.role === 'admin') hostel = v.oneOf(req.body.hostel || 'All', ['All', 'Boys', 'Girls'], 'hostel');
  else {
    hostel = req.user.hostel;
    if (req.body.hostel && req.body.hostel !== hostel) throw new AppError(403, 'You can only announce to your own hostel.');
  }
  const id = await Content.addNotice(hostel, message, req.user.id);
  await Content.audit(req.user.id, 'NOTICE_CREATE', `notice ${id} (${hostel})`);
  res.status(201).json({ message: 'Announcement sent.', id });
});

exports.getMenu = asyncHandler(async (req, res) => res.json({ menu: await Content.menu() }));

exports.updateMenu = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const meals = Object.keys(body);
  if (!meals.length) throw new AppError(400, 'No menu changes supplied.');
  for (const m of meals) {
    if (!Content.MEALS.includes(m)) throw new AppError(400, `Unknown meal "${m}". Use: ${Content.MEALS.join(', ')}.`);
    const items = v.str(body[m] && body[m].items, `${m} items`, { max: 255 });
    const time = v.str(body[m] && body[m].time, `${m} time`, { max: 30, optional: true });
    await Content.updateMeal(m, items, time);
  }
  await Content.audit(req.user.id, 'MENU_UPDATE', meals.join(','));
  res.json({ message: 'Mess menu updated.' });
});

exports.rules = asyncHandler(async (req, res) => res.json({ rules: (await Content.rules()).map(r => r.rule_text) }));
